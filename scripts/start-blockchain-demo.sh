#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHAIN_DIR="$ROOT/Blockchain"
RUNTIME="$CHAIN_DIR/runtime"

cd "$CHAIN_DIR"

echo "==============================================="
echo "       CareQuest Free Local Blockchain"
echo "==============================================="
echo

command -v node >/dev/null 2>&1 || {
  echo "Node.js is required."
  exit 1
}
command -v npm >/dev/null 2>&1 || {
  echo "npm is required."
  exit 1
}

if [[ ! -d node_modules ]]; then
  echo "Installing local blockchain dependencies..."
  npm install
fi

# Load Blockchain/.env if present (MST_RPC_URL, BRIDGEKEY_PRIVATE_KEY, ...).
# Real exported environment variables always win.
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
  echo "Loaded Blockchain/.env"
fi

CHAIN_RPC="${MST_RPC_URL:-${CAREQUEST_EVM_RPC_URL:-http://127.0.0.1:8545}}"
IS_REMOTE=0
if [[ "$CHAIN_RPC" != *"127.0.0.1"* && "$CHAIN_RPC" != *"localhost"* ]]; then
  IS_REMOTE=1
fi

mkdir -p "$RUNTIME"

# Only wipe the runtime dir for the throwaway local chain. On a real network the
# contracts live forever, so deleting deployment.json would orphan them and
# force a needless redeploy.
if [[ "$IS_REMOTE" -eq 0 ]]; then
  rm -rf "$RUNTIME"
  mkdir -p "$RUNTIME"
fi

cleanup() {
  if [[ -n "${EVM_PID:-}" ]]; then
    kill "$EVM_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

if [[ "$IS_REMOTE" -eq 1 ]]; then
  if [[ -z "${BRIDGEKEY_PRIVATE_KEY:-}" ]]; then
    echo "ERROR: MST_RPC_URL points at a remote network but BRIDGEKEY_PRIVATE_KEY is unset."
    echo "       Add it to Blockchain/.env and make sure that account is funded."
    exit 1
  fi
  echo "Using remote EVM: $CHAIN_RPC"
  echo "Skipping local Hardhat node."
else
  echo "Starting local EVM at 127.0.0.1:8545..."
  npx hardhat node --hostname 127.0.0.1 --port 8545   >"$RUNTIME/hardhat.log" 2>&1 &
  EVM_PID=$!
fi

node scripts/wait-for-rpc.js

if [[ -f runtime/deployment.json ]] && [[ "$IS_REMOTE" -eq 1 ]]; then
  # A real network persists, so reuse the existing deployment instead of
  # spending gas on a second identical copy.
  if node -e '
    const fs=require("fs");
    const d=JSON.parse(fs.readFileSync("runtime/deployment.json","utf8"));
    process.exit(Number(d.chainId)===Number(process.argv[1])?0:1);
  ' "$(node scripts/print-chain-id.js)"; then
    echo "Contracts already deployed on this chain; skipping deploy."
  else
    echo "Deployment is for a different chain; redeploying."
    node scripts/deploy.js
  fi
else
  echo "Deploying CareQuest contracts..."
  node scripts/deploy.js
fi

echo
echo "Running contract smoke test..."
node scripts/smoke.js

echo
echo "==============================================="
echo "CareQuest blockchain ready"
if [[ "$IS_REMOTE" -eq 1 ]]; then
  echo "RPC:    $CHAIN_RPC (remote)"
else
  echo "RPC:    http://127.0.0.1:8545 (local, in-memory)"
fi
echo "Bridge: http://127.0.0.1:8546"
echo
if [[ "$IS_REMOTE" -eq 1 ]]; then
  echo "REAL NETWORK: transactions cost real testnet gas and are irreversible."
  echo "CITY/LOTUS hospital Capsules use independent token IDs."
else
  echo "No faucet. No MetaMask. No paid RPC. No real gas."
  echo "CITY/LOTUS hospital Capsules use independent token IDs."
fi
echo "Keep this terminal open during the demo."
echo "==============================================="
echo

node bridge-server.js
