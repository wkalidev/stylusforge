import { hooks, network } from "hardhat";
import { configVariable } from "hardhat/config";
import { getAddress, isAddress } from "viem";

import { loadLessons } from "./lessons.js";

const LESSONS = loadLessons();

/**
 * Resolves a Hardhat configuration variable the same way the config does:
 * environment variable first, then the keystore.
 */
async function readConfigVariable(name: string): Promise<string> {
  if (process.env[name] !== undefined) {
    return process.env[name];
  }
  return hooks.runHandlerChain(
    "configurationVariables",
    "fetchValue",
    [configVariable(name)],
    async (_context, variable) => {
      throw new Error(`Configuration variable ${variable.name} is not set (environment or keystore)`);
    },
  );
}

const claimSignerValue = await readConfigVariable("CLAIM_SIGNER_ADDRESS");
if (!isAddress(claimSignerValue)) {
  throw new Error("CLAIM_SIGNER_ADDRESS is not a valid address");
}
const claimSigner = getAddress(claimSignerValue);

const { viem, networkName } = await network.create();
const publicClient = await viem.getPublicClient();

const [deployer] = await viem.getWalletClients();
console.log(`Deploying StylusForgeNFT to ${networkName} with ${deployer.account.address}...`);

const nft = await viem.deployContract("StylusForgeNFT");
console.log(`StylusForgeNFT deployed to: ${nft.address}`);

for (const lesson of LESSONS) {
  const hash = await nft.write.addLesson([lesson.id, lesson.name, lesson.xp]);
  await publicClient.waitForTransactionReceipt({ hash });
  console.log(`Registered lesson ${lesson.id}: ${lesson.name} (${lesson.xp} XP)`);
}

const hash = await nft.write.setSigner([claimSigner]);
await publicClient.waitForTransactionReceipt({ hash });
console.log(`Claim signer set to: ${claimSigner}`);

console.log("\nAdd this to apps/web/.env.local:");
console.log(`NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=${nft.address}`);
console.log("CLAIM_SIGNER_PRIVATE_KEY must be the private key of the claim signer address above.");
