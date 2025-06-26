const hre = require("hardhat");

async function main() {
    console.log("Deploying contract...");

    // Get the contract factory
    const HealthcareRBAC = await hre.ethers.getContractFactory("HealthcareRBAC");

    // Deploy the contract
    const myContract = await HealthcareRBAC.deploy();
    await myContract.deployed(); // Wait for deployment to finish

    console.log("HealthcareRBAC deployed:", myContract.address);
}

// Call main and handle errors
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});