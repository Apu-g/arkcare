import fs from "node:fs";
import path from "node:path";
import { ethers } from "ethers";

const ROOT = path.resolve(process.cwd());
const deployment = JSON.parse(
  fs.readFileSync(path.join(ROOT, "runtime", "deployment.json"), "utf8")
);
const provider = new ethers.JsonRpcProvider(deployment.rpcUrl);
const admin = await provider.getSigner(0);
const patient = await provider.getSigner(1);
const other = await provider.getSigner(2);
const patientAddress = await patient.getAddress();
const otherAddress = await other.getAddress();

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
const hospitalCapsule = new ethers.Contract(
  deployment.hospitalCapsuleAddress,
  deployment.hospitalCapsuleAbi,
  admin
);

let tx = await capsule.mint(patientAddress, 3);
await tx.wait();
if (Number(await capsule.balanceOf(patientAddress)) !== 3) {
  throw new Error("CAP mint smoke failed");
}

let transferBlocked = false;
try {
  tx = await capsule.connect(patient).transfer(otherAddress, 1);
  await tx.wait();
} catch {
  transferBlocked = true;
}
if (!transferBlocked) throw new Error("CAP transfer should be blocked");

tx = await capsule.correctionBurn(patientAddress, 1);
await tx.wait();
if (Number(await capsule.balanceOf(patientAddress)) !== 2) {
  throw new Error("CAP correction burn smoke failed");
}

tx = await hospitalCapsule.mint(patientAddress, 1001, 7);
await tx.wait();
tx = await hospitalCapsule.mint(patientAddress, 1002, 4);
await tx.wait();

if (Number(await hospitalCapsule.balanceOf(patientAddress, 1001)) !== 7) {
  throw new Error("CITY token balance smoke failed");
}
if (Number(await hospitalCapsule.balanceOf(patientAddress, 1002)) !== 4) {
  throw new Error("LOTUS token balance smoke failed");
}

let hospitalTransferBlocked = false;
try {
  tx = await hospitalCapsule
    .connect(patient)
    .safeTransferFrom(patientAddress, otherAddress, 1001, 1, "0x");
  await tx.wait();
} catch {
  hospitalTransferBlocked = true;
}
if (!hospitalTransferBlocked) {
  throw new Error("Hospital Capsule transfer should be blocked");
}

tx = await hospitalCapsule.correctionBurn(patientAddress, 1001, 2);
await tx.wait();
if (Number(await hospitalCapsule.balanceOf(patientAddress, 1001)) !== 5) {
  throw new Error("Hospital Capsule correction burn smoke failed");
}

const batchId = ethers.id("smoke-batch");
const root = ethers.keccak256(ethers.toUtf8Bytes("smoke-root"));
tx = await audit.anchor(batchId, root);
await tx.wait();
if ((await audit.roots(batchId)).toLowerCase() !== root.toLowerCase()) {
  throw new Error("Audit anchor smoke failed");
}

console.log("CareQuest contract smoke PASS");
console.log("CAP transfer blocked: yes");
console.log("CAP balance after correction:", 2);
console.log("Hospital token 1001 balance:", 5);
console.log("Hospital token 1002 balance:", 4);
console.log("Hospital token transfer blocked: yes");
