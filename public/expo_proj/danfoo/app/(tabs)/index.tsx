// app/(tabs)/index.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  Platform,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { styles } from "../styles";
import config from "../config";

// Proper TypeScript interfaces
interface Route {
  origin: string;
  destination: string;
  duration_minutes: number;
}

interface Trip {
  id: number;
  routes: Route;
  departure_time: string;
  arrival_time: string;
  price_per_seat: number;
  available_seats: number;
  total_seats: number;
}

interface Booking {
  id: number;
  booking_status: "pending" | "confirmed" | "cancelled";
  passenger_name: string;
  passenger_phone: string;
  seats_booked: number;
  total_amount: number;
  created_at: string;
  trips: {
    routes: Route;
    departure_time: string;
  };
}

export default function Home() {
  const router = useRouter();

  // Form states
  const [locations, setLocations] = useState<string[]>([]);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Data states
  const [trips, setTrips] = useState<Trip[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookingInProgress, setBookingInProgress] = useState<
    Record<number, boolean>
  >({});
  const [openBookingFor, setOpenBookingFor] = useState<number | null>(null);

  // Form inputs for dynamic booking forms (object keyed by tripId)
  const [passengerName, setPassengerName] = useState<Record<number, string>>(
    {}
  );
  const [passengerPhone, setPassengerPhone] = useState<Record<number, string>>(
    {}
  );
  const [passengerSeats, setPassengerSeats] = useState<Record<number, number>>(
    {}
  );

  useEffect(() => {
    loadRoutes();

    // Fixed deep link handling
    const handleUrl = (event: { url: string }) => {
      const url = event.url;
      if (url.includes("reference=")) {
        Alert.alert("Payment", "Payment completed. Refreshing bookings...");
        loadBookings();
      }
    };

    // Fixed event listener setup
    const subscription = Linking.addEventListener("url", handleUrl);

    return () => subscription?.remove();
  }, []);

  // Helper functions
  const getStatusColor = (status: string): string => {
    switch (status) {
      case "pending":
        return config.COLORS.warning;
      case "confirmed":
        return  config.COLORS.success;
      case "cancelled":
        return  config.COLORS.danger;
      default:
        return  config.COLORS.gray;
    }
  };

  const validateDate = (text: string): boolean => {
    return /^\d{0,4}(-\d{0,2}(-\d{0,2})?)?$/.test(text);
  };

  const formatDateTime = (dateString?: string): string => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Invalid date";
    }
  };

  // API functions
  async function loadRoutes() {
    setLoadingRoutes(true);
    try {
      const res = await axios.get(`${config.API_BASE}/trips/locations`);
      setLocations(res.data || []);
    } catch (err) {
      console.error("Error loading locations:", err);
      const errorMsg =
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : "Could not load locations";
      Alert.alert("Error", errorMsg);
      setLocations([]);
    } finally {
      setLoadingRoutes(false);
    }
  }

  async function searchTrips() {
    if (!origin || !destination) {
      Alert.alert("Validation", "Please select origin and destination");
      return;
    }

    if (origin === destination) {
      Alert.alert("Validation", "Origin and destination cannot be the same");
      return;
    }

    setLoadingTrips(true);
    try {
      const params: any = { origin, destination };
      // if (date) {
      //   if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      //     Alert.alert("Validation", "Please enter date in YYYY-MM-DD format");
      //     return;
      //   }
      //   params.date = date + "T00:00:00";
      // }

      const res = await axios.get(`${config.API_BASE}/trips/search`, { params });
      setTrips(res.data || []);

      if ((res.data || []).length === 0) {
        Alert.alert("Search Results", "No trips found for this route and date");
      }
    } catch (err) {
      console.error("Search trips error:", err);
      const errorMsg =
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : "Error searching for trips. Try again.";
      Alert.alert("Error", errorMsg);
      setTrips([]);
    } finally {
      setLoadingTrips(false);
    }
  }

  function toggleBookingForm(tripId: number) {
    setOpenBookingFor((prev) => (prev === tripId ? null : tripId));

    // Initialize form data if not exists
    if (!passengerName[tripId]) {
      setPassengerName((prev) => ({ ...prev, [tripId]: "" }));
      setPassengerPhone((prev) => ({ ...prev, [tripId]: "" }));
      setPassengerSeats((prev) => ({ ...prev, [tripId]: 1 }));
    }
  }

  async function bookTrip(tripId: number) {
    const name = passengerName[tripId]?.trim();
    const phone = passengerPhone[tripId]?.trim();
    const seats = passengerSeats[tripId] || 1;

    // Validation
    if (!name || !phone) {
      Alert.alert("Validation", "Please enter passenger name and phone");
      return;
    }

    if (name.length < 2) {
      Alert.alert("Validation", "Passenger name must be at least 2 characters");
      return;
    }

    if (!/^[\d\s+\-()]+$/.test(phone) || phone.length < 10) {
      Alert.alert("Validation", "Please enter a valid phone number");
      return;
    }

    const token = await AsyncStorage.getItem("token");
    if (!token) {
      Alert.alert("Login required", "Please login to make a booking", [
        { text: "Cancel" },
        { text: "Login", onPress: () => router.push("/login") },
      ]);
      return;
    }

    setBookingInProgress((prev) => ({ ...prev, [tripId]: true }));

    try {
      const res = await axios.post(
        `${config.API_BASE}/bookings`,
        {
          trip_id: tripId,
          seats_booked: seats,
          passenger_name: name,
          passenger_phone: phone,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const result = res.data;
      const booking = result.booking || result;
      const total = result.total_amount || booking.total_amount || 0;

      Alert.alert(
        "Booking Successful",
        `Total: ₦${total.toLocaleString()}\n\nWould you like to pay now?`,
        [
          { text: "Later", style: "cancel" },
          {
            text: "Pay Now",
            onPress: () => payForBooking(booking.id),
          },
        ]
      );

      // Clear form for that trip
      setPassengerName((prev) => ({ ...prev, [tripId]: "" }));
      setPassengerPhone((prev) => ({ ...prev, [tripId]: "" }));
      setPassengerSeats((prev) => ({ ...prev, [tripId]: 1 }));
      setOpenBookingFor(null);

      // Refresh trips list to update available seats
      if (origin && destination) {
        searchTrips();
      }

      // Refresh bookings to show new booking
      loadBookings();
    } catch (err: any) {
      console.error("Booking error:", err);
      const errorMsg =
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : "Could not create booking. Please try again.";
      Alert.alert("Booking Failed", errorMsg);
    } finally {
      setBookingInProgress((prev) => ({ ...prev, [tripId]: false }));
    }
  }

  async function payForBooking(bookingId: number | string | undefined) {
    if (!bookingId) {
      Alert.alert("Payment", "Missing booking ID");
      return;
    }

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Login required", "Please login to make payment");
        return;
      }

      const res = await axios.post(
        `${config.API_BASE}/bookings/${bookingId}/pay`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const result = res.data;

      if (!result.authorization_url) {
        Alert.alert(
          "Payment",
          "Payment initialization failed - no payment URL received"
        );
        return;
      }

      // Open Paystack page in external browser
      const supported = await Linking.canOpenURL(result.authorization_url);
      if (supported) {
        await Linking.openURL(result.authorization_url);
        Alert.alert(
          "Payment",
          "Payment page opened in browser. After completing payment, return here and refresh your bookings."
        );
      } else {
        Alert.alert("Error", "Cannot open payment URL");
      }
    } catch (error) {
      console.error("Payment init error:", error);
      const errorMsg =
        axios.isAxiosError(error) && error.response?.data?.error
          ? error.response.data.error
          : "Could not initialize payment.";
      Alert.alert("Payment Error", errorMsg);
    }
  }

  async function loadBookings() {
    const token = await AsyncStorage.getItem("token");
    if (!token) {
      Alert.alert("Login Required", "Please login to view bookings", [
        { text: "Cancel" },
        { text: "Login", onPress: () => router.push("/login") },
      ]);
      return;
    }

    setLoadingBookings(true);
    try {
      const res = await axios.get(`${config.API_BASE}/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBookings(res.data || []);
    } catch (err) {
      console.error("loadBookings error:", err);
      const errorMsg =
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : "Could not load bookings.";
      Alert.alert("Error", errorMsg);
    } finally {
      setLoadingBookings(false);
    }
  }

  async function cancelBooking(bookingId: number) {
    Alert.alert(
      "Cancel Booking",
      "Are you sure you want to cancel this booking?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("token");
              await axios.delete(`${config.API_BASE}/bookings/${bookingId}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              Alert.alert("Success", "Booking cancelled successfully");
              loadBookings();
            } catch (err) {
              console.error("Cancel booking error:", err);
              const errorMsg =
                axios.isAxiosError(err) && err.response?.data?.error
                  ? err.response.data.error
                  : "Could not cancel booking.";
              Alert.alert("Error", errorMsg);
            }
          },
        },
      ]
    );
  }

  return (
    <LinearGradient
      colors={["#1a1a1a", "#2c3e50", "#1a1a1a"]}
      style={{ flex: 1 }}
    >
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }}>
        {/* Header with gradient */}
        <View style={styles.headerWrap}>
          <LinearGradient
            colors={[config.COLORS.primary, config.COLORS.primaryDark]}
            style={styles.headerInner}
          >
            <Text style={styles.title}>Danfoo</Text>
            <Text style={styles.subtitle}>
              Fast, Reliable Transport Booking
            </Text>
          </LinearGradient>
        </View>

        {/* Auth Buttons */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <TouchableOpacity
            style={styles.btn}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.btnText}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => router.push("/signup")}
          >
            <Text style={styles.btnText}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        {/* Search section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Find Your Trip</Text>

          {/* Origin Picker */}
          <View style={{ marginBottom: 8 }}>
            <Text style={{ color: config.COLORS.primary, marginBottom: 6 }}>From</Text>
            <View style={[styles.input, { padding: 0 }]}>
              <Picker
                selectedValue={origin}
                onValueChange={(v) => setOrigin(v)}
                style={{ color: "#fff" }}
                enabled={!loadingRoutes}
              >
                <Picker.Item
                  label={loadingRoutes ? "Loading..." : "Select origin"}
                  value=""
                />
                {locations.map((city) => (
                  <Picker.Item key={city} label={city} value={city} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Destination Picker */}
          <View style={{ marginBottom: 8 }}>
            <Text style={{ color: config.COLORS.primary, marginBottom: 6 }}>To</Text>
            <View style={[styles.input, { padding: 0 }]}>
              <Picker
                selectedValue={destination}
                onValueChange={(v) => setDestination(v)}
                style={{ color: "#fff" }}
                enabled={!loadingRoutes}
              >
                <Picker.Item
                  label={loadingRoutes ? "Loading..." : "Select destination"}
                  value=""
                />
                {locations.map((city) => (
                  <Picker.Item key={city} label={city} value={city} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Date Input with validation */}
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={{ color: "#fff" }}>
              {date.toISOString().split("T")[0]} {/* Shows YYYY-MM-DD format */}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  setDate(selectedDate);
                }
              }}
              minimumDate={new Date()} // Prevents selecting past dates
            />
          )}

          <TouchableOpacity
            style={[styles.btn, loadingTrips && styles.btnDisabled]}
            onPress={searchTrips}
            disabled={loadingTrips}
          >
            <Text style={styles.btnText}>
              {loadingTrips ? "Searching..." : "Search Trips"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Available trips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Trips</Text>

          {loadingTrips && (
            <Text style={styles.loadingText}>Searching for trips...</Text>
          )}

          {!loadingTrips && trips.length === 0 && (
            <Text style={styles.loadingText}>
              Search for trips to see available options
            </Text>
          )}

          {trips.map((trip: Trip) => (
            <View key={trip.id} style={styles.tripCard}>
              <View style={styles.tripHeader}>
                <Text style={styles.route}>
                  {trip.routes?.origin || "Unknown"} →{" "}
                  {trip.routes?.destination || "Unknown"}
                </Text>
                <Text style={styles.price}>
                  ₦{Number(trip.price_per_seat || 0).toLocaleString()}
                </Text>
              </View>

              <View style={{ marginBottom: 8 }}>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Departure</Text>
                    <Text style={styles.detailValue}>
                      {formatDateTime(trip.departure_time)}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Arrival</Text>
                    <Text style={styles.detailValue}>
                      {formatDateTime(trip.arrival_time)}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Seats</Text>
                    <Text style={styles.detailValue}>
                      {trip.available_seats || 0}/{trip.total_seats || 0}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Duration</Text>
                    <Text style={styles.detailValue}>
                      {Math.floor((trip.routes?.duration_minutes || 0) / 60)}h{" "}
                      {(trip.routes?.duration_minutes || 0) % 60}m
                    </Text>
                  </View>
                </View>
              </View>

              {/* Booking form toggle */}
              {openBookingFor === trip.id && (
                <View style={styles.bookingForm}>
                  <Text
                    style={{
                      color: config.COLORS.primary,
                      fontWeight: "700",
                      marginBottom: 8,
                    }}
                  >
                    Book This Trip
                  </Text>

                  <TextInput
                    placeholder="Passenger name"
                    placeholderTextColor="#aaa"
                    style={styles.input}
                    value={passengerName[trip.id] || ""}
                    onChangeText={(text) =>
                      setPassengerName((prev) => ({ ...prev, [trip.id]: text }))
                    }
                    maxLength={100}
                  />

                  <TextInput
                    placeholder="Phone number (e.g., 08012345678)"
                    placeholderTextColor="#aaa"
                    style={styles.input}
                    keyboardType="phone-pad"
                    value={passengerPhone[trip.id] || ""}
                    onChangeText={(text) =>
                      setPassengerPhone((prev) => ({
                        ...prev,
                        [trip.id]: text,
                      }))
                    }
                    maxLength={20}
                  />

                  <Text style={{ color: config.COLORS.primary, marginBottom: 6 }}>
                    Number of seats
                  </Text>
                  <View style={[styles.input, { padding: 0 }]}>
                    <Picker
                      selectedValue={passengerSeats[trip.id] || 1}
                      onValueChange={(value) =>
                        setPassengerSeats((prev) => ({
                          ...prev,
                          [trip.id]: value,
                        }))
                      }
                    >
                      {Array.from(
                        {
                          length: Math.min(
                            Math.max(trip.available_seats || 1, 1),
                            5
                          ),
                        },
                        (_, i) => i + 1
                      ).map((n) => (
                        <Picker.Item
                          key={n}
                          label={`${n} seat${n > 1 ? "s" : ""}`}
                          value={n}
                        />
                      ))}
                    </Picker>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.btn,
                      { marginTop: 8 },
                      bookingInProgress[trip.id] && styles.btnDisabled,
                    ]}
                    onPress={() => bookTrip(trip.id)}
                    disabled={bookingInProgress[trip.id]}
                  >
                    <Text style={styles.btnText}>
                      {bookingInProgress[trip.id] ? "Booking..." : "Book Now"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                style={[styles.btn, { marginTop: 10 }]}
                onPress={() => toggleBookingForm(trip.id)}
                disabled={trip.available_seats === 0}
              >
                <Text style={styles.btnText}>
                  {trip.available_seats === 0
                    ? "Fully Booked"
                    : openBookingFor === trip.id
                    ? "Close Form"
                    : "Book This Trip"}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* My Bookings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Bookings</Text>

          <TouchableOpacity
            style={[styles.btn, loadingBookings && styles.btnDisabled]}
            onPress={loadBookings}
            disabled={loadingBookings}
          >
            <Text style={styles.btnText}>
              {loadingBookings ? "Loading..." : "Refresh Bookings"}
            </Text>
          </TouchableOpacity>

          {loadingBookings ? (
            <Text style={styles.loadingText}>Loading bookings...</Text>
          ) : bookings.length === 0 ? (
            <Text style={styles.loadingText}>
              No bookings found. Press "Refresh Bookings" to check again.
            </Text>
          ) : (
            bookings.map((booking: Booking) => (
              <View key={booking.id} style={styles.bookingCard}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ color: config.COLORS.success, fontWeight: "700" }}>
                    Booking #{booking.id}
                  </Text>
                  <Text
                    style={{
                      backgroundColor: getStatusColor(booking.booking_status),
                      color: "#000",
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    {booking.booking_status.toUpperCase()}
                  </Text>
                </View>

                <Text
                  style={{ color: "#bbb", fontSize: 16, fontWeight: "600" }}
                >
                  {booking.trips?.routes?.origin || "Unknown"} →{" "}
                  {booking.trips?.routes?.destination || "Unknown"}
                </Text>

                <View style={{ marginTop: 8 }}>
                  <Text style={{ color: "#fff" }}>
                    Passenger: {booking.passenger_name}
                  </Text>
                  <Text style={{ color: "#fff" }}>
                    Phone: {booking.passenger_phone}
                  </Text>
                  <Text style={{ color: "#fff" }}>
                    Seats: {booking.seats_booked}
                  </Text>
                  <Text style={{ color: "#fff", fontWeight: "600" }}>
                    Total: ₦{Number(booking.total_amount || 0).toLocaleString()}
                  </Text>
                  <Text style={{ color: "#fff" }}>
                    Departure: {formatDateTime(booking.trips?.departure_time)}
                  </Text>
                  <Text style={{ color: "#aaa", fontSize: 12 }}>
                    Booked:{" "}
                    {new Date(booking.created_at).toLocaleDateString("en-GB")}
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    gap: 8,
                    marginTop: 12,
                    flexWrap: "wrap",
                  }}
                >
                  {booking.booking_status === "pending" && (
                    <TouchableOpacity
                      style={styles.btn}
                      onPress={() => payForBooking(booking.id)}
                    >
                      <Text style={styles.btnText}>Pay Now</Text>
                    </TouchableOpacity>
                  )}

                  {booking.booking_status !== "cancelled" && (
                    <TouchableOpacity
                      style={styles.btnDanger}
                      onPress={() => cancelBooking(booking.id)}
                    >
                      <Text style={{ color: "#fff", fontWeight: "700" }}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}
