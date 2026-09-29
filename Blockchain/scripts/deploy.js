import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import solc from "solc";
import { ethers } from "ethers";
import {
  RUNTIME,
  DEPLOYMENT_PATH,
  IS_LOCAL,
  NETWORK_NAME,
  CONFIRMATIONS,
  RPC_URL,
  createProviderAndSigner,
  sendWrite,
} from "../config.js";

fs.mkdirSync(RUNTIME, { recursive: true });

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), "utf8");
}

function findImports(importPath) {
  const candidates = [
    path.join(ROOT, importPath),
    path.join(ROOT, "node_modules", importPath),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return { contents: fs.readFileSync(candidate, "utf8") };
    }
  }
  return { error: "Import not found: " + importPath };
}

const input = {
  language: "Solidity",
  sources: {
    "contracts/CareQuestCapsule.sol": {
      content: read("contracts/CareQuestCapsule.sol"),
    },
    "contracts/CareQuestAuditAnchor.sol": {
      content: read("contracts/CareQuestAuditAnchor.sol"),
    },
    "contracts/CareQuestHospitalCapsules.sol": {
      content: read("contracts/CareQuestHospitalCapsules.sol"),
    },
  },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: {
      "*": { "*": ["abi", "evm.bytecode.object"] },
    },
  },
};

const output = JSON.parse(
  solc.compile(JSON.stringify(input), { import: findImports })
);
const errors = (output.errors || []).filter((item) => item.severity === "error");
if (errors.length) {
  for (const error of errors) console.error(error.formattedMessage);
  process.exit(1);
}

function artifact(source, name) {
  const item = output.contracts[source][name];
  if (!item) throw new Error(`Contract ${name} missing from solc output`);
  return { abi: item.abi, bytecode: "0x" + item.evm.bytecode.object };
}

const capsuleArtifact = artifact("contracts/CareQuestCapsule.sol", "CareQuestCapsule");
const auditArtifact = artifact("contracts/CareQuestAuditAnchor.sol", "CareQuestAuditAnchor");
const hospitalCapsuleArtifact = artifact(
  "contracts/CareQuestHospitalCapsules.sol",
  "CareQuestHospitalCapsules"
);

const { provider, signer, chainId, minterAddress, networkName } =
  await createProviderAndSigner();

console.log("Network:  " + networkName);
console.log("Chain ID: " + chainId);
console.log("RPC:      " + RPC_URL);
console.log("Deployer: " + minterAddress);

if (!IS_LOCAL) {
  // A real network charges real gas. Check the deployer can actually pay before
  // burning a nonce on a deployment that is guaranteed to fail.
  const balance = await provider.getBalance(minterAddress);
  if (balance === 0n) {
    throw new Error(
      `Deployer ${minterAddress} has a zero balance on chainId ${chainId}. ` +
        "Fund it from the MST testnet faucet before deploying."
    );
  }
  console.log("Balance:  " + ethers.formatEther(balance) + " " + networkName);
}

// Deploying three contracts needs three nonces from one account. sendWrite
// serialises them, so they cannot collide on a public node the way three
// concurrent deployments would.
async function deploy(name, contractArtifact, args) {
  const factory = new ethers.ContractFactory(
    contractArtifact.abi,
    contractArtifact.bytecode,
    signer
  );
  console.log("Deploying " + name + "...");
  // sendWrite normalises both shapes and resolves to the mined receipt.
  const receipt = await sendWrite((o) => factory.deploy(...args, o), { provider });
  // A contract-creation receipt carries the new address directly, which is
  // more reliable than recomputing it from (sender, nonce).
  const address = receipt.contractAddress;
  if (!address) {
    throw new Error(
      "Deployment receipt for " + name + " carries no contract address"
    );
  }
  console.log("  " + name + " -> " + address + "  (tx " + receipt.hash + ")");
  return { address, receipt };
}

const capsule = await deploy("CareQuestCapsule", capsuleArtifact, [minterAddress]);
const hospitalCapsule = await deploy("CareQuestHospitalCapsules", hospitalCapsuleArtifact, [
  minterAddress,
]);
const audit = await deploy("CareQuestAuditAnchor", auditArtifact, [minterAddress]);

// Verify bytecode actually exists at each address. A deployment can report a
// contract address without the code being present (bad nonce, chain reorg), and
// writing deployment.json in that state would point the bridge at nothing.
for (const [name, entry] of [
  ["CareQuestCapsule", capsule],
  ["CareQuestHospitalCapsules", hospitalCapsule],
  ["CareQuestAuditAnchor", audit],
]) {
  const code = await provider.getCode(entry.address);
  if (!code || code === "0x") {
    throw new Error(
      `No bytecode at ${entry.address} for ${name} after deployment. ` +
        "The deployment did not land; refusing to write deployment.json."
    );
  }
}

const deployment = {
  network: networkName,
  chainId,
  rpcUrl: RPC_URL,
  isLocal: IS_LOCAL,
  admin: minterAddress,
  minter: minterAddress,
  confirmations: CONFIRMATIONS,
  capsuleAddress: capsule.address,
  capsuleDeployTx: capsule.receipt.hash,
  hospitalCapsuleAddress: hospitalCapsule.address,
  hospitalCapsuleDeployTx: hospitalCapsule.receipt.hash,
  auditAddress: audit.address,
  auditDeployTx: audit.receipt.hash,
  capsuleAbi: capsuleArtifact.abi,
  hospitalCapsuleAbi: hospitalCapsuleArtifact.abi,
  auditAbi: auditArtifact.abi,
  deployedAt: new Date().toISOString(),
};

fs.writeFileSync(DEPLOYMENT_PATH, JSON.stringify(deployment, null, 2));

console.log("");
console.log("CareQuest contracts deployed");
console.log("Network:  " + deployment.network + " (chainId " + chainId + ")");
console.log("Legacy CAP:      " + deployment.capsuleAddress);
console.log("Hospital Capsules: " + deployment.hospitalCapsuleAddress);
console.log("Audit:            " + deployment.auditAddress);
console.log("Wrote: " + DEPLOYMENT_PATH);
