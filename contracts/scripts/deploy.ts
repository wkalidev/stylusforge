import hre from "hardhat";

async function main() {
  console.log("Deploying StylusForgeNFT to Arbitrum Sepolia...");

  const contract = await hre.viem.deployContract("StylusForgeNFT");
  
  console.log(`StylusForgeNFT deployed to: ${contract.address}`);
  console.log(`Verify: https://sepolia.arbiscan.io/address/${contract.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});