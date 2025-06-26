// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract HealthcareRBAC {

    // Admin address (MetaMask-based)
    address public admin;

    // Enum for different roles
    enum Role { None, Doctor, Patient, LabTechnician }

    // Mapping of user IDs (strings) to roles
    mapping(string => Role) private userRoles;

    // Event to notify when a role is assigned
    event RoleAssigned(string userId, Role role);

    // Modifier to restrict access to admin only
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    // Constructor sets the deployer as admin
    constructor() {
        admin = msg.sender;
    }

    // Admin assigns a role to a userId (like "doc123", "pat456", etc.)
    function assignRole(string memory userId, Role role) external onlyAdmin {
        require(role != Role.None, "Invalid role");
        require(userRoles[userId] == Role.None, "Role already assigned");
        userRoles[userId] = role;
        emit RoleAssigned(userId, role);
    }

    // View the role assigned to a user ID
    function getUserRole(string memory userId) external view returns (Role) {
        return userRoles[userId];
    }
}
