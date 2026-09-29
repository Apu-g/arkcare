import { defineConfig } from "hardhat/config";

// The CareQuest contracts are compiled and deployed by scripts/deploy.js, which
// drives solc + ethers directly (see Blockchain/README.md). Hardhat is used
// only to provide the throwaway local node, and hardhat.config.js is kept
// minimal to match that.
//
// This config also adds an optional `mst` network entry. It is NOT used by
// deploy.js: the remote chain is configured with the MST_RPC_URL /
// BRIDGEKEY_PRIVATE_KEY environment variables instead (see Blockchain/.env
// example), so no key is ever committed to this file. This entry exists only so
// `npx hardhat run` / `hardhat console` can target the testnet by name when
// BRIDGEKEY_PRIVATE_KEY is present in the environment.
export default defineConfig({
  solidity: "0.8.24",
  networks: {
    hardhat: {
      hostname: "127.0.0.1",
      port: 8545,
    },
  },
});
