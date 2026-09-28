import hre from "hardhat";

async function main() {
  console.log("Deploying StylusForgeNFT to Arbitrum Sepolia...");

  const [deployer] = await hre.viem.getWalletClients();
  console.log("Deploying with:", deployer.account.address);

  const contract = await hre.viem.deployContract("StylusForgeNFT");

  console.log(`✅ StylusForgeNFT deployed to: ${contract.address}`);
  console.log(`🔍 Verify: https://sepolia.arbiscan.io/address/${contract.address}`);
  
  // Sauvegarde l'adresse
  console.log("\nAdd this to your .env.local:");
  console.log(`NEXT_PUBLIC_NFT_CONTRACT=${contract.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});