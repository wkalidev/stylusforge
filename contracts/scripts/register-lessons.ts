import { network } from "hardhat";
import { getAddress, isAddress } from "viem";

import { readConfigVariable } from "./config-variables.js";
import { planLessonRegistration } from "./lesson-registration.js";
import { loadLessons } from "./lessons.js";

/**
 * Registers the available lessons of curriculum/lessons.json that are not on-chain yet:
 *   pnpm register:lessons --network arbitrumSepolia
 * Reads NFT_CONTRACT_ADDRESS (environment, then keystore) and must run from the contract
 * owner's account. Refuses to run when a registered lesson differs from the curriculum.
 */
const addressValue = await readConfigVariable("NFT_CONTRACT_ADDRESS");
if (!isAddress(addressValue)) {
  throw new Error("NFT_CONTRACT_ADDRESS is not a valid address");
}

const { viem, networkName } = await network.create();
const publicClient = await viem.getPublicClient();
const [account] = await viem.getWalletClients();
const nft = await viem.getContractAt("StylusForgeNFT", getAddress(addressValue));

const owner = await nft.read.owner();
if (getAddress(owner) !== getAddress(account.account.address)) {
  throw new Error(`The connected account ${account.account.address} is not the contract owner (${owner})`);
}

const onChain = await Promise.all(
  (await nft.read.getLessonIds()).map(async (id) => {
    const [name, xp] = await nft.read.lessons([id]);
    return { id, name, xp };
  }),
);
const plan = planLessonRegistration(loadLessons(), onChain);

console.log(`${plan.unchanged.length} lesson(s) already registered on ${networkName}.`);
if (plan.toAdd.length === 0) {
  console.log("Nothing to register.");
}
for (const lesson of plan.toAdd) {
  const hash = await nft.write.addLesson([lesson.id, lesson.name, lesson.xp]);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error(`Registering lesson ${lesson.id} reverted (transaction ${hash}); later lessons were not sent`);
  }
  console.log(`Registered lesson ${lesson.id}: ${lesson.name} (${lesson.xp} XP)`);
}
