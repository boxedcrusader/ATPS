import express from "express";
import axios from "axios";
import requireAuth from "../middleware/auth.js";

const router = express.Router();

// Get all bookings
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const cacheKey = `bookings:all:${userId}`;

    // Check cache
    const cached = await req.redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached)); // Return consistent format
    }

    // Query database
    const { data, error } = await req.supabase
      .from("bookings")
      .select(
        `
        *,
        trips (
          *,
          routes (
            origin,
            destination,
            duration_minutes
          )
        )
      `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false }); // Most recent first

    if (error) throw error;

    // Cache the result
    try {
      await req.redis.set(cacheKey, JSON.stringify(data || []), "EX", 300);
    } catch (cacheError) {
      console.error("Cache set failed:", cacheError);
    }

    res.json(data || []);
  } catch (error) {
    console.error("Get bookings error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new booking
router.post("/", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { trip_id, seats_booked, passenger_name, passenger_phone } = req.body;

  // Proper validation
  if (!trip_id || !seats_booked || !passenger_name || !passenger_phone) {
    return res.status(400).json({ error: "All fields are required" });
  }

  if (seats_booked < 1 || seats_booked > 5) {
    return res.status(400).json({ error: "Seats must be between 1 and 5" });
  }

  try {
    // Check trip availability
    const { data: trip, error: tripError } = await req.supabase
      .from("trips")
      .select("*")
      .eq("id", trip_id)
      .single();

    if (tripError) {
      return res.status(404).json({ error: "Trip not found" });
    }

    if (trip.available_seats < seats_booked) {
      return res.status(400).json({
        error: "Not enough seats available",
        available: trip.available_seats,
        requested: seats_booked,
      });
    }

    const total_amount = trip.price_per_seat * seats_booked;

    // Create booking with atomic seat update
    const { data: booking, error: bookingError } = await req.supabase
      .from("bookings")
      .insert({
        trip_id,
        seats_booked,
        total_amount,
        passenger_name,
        passenger_phone,
        user_id: userId,
        booking_status: "pending",
      })
      .select()
      .single();

    if (bookingError) throw bookingError;

    // Atomic seat update with optimistic locking
    const { data: updatedTrip, error: updateError } = await req.supabase
      .from("trips")
      .update({
        available_seats: trip.available_seats - seats_booked,
      })
      .eq("id", trip_id)
      .eq("available_seats", trip.available_seats) // Prevent race condition
      .select()
      .single();

    if (updateError || !updatedTrip) {
      // Rollback: Delete the booking if seat update failed
      await req.supabase.from("bookings").delete().eq("id", booking.id);
      return res.status(409).json({
        error: "Seats no longer available. Please try again.",
      });
    }

    // Invalidate relevant caches
    try {
      await req.redis.del("trips:all");
      await req.redis.del(`bookings:all:${userId}`);
    } catch (cacheError) {
      console.error("Cache invalidation failed:", cacheError);
    }

    res.status(201).json({
      message: "Booking created successfully",
      booking_id: booking.id,
      booking,
      total_amount,
    });
  } catch (error) {
    console.error("Booking creation error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get booking by ID
router.get("/:id", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const bookingId = req.params.id;

  const cacheKey = `booking:${userId}:${bookingId}`;
  try {
    const cached = await req.redis.get(cacheKey);
    if (cached) {
      return res.json({ source: "cache", bookings: JSON.parse(cached) });
    }
    const { data, error } = await req.supabase
      .from("bookings")
      .select(
        `
        *,
        trips (
          *,
          routes (
            origin,
            destination,
            distance_km,
            duration_minutes
          )
        )
      `
      )
      .eq("id", bookingId)
      .eq("user_id", userId)
      .single();

    if (error) throw error;

    try {
      await req.redis.set(cacheKey, JSON.stringify(data), "EX", 300);
    } catch (cacheError) {
      console.error("Cache set failed:", cacheError);
    }

    res.json({ source: "database", booking: data });
  } catch (error) {
    res.status(404).json({ error: "Booking not found" });
  }
});

// Cancel a booking
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const bookingId = req.params.id;

    // Get booking with current trip data
    const { data: booking, error: bookingError } = await req.supabase
      .from("bookings")
      .select("*, trips(*)")
      .eq("id", bookingId)
      .eq("user_id", userId)
      .single();

    if (bookingError) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Check if booking can be cancelled
    if (booking.booking_status === "cancelled") {
      return res.status(400).json({ error: "Booking already cancelled" });
    }

    // Atomic seat restoration using RPC
    const { error: updateError } = await req.supabase.rpc("restore_seats", {
      trip_id: booking.trip_id,
      seats: booking.seats_booked,
    });

    if (updateError) throw updateError;

    // Mark booking as cancelled (soft delete)
    const { error: cancelError } = await req.supabase
      .from("bookings")
      .update({ is_cancelled: true })
      .eq("id", bookingId);

    if (cancelError) throw cancelError;

    // Invalidate relevant caches
    try {
      await req.redis.del(`booking:${userId}:${bookingId}`);
      await req.redis.del(`bookings:all:${userId}`);
      await req.redis.del("trips:all");
    } catch (cacheError) {
      console.error("Cache invalidation failed:", cacheError);
    }

    res.json({
      message: "Booking cancelled successfully",
      seats_restored: booking.seats_booked,
    });
  } catch (error) {
    console.error("Cancel booking error:", error);
    res.status(500).json({ error: error.message });
  }
});


//Initialize payment
router.post("/:id/pay", requireAuth, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userId = req.user.id;

    // Input validation
    if (!bookingId || isNaN(bookingId)) {
      return res.status(400).json({ error: "Invalid booking ID" });
    }

    // Get booking with authorization check
    const { data: booking, error: bookingError } = await req.supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .eq("user_id", userId)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Business logic validation
    if (booking.booking_status === "confirmed") {
      return res.status(400).json({ error: "Booking already paid" });
    }

    if (booking.booking_status === "cancelled") {
      return res.status(400).json({ error: "Cannot pay for cancelled booking" });
    }

    if (booking.total_amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    // Check if payment already exists for this booking
    const { data: existingPayment } = await req.supabase
      .from("payments")
      .select("*")
      .eq("booking_id", booking.id)
      .eq("status", "pending")
      .single();

    if (existingPayment) {
      return res.status(400).json({ 
        error: "Payment already in progress",
        reference: existingPayment.paystack_reference 
      });
    }

    const userEmail = req.user.email;

    // Initialize transaction with Paystack
    let paystackResponse;
    try {
      paystackResponse = await axios.post(
        "https://api.paystack.co/transaction/initialize",
        {
          email: userEmail,
          amount: Math.round(booking.total_amount * 100), // Convert to kobo
          metadata: {
            booking_id: booking.id,
            passenger_name: booking.passenger_name,
            user_id: userId
          },
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 10000 // 10 second timeout
        }
      );
    } catch (paystackError) {
      console.error("Paystack API error:", paystackError.response?.data || paystackError.message);
      return res.status(500).json({ 
        error: "Payment service temporarily unavailable. Please try again." 
      });
    }

    const paystackData = paystackResponse.data.data;

    // Save payment record in database
    const { error: paymentError } = await req.supabase
      .from("payments")
      .insert({
        booking_id: booking.id,
        paystack_reference: paystackData.reference,
        amount: booking.total_amount,
        status: "pending",
        raw_response: paystackData,
      });

    if (paymentError) {
      console.error("Payment record creation failed:", paymentError);
      return res.status(500).json({ error: "Failed to create payment record" });
    }

    // Optional: Invalidate user's booking cache since payment is now in progress
    try {
      await req.redis.del(`bookings:all:${userId}`);
      await req.redis.del(`booking:${userId}:${bookingId}`);
    } catch (cacheError) {
      console.error("Cache invalidation failed:", cacheError);
      // Don't fail the request for cache errors
    }

    res.json({
      authorization_url: paystackData.authorization_url,
      reference: paystackData.reference,
      amount: booking.total_amount
    });

  } catch (error) {
    console.error("Payment initialization error:", error);
    res.status(500).json({ error: "Failed to initialize payment" });
  }
});

//Connect to paystack webhook
router.post("/paystackwebhook", express.json(), async (req, res) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;

    // Verify signature
    const crypto = await import("crypto");
    const hash = crypto
      .createHmac("sha512", secret)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (hash !== req.headers["x-paystack-signature"]) {
      console.error("Invalid webhook signature");
      return res.status(400).json({ error: "Invalid signature" });
    }

    const event = req.body;

    if (event.event === "charge.success") {
      const reference = event.data.reference;

      // Verify with Paystack API
      const verifyResp = await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },
          timeout: 10000
        }
      );

      const verification = verifyResp.data.data;

      if (verification.status === "success") {
        // Update payment record
        const { data: payment, error: paymentError } = await req.supabase
          .from("payments")
          .update({
            status: "success",
            paid_at: new Date(verification.paid_at),
            channel: verification.channel,
            raw_response: verification,
          })
          .eq("paystack_reference", reference)
          .select("booking_id")
          .single();

        if (paymentError) {
          console.error("Failed to update payment:", paymentError);
          return res.status(200).send(); // Still return 200 for webhook
        }

        if (payment && payment.booking_id) {
          // Update booking status
          const { error: bookingError } = await req.supabase
            .from("bookings")
            .update({ booking_status: "confirmed" })
            .eq("id", payment.booking_id);

          if (bookingError) {
            console.error("Failed to confirm booking:", bookingError);
          } else {
            // Invalidate relevant caches after successful payment
            try {
              // Get user_id for cache invalidation
              const { data: booking } = await req.supabase
                .from("bookings")
                .select("user_id")
                .eq("id", payment.booking_id)
                .single();

              if (booking) {
                await req.redis.del(`bookings:all:${booking.user_id}`);
                await req.redis.del(`booking:${booking.user_id}:${payment.booking_id}`);
              }
            } catch (cacheError) {
              console.error("Cache invalidation failed:", cacheError);
            }
          }
        }
      } else {
        // Payment verification failed
        const { error } = await req.supabase
          .from("payments")
          .update({
            status: "failed",
            raw_response: verification,
          })
          .eq("paystack_reference", reference);

        if (error) {
          console.error("Failed to update failed payment:", error);
        }
      }
    }

    res.status(200).send();
  } catch (error) {
    console.error("Webhook processing error:", error);
    res.status(200).send(); // Always return 200 to prevent Paystack retries
  }
});

export default router;
