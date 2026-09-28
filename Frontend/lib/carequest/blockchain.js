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

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Blockchain bridge request failed");
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

export async function blockchainHealth() {
  try {
    const response = await fetch(bridgeUrl("/health"), { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, ...data };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}
