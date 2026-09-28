const DEFAULT_BRIDGE = "http://127.0.0.1:8546";

function bridgeUrl(path) {
  return (process.env.CAREQUEST_BLOCKCHAIN_BRIDGE_URL || DEFAULT_BRIDGE).replace(/\/$/, "") + path;
}

export function blockchainEnabled() {
  return process.env.CAREQUEST_BLOCKCHAIN_ENABLED === "true";
}

async function callBridge(path, body) {
  if (!blockchainEnabled()) {
    return { disabled: true };
  }

  const response = await fetch(bridgeUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    // A 200 with a non-JSON body (proxy error page, truncated response) is
    // NOT a success. Treating it as one produced durable records with an empty
    // txHash marked "anchored".
    throw new Error(
      `Blockchain bridge returned a non-JSON response (${response.status})`
    );
  }

  if (!response.ok) throw new Error(data.error || "Blockchain bridge request failed");

  // A commitment the chain already holds needs no new transaction: the bridge
  // reports the existing on-chain root instead of a fresh txHash. This is a
  // genuine success, not a missing-transaction failure.
  if (data.alreadyOnChain) {
    return data;
  }

  // Otherwise a commitment without a transaction hash was never anchored.
  if (data.txHash === "" || data.txHash === undefined || data.txHash === null) {
    throw new Error(data.error || "Blockchain bridge returned no transaction hash");
  }

  return data;
}

export async function mintCapsules({ walletAddress, amount, reference }) {
  return callBridge("/mint", { walletAddress, amount, reference });
}

export async function getBlockchainBalance(walletAddress) {
  if (!blockchainEnabled()) return { disabled: true, balance: null };
  const response = await fetch(
    bridgeUrl("/balance?walletAddress=" + encodeURIComponent(walletAddress)),
    { cache: "no-store" }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Could not read blockchain balance");
  return data;
}

export async function anchorAuditRoot({ batchId, merkleRoot }) {
  return callBridge("/anchor", { batchId, merkleRoot });
}

/**
 * Read a commitment back off the chain. This is the authoritative check: a
 * database row saying "confirmed" only proves we once received a transaction
 * hash. The local Hardhat network is in-memory and resets on restart, so a
 * stored txHash can outlive the chain that produced it. Never present an
 * anchor as on-chain without asking the chain.
 */
export async function verifyAnchorOnChain(batchId) {
  if (!blockchainEnabled()) return { disabled: true, anchored: null };
  try {
    const response = await fetch(
      bridgeUrl("/anchor?batchId=" + encodeURIComponent(batchId)),
      { cache: "no-store" }
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { anchored: null, error: data.error || "Could not read anchor" };
    }
    return { ...data, ok: true };
  } catch (error) {
    return { anchored: null, error: error.message };
  }
}

export async function blockchainHealth() {
  try {
    const response = await fetch(bridgeUrl("/health"), { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, ...data };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}
