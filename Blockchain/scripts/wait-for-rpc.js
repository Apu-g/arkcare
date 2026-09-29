import { RPC_URL, IS_LOCAL, NETWORK_NAME, EXPECTED_CHAIN_ID } from "../config.js";

const DEADLINE_MS = Number(process.env.CAREQUEST_RPC_TIMEOUT_MS || 90_000);
const started = Date.now();

async function probe() {
  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "eth_chainId", params: [], id: 1 }),
  });
  if (!response.ok) throw new Error("HTTP " + response.status);
  const data = await response.json();
  if (!data?.result) throw new Error("no result in " + JSON.stringify(data));
  return Number(data.result);
}

if (!IS_LOCAL) {
  console.log("Using remote chain: " + NETWORK_NAME);
  console.log("RPC: " + RPC_URL);
}

let chainId = null;
let lastError = null;

while (Date.now() - started < DEADLINE_MS) {
  try {
    chainId = await probe();
    lastError = null;
    break;
  } catch (error) {
    lastError = error;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

if (chainId === null) {
  console.error("RPC did not become ready at " + RPC_URL);
  if (lastError) console.error("Last error: " + lastError.message);
  process.exit(1);
}

console.log("RPC ready: chainId " + chainId);

if (EXPECTED_CHAIN_ID !== null && chainId !== EXPECTED_CHAIN_ID) {
  console.error(
    "Refusing to continue: expected chainId " +
      EXPECTED_CHAIN_ID +
      " but " +
      RPC_URL +
      " reports " +
      chainId
  );
  process.exit(1);
}
