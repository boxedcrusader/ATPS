//Driver Application
//Configuration
const CONFIG = {
  API_BASE: "http://localhost:3000/api",
  TOKEN_KEY: "token",
  MIN_PASSWORD_LENGTH: 6,
};

window.addEventListener("load", async () => {});

// Event Listeners Setup
function setupEventListeners() {
  //Login form
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  // Signup form
  const signupForm = document.getElementById("signupForm");
  if (signupForm) {
    signupForm.addEventListener("submit", handleSignup);
  }

  // Logout button
  const logoutButton = document.getElementById("logoutButton");
  if (logoutButton) {
    logoutButton.addEventListener("click");
  }

  // Refresh schedule button
  const refreshScheduleButton = document.getElementById("refreshScheduleButton");
  if (refreshScheduleButton) {
    refreshScheduleButton.addEventListener("click");
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

// Auth functions
async function handleLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  // Validation
  if (!email || !password) {
    showAlert("Please fill in all required fields", "error");
    return;
  }

  if (!validateEmail(email)) {
    showAlert("Please enter a valid email address", "error");
    return;
  }

  if (password.length < CONFIG.MIN_PASSWORD_LENGTH) {
    showAlert("Password must be at least 6 characters", "error");
    return;
  }

  const result = await apiRequest("/auth/log-in", {
    method: "POST",
    body: JSON.stringify({ email, password })
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

async function handleSignup(e) {
  e.preventDefault();
  
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;
  const fullName = document.getElementById("fullName").value.trim();

  // Validation
  if (!email || !password || !fullName) {
    showAlert("Please fill in all required fields", "error");
    return;
  }

  if (!validateEmail(email)) {
    showAlert("Please enter a valid email address", "error");
    return;
  }

  if (password.length < CONFIG.MIN_PASSWORD_LENGTH) {
    showAlert("Password must be at least 6 characters", "error");
    return;
  }

  if (fullName.length < CONFIG.MIN_NAME_LENGTH) {
    showAlert("Full name must be at least 2 characters", "error");
    return;
  }

  const result = await apiRequest("/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      full_name: fullName
    })
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