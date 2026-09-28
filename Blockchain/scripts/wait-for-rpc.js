const url = "http://127.0.0.1:8545";

for (let attempt = 0; attempt < 60; attempt += 1) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_chainId",
        params: [],
      }),
    });
    if (response.ok) {
      console.log("Local EVM ready");
      process.exit(0);
    }
  } catch {}
  await new Promise((resolve) => setTimeout(resolve, 500));
}

console.error("Timed out waiting for local EVM");
process.exit(1);
