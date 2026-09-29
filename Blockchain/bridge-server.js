import fs from "node:fs";
import http from "node:http";
import { ethers } from "ethers";
import {
  BRIDGE_PORT,
  DEPLOYMENT_PATH,
  STATE_PATH,
  IS_LOCAL,
  CONFIRMATIONS,
  NETWORK_NAME,
  RPC_URL,
  createProviderAndSigner,
  resolveWalletAddress,
  sendWrite,
} from "./config.js";

if (!fs.existsSync(DEPLOYMENT_PATH)) {
  throw new Error(
    "Run deployment before starting the CareQuest bridge (npm run deploy)"
  );
}

const deployment = JSON.parse(fs.readFileSync(DEPLOYMENT_PATH, "utf8"));
const { provider, signer, chainId, minterAddress } =
  await createProviderAndSigner();

// Fail fast if deployment.json was written for a different chain than the one
// the bridge is now pointed at. Minting to a stale address on the wrong network
// is the worst possible silent failure here.
if (Number(deployment.chainId) !== chainId) {
  throw new Error(
    `deployment.json targets chainId ${deployment.chainId} but the RPC endpoint ` +
      `reports chainId ${chainId}. Re-run "npm run deploy" against this network.`
  );
}

const capsule = new ethers.Contract(
  deployment.capsuleAddress,
  deployment.capsuleAbi,
  signer
);
const audit = new ethers.Contract(
  deployment.auditAddress,
  deployment.auditAbi,
  signer
);
const hospitalCapsule = deployment.hospitalCapsuleAddress
  ? new ethers.Contract(
      deployment.hospitalCapsuleAddress,
      deployment.hospitalCapsuleAbi,
      signer
    )
  : null;

// The minter address baked into the contracts at deploy time must match the key
// the bridge actually signs with, otherwise every mint/burn reverts on
// AccessControl and the failure looks like a contract bug.
async function assertMinterMatchesDeployment() {
  const onChainMinter = await capsule.MINTER_ROLE();
  const hasRole = await capsule.hasRole(onChainMinter, minterAddress);
  if (!hasRole) {
    throw new Error(
      `Signer ${minterAddress} does not hold MINTER_ROLE on the CAP contract at ` +
        `${deployment.capsuleAddress} (chainId ${chainId}). Deploy the contracts ` +
        "with the same key that the bridge signs with, or point the bridge at " +
        "the deployment key."
    );
  }
}
await assertMinterMatchesDeployment();

function loadState() {
  if (!fs.existsSync(STATE_PATH)) return { references: {} };
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
  } catch {
    return { references: {} };
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

/**
 * Is a cached transaction still present on the live chain?
 *
 * The original local Hardhat network is in-memory and RESETS to block 0 on
 * every start, but bridge-state.json lives on disk. Without this check, after a
 * restart the bridge replayed cached transaction hashes that no longer existed,
 * reporting anchors as "confirmed" and `duplicate: true` while the chain held
 * no such proof at all. A cached reference is only honoured when the chain
 * still has the transaction behind it.
 *
 * This matters MORE on a real testnet, not less: a reorg can drop a receipt
 * that the database already recorded, and re-verifying is the only way to tell
 * a real proof from a stale row.
 */
async function isReferenceLive(txHash) {
  if (!txHash || typeof txHash !== "string") return false;
  try {
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt || receipt.status !== 1) return false;

    // Confirm it is still on the canonical chain, not just mined somewhere.
    // Comparing block numbers is enough for this purpose and cheap: if the
    // receipt's block is older than CONFIRMATIONS deep and the chain head has
    // moved on, the transaction is final enough to trust.
    if (CONFIRMATIONS > 1) {
      const head = await provider.getBlockNumber();
      if (BigInt(receipt.blockNumber) + BigInt(CONFIRMATIONS) > head) return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Return the cached transaction hash for a key, but only if the chain still
 * holds it. Prunes the dead entry so the caller re-does the work.
 */
async function liveReference(state, key) {
  const txHash = state.references[key];
  if (!txHash) return null;
  if (await isReferenceLive(txHash)) return txHash;
  delete state.references[key];
  saveState(state);
  return null;
}

function json(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "http://localhost:3000",
  });
  response.end(JSON.stringify(body));
}

async function body(request) {
  let raw = "";
  for await (const chunk of request) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

/**
 * Input validation errors are the caller's fault, not a bridge failure.
 *
 * These used to be raised as ordinary errors, so the catch-all at the bottom
 * of the request handler turned a bad payload into HTTP 500. The frontend
 * cannot distinguish "you sent nonsense" from "the chain is down" by status
 * code alone, and treating a validation slip as an infrastructure outage makes
 * real chain problems much harder to spot. Marking them lets the handler answer
 * 400 while genuine RPC/contract failures still surface as 500.
 */
class BadRequestError extends Error {
  constructor(message) {
    super(message);
    this.name = "BadRequestError";
    this.status = 400;
  }
}

function requirePositiveAmount(value) {
  const amount = Number(value);
  if (!Number.isInteger(amount) || amount <= 0 || amount > 100000) {
    throw new BadRequestError("positive integer amount required");
  }
  return amount;
}

function requireAddress(value, message = "valid walletAddress required") {
  if (!ethers.isAddress(value || "")) {
    throw new BadRequestError(message);
  }
  return value;
}

function requireTokenId(value) {
  const tokenId = Number(value);
  if (!Number.isInteger(tokenId) || tokenId <= 0) {
    throw new BadRequestError("positive integer tokenId required");
  }
  return tokenId;
}

function requireReference(value) {
  if (!value) throw new BadRequestError("reference required");
  return value;
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://127.0.0.1:" + BRIDGE_PORT);

    if (request.method === "GET" && url.pathname === "/health") {
      const [blockNumber, balance] = await Promise.all([
        provider.getBlockNumber(),
        provider.getBalance(minterAddress),
      ]);
      return json(response, 200, {
        ok: true,
        network: NETWORK_NAME,
        chainId,
        blockNumber,
        minter: minterAddress,
        minterBalance: ethers.formatEther(balance),
        confirmations: CONFIRMATIONS,
        rpcUrl: RPC_URL,
        local: IS_LOCAL,
        capsuleAddress: deployment.capsuleAddress,
        hospitalCapsuleAddress: deployment.hospitalCapsuleAddress || null,
        auditAddress: deployment.auditAddress,
      });
    }

    if (request.method === "POST" && url.pathname === "/wallet") {
      const payload = await body(request);
      requireReference(payload.reference);
      const walletAddress = await resolveWalletAddress({
        reference: String(payload.reference),
        provider,
      });
      return json(response, 200, {
        walletAddress,
        network: NETWORK_NAME,
        chainId,
      });
    }

    if (request.method === "GET" && url.pathname === "/balance") {
      const walletAddress = requireAddress(url.searchParams.get("walletAddress"));
      const balance = await capsule.balanceOf(walletAddress);
      return json(response, 200, {
        walletAddress,
        balance: Number(balance),
        network: NETWORK_NAME,
        chainId,
      });
    }

    if (request.method === "POST" && url.pathname === "/mint") {
      const payload = await body(request);
      requireAddress(payload.walletAddress);
      const amount = requirePositiveAmount(payload.amount);
      requireReference(payload.reference);

      const state = loadState();
      const cached = await liveReference(state, payload.reference);
      if (cached) {
        return json(response, 200, { duplicate: true, txHash: cached });
      }

      const receipt = await sendWrite(
        (overrides) => capsule.mint(payload.walletAddress, amount, overrides),
        { provider }
      );
      state.references[payload.reference] = receipt.hash;
      saveState(state);
      return json(response, 200, {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        amount,
        walletAddress: payload.walletAddress,
        network: NETWORK_NAME,
        chainId,
      });
    }

    if (request.method === "POST" && url.pathname === "/burn") {
      const payload = await body(request);
      requireAddress(payload.walletAddress);
      const amount = requirePositiveAmount(payload.amount);
      requireReference(payload.reference);

      const state = loadState();
      const cached = await liveReference(state, payload.reference);
      if (cached) {
        return json(response, 200, { duplicate: true, txHash: cached });
      }

      const receipt = await sendWrite(
        (overrides) =>
          capsule.correctionBurn(payload.walletAddress, amount, overrides),
        { provider }
      );
      state.references[payload.reference] = receipt.hash;
      saveState(state);
      return json(response, 200, {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        amount,
        walletAddress: payload.walletAddress,
        network: NETWORK_NAME,
        chainId,
      });
    }

    if (request.method === "GET" && url.pathname === "/hospital-balance") {
      if (!hospitalCapsule) {
        return json(
          response,
          503,
          { error: "hospital Capsule contract not deployed" }
        );
      }
      const walletAddress = requireAddress(url.searchParams.get("walletAddress"));
      const tokenId = requireTokenId(url.searchParams.get("tokenId"));
      const balance = await hospitalCapsule.balanceOf(walletAddress, tokenId);
      return json(response, 200, {
        walletAddress,
        tokenId,
        balance: Number(balance),
        network: NETWORK_NAME,
        chainId,
      });
    }

    if (request.method === "POST" && url.pathname === "/hospital-mint") {
      if (!hospitalCapsule) {
        return json(
          response,
          503,
          { error: "hospital Capsule contract not deployed" }
        );
      }
      const payload = await body(request);
      const tokenId = requireTokenId(payload.tokenId);
      const amount = requirePositiveAmount(payload.amount);
      requireAddress(payload.walletAddress);
      requireReference(payload.reference);

      const state = loadState();
      const key = "hospital-mint:" + payload.reference;
      const cached = await liveReference(state, key);
      if (cached) {
        return json(response, 200, { duplicate: true, txHash: cached, tokenId });
      }

      const receipt = await sendWrite(
        (overrides) =>
          hospitalCapsule.mint(payload.walletAddress, tokenId, amount, overrides),
        { provider }
      );
      state.references[key] = receipt.hash;
      saveState(state);
      return json(response, 200, {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        tokenId,
        amount,
        walletAddress: payload.walletAddress,
        network: NETWORK_NAME,
        chainId,
      });
    }

    if (request.method === "POST" && url.pathname === "/hospital-burn") {
      if (!hospitalCapsule) {
        return json(
          response,
          503,
          { error: "hospital Capsule contract not deployed" }
        );
      }
      const payload = await body(request);
      const tokenId = requireTokenId(payload.tokenId);
      const amount = requirePositiveAmount(payload.amount);
      requireAddress(payload.walletAddress);
      requireReference(payload.reference);

      const state = loadState();
      const key = "hospital-burn:" + payload.reference;
      const cached = await liveReference(state, key);
      if (cached) {
        return json(response, 200, { duplicate: true, txHash: cached, tokenId });
      }

      const receipt = await sendWrite(
        (overrides) =>
          hospitalCapsule.correctionBurn(
            payload.walletAddress,
            tokenId,
            amount,
            overrides
          ),
        { provider }
      );
      state.references[key] = receipt.hash;
      saveState(state);
      return json(response, 200, {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        tokenId,
        amount,
        walletAddress: payload.walletAddress,
        network: NETWORK_NAME,
        chainId,
      });
    }

    if (request.method === "POST" && url.pathname === "/anchor") {
      const payload = await body(request);
      if (
        !payload.batchId ||
        !/^0x[0-9a-fA-F]{64}$/.test(payload.merkleRoot || "")
      ) {
        throw new BadRequestError("batchId and bytes32 merkleRoot required");
      }
      const batchKey = "anchor:" + payload.batchId;
      const state = loadState();
      const cached = await liveReference(state, batchKey);
      if (cached) {
        return json(response, 200, {
          duplicate: true,
          txHash: cached,
          network: NETWORK_NAME,
          chainId,
        });
      }

      const batchId = ethers.id(payload.batchId);
      const existingRoot = await audit
        .roots(batchId)
        .catch(() => ethers.ZeroHash);
      if (existingRoot && existingRoot !== ethers.ZeroHash) {
        // The chain already holds this commitment (e.g. the local reference
        // file was pruned but the chain survived). Report it as a duplicate
        // rather than re-mining — the contract rejects a second anchor.
        return json(response, 200, {
          duplicate: true,
          alreadyOnChain: true,
          merkleRoot: existingRoot,
          network: NETWORK_NAME,
          chainId,
        });
      }

      const receipt = await sendWrite(
        (overrides) => audit.anchor(batchId, payload.merkleRoot, overrides),
        { provider }
      );
      state.references[batchKey] = receipt.hash;
      saveState(state);
      return json(response, 200, {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        network: NETWORK_NAME,
        chainId,
      });
    }

    // Read an anchor back off the chain. This is the authoritative check that
    // a commitment really is on-chain, rather than trusting a local file.
    if (request.method === "GET" && url.pathname === "/anchor") {
      const batchId = url.searchParams.get("batchId");
      if (!batchId) throw new BadRequestError("batchId required");
      const root = await audit
        .roots(ethers.id(batchId))
        .catch(() => ethers.ZeroHash);
      return json(response, 200, {
        batchId,
        merkleRoot: root && root !== ethers.ZeroHash ? root : null,
        anchored: Boolean(root && root !== ethers.ZeroHash),
        network: NETWORK_NAME,
        chainId,
        blockNumber: await provider.getBlockNumber(),
      });
    }

    return json(response, 404, { error: "not found" });
  } catch (error) {
    // A validation slip is the caller's fault (400). Anything else is a real
    // bridge/chain failure and stays a 500, so a genuine outage stays visible
    // instead of hiding behind a stream of 400s.
    const status = Number(error?.status) === 400 ? 400 : 500;
    if (status === 500) console.error(error);
    return json(response, status, { error: error.message });
  }
});

server.listen(BRIDGE_PORT, "127.0.0.1", () => {
  console.log("");
  console.log("CareQuest blockchain bridge ONLINE");
  console.log("Bridge:   http://127.0.0.1:" + BRIDGE_PORT);
  console.log("Network:  " + NETWORK_NAME);
  console.log("Chain ID: " + chainId);
  console.log("RPC:      " + RPC_URL);
  console.log("Minter:   " + minterAddress);
  console.log("Confirms: " + CONFIRMATIONS);
  console.log("Legacy CAP:      " + deployment.capsuleAddress);
  console.log(
    "Hospital Capsules: " + (deployment.hospitalCapsuleAddress || "not deployed")
  );
  console.log("Audit:            " + deployment.auditAddress);
  console.log("");
});
