const hre = require("hardhat");

async function main() {
    console.log("Deploying contract...");

    // Get the contract factory
    const HealthcareRBAC = await hre.ethers.getContractFactory("HealthcareRBAC");

    // Deploy the contract and wait for deployment
    const myContract = await HealthcareRBAC.deploy();
    await myContract.waitForDeployment(); // Wait for deployment completion

    console.log("HealthcareRBAC deployed to:", myContract.target);
}

// Run the script
main().catch((error) => {
    console.error("Error during deployment:", error);
    process.exitCode = 1;
});
