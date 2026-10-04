import { network } from "hardhat";

const { viem, networkName } = await network.create();

const [deployer] = await viem.getWalletClients();
console.log(`Deploying StylusForgeNFT to ${networkName} with ${deployer.account.address}...`);

const nft = await viem.deployContract("StylusForgeNFT");
console.log(`StylusForgeNFT deployed to: ${nft.address}`);
