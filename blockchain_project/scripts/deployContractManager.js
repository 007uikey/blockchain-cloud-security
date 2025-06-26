// scripts/deployContractManager.js
const hre = require("hardhat");

async function main() {
  const ContractRegistry = await hre.ethers.getContractFactory("ContractRegistry");
  const contract = await ContractRegistry.deploy();
  await contract.waitForDeployment(); // Wait for deployment completion

  console.log("Contract deployed to:", contract.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
