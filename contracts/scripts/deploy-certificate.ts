import type { NetworkConnection } from "hardhat/types/network";
import type { Address } from "viem";

import { loadLessons } from "./lessons.js";

/**
 * Deploys StylusForgeNFT from the first account of the connection, registers every
 * lesson of curriculum/lessons.json and sets the claim signer. Returns the contract address.
 */
export async function deployCertificate(
  { viem, networkName }: NetworkConnection,
  claimSigner: Address,
): Promise<Address> {
  const lessons = loadLessons();
  const publicClient = await viem.getPublicClient();

  const [deployer] = await viem.getWalletClients();
  console.log(`Deploying StylusForgeNFT to ${networkName} with ${deployer.account.address}...`);

  const nft = await viem.deployContract("StylusForgeNFT");
  console.log(`StylusForgeNFT deployed to: ${nft.address}`);

  for (const lesson of lessons) {
    const hash = await nft.write.addLesson([lesson.id, lesson.name, lesson.xp]);
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`Registered lesson ${lesson.id}: ${lesson.name} (${lesson.xp} XP)`);
  }

  const hash = await nft.write.setSigner([claimSigner]);
  await publicClient.waitForTransactionReceipt({ hash });
  console.log(`Claim signer set to: ${claimSigner}`);

  return nft.address;
}
