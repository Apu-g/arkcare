import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ethers } from "ethers";

// Resolve paths from this file, not process.cwd(), so the scripts behave the
// same whether they are launched via `npm run` or directly by scripts/*.sh.
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = HERE;
export const RUNTIME = path.join(HERE, "runtime");
export const DEPLOYMENT_PATH = path.join(RUNTIME, "deployment.json");
export const STATE_PATH = path.join(RUNTIME, "bridge-state.json");

/**
 * Minimal .env loader.
 *
 * The bridge and deploy scripts run as plain `node` processes spawned by
 * scripts/start-local-all.sh, which does NOT export Frontend/.env.local into
 * their environment. Previously the whole local chain needed no secrets, so
 * this never mattered. A real network needs a funded private key, so the chain
 * scripts now read their own git-ignored Blockchain/.env.
 *
 * Real process environment always wins over the file, so an explicit
 * `BRIDGEKEY_PRIVATE_KEY=... node bridge-server.js` still overrides.
 */
function loadEnvFile() {
  const file = path.join(HERE, ".env");
  if (!fs.existsSync(file)) return;
  for (const rawLine of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (!key || Object.prototype.hasOwnProperty.call(process.env, key)) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}
loadEnvFile();

// --- network selection ----------------------------------------------------

export const RPC_URL = (
  process.env.MST_RPC_URL ||
  process.env.CAREQUEST_EVM_RPC_URL ||
  "http://127.0.0.1:8545"
).replace(/\/+$/, "");

// A local in-memory Hardhat node is treated as the zero-cost demo path. A real
// network gets stricter behaviour: it must have an explicit funded key, and it
// is never silently assumed to be replayable.
export const IS_LOCAL = /^https?:\/\/(127\.0\.0\.1|localhost|0\.0\.0\.0|\[::1\])/i.test(
  RPC_URL
);

export const NETWORK_NAME =
  process.env.CAREQUEST_NETWORK_NAME ||
  (IS_LOCAL ? "carequest-local-evm" : "mst-testnet");

export const EXPECTED_CHAIN_ID = process.env.CAREQUEST_EXPECT_CHAIN_ID
  ? Number(process.env.CAREQUEST_EXPECT_CHAIN_ID)
  : null;

// Block confirmations required before a transaction is treated as proof.
// A local node needs 1; a public testnet can reorg, so raise this if you want
// deeper finality before the app calls something "confirmed".
export const CONFIRMATIONS = Math.max(
  1,
  Number(process.env.CAREQUEST_CONFIRMATIONS || (IS_LOCAL ? 1 : 1)) || 1
);

export const BRIDGE_PORT = (() => {
  const port = Number(process.env.CAREQUEST_BLOCKCHAIN_BRIDGE_PORT || 8546);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error("CAREQUEST_BLOCKCHAIN_BRIDGE_PORT must be a valid TCP port");
  }
  return port;
})();

// --- key handling ---------------------------------------------------------

export function getPrivateKey() {
  const key = (process.env.BRIDGEKEY_PRIVATE_KEY || "").trim();
  if (!key) return null;
  if (!/^0x[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error(
      "BRIDGEKEY_PRIVATE_KEY must be a 0x-prefixed 32-byte (64 hex char) private key"
    );
  }
  return key;
}

// --- provider / signer ----------------------------------------------------

export async function createProviderAndSigner() {
  if (!IS_LOCAL && !getPrivateKey()) {
    throw new Error(
      "BRIDGEKEY_PRIVATE_KEY is required when pointing at a non-local network " +
        `(${RPC_URL}). Create Blockchain/.env with a funded testnet key.`
    );
  }

  // staticNetwork avoids an eth_chainId round-trip on every single call.
  const provider = new ethers.JsonRpcProvider(RPC_URL, undefined, {
    staticNetwork: true,
  });

  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);

  if (EXPECTED_CHAIN_ID !== null && chainId !== EXPECTED_CHAIN_ID) {
    throw new Error(
      `Refusing to operate: ${RPC_URL} reports chainId ${chainId} but ` +
        `CAREQUEST_EXPECT_CHAIN_ID is ${EXPECTED_CHAIN_ID}. ` +
        "Point MST_RPC_URL at the intended network, or unset the expectation."
    );
  }

  // On a local Hardhat node the accounts are unlocked by the node itself. On a
  // real network eth_accounts is empty, so the only way to sign is to hold the
  // key. This is the single behavioural switch between the two modes.
  const privateKey = getPrivateKey();
  const signer = privateKey
    ? new ethers.Wallet(privateKey, provider)
    : await provider.getSigner(0);

  const minterAddress = await signer.getAddress();
  return { provider, signer, chainId, minterAddress, networkName: NETWORK_NAME };
}

// --- gas ------------------------------------------------------------------

/**
 * MST (and many Geth-based chains) is a LEGACY-gas chain: eth_getBlockByNumber
 * returns baseFeePerGas = 0 and getFeeData reports maxFeePerGas = null. Sending
 * an EIP-1559 payload to such a chain is rejected. So only attach 1559 fields
 * when the node actually reports them, and otherwise pin an explicit gasPrice.
 */
export async function buildFeeOverrides(provider) {
  if (process.env.CAREQUEST_GAS_PRICE) {
    return { gasPrice: ethers.parseUnits(process.env.CAREQUEST_GAS_PRICE, "gwei") };
  }
  const feeData = await provider.getFeeData();
  if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
    return {}; // real EIP-1559 node: let ethers populate 1559 fields
  }
  if (!feeData.gasPrice) {
    throw new Error("Could not determine a gas price from the RPC endpoint");
  }
  return { gasPrice: feeData.gasPrice };
}

/**
 * Serialise every state-changing transaction.
 *
 * This is the most important difference between a local Hardhat node and a real
 * network. Hardhat tolerates concurrent sends; a public node does not. Two
 * requests racing both read getTransactionCount("pending"), pick the SAME nonce,
 * and the second one dies with "nonce too low" (or silently replaces the first).
 *
 * Every write goes through this single promise chain, so nonces are handed out
 * strictly in order and a transaction is only sent after the previous one has
 * been mined.
 */
let txQueue = Promise.resolve();

export function serializeTransactions(task) {
  const result = txQueue.then(task, task);
  txQueue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

/**
 * Await a mined transaction and assert it succeeded.
 *
 * Accepts either shape ethers can hand back:
 *   - a TransactionResponse from a contract method call, or
 *   - a Contract from factory.deploy(), whose receipt lives on
 *     .deployTransaction (and whose address only resolves after deployment).
 */
export async function awaitReceipt(txOrContract) {
  let tx = null;

  if (txOrContract && typeof txOrContract.wait === "function") {
    // A TransactionResponse from a contract method call.
    tx = txOrContract;
  } else if (txOrContract && typeof txOrContract.deploymentTransaction === "function") {
    // A Contract from factory.deploy(): the receipt lives on the transaction
    // that created it, and the contract is not addressable until that mines.
    tx = txOrContract.deploymentTransaction();
    if (!tx) {
      // Some ethers versions only populate this after waitForDeployment().
      await txOrContract.waitForDeployment();
      tx = txOrContract.deploymentTransaction();
    }
  }

  if (!tx || typeof tx.wait !== "function") {
    throw new Error("Expected a transaction or deployed contract, got neither");
  }

  const receipt = await tx.wait(CONFIRMATIONS);
  if (!receipt || receipt.status !== 1) {
    throw new Error(`Transaction ${tx.hash} did not succeed on chain`);
  }
  return receipt;
}

/**
 * Send a contract write, fee-aware and nonce-serialised, and wait for
 * `CONFIRMATIONS` blocks before resolving.
 */
export async function sendWrite(contractCall, { provider }) {
  return serializeTransactions(async () => {
    const overrides = await buildFeeOverrides(provider);
    return awaitReceipt(await contractCall(overrides));
  });
}

// --- deterministic patient wallets ---------------------------------------

/**
 * Deterministic index for a reference, preserving the original 1..18 spread
 * used by the local demo so seeded wallets keep their shape.
 */
export function walletIndex(reference, accountCount) {
  const hash = crypto.createHash("sha256").update(String(reference)).digest();
  const available = Math.max(1, Math.min(accountCount - 1, 18));
  return 1 + (hash.readUInt32BE(0) % available);
}

/**
 * Resolve the on-chain address for a user reference.
 *
 * LOCAL mode keeps the original behaviour: pick one of Hardhat's pre-funded,
 * unlocked accounts. That is what CI and the seeded demo data depend on.
 *
 * REMOTE mode derives a deterministic child of the bridge key. Two properties
 * matter:
 *   1. The same user always gets the same address, on any machine, forever.
 *   2. The bridge holds the child key, so the smoke test can still sign as a
 *      patient to prove transfers are blocked.
 * These addresses never need a gas balance: a patient is only ever a mint
 * RECIPIENT, and receiving ERC-1155 costs the recipient nothing.
 */
export async function resolveWalletAddress({ reference, provider, accounts }) {
  const privateKey = getPrivateKey();

  if (IS_LOCAL && !privateKey) {
    const list = accounts || (await provider.send("eth_accounts", []));
    if (!list.length) {
      throw new Error("Local Hardhat node exposed no accounts");
    }
    return list[walletIndex(reference, list.length)];
  }

  if (!privateKey) {
    throw new Error("BRIDGEKEY_PRIVATE_KEY is required to derive wallets");
  }

  const index = walletIndex(reference, 20);
  const seed = ethers.sha256(ethers.toUtf8Bytes(privateKey + ":" + reference));
  return ethers.HDNodeWallet.fromSeed(seed)
    .derivePath(`m/44'/60'/0'/0/${index}`)
    .address;
}

/**
 * The signing child wallet at a given index (only used by the smoke test to
 * prove a transfer reverts). Returns null in local mode, where Hardhat's own
 * unlocked account is used instead.
 */
export function deriveChildWallet(reference, index) {
  const privateKey = getPrivateKey();
  if (!privateKey) return null;
  const seed = ethers.sha256(ethers.toUtf8Bytes(privateKey + ":" + reference));
  return ethers.HDNodeWallet.fromSeed(seed)
    .derivePath(`m/44'/60'/0'/0/${index}`)
    .connect(process.env.CAREQUEST_RPC || RPC_URL);
}
