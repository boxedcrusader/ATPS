import express from "express";
import axios from "axios";

const router = express.Router();

// Get all bookings
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const { data, error } = await req.supabase
      .from("bookings")
      .select(
        `
        *,
        trips (
          *,
          routes (
            origin,
            destination
          )
        )
      `
      )
      .eq("user_id", userId);

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new booking
router.post("/", async (req, res) => {
  const userId = req.user.id;
  const { trip_id, seats_booked, passenger_name, passenger_phone } = req.body;

  try {
    // First, check if trip exists and has enough seats
    const { data: trip, error: tripError } = await req.supabase
      .from("trips")
      .select("*")
      .eq("id", trip_id)
      .single();

    if (tripError) throw new Error("Trip not found");

    if (trip.available_seats < seats_booked) {
      return res.status(400).json({
        error: "Not enough seats available",
        available: trip.available_seats,
        requested: seats_booked,
      });
    }

    // Calculate total amount
    const total_amount = trip.price_per_seat * seats_booked;

    // Create the booking
    const { data: booking, error: bookingError } = await req.supabase
      .from("bookings")
      .insert({
        trip_id,
        seats_booked,
        total_amount: total_amount,
        passenger_name,
        user_id: userId,
        booking_status: "pending",
      })
      .select()
      .single();

    if (bookingError) throw bookingError;

    // Update available seats
    const { error: updateError } = await req.supabase
      .from("trips")
      .update({
        available_seats: trip.available_seats - seats_booked,
      })
      .eq("id", trip_id);

    if (updateError) throw updateError;

    res.status(201).json({
      message: "Booking created successfully",
      booking_id: booking.id,
      booking,
      total_amount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get booking by ID
router.get("/:id", async (req, res) => {
  try {
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
      .eq("id", req.params.id)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(404).json({ error: "Booking not found" });
  }
});

// Cancel a booking
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    // Get the booking first
    const { data: booking, error: bookingError } = await req.supabase
      .from("bookings")
      .select("*, trips(*)")
      .eq("id", req.params.id)
      .eq("user_id", userId)
      .single();

    if (bookingError) throw new Error("Booking not found");

    // Restore the seats to the trip
    const { error: updateError } = await req.supabase
      .from("trips")
      .update({
        available_seats: booking.trips.available_seats + booking.seats_booked,
      })
      .eq("id", booking.trip_id);

    if (updateError) throw updateError;

    // Delete the booking
    const { error: deleteError } = await req.supabase
      .from("bookings")
      .delete()
      .eq("id", req.params.id);

    if (deleteError) throw deleteError;

    res.json({
      message: "Booking cancelled successfully",
      seats_restored: booking.seats_booked,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//Initialize payment
router.post("/:id/pay", async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userId = req.user.id;

        console.log('=== VALUES DEBUG ===');
    console.log('Booking ID:', bookingId, 'Type:', typeof bookingId);
    console.log('User ID:', userId, 'Type:', typeof userId);
    console.log('req.params:', req.params);
    console.log('req.user:', req.user);

    //Get booking
    const { data: booking, error: bookingError } = await req.supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .eq("user_id", userId)
      .single();

    console.log("Booking query result:", { booking, bookingError });

    if (bookingError || !booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Use email from JWT token
    const userEmail = req.user.email;

    //Initialize transaction with paystack
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: userEmail,
        amount: booking.total_amount * 100, //kobo amount
        metadata: {
          booking_id: booking.id,
          passenger_name: booking.passenger_name,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    // FIX 1: Use response.data instead of undefined paystackData
    const paystackData = response.data.data;

    //Save payment in supabase
    await req.supabase.from("payments").insert({
      booking_id: booking.id,
      paystack_reference: paystackData.reference,
      amount: booking.total_amount,
      status: "pending",
      raw_response: paystackData,
    });

    // FIX 2: Use paystackData (now properly defined) instead of undefined variable
    res.json({
      authorization_url: paystackData.authorization_url,
      reference: paystackData.reference,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to initialize payment" });
  }
});

//Connect to paystack webhook
router.post("/paystackwebhook", express.json(), async (req, res) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;

    //Verify signature
    const crypto = await import("crypto");
    const hash = crypto
      .createHmac("sha512", secret)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (hash !== req.headers["x-paystack-signature"]) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    const event = req.body;

    // FIX 3: Declare verification variable outside the if block
    let verification;

    if (event.event === "charge.success") {
      const reference = event.data.reference;

      //recheck with paystack API
      const verifyResp = await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },
        }
      );

      verification = verifyResp.data.data;

      if (verification.status === "success") {
        //payment is really successful
        const { data: payment } = await req.supabase
          .from("payments")
          .update({
            status: "success",
            paid_at: new Date(verification.paid_at),
            channel: verification.channel, // FIX 4: Corrected typo from "chaqnnel" to "channel"
            raw_response: verification,
          })
          .eq("paystack_reference", reference)
          .select("booking_id")
          .single();

        if (payment) {
          await req.supabase
            .from("bookings")
            .update({ booking_status: "confirmed" })
            .eq("id", payment.booking_id);
        }
      } else {
        //payment failed
        await req.supabase
          .from("payments")
          .update({
            status: "failed",
            raw_response: verification,
          })
          .eq("paystack_reference", reference);
      }
    }

    // FIX 5: Added .send() to complete the response
    res.status(200).send();
  } catch (error) {
    console.error("Webhook error:", error.message);

    res.sendStatus(200); //so paystack does not endlessly retry
  }
});

export default router;
