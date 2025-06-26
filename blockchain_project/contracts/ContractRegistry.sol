// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ContractRegistry {
    address public admin;

    struct ContractInfo {
        string name;
        address contractAddress;
        string version;
        bool isActive;
        uint256 timestamp;
        string upgradeReason;
    }

    ContractInfo[] public contracts;

    event ContractAdded(
        address indexed admin,
        string name,
        address contractAddress,
        string version,
        string reason,
        uint256 timestamp
    );

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not authorized");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function addContract(
        string memory name,
        address contractAddress,
        string memory version,
        string memory reason
    ) public onlyAdmin {
        ContractInfo memory newContract = ContractInfo({
            name: name,
            contractAddress: contractAddress,
            version: version,
            isActive: true,
            timestamp: block.timestamp,
            upgradeReason: reason
        });

        contracts.push(newContract);

        emit ContractAdded(admin, name, contractAddress, version, reason, block.timestamp);
    }

    function getAllContracts() public view returns (ContractInfo[] memory) {
        return contracts;
    }
}
