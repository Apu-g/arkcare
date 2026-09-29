import { createProviderAndSigner } from "../config.js";

try {
  const { chainId } = await createProviderAndSigner();
  console.log(chainId);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
