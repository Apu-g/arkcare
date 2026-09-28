import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { ethers } from "ethers";

const ROOT = path.resolve(process.cwd());
const RUNTIME = path.join(ROOT, "runtime");
const deploymentPath = path.join(RUNTIME, "deployment.json");
const statePath = path.join(RUNTIME, "bridge-state.json");
const bridgePort = Number(
  process.env.CAREQUEST_BLOCKCHAIN_BRIDGE_PORT || 8546
);
if (!Number.isInteger(bridgePort) || bridgePort < 1024 || bridgePort > 65535) {
  throw new Error("CAREQUEST_BLOCKCHAIN_BRIDGE_PORT must be a valid TCP port");
}

if (!fs.existsSync(deploymentPath)) {
  throw new Error("Run deployment before starting the CareQuest bridge");
}

const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
const provider = new ethers.JsonRpcProvider(deployment.rpcUrl);
const signer = await provider.getSigner(0);
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

function loadState() {
  if (!fs.existsSync(statePath)) return { references: {} };
  try {
    return JSON.parse(fs.readFileSync(statePath, "utf8"));
  } catch {
    return { references: {} };
  }
}

function saveState(state) {
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

/**
 * Is a cached transaction still present on the live chain?
 *
 * The local Hardhat network is in-memory and RESETS to block 0 on every start,
 * but bridge-state.json lives on disk. Without this check, after a restart the
 * bridge replayed cached transaction hashes that no longer existed, reporting
 * anchors as "confirmed" and `duplicate: true` while the chain held no such
 * proof at all. A cached reference is only honoured when the chain still has
 * the transaction behind it.
 */
async function isReferenceLive(txHash) {
  if (!txHash || typeof txHash !== "string") return false;
  try {
    const receipt = await provider.getTransactionReceipt(txHash);
    return Boolean(receipt && receipt.status === 1);
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

function walletIndex(reference, accountCount) {
  const hash = crypto.createHash("sha256").update(String(reference)).digest();
  const available = Math.max(1, Math.min(accountCount - 1, 18));
  return 1 + (hash.readUInt32BE(0) % available);
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(
      request.url,
      "http://127.0.0.1:" + bridgePort
    );

    if (request.method === "GET" && url.pathname === "/health") {
      const blockNumber = await provider.getBlockNumber();
      return json(response, 200, {
        ok: true,
        network: deployment.network,
        chainId: deployment.chainId,
        blockNumber,
        capsuleAddress: deployment.capsuleAddress,
        hospitalCapsuleAddress: deployment.hospitalCapsuleAddress || null,
        auditAddress: deployment.auditAddress,
      });
    }

    if (request.method === "POST" && url.pathname === "/wallet") {
      const payload = await body(request);
      if (!payload.reference) return json(response, 400, { error: "reference required" });
      const accounts = await provider.send("eth_accounts", []);
      const index = walletIndex(payload.reference, accounts.length);
      return json(response, 200, {
        walletAddress: accounts[index],
        network: deployment.network,
        chainId: deployment.chainId,
      });
    }

    if (request.method === "GET" && url.pathname === "/balance") {
      const walletAddress = url.searchParams.get("walletAddress");
      if (!ethers.isAddress(walletAddress || "")) {
        return json(response, 400, { error: "valid walletAddress required" });
      }
      const balance = await capsule.balanceOf(walletAddress);
      return json(response, 200, {
        walletAddress,
        balance: Number(balance),
        network: deployment.network,
        chainId: deployment.chainId,
      });
    }

    if (request.method === "POST" && url.pathname === "/mint") {
      const payload = await body(request);
      if (!ethers.isAddress(payload.walletAddress || "")) {
        return json(response, 400, { error: "valid walletAddress required" });
      }
      const amount = Number(payload.amount);
      if (!Number.isInteger(amount) || amount <= 0 || amount > 100000) {
        return json(response, 400, { error: "positive integer amount required" });
      }
      if (!payload.reference) return json(response, 400, { error: "reference required" });

      const state = loadState();
      const cached = await liveReference(state, payload.reference);
      if (cached) {
        return json(response, 200, {
          duplicate: true,
          txHash: cached,
        });
      }

      const tx = await capsule.mint(payload.walletAddress, amount);
      const receipt = await tx.wait();
      state.references[payload.reference] = receipt.hash;
      saveState(state);
      return json(response, 200, {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        amount,
        walletAddress: payload.walletAddress,
        network: deployment.network,
        chainId: deployment.chainId,
      });
    }

    if (request.method === "POST" && url.pathname === "/burn") {
      const payload = await body(request);
      if (!ethers.isAddress(payload.walletAddress || "")) {
        return json(response, 400, { error: "valid walletAddress required" });
      }
      const amount = Number(payload.amount);
      if (!Number.isInteger(amount) || amount <= 0 || amount > 100000) {
        return json(response, 400, { error: "positive integer amount required" });
      }
      if (!payload.reference) return json(response, 400, { error: "reference required" });

      const state = loadState();
      const cached = await liveReference(state, payload.reference);
      if (cached) {
        return json(response, 200, {
          duplicate: true,
          txHash: cached,
        });
      }

      const tx = await capsule.correctionBurn(payload.walletAddress, amount);
      const receipt = await tx.wait();
      state.references[payload.reference] = receipt.hash;
      saveState(state);
      return json(response, 200, {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        amount,
        walletAddress: payload.walletAddress,
        network: deployment.network,
        chainId: deployment.chainId,
      });
    }

    if (request.method === "GET" && url.pathname === "/hospital-balance") {
      if (!hospitalCapsule) {
        return json(response, 503, { error: "hospital Capsule contract not deployed" });
      }
      const walletAddress = url.searchParams.get("walletAddress");
      const tokenId = Number(url.searchParams.get("tokenId"));
      if (!ethers.isAddress(walletAddress || "")) {
        return json(response, 400, { error: "valid walletAddress required" });
      }
      if (!Number.isInteger(tokenId) || tokenId <= 0) {
        return json(response, 400, { error: "positive integer tokenId required" });
      }
      const balance = await hospitalCapsule.balanceOf(walletAddress, tokenId);
      return json(response, 200, {
        walletAddress,
        tokenId,
        balance: Number(balance),
        network: deployment.network,
        chainId: deployment.chainId,
      });
    }

    if (request.method === "POST" && url.pathname === "/hospital-mint") {
      if (!hospitalCapsule) {
        return json(response, 503, { error: "hospital Capsule contract not deployed" });
      }
      const payload = await body(request);
      const tokenId = Number(payload.tokenId);
      const amount = Number(payload.amount);
      if (!ethers.isAddress(payload.walletAddress || "")) {
        return json(response, 400, { error: "valid walletAddress required" });
      }
      if (!Number.isInteger(tokenId) || tokenId <= 0) {
        return json(response, 400, { error: "positive integer tokenId required" });
      }
      if (!Number.isInteger(amount) || amount <= 0 || amount > 100000) {
        return json(response, 400, { error: "positive integer amount required" });
      }
      if (!payload.reference) return json(response, 400, { error: "reference required" });

      const state = loadState();
      const key = "hospital-mint:" + payload.reference;
      const cached = await liveReference(state, key);
      if (cached) {
        return json(response, 200, {
          duplicate: true,
          txHash: cached,
          tokenId,
        });
      }

      const tx = await hospitalCapsule.mint(payload.walletAddress, tokenId, amount);
      const receipt = await tx.wait();
      state.references[key] = receipt.hash;
      saveState(state);
      return json(response, 200, {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        tokenId,
        amount,
        walletAddress: payload.walletAddress,
        network: deployment.network,
        chainId: deployment.chainId,
      });
    }

    if (request.method === "POST" && url.pathname === "/hospital-burn") {
      if (!hospitalCapsule) {
        return json(response, 503, { error: "hospital Capsule contract not deployed" });
      }
      const payload = await body(request);
      const tokenId = Number(payload.tokenId);
      const amount = Number(payload.amount);
      if (!ethers.isAddress(payload.walletAddress || "")) {
        return json(response, 400, { error: "valid walletAddress required" });
      }
      if (!Number.isInteger(tokenId) || tokenId <= 0) {
        return json(response, 400, { error: "positive integer tokenId required" });
      }
      if (!Number.isInteger(amount) || amount <= 0 || amount > 100000) {
        return json(response, 400, { error: "positive integer amount required" });
      }
      if (!payload.reference) return json(response, 400, { error: "reference required" });

      const state = loadState();
      const key = "hospital-burn:" + payload.reference;
      const cached = await liveReference(state, key);
      if (cached) {
        return json(response, 200, {
          duplicate: true,
          txHash: cached,
          tokenId,
        });
      }

      const tx = await hospitalCapsule.correctionBurn(
        payload.walletAddress,
        tokenId,
        amount
      );
      const receipt = await tx.wait();
      state.references[key] = receipt.hash;
      saveState(state);
      return json(response, 200, {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        tokenId,
        amount,
        walletAddress: payload.walletAddress,
        network: deployment.network,
        chainId: deployment.chainId,
      });
    }

    if (request.method === "POST" && url.pathname === "/anchor") {
      const payload = await body(request);
      if (!payload.batchId || !/^0x[0-9a-fA-F]{64}$/.test(payload.merkleRoot || "")) {
        return json(response, 400, { error: "batchId and bytes32 merkleRoot required" });
      }
      const batchKey = "anchor:" + payload.batchId;
      const state = loadState();
      const cached = await liveReference(state, batchKey);
      if (cached) {
        return json(response, 200, {
          duplicate: true,
          txHash: cached,
          network: deployment.network,
          chainId: deployment.chainId,
        });
      }

      const batchId = ethers.id(payload.batchId);
      const existingRoot = await audit.roots(batchId).catch(() => ethers.ZeroHash);
      if (existingRoot && existingRoot !== ethers.ZeroHash) {
        // The chain already holds this commitment (e.g. the local reference
        // file was pruned but the chain survived). Report it as a duplicate
        // rather than re-mining — the contract rejects a second anchor.
        return json(response, 200, {
          duplicate: true,
          alreadyOnChain: true,
          merkleRoot: existingRoot,
          network: deployment.network,
          chainId: deployment.chainId,
        });
      }

      const tx = await audit.anchor(batchId, payload.merkleRoot);
      const receipt = await tx.wait();
      state.references[batchKey] = receipt.hash;
      saveState(state);
      return json(response, 200, {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        network: deployment.network,
        chainId: deployment.chainId,
      });
    }

    // Read an anchor back off the chain. This is the authoritative check that
    // a commitment really is on-chain, rather than trusting a local file.
    if (request.method === "GET" && url.pathname === "/anchor") {
      const batchId = url.searchParams.get("batchId");
      if (!batchId) return json(response, 400, { error: "batchId required" });
      const root = await audit.roots(ethers.id(batchId)).catch(() => ethers.ZeroHash);
      return json(response, 200, {
        batchId,
        merkleRoot: root && root !== ethers.ZeroHash ? root : null,
        anchored: Boolean(root && root !== ethers.ZeroHash),
        network: deployment.network,
        chainId: deployment.chainId,
        blockNumber: await provider.getBlockNumber(),
      });
    }

    return json(response, 404, { error: "not found" });
  } catch (error) {
    console.error(error);
    return json(response, 500, { error: error.message });
  }
});

server.listen(bridgePort, "127.0.0.1", () => {
  console.log("");
  console.log("CareQuest blockchain bridge ONLINE");
  console.log("Bridge: http://127.0.0.1:" + bridgePort);
  console.log("Network:", deployment.network);
  console.log("Chain ID:", deployment.chainId);
  console.log("Legacy CAP:", deployment.capsuleAddress);
  console.log("Hospital Capsules:", deployment.hospitalCapsuleAddress || "not deployed");
  console.log("Audit:", deployment.auditAddress);
});
