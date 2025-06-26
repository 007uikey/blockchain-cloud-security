// contract-config.js
const CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"; // Replace with your actual contract address

const CONTRACT_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "string",
        "name": "userId",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "enum HealthcareRBAC.Role",
        "name": "role",
        "type": "uint8"
      }
    ],
    "name": "RoleAssigned",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "admin",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "userId",
        "type": "string"
      },
      {
        "internalType": "enum HealthcareRBAC.Role",
        "name": "role",
        "type": "uint8"
      }
    ],
    "name": "assignRole",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "userId",
        "type": "string"
      }
    ],
    "name": "getUserRole",
    "outputs": [
      {
        "internalType": "enum HealthcareRBAC.Role",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

export { CONTRACT_ADDRESS, CONTRACT_ABI };
