import { network } from "hardhat";
import { getAddress, isAddress } from "viem";

import { readConfigVariable } from "./config-variables.js";
import { confirm } from "./confirm.js";
import { metadataUri } from "./metadata-uri.js";

/**
 * Points the certificate metadata at the deployed web app:
 *   pnpm hardhat run scripts/set-uri.ts --network arbitrumSepolia
 * Reads NFT_CONTRACT_ADDRESS and METADATA_BASE_URL (environment, then keystore) and must run
 * from the contract owner's account (DEPLOYER_PRIVATE_KEY on arbitrumSepolia).
 */
const addressValue = await readConfigVariable("NFT_CONTRACT_ADDRESS");
if (!isAddress(addressValue)) {
  throw new Error("NFT_CONTRACT_ADDRESS is not a valid address");
}
const uri = metadataUri(await readConfigVariable("METADATA_BASE_URL"));

const { viem, networkName } = await network.create();
const publicClient = await viem.getPublicClient();
const [account] = await viem.getWalletClients();
const nft = await viem.getContractAt("StylusForgeNFT", getAddress(addressValue));

const owner = await nft.read.owner();
if (getAddress(owner) !== getAddress(account.account.address)) {
  throw new Error(`The connected account ${account.account.address} is not the contract owner (${owner})`);
}

// uri(id) returns the template for every id; 1 is the first lesson.
const current = await nft.read.uri([1n]);
if (current === uri) {
  console.log(`Metadata URI on ${networkName} is already ${uri}: nothing to do.`);
} else {
  console.log(`Setting the metadata URI on ${networkName}:\n  from: ${current || "(empty)"}\n  to:   ${uri}`);
  // ERC-1155 clients replace {id} with the token id in lowercase hex, zero-padded to 64 digits
  // (the web app also accepts the decimal id).
  console.log(`  (token 1: ${uri.replace("{id}", "1".padStart(64, "0"))})`);
  if (await confirm(`Send setURI("${uri}") to ${nft.address}?`)) {
    const hash = await nft.write.setURI([uri]);
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`Done (transaction ${hash}).`);
  } else {
    console.log("Not confirmed, nothing was sent. Answer y in an interactive terminal to send it.");
    process.exitCode = 1;
  }
}
