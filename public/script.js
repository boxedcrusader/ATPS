const API_BASE = "http://localhost:3000/api";

// Search for trips
document.getElementById("searchForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const origin = document.getElementById("origin").value;
  const destination = document.getElementById("destination").value;
  const date = document.getElementById("date").value;

  await searchTrips(origin, destination, date);
});

// Display trips
function displayTrips(trips) {
  const container = document.getElementById("tripsContainer");

  if (trips.length === 0) {
    container.innerHTML =
      '<div class="error">No trips found for this route.</div>';
    return;
  }

  container.innerHTML = trips
    .map(
      (trip) => `
                <div class="trip-card">
                    <div class="trip-header">
                        <div class="route">${trip.routes.origin} → ${
        trip.routes.destination
      }</div>
                        <div class="price">₦${trip.price_per_seat.toLocaleString()}</div>
                    </div>
                    
                    <div class="trip-details">
                        <div class="detail-item">
                            <div class="detail-label">Departure</div>
                            <div class="detail-value">${formatDateTime(
                              trip.departure_time
                            )}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Arrival</div>
                            <div class="detail-value">${formatDateTime(
                              trip.arrival_time
                            )}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Available Seats</div>
                            <div class="detail-value">${trip.available_seats}/${
        trip.total_seats
      }</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Duration</div>
                            <div class="detail-value">${Math.floor(
                              trip.routes.duration_minutes / 60
                            )}h ${trip.routes.duration_minutes % 60}m</div>
                        </div>
                    </div>
                    
                    <div class="booking-form hidden" id="bookingForm${trip.id}">
                        <h3 style="color: #f1c40f; margin-bottom: 15px;">Book This Trip</h3>
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Passenger Name</label>
                                <input type="text" id="name${
                                  trip.id
                                }" placeholder="Full name" required>
                            </div>
                            <div class="form-group">
                                <label>Phone Number</label>
                                <input type="tel" id="phone${
                                  trip.id
                                }" placeholder="080XXXXXXXX" required>
                            </div>
                            <div class="form-group">
                                <label>Number of Seats</label>
                                <select id="seats${trip.id}" required>
                                    ${Array.from(
                                      {
                                        length: Math.min(
                                          trip.available_seats,
                                          5
                                        ),
                                      },
                                      (_, i) =>
                                        `<option value="${i + 1}">${
                                          i + 1
                                        } seat${i > 0 ? "s" : ""}</option>`
                                    ).join("")}
                                </select>
                            </div>
                            <div class="form-group" style="align-self: end;">
                                <button class="btn" onclick="bookTrip(${
                                  trip.id
                                })">
                                    Book Now
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <button class="btn" onclick="toggleBookingForm(${
                      trip.id
                    })" style="margin-top: 15px;">
                        Book This Trip
                    </button>
                </div>
            `
    )
    .join("");
}

// Toggle booking form
function toggleBookingForm(tripId) {
  const form = document.getElementById(`bookingForm${tripId}`);
  form.classList.toggle("hidden");
}

// Book a trip
async function bookTrip(tripId) {
  const name = document.getElementById(`name${tripId}`).value;
  const phone = document.getElementById(`phone${tripId}`).value;
  const seats = document.getElementById(`seats${tripId}`).value;

  if (!name || !phone) {
    alert("Please fill in all required fields");
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        trip_id: tripId,
        seats_booked: parseInt(seats),
        passenger_name: name,
        passenger_phone: phone,
      }),
    });

    const result = await response.json();
    console.log("Booking response:", result);

    if (response.ok) {
      alert(
        `Booking successful! Total amount: ₦${result.total_amount.toLocaleString()}`
      );

      // Clear the form
      document.getElementById(`name${tripId}`).value = "";
      document.getElementById(`phone${tripId}`).value = "";
      toggleBookingForm(tripId);

      // Refresh trips by re-searching with current form values
      const origin = document.getElementById("origin").value;
      const destination = document.getElementById("destination").value;
      const date = document.getElementById("date").value;

      if (origin && destination) {
        await searchTrips(origin, destination, date);
      }
    } else {
      alert("Booking failed: " + result.error);
    }
  } catch (error) {
    console.error("Network error:", error);
    alert("Error creating booking. Please try again.");
  }
}

// Extract search logic to reusable function
async function searchTrips(origin, destination, date) {
  const container = document.getElementById("tripsContainer");
  container.innerHTML = '<div class="loading">Searching for trips...</div>';

  try {
    const params = new URLSearchParams({ origin, destination });
    if (date) params.append("date", date + "T00:00:00");

    const response = await fetch(`${API_BASE}/trips/search?${params}`);
    const trips = await response.json();

    displayTrips(trips);
  } catch (error) {
    container.innerHTML =
      '<div class="error">Error searching for trips. Please try again.</div>';
  }
}

// Load bookings
async function loadBookings() {
  const container = document.getElementById("bookingsContainer");
  container.innerHTML = '<div class="loading">Loading bookings...</div>';

  try {
    const response = await fetch(`${API_BASE}/bookings`);
    const bookings = await response.json();

    displayBookings(bookings);
  } catch (error) {
    container.innerHTML =
      '<div class="error">Error loading bookings. Please try again.</div>';
  }
}

// Display bookings
function displayBookings(bookings) {
  const container = document.getElementById("bookingsContainer");

  if (bookings.length === 0) {
    container.innerHTML = '<div class="loading">No bookings found.</div>';
    return;
  }

  container.innerHTML = bookings
    .map(
      (booking) => `
                <div class="booking-card">
                    <div class="booking-header">
                        <div class="booking-id">Booking #${booking.id}</div>
                        <div class="status confirmed">${
                          booking.booking_status
                        }</div>
                    </div>
                    
                    <div class="trip-details">
                        <div class="detail-item">
                            <div class="detail-label">Route</div>
                            <div class="detail-value">${
                              booking.trips.routes.origin
                            } → ${booking.trips.routes.destination}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Passenger</div>
                            <div class="detail-value">${
                              booking.passenger_name
                            }</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Seats</div>
                            <div class="detail-value">${
                              booking.seats_booked
                            }</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Total Amount</div>
                            <div class="detail-value">₦${booking.total_amount.toLocaleString()}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Departure</div>
                            <div class="detail-value">${formatDateTime(
                              booking.trips.departure_time
                            )}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Booked On</div>
                            <div class="detail-value">${formatDate(
                              booking.created_at
                            )}</div>
                        </div>
                    </div>
                    
                    <button class="btn btn-danger" onclick="cancelBooking(${
                      booking.id
                    })" style="margin-top: 15px;">
                        Cancel Booking
                    </button>
                </div>
            `
    )
    .join("");
}

// Cancel booking
async function cancelBooking(bookingId) {
  if (!confirm("Are you sure you want to cancel this booking?")) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/bookings/${bookingId}`, {
      method: "DELETE",
    });

    const result = await response.json();

    if (response.ok) {
      alert("Booking cancelled successfully!");
      loadBookings(); // Refresh bookings
    } else {
      alert("Error cancelling booking: " + result.error);
    }
  } catch (error) {
    alert("Error cancelling booking. Please try again.");
  }
}

// Utility functions
function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB");
}

// Set minimum date to today
document.getElementById("date").min = new Date().toISOString().split("T")[0];
