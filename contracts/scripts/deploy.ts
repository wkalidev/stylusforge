import { network } from "hardhat";
import { getAddress, isAddress } from "viem";

import { readConfigVariable } from "./config-variables.js";
import { deployCertificate } from "./deploy-certificate.js";

const claimSignerValue = await readConfigVariable("CLAIM_SIGNER_ADDRESS");
if (!isAddress(claimSignerValue)) {
  throw new Error("CLAIM_SIGNER_ADDRESS is not a valid address");
}
const claimSigner = getAddress(claimSignerValue);

const address = await deployCertificate(await network.create(), claimSigner);

console.log("\nAdd this to apps/web/.env.local:");
console.log(`NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=${address}`);
console.log("CLAIM_SIGNER_PRIVATE_KEY must be the private key of the claim signer address above.");
