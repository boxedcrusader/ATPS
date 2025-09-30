// Driver Application
// Configuration
const CONFIG = {
  API_BASE: "http://localhost:3000/api",
  TOKEN_KEY: "token",
  MIN_PASSWORD_LENGTH: 6,
};

// Application state
let currentUser = null;
let isOnline = false; // driver online/offline status

// Initialize application
window.addEventListener("load", async () => {
  await initializeApp();
  setupEventListeners();
});

async function initializeApp() {
  const token = localStorage.getItem(CONFIG.TOKEN_KEY);

  if (token) {
    await displayUserDetails();
  } else {
    showLoginModal();
  }
}

// Event Listeners Setup
function setupEventListeners() {
  // Login form
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  // Driver login form
  const driverLoginForm = document.getElementById("driverLoginForm");
  if (driverLoginForm) {
    driverLoginForm.addEventListener("submit", handleDriverLogin);
  }

  // Signup form
  const signupForm = document.getElementById("signupForm");
  if (signupForm) {
    signupForm.addEventListener("submit", handleSignup);
  }

  // Logout button
  const logoutButton = document.getElementById("logoutButton");
  if (logoutButton) {
    logoutButton.addEventListener("click", handleLogout);
  }

  // Status toggle
  const statusToggle = document.getElementById("statusToggle");
  if (statusToggle) {
    statusToggle.addEventListener("click", toggleDriverStatus);
  }

  // Incident form
  const incidentButton = document.getElementById("incident-button");
  if (incidentButton) {
    incidentButton.addEventListener("click", reportIncident);
  }

  // Support form
  const supportButton = document.getElementById("support-button");
  if (supportButton) {
    supportButton.addEventListener("submit", contactSupport);
  }
}

// Modal Management
function toggleModal(showId, hideId = null) {
  if (hideId) {
    const hideModal = document.getElementById(hideId);
    if (hideModal) {
      hideModal.classList.add("hidden");
      hideModal.classList.remove("show");
    }
  }

  const showModal = document.getElementById(showId);
  if (showModal) {
    showModal.classList.remove("hidden");
    showModal.classList.add("show");
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove("show");
    setTimeout(() => modal.classList.add("hidden"), 300);
  }
}

function showLoginModal() {
  toggleModal("loginModal");
}

// Validation Functions
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function sanitizeHTML(str) {
  if (!str) return "";
  const temp = document.createElement("div");
  temp.textContent = str;
  return temp.innerHTML;
}

// API Utility Functions
function getAuthHeaders() {
  const token = localStorage.getItem(CONFIG.TOKEN_KEY);
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

async function apiRequest(url, options = {}) {
  try {
    const response = await fetch(`${CONFIG.API_BASE}${url}`, {
      headers: getAuthHeaders(),
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || `HTTP ${response.status}`);
    }

    return { success: true, data, status: response.status };
  } catch (error) {
    console.error(`API request failed for ${url}:`, error);
    return { success: false, error: error.message };
  }
}

// Alert/Notification System
function showAlert(message, type = "info") {
  if (type === "error") {
    alert(`Error: ${message}`);
  } else if (type === "success") {
    alert(`Success: ${message}`);
  } else {
    alert(message);
  }
}

// Auth functions
async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!email || !password) {
    showAlert("Please fill in all required fields", "error");
    return;
  }

  const result = await apiRequest("/driver/auth/log-in", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (result.success) {
    localStorage.setItem(CONFIG.TOKEN_KEY, result.data.token);
    showAlert("Login successful!", "success");
    closeModal("loginModal");
    await displayUserDetails();
    document.getElementById("loginForm").reset();
  } else {
    showAlert(result.error || "Login failed. Please try again.", "error");
  }
}

async function handleDriverLogin(e) {
  e.preventDefault();

  const email = document.getElementById("driverEmail").value.trim();
  const password = document.getElementById("driverPassword").value;
  const license = document.getElementById("driverLicense").value.trim();

  if (!email || !password || !license) {
    showAlert("Please fill in all fields", "error");
    return;
  }

  const result = await apiRequest("/driver/auth/log-in", {
    method: "POST",
    body: JSON.stringify({ email, password, license_number: license }),
  });

  if (result.success) {
    localStorage.setItem(CONFIG.TOKEN_KEY, result.data.token);
    showAlert("Driver login successful!", "success");
    closeModal("driverLoginModal");
    await displayUserDetails();
    document.getElementById("driverLoginForm").reset();
  } else {
    showAlert(result.error || "Login failed. Please try again.", "error");
  }
}

async function handleSignup(e) {
  e.preventDefault();

  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;
  const fullName = document.getElementById("fullName").value.trim();
  const license = document.getElementById("licenseNumber").value.trim();

  if (!email || !password || !fullName || !license) {
    showAlert("Please fill in all required fields", "error");
    return;
  }

  const result = await apiRequest("/driver/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      full_name: fullName,
      license_number: license,
    }),
  });

  if (result.success) {
    localStorage.setItem(CONFIG.TOKEN_KEY, result.data.token);
    showAlert("Signup successful!", "success");
    closeModal("signupModal");
    await displayUserDetails();
    document.getElementById("signupForm").reset();
  } else {
    showAlert(result.error || "Signup failed. Please try again.", "error");
  }
}

async function displayUserDetails() {
  const displayName = document.getElementById("driver_name");
  if (!displayName) return;

  const result = await apiRequest("/driver/user");

  if (result.success && result.data?.user?.user_metadata) {
    const userName = result.data.user.user_metadata.full_name || "Driver";
    currentUser = result.data.user.user_metadata;
    displayName.innerHTML = sanitizeHTML(userName);
  } else {
    displayName.innerHTML = "Guest";
  }
}

function handleLogout(e) {
  e.preventDefault();
  if (confirm("Are you sure you want to log out?")) {
    localStorage.removeItem(CONFIG.TOKEN_KEY);
    currentUser = null;
    document.getElementById("driver_name").innerHTML = "Guest";
    showLoginModal();
    showAlert("Logged out successfully!", "success");
  }
}

// Status toggle
function toggleDriverStatus() {
  const statusIndicator = document.getElementById("statusIndicator");
  const statusToggle = document.getElementById("statusToggle");
  const onlineStatus = document.getElementById("onlineStatus");

  isOnline = !isOnline;

  if (isOnline) {
    statusIndicator.style.backgroundColor = "green";
    statusToggle.innerText = "Go Offline";
    onlineStatus.innerText = "Online";
  } else {
    statusIndicator.style.backgroundColor = "red";
    statusToggle.innerText = "Go Online";
    onlineStatus.innerText = "Offline";
  }
}

// Incident Report
async function handleIncidentReport(e) {
  e.preventDefault();

  const type = document.getElementById("incidentType").value;
  const description = document.getElementById("incidentDescription").value.trim();
  const location = document.getElementById("incidentLocation").value.trim();

  if (!type || !description) {
    showAlert("Please fill in all required fields", "error");
    return;
  }

  const result = await apiRequest("/driver/reports", {
    method: "POST",
    body: JSON.stringify({ type, description, location }),
  });

  if (result.success) {
    showAlert("Incident report submitted!", "success");
    closeModal("incidentModal");
    document.getElementById("incidentForm").reset();
  } else {
    showAlert(result.error || "Failed to submit incident", "error");
  }
}


function reportIncident() {
  toggleModal("incidentModal");
}

function contactSupport() {
  showAlert("Support contact feature coming soon!", "info");
}