//import { CONTRACT_ADDRESS, CONTRACT_ABI } from './contract-config.js';
document.addEventListener("DOMContentLoaded", () => {
  const registerSection = document.getElementById("registerSection");
  const loginSection = document.getElementById("loginSection");
  const dashboardSection = document.getElementById("dashboardSection");
  const adminControls = document.getElementById("adminControls");

  const switchToLogin = document.getElementById("switchToLogin");
  const switchToRegister = document.getElementById("switchToRegister");

  switchToLogin.onclick = () => {
    registerSection.style.display = "none";
    loginSection.style.display = "block";
  };
  switchToRegister.onclick = () => {
    loginSection.style.display = "none";
    registerSection.style.display = "block";
  };

  document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const res = await fetch("http://127.0.0.1:5000/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    alert(data.message);
    if (data.message === "User registered successfully") {
      registerSection.style.display = "none";
      loginSection.style.display = "block";
    }
  });

  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("loginUsername").value;
    const password = document.getElementById("loginPassword").value;

    const res = await fetch("http://127.0.0.1:5000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: 'include', 
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    alert(data.message);
    if (data.message === "Login successful") {
      localStorage.setItem("user_id", data.user_id);
      localStorage.setItem("username", username);
      localStorage.setItem("doctor_id", data.user_id);
      loadDashboard();
    }
  });

  document.getElementById("connectAdmin").addEventListener("click", async () => {
    if (typeof window.ethereum !== "undefined") {
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      const adminAddress = accounts[0];
      localStorage.setItem("user_id", adminAddress);
      localStorage.setItem("username", "Admin");
      localStorage.setItem("role", "admin");
      loadDashboard();
    } else {
      alert("Please install MetaMask to login as admin.");
    }
  });

  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.clear();
    location.reload();
  });

  document.getElementById("assignRoleBtn").addEventListener("click", async () => {
    const targetUser = document.getElementById("targetUserId").value.trim();
    const role = parseInt(document.getElementById("roleSelect").value);
  
    if (!targetUser || isNaN(role) || role < 1 || role > 3) {
      alert("⚠️ Please enter a valid user ID and select a role.");
      return;
    }
  
    try {
      await ethereum.request({ method: "eth_requestAccounts" });
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
  
      const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; 
      const contractABI = [
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
  
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
  
      // Check current MetaMask account vs contract admin
      const admin = await contract.admin();
      const current = await signer.getAddress();
  
      if (admin.toLowerCase() !== current.toLowerCase()) {
        alert("❌ Only the Admin can assign roles. Connect with the admin wallet.");
        return;
      }
  
      // Assign role
      const tx = await contract.assignRole(targetUser, role);
      await tx.wait();

      //Create audit trail entry
      await fetch("http://localhost:5000/create_audit_log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            user_id: targetUser,  
            action: `Role ${role} assigned by Admin`
        })
      });

    localStorage.removeItem("role");
    alert("✅ Role assigned successfully. Reloading dashboard...");
    location.reload();

    
      // Verify role assignment
      const assigned = await contract.getUserRole(targetUser);
      if (parseInt(assigned) === role) {
        alert(`✅ Role assigned successfully to ${targetUser} (Role: ${role})`);
      } else {
        alert("⚠️ Transaction complete, but role not confirmed. Please verify manually.");
      }
  
    } catch (err) {
      console.error("❌ Error assigning role:", err);
      const message = err?.data?.message || err?.error?.message || err?.message || "Unknown error";
      alert("Role assignment failed: " + message);
    }
  });
  
  });


  const CONTRACT_MANAGER_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"; // <-- paste your deployed ContractManager address
  const CONTRACT_MANAGER_ABI = [
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "admin",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "name",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "contractAddress",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "version",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "reason",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        }
      ],
      "name": "ContractAdded",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "name",
          "type": "string"
        },
        {
          "internalType": "address",
          "name": "contractAddress",
          "type": "address"
        },
        {
          "internalType": "string",
          "name": "version",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "reason",
          "type": "string"
        }
      ],
      "name": "addContract",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
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
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "contracts",
      "outputs": [
        {
          "internalType": "string",
          "name": "name",
          "type": "string"
        },
        {
          "internalType": "address",
          "name": "contractAddress",
          "type": "address"
        },
        {
          "internalType": "string",
          "name": "version",
          "type": "string"
        },
        {
          "internalType": "bool",
          "name": "isActive",
          "type": "bool"
        },
        {
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "upgradeReason",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getAllContracts",
      "outputs": [
        {
          "components": [
            {
              "internalType": "string",
              "name": "name",
              "type": "string"
            },
            {
              "internalType": "address",
              "name": "contractAddress",
              "type": "address"
            },
            {
              "internalType": "string",
              "name": "version",
              "type": "string"
            },
            {
              "internalType": "bool",
              "name": "isActive",
              "type": "bool"
            },
            {
              "internalType": "uint256",
              "name": "timestamp",
              "type": "uint256"
            },
            {
              "internalType": "string",
              "name": "upgradeReason",
              "type": "string"
            }
          ],
          "internalType": "struct ContractRegistry.ContractInfo[]",
          "name": "",
          "type": "tuple[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ];

  async function registerContract() {
    const contractName = document.getElementById("contractName").value;
    const contractAddress = document.getElementById("contractAddress").value;

    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }

     const provider = new ethers.providers.Web3Provider(window.ethereum);
     await provider.send("eth_requestAccounts", []);
     const signer = provider.getSigner();

     const contractManager = new ethers.Contract(CONTRACT_MANAGER_ADDRESS, CONTRACT_MANAGER_ABI, signer);

    try {
      const tx = await contractManager.registerContract(contractName, contractAddress);
      await tx.wait();
      document.getElementById("status").innerText = "✅ Contract registered successfully!";
    } catch (error) {
      console.error(error);
      document.getElementById("status").innerText = "❌ Error: " + error.message;
    }
  }

  async function getRegisteredContract() {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();

    const contractManager = new ethers.Contract(CONTRACT_MANAGER_ADDRESS, CONTRACT_MANAGER_ABI, signer);

    const queryName = document.getElementById("queryName").value;

    try {
      const address = await contractManager.getContract(queryName);
      document.getElementById("contractResult").innerText = `📍 Registered Address: ${address}`;
    } catch (err) {
      console.error(err);
      document.getElementById("contractResult").innerText = "❌ Error: " + err.message;
    }
  }


  async function loadDashboard() {
    const username = localStorage.getItem("username");
    const userId = localStorage.getItem("user_id");
    
    registerSection.style.display = "none";
    loginSection.style.display = "none";
    dashboardSection.style.display = "block";
    document.getElementById("displayUsername").textContent = username;
    document.getElementById("displayUserId").textContent = userId;
  
    if (username === "Admin") {
      
      adminControls.style.display = "block";
  
      document.getElementById("doctorDashboard").style.display = "none";
      document.getElementById("patientDashboard").style.display = "none";
  
      document.getElementById("displayRole").textContent = "Admin";
    } else {
      try {
        await ethereum.request({ method: "eth_requestAccounts" });
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; 
        const contractABI = [ 
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
        const contract = new ethers.Contract(contractAddress, contractABI, provider);
        
        const role = await contract.getUserRole(userId); 
        let roleText = "";
        if (role == 1) {
          roleText = "Doctor";
  
          // Show Doctor Dashboard
          document.getElementById("doctorDashboard").style.display = "block";
          document.getElementById("patientDashboard").style.display = "none";
          adminControls.style.display = "none";
  
        } else if (role == 2) {
          roleText = "Patient";
  
          // Show Patient Dashboard
          document.getElementById("patientDashboard").style.display = "block";
          document.getElementById("doctorDashboard").style.display = "none";
          adminControls.style.display = "none";
  
        } else {
          roleText = "Unassigned";
  
          // Hide both dashboards if no role assigned
          document.getElementById("doctorDashboard").style.display = "none";
          document.getElementById("patientDashboard").style.display = "none";
          adminControls.style.display = "none";
        }
  
        localStorage.setItem("role", roleText);
        document.getElementById("displayRole").textContent = roleText;
  
        Toastify({
          text: `✅ Role fetched: ${roleText}`,
          duration: 3000,
          gravity: "top",
          position: "right",
          backgroundColor: "#4CAF50"
        }).showToast();
        
      } catch (err) {
        console.error("Error fetching role:", err);
        alert("❌ Error fetching role. Please connect MetaMask properly.");
      }

      
    }
  }
  
  
  async function refreshMyRole() {
    const userId = localStorage.getItem('user_id');
  
    if (!userId) {
      alert('User ID not found! Please login again.');
      return;
    }
  
    try {
      const response = await fetch('http://localhost:5000/get_user_role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId }),
      });
  
      const data = await response.json();
      
      if (response.ok) {
        if (data.role !== undefined && data.role !== null) {
          document.getElementById('displayRole').innerText = ` ${data.role}`;
        } else {
          document.getElementById('displayRole').innerText = 'Role not assigned yet.';
        }
      } else {
        alert(data.error || 'Failed to fetch role.');
      }
    } catch (error) {
      console.error('Error fetching role:', error);
      alert('Error connecting to server!');
    }
}

async function uploadReport() {
  const patientId = document.getElementById("patientIdInput").value.trim();
  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];
  const diagnosis = document.getElementById("diagnosisInput").value.trim();
  const treatment = document.getElementById("treatmentInput").value.trim();

  const statusElement = document.getElementById("uploadStatus");
  statusElement.innerText = ""; // Clear previous status

  if (!patientId) {
    alert("Please enter a patient ID.");
    return;
  }

  const formData = new FormData();
  formData.append("patient_id", patientId);
  formData.append('doctor_id', localStorage.getItem('user_id')); 

  if (file) {
    formData.append("file", file);
  } else if (diagnosis && treatment) {
    formData.append("diagnosis", diagnosis);
    formData.append("treatment", treatment);
  } else {
    alert("Please select a file or enter diagnosis and treatment.");
    return;
  }

  // Show a loading status
  statusElement.innerText = "Uploading... Please wait.";

  try {
    const response = await fetch("http://127.0.0.1:5000/upload", {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    if (response.ok) {
      statusElement.innerText = data.message || "Report uploaded successfully!";
    } else {
      statusElement.innerText = data.error || "Error uploading report!";
    }
  } catch (error) {
    console.error("Error uploading report:", error);
    statusElement.innerText = "Error uploading report!";
  }
}
  
  if (localStorage.getItem("user_id")) {
    loadDashboard();
  }
