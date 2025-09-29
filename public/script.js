// Enhanced Bus Booking Application
// Configuration
const CONFIG = {
  API_BASE: "http://localhost:3000/api",
  TOKEN_KEY: "token",
  MIN_PASSWORD_LENGTH: 6,
  MIN_NAME_LENGTH: 2,
  MAX_SEATS_PER_BOOKING: 5
};

// Application state
let currentUser = null;

// Initialize application
window.addEventListener("load", async () => {
  try {
    await initializeApp();
  } catch (error) {
    console.error("App initialization error:", error);
  }
});

async function initializeApp() {
  const token = localStorage.getItem(CONFIG.TOKEN_KEY);
  
  if (token) {
    await displayUserDetails();
  } else {
    showLoginModal();
  }

  handlePaymentReturn();
  await loadRoutes();
  setupDateValidation();
  setupEventListeners();
}

// Event Listeners Setup
function setupEventListeners() {
  // Login form
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  // Signup form  
  const signupForm = document.getElementById("signupForm");
  if (signupForm) {
    signupForm.addEventListener("submit", handleSignup);
  }

  // Search form
  const searchForm = document.getElementById("searchForm");
  if (searchForm) {
    searchForm.addEventListener("submit", handleSearch);
  }

  // Logout button
  const logoutButton = document.getElementById("logoutButton");
  if (logoutButton) {
    logoutButton.addEventListener("click", handleLogout);
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

function validatePhone(phone) {
  const phoneRegex = /^[\d\s+\-()]{10,}$/;
  return phoneRegex.test(phone.trim());
}

function sanitizeHTML(str) {
  if (!str) return "";
  const temp = document.createElement("div");
  temp.textContent = str;
  return temp.innerHTML;
}

function validateBookingInputs(name, phone, seats) {
  const errors = [];
  
  if (!name || name.length < CONFIG.MIN_NAME_LENGTH) {
    errors.push("Passenger name must be at least 3 characters");
  }
  
  if (!phone || !validatePhone(phone)) {
    errors.push("Please enter a valid phone number (at least 10 digits)");
  }
  
  if (!seats || seats < 1) {
    errors.push("Please select number of seats");
  }
  
  return errors;
}

// Date Management
function setupDateValidation() {
  const dateInput = document.getElementById("date");
  if (!dateInput) return;

  const today = new Date().toISOString().split("T")[0];
  dateInput.min = today;

  dateInput.addEventListener("change", function() {
    const selectedDate = new Date(this.value);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    if (selectedDate < todayDate) {
      showAlert("Please select a future date", "error");
      this.value = "";
    }
  });
}

// API Utility Functions
function getAuthHeaders() {
  const token = localStorage.getItem(CONFIG.TOKEN_KEY);
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` })
  };
}

async function apiRequest(url, options = {}) {
  try {
    const response = await fetch(`${CONFIG.API_BASE}${url}`, {
      headers: getAuthHeaders(),
      ...options
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
  // Enhanced alert system - you can replace with a proper notification library
  if (type === "error") {
    alert(`Error: ${message}`);
  } else if (type === "success") {
    alert(`Success: ${message}`);
  } else {
    alert(message);
  }
}

// Authentication Functions
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

async function displayUserDetails() {
  const displayName = document.getElementById("display_name");
  if (!displayName) {
    console.error("Display name element not found");
    return;
  }

  const token = localStorage.getItem(CONFIG.TOKEN_KEY);
  if (!token) {
    displayName.innerHTML = "Guest";
    return;
  }

  const result = await apiRequest("/auth/user");
  
  if (result.success && result.data?.user?.user_metadata) {
    const userName = result.data.user.user_metadata.full_name || "User";
    currentUser = result.data.user.user_metadata;
    displayName.innerHTML = sanitizeHTML(userName);
  } else {
    console.error("Failed to fetch user details:", result.error);
    
    if (result.status === 401) {
      localStorage.removeItem(CONFIG.TOKEN_KEY);
      displayName.innerHTML = "Guest";
      showLoginModal();
    } else {
      displayName.innerHTML = "User";
    }
  }
}

function handleLogout(e) {
  e.preventDefault();
  
  if (confirm("Are you sure you want to log out?")) {
    localStorage.removeItem(CONFIG.TOKEN_KEY);
    currentUser = null;
    
    document.getElementById("display_name").innerHTML = "Guest";
    showLoginModal();
    
    // Clear user-specific data
    clearUserData();
    showAlert("Logged out successfully!", "success");
  }
}

function clearUserData() {
  const bookingsContainer = document.getElementById("bookingsContainer");
  if (bookingsContainer) {
    bookingsContainer.innerHTML = '<div class="loading">Click "Refresh Bookings" to view your bookings...</div>';
  }

  const tripsContainer = document.getElementById("tripsContainer");
  if (tripsContainer) {
    tripsContainer.innerHTML = '<div class="loading">Search for trips to see available options...</div>';
  }
}

// Route/Location Functions
async function loadRoutes() {
  const result = await apiRequest("/trips/locations");
  
  if (!result.success) {
    console.error("Error loading locations:", result.error);
    setLocationError();
    showAlert("Failed to load locations. Please refresh the page.", "error");
    return;
  }

  const cities = result.data;
  if (!Array.isArray(cities)) {
    console.error("Invalid data format received");
    setLocationError();
    return;
  }

  populateLocationSelects(cities);
  setupLocationValidation();
}

function populateLocationSelects(cities) {
  const originSelect = document.getElementById("origin");
  const destinationSelect = document.getElementById("destination");

  if (!originSelect || !destinationSelect) return;

  // Clear existing options
  originSelect.innerHTML = '<option value="">Select origin</option>';
  destinationSelect.innerHTML = '<option value="">Select destination</option>';

  cities.forEach(city => {
    const originOption = new Option(sanitizeHTML(city), city);
    const destinationOption = new Option(sanitizeHTML(city), city);
    
    originSelect.add(originOption);
    destinationSelect.add(destinationOption);
  });
}

function setupLocationValidation() {
  const originSelect = document.getElementById("origin");
  const destinationSelect = document.getElementById("destination");

  if (!originSelect || !destinationSelect) return;

  const validateSelection = () => {
    const origin = originSelect.value;
    const destination = destinationSelect.value;

    if (origin && destination && origin === destination) {
      showAlert("Origin and destination cannot be the same. Please select different locations.", "error");
      destinationSelect.value = "";
    }
  };

  originSelect.addEventListener("change", validateSelection);
  destinationSelect.addEventListener("change", validateSelection);
}

function setLocationError() {
  const errorMsg = '<option value="">Error loading locations</option>';
  const originSelect = document.getElementById("origin");
  const destinationSelect = document.getElementById("destination");
  
  if (originSelect) originSelect.innerHTML = errorMsg;
  if (destinationSelect) destinationSelect.innerHTML = errorMsg;
}

// Trip Search Functions
async function handleSearch(e) {
  e.preventDefault();

  const origin = document.getElementById("origin").value;
  const destination = document.getElementById("destination").value;
  const date = document.getElementById("date").value;

  if (!origin || !destination) {
    showAlert("Please select both origin and destination", "error");
    return;
  }

  if (origin === destination) {
    showAlert("Origin and destination cannot be the same", "error");
    return;
  }

  await searchTrips(origin, destination, date);
}

async function searchTrips(origin, destination, date) {
  const container = document.getElementById("tripsContainer");
  if (!container) return;

  container.innerHTML = '<div class="loading">Searching for trips...</div>';

  try {
    const params = new URLSearchParams({ origin, destination });
    if (date) {
      const selectedDate = new Date(date);
      if (isNaN(selectedDate.getTime())) {
        throw new Error("Invalid date format");
      }
      params.append("date", date + "T00:00:00");
    }

    const result = await apiRequest(`/trips/search?${params}`);
    
    if (!result.success) {
      throw new Error(result.error);
    }

    // Handle different response formats
    let trips;
    const data = result.data;
    if (Array.isArray(data)) {
      trips = data;
    } else if (data.trips && Array.isArray(data.trips)) {
      trips = data.trips;
    } else {
      throw new Error("Invalid response format - expected array of trips");
    }

    displayTrips(trips);
  } catch (error) {
    console.error("Search error:", error);
    container.innerHTML = '<div class="error">Error searching for trips. Please try again.</div>';
    showAlert("Error searching for trips. Please try again.", "error");
  }
}

function displayTrips(trips) {
  const tripsContainer = document.getElementById("tripsContainer");
  if (!tripsContainer) return;

  tripsContainer.innerHTML = "";

  if (!trips || trips.length === 0) {
    tripsContainer.innerHTML = "<p>No trips found for this search.</p>";
    return;
  }

  trips.forEach(trip => {
    const card = document.createElement("div");
    card.className = "trip-card";

    card.innerHTML = `
      <div class="trip-header">
        <div class="route">${sanitizeHTML(trip.origin || trip.routes?.origin || "Unknown")} → ${sanitizeHTML(trip.destination || trip.routes?.destination || "Unknown")}</div>
        <div class="price">₦${parseInt(trip.price || trip.price_per_seat || 0).toLocaleString()}</div>
      </div>
      
      <div class="trip-details">
        <div class="detail-item">
          <div class="detail-label">Date</div>
          <div class="detail-value">${sanitizeHTML(trip.trip_date || formatDate(trip.departure_time))}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Departure Time</div>
          <div class="detail-value">${sanitizeHTML(trip.departure_time || "Not specified")}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Available Seats</div>
          <div class="detail-value">${trip.available_seats || 0}</div>
        </div>
      </div>
      
      <div class="booking-form hidden" id="bookingForm${trip.id}">
        <h3 style="margin-bottom: 15px;">Book This Trip</h3>
        <div class="form-grid">
          <div class="form-group">
            <label>Passenger Name</label>
            <input type="text" id="name${trip.id}" placeholder="Full name" required maxlength="100" value="${sanitizeHTML(currentUser?.full_name || "")}">
          </div>
          <div class="form-group">
            <label>Phone Number</label>
            <input type="tel" id="phone${trip.id}" placeholder="080XXXXXXXX" required maxlength="20" value="${sanitizeHTML(currentUser?.phone_number || "")}">
          </div>
          <div class="form-group">
            <label>Number of Seats</label>
            <select id="seats${trip.id}" required>
              ${Array.from(
                { length: Math.min(Math.max(trip.available_seats || 0, 0), CONFIG.MAX_SEATS_PER_BOOKING) },
                (_, i) => `<option value="${i + 1}">${i + 1} seat${i > 0 ? "s" : ""}</option>`
              ).join("")}
            </select>
          </div>
          <div class="form-group">
            <button class="btn" onclick="bookTrip(${trip.id})" ${(trip.available_seats || 0) === 0 ? "disabled" : ""}>
              ${(trip.available_seats || 0) === 0 ? "Fully Booked" : "Book Now"}
            </button>
          </div>
        </div>
      </div>
      
      <button class="btn" onclick="toggleBookingForm(${trip.id})" 
              style="margin-top: 15px;" ${(trip.available_seats || 0) === 0 ? "disabled" : ""}>
        ${(trip.available_seats || 0) === 0 ? "Fully Booked" : "Book This Trip"}
      </button>
    `;

    tripsContainer.appendChild(card);
  });
}

function toggleBookingForm(tripId) {
  const form = document.getElementById(`bookingForm${tripId}`);
  if (form) {
    form.classList.toggle("hidden");
  }
}

// Booking Functions
async function bookTrip(tripId) {
  const token = localStorage.getItem(CONFIG.TOKEN_KEY);
  if (!token) {
    showAlert("Please log in to make a booking", "error");
    showLoginModal();
    return;
  }

  const nameInput = document.getElementById(`name${tripId}`);
  const phoneInput = document.getElementById(`phone${tripId}`);
  const seatsInput = document.getElementById(`seats${tripId}`);

  const name = nameInput?.value?.trim();
  const phone = phoneInput?.value?.trim();
  const seats = parseInt(seatsInput?.value);

  // Validation
  const validationErrors = validateBookingInputs(name, phone, seats);
  if (validationErrors.length > 0) {
    showAlert(validationErrors.join("\n"), "error");
    return;
  }

  const result = await apiRequest("/bookings", {
    method: "POST",
    body: JSON.stringify({
      trip_id: tripId,
      seats_booked: seats,
      passenger_name: name,
      passenger_phone: phone
    })
  });

  if (result.success) {
    const bookingId = result.data.booking_id || result.data.booking?.id;
    const totalAmount = result.data.total_amount || result.data.booking?.total_amount || 0;

    if (!bookingId) {
      showAlert("Booking created but ID not found. Please check your bookings.", "error");
      return;
    }

    const proceedToPayment = confirm(
      `Booking successful! Total amount: ₦${totalAmount.toLocaleString()}\n\nWould you like to pay now?`
    );

    if (proceedToPayment) {
      await payForBooking(bookingId);
      return;
    }

    // Clear form and refresh
    nameInput.value = "";
    phoneInput.value = "";
    toggleBookingForm(tripId);
    
    // Refresh search results
    const origin = document.getElementById("origin").value;
    const destination = document.getElementById("destination").value;
    const date = document.getElementById("date").value;
    if (origin && destination) {
      await searchTrips(origin, destination, date);
    }
  } else {
    if (result.status === 401) {
      showAlert("Please log in to make a booking", "error");
      showLoginModal();
      return;
    }
    showAlert(`Booking failed: ${result.error}`, "error");
  }
}

// Payment Functions
async function payForBooking(bookingId) {
  if (!bookingId) {
    showAlert("Invalid booking ID", "error");
    return;
  }

  const token = localStorage.getItem(CONFIG.TOKEN_KEY);
  if (!token) {
    showAlert("Please log in to make payment", "error");
    showLoginModal();
    return;
  }

  const result = await apiRequest(`/bookings/${bookingId}/pay`, {
    method: "POST"
  });

  if (result.success && result.data?.authorization_url) {
    window.location.href = result.data.authorization_url;
  } else {
    if (result.status === 401) {
      showAlert("Please log in to make payment", "error");
      showLoginModal();
      return;
    }
    showAlert(`Payment initialization failed: ${result.error}`, "error");
  }
}

function handlePaymentReturn() {
  const urlParams = new URLSearchParams(window.location.search);
  const reference = urlParams.get("reference");

  if (reference) {
    showAlert("Payment completed! Please check your bookings for confirmation.", "success");
    loadBookings();
    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

// Bookings Management
async function loadBookings() {
  const container = document.getElementById("bookingsContainer");
  if (!container) return;

  container.innerHTML = '<div class="loading">Loading bookings...</div>';

  const token = localStorage.getItem(CONFIG.TOKEN_KEY);
  if (!token) {
    container.innerHTML = '<div class="error">Please log in to view bookings.</div>';
    return;
  }

  const result = await apiRequest("/bookings");
  
  if (result.success) {
    if (!Array.isArray(result.data)) {
      container.innerHTML = '<div class="error">Invalid response format.</div>';
      return;
    }
    displayBookings(result.data);
  } else {
    if (result.status === 401) {
      container.innerHTML = '<div class="error">Please log in to view bookings.</div>';
      showLoginModal();
      return;
    }
    container.innerHTML = '<div class="error">Error loading bookings. Please try again.</div>';
  }
}

function displayBookings(bookings) {
  const container = document.getElementById("bookingsContainer");
  if (!container) return;

  if (bookings.length === 0) {
    container.innerHTML = '<div class="loading">No bookings found.</div>';
    return;
  }

  container.innerHTML = bookings.map(booking => {
    const origin = booking.trips?.routes?.origin || "Unknown";
    const destination = booking.trips?.routes?.destination || "Unknown";
    const passengerName = booking.passenger_name || "Unknown";
    const seatsBooked = booking.seats_booked || 0;
    const totalAmount = booking.total_amount || 0;
    const bookingStatus = booking.booking_status || "unknown";

    return `
      <div class="booking-card">
        <div class="booking-header">
          <div class="booking-id">Booking #${booking.id}</div>
          <div class="status ${bookingStatus}">${sanitizeHTML(bookingStatus)}</div>
        </div>
        
        <div class="trip-details">
          <div class="detail-item">
            <div class="detail-label">Route</div>
            <div class="detail-value">${sanitizeHTML(origin)} → ${sanitizeHTML(destination)}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Passenger</div>
            <div class="detail-value">${sanitizeHTML(passengerName)}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Seats</div>
            <div class="detail-value">${seatsBooked}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Total Amount</div>
            <div class="detail-value">₦${totalAmount.toLocaleString()}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Departure</div>
            <div class="detail-value">${formatDateTime(booking.trips?.departure_time)}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Booked On</div>
            <div class="detail-value">${formatDate(booking.created_at)}</div>
          </div>
        </div>
        
        <div style="margin-top: 15px; display: flex; gap: 10px; flex-wrap: wrap;">
          ${bookingStatus === "pending" ? `<button class="btn" onclick="payForBooking(${booking.id})">Pay Now</button>` : ""}
          ${bookingStatus !== "cancelled" ? `<button class="btn btn-danger" onclick="cancelBooking(${booking.id})">Cancel Booking</button>` : ""}
        </div>
      </div>
    `;
  }).join("");
}

async function cancelBooking(bookingId) {
  if (!confirm("Are you sure you want to cancel this booking?")) {
    return;
  }

  if (!bookingId) {
    showAlert("Invalid booking ID", "error");
    return;
  }

  const token = localStorage.getItem(CONFIG.TOKEN_KEY);
  if (!token) {
    showAlert("Please log in to cancel booking", "error");
    showLoginModal();
    return;
  }

  const result = await apiRequest(`/bookings/${bookingId}`, {
    method: "DELETE"
  });

  if (result.success) {
    showAlert("Booking cancelled successfully!", "success");
    loadBookings();
  } else {
    if (result.status === 401) {
      showAlert("Please log in to cancel booking", "error");
      showLoginModal();
      return;
    }
    showAlert(`Error cancelling booking: ${result.error}`, "error");
  }
}

// Utility Functions
function formatDateTime(dateString) {
  if (!dateString) return "Not specified";

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid date";

    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit", 
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "Invalid date";
  }
}

function formatDate(dateString) {
  if (!dateString) return "Not specified";

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid date";

    return date.toLocaleDateString("en-GB");
  } catch {
    return "Invalid date";
  }
}