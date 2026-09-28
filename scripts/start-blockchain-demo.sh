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

rm -rf "$RUNTIME"
mkdir -p "$RUNTIME"

cleanup() {
  if [[ -n "${EVM_PID:-}" ]]; then
    kill "$EVM_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "Starting local EVM at 127.0.0.1:8545..."
npx hardhat node --hostname 127.0.0.1 --port 8545   >"$RUNTIME/hardhat.log" 2>&1 &
EVM_PID=$!

node scripts/wait-for-rpc.js

echo "Deploying CareQuest contracts..."
node scripts/deploy.js

echo
echo "Running contract smoke test..."
node scripts/smoke.js

echo
echo "==============================================="
echo "CareQuest blockchain ready"
echo "RPC:    http://127.0.0.1:8545"
echo "Bridge: http://127.0.0.1:8546"
echo
echo "No faucet. No MetaMask. No paid RPC. No real gas."
echo "CITY/LOTUS hospital Capsules use independent token IDs."
echo "Keep this terminal open during the demo."
echo "==============================================="
echo

node bridge-server.js
