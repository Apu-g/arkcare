import fs from "node:fs";
import path from "node:path";
import solc from "solc";
import { ethers } from "ethers";

const ROOT = path.resolve(process.cwd());
const RUNTIME = path.join(ROOT, "runtime");
fs.mkdirSync(RUNTIME, { recursive: true });

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

const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
const errors = (output.errors || []).filter((item) => item.severity === "error");
if (errors.length) {
  for (const error of errors) console.error(error.formattedMessage);
  process.exit(1);
}

function artifact(source, name) {
  const item = output.contracts[source][name];
  return {
    abi: item.abi,
    bytecode: "0x" + item.evm.bytecode.object,
  };
}

const capsuleArtifact = artifact(
  "contracts/CareQuestCapsule.sol",
  "CareQuestCapsule"
);
const auditArtifact = artifact(
  "contracts/CareQuestAuditAnchor.sol",
  "CareQuestAuditAnchor"
);
const hospitalCapsuleArtifact = artifact(
  "contracts/CareQuestHospitalCapsules.sol",
  "CareQuestHospitalCapsules"
);

const rpcUrl =
  process.env.CAREQUEST_EVM_RPC_URL || "http://127.0.0.1:8545";
const provider = new ethers.JsonRpcProvider(rpcUrl);
const signer = await provider.getSigner(0);
const admin = await signer.getAddress();

const capsuleFactory = new ethers.ContractFactory(
  capsuleArtifact.abi,
  capsuleArtifact.bytecode,
  signer
);
const capsule = await capsuleFactory.deploy(admin);
await capsule.waitForDeployment();

const hospitalCapsuleFactory = new ethers.ContractFactory(
  hospitalCapsuleArtifact.abi,
  hospitalCapsuleArtifact.bytecode,
  signer
);
const hospitalCapsule = await hospitalCapsuleFactory.deploy(admin);
await hospitalCapsule.waitForDeployment();

const auditFactory = new ethers.ContractFactory(
  auditArtifact.abi,
  auditArtifact.bytecode,
  signer
);
const audit = await auditFactory.deploy(admin);
await audit.waitForDeployment();

const network = await provider.getNetwork();
const deployment = {
  network: "carequest-local-evm",
  chainId: Number(network.chainId),
  rpcUrl,
  admin,
  capsuleAddress: await capsule.getAddress(),
  hospitalCapsuleAddress: await hospitalCapsule.getAddress(),
  auditAddress: await audit.getAddress(),
  capsuleAbi: capsuleArtifact.abi,
  hospitalCapsuleAbi: hospitalCapsuleArtifact.abi,
  auditAbi: auditArtifact.abi,
  deployedAt: new Date().toISOString(),
};

fs.writeFileSync(
  path.join(RUNTIME, "deployment.json"),
  JSON.stringify(deployment, null, 2)
);

console.log("CareQuest contracts deployed");
console.log("Legacy CAP:", deployment.capsuleAddress);
console.log("Hospital Capsules:", deployment.hospitalCapsuleAddress);
console.log("Audit:", deployment.auditAddress);
