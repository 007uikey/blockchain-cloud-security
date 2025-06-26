// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ContractManager {
    address public admin;

    struct ContractInfo {
        string name;
        address contractAddress;
        uint256 deployedAt;
        bool isActive;
    }

    ContractInfo[] public contracts;

    event ContractRegistered(string name, address contractAddress, uint256 deployedAt);
    event ContractDeactivated(uint indexed index, address contractAddress, uint256 time);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    // Register a new smart contract with a name
    function registerContract(string memory name, address contractAddress) public onlyAdmin {
        contracts.push(ContractInfo({
            name: name,
            contractAddress: contractAddress,
            deployedAt: block.timestamp,
            isActive: true
        }));

        emit ContractRegistered(name, contractAddress, block.timestamp);
    }

    // Deactivate a contract (soft delete)
    function deactivateContract(uint index) public onlyAdmin {
        require(index < contracts.length, "Invalid index");
        contracts[index].isActive = false;

        emit ContractDeactivated(index, contracts[index].contractAddress, block.timestamp);
    }

    // Get a specific contract info
    function getContract(uint index) public view returns (ContractInfo memory) {
        require(index < contracts.length, "Invalid index");
        return contracts[index];
    }

    // Return all contracts (for frontend listing)
    function getAllContracts() public view returns (ContractInfo[] memory) {
        return contracts;
    }

    // Get total count
    function getTotalContracts() public view returns (uint) {
        return contracts.length;
    }
}
