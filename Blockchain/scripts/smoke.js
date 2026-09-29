import fs from "node:fs";
import { ethers } from "ethers";
import {
  DEPLOYMENT_PATH,
  IS_LOCAL,
  NETWORK_NAME,
  RPC_URL,
  createProviderAndSigner,
  deriveChildWallet,
  resolveWalletAddress,
  sendWrite,
} from "../config.js";

const deployment = JSON.parse(fs.readFileSync(DEPLOYMENT_PATH, "utf8"));
const { provider, signer, chainId, minterAddress } =
  await createProviderAndSigner();

if (Number(deployment.chainId) !== chainId) {
  throw new Error(
    `deployment.json targets chainId ${deployment.chainId}, RPC reports ${chainId}`
  );
}

console.log("Smoke test on " + NETWORK_NAME + " (chainId " + chainId + ")");
console.log("RPC: " + RPC_URL);
console.log("Minter: " + minterAddress);

const admin = signer;

const capsule = new ethers.Contract(
  deployment.capsuleAddress,
  deployment.capsuleAbi,
  admin
);
const audit = new ethers.Contract(
  deployment.auditAddress,
  deployment.auditAbi,
  admin
);
const hospitalCapsule = deployment.hospitalCapsuleAddress
  ? new ethers.Contract(
      deployment.hospitalCapsuleAddress,
      deployment.hospitalCapsuleAbi,
      admin
    )
  : null;

/**
 * A fresh reference per run.
 *
 * The old smoke test used the fixed batchId "smoke-batch" against a chain that
 * reset to block 0 on every boot, so the contract's "batch already anchored"
 * guard never triggered. On a persistent network the same fixed ID would make
 * the SECOND run revert forever. A per-run unique reference keeps the test
 * re-runnable while still proving the anchor path end to end.
 */
const runId = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);

// On a real network the "patient" must be an address we can also sign AS, so
// the transfer-rejection check is meaningful. Derive that child from the bridge
// key. On a local node we can just use Hardhat's unlocked account 1.
let patient;
if (IS_LOCAL && !process.env.BRIDGEKEY_PRIVATE_KEY) {
  patient = await provider.getSigner(1);
} else {
  patient = deriveChildWallet(runId + ":patient", 0);
}
if (!patient) throw new Error("Could not obtain a patient signer for the smoke test");

const patientAddress = await patient.getAddress();
const otherAddress = await resolveWalletAddress({
  reference: runId + ":other",
  provider,
});

console.log("Patient wallet: " + patientAddress);
console.log("Other wallet:   " + otherAddress);

// --- CAP (legacy ERC20) ---------------------------------------------------
await sendWrite((o) => capsule.mint(patientAddress, 3, o), { provider });
if (Number(await capsule.balanceOf(patientAddress)) !== 3) {
  throw new Error("CAP mint smoke failed");
}

let transferBlocked = false;
try {
  await sendWrite(
    (o) => capsule.connect(patient).transfer(otherAddress, 1, o),
    { provider }
  );
} catch {
  transferBlocked = true;
}
if (!transferBlocked) throw new Error("CAP transfer should be blocked");

await sendWrite((o) => capsule.correctionBurn(patientAddress, 1, o), { provider });
if (Number(await capsule.balanceOf(patientAddress)) !== 2) {
  throw new Error("CAP correction burn smoke failed");
}

// --- Hospital Capsules (ERC1155) -----------------------------------------
if (hospitalCapsule) {
  await sendWrite((o) => hospitalCapsule.mint(patientAddress, 1001, 7, o), {
    provider,
  });
  await sendWrite((o) => hospitalCapsule.mint(patientAddress, 1002, 4, o), {
    provider,
  });

  if (Number(await hospitalCapsule.balanceOf(patientAddress, 1001)) !== 7) {
    throw new Error("CITY token balance smoke failed");
  }
  if (Number(await hospitalCapsule.balanceOf(patientAddress, 1002)) !== 4) {
    throw new Error("LOTUS token balance smoke failed");
  }

  let hospitalTransferBlocked = false;
  try {
    await sendWrite(
      (o) =>
        hospitalCapsule
          .connect(patient)
          .safeTransferFrom(patientAddress, otherAddress, 1001, 1, "0x", o),
      { provider }
    );
  } catch {
    hospitalTransferBlocked = true;
  }
  if (!hospitalTransferBlocked) {
    throw new Error("Hospital Capsule transfer should be blocked");
  }

  await sendWrite((o) => hospitalCapsule.correctionBurn(patientAddress, 1001, 2, o), {
    provider,
  });
  if (Number(await hospitalCapsule.balanceOf(patientAddress, 1001)) !== 5) {
    throw new Error("Hospital Capsule correction burn smoke failed");
  }
}

// --- Audit anchor ---------------------------------------------------------
const batchId = "smoke-batch-" + runId;
const root = ethers.keccak256(ethers.toUtf8Bytes("smoke-root-" + runId));
await sendWrite((o) => audit.anchor(ethers.id(batchId), root, o), { provider });
if ((await audit.roots(ethers.id(batchId))).toLowerCase() !== root.toLowerCase()) {
  throw new Error("Audit anchor smoke failed");
}

console.log("");
console.log("CareQuest contract smoke PASS");
console.log("CAP transfer blocked: yes");
console.log("CAP balance after correction: 2");
if (hospitalCapsule) {
  console.log("Hospital token 1001 balance: 5");
  console.log("Hospital token 1002 balance: 4");
  console.log("Hospital token transfer blocked: yes");
}
console.log("Audit anchor readback: confirmed");
console.log("Run id: " + runId);
