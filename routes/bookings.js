import express from 'express';
const router = express.Router();

// Get all bookings (for testing - in real app you'd filter by user)
router.get('/', async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('bookings')
      .select(`
        *,
        trips (
          *,
          routes (
            origin,
            destination
          )
        )
      `);

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new booking
router.post('/', async (req, res) => {
  const { 
    trip_id, 
    seats_booked, 
    passenger_name, 
    passenger_phone 
  } = req.body;

  try {
    // First, check if trip exists and has enough seats
    const { data: trip, error: tripError } = await req.supabase
      .from('trips')
      .select('*')
      .eq('id', trip_id)
      .single();

    if (tripError) throw new Error('Trip not found');
    
    if (trip.available_seats < seats_booked) {
      return res.status(400).json({ 
        error: 'Not enough seats available',
        available: trip.available_seats,
        requested: seats_booked
      });
    }

    // Calculate total amount
    const total_amount = trip.price_per_seat * seats_booked;

    // Create the booking
    const { data: booking, error: bookingError } = await req.supabase
      .from('bookings')
      .insert({
        trip_id,
        seats_booked,
        total_amount,
        passenger_name,
        passenger_phone,
        user_id: null // We'll add auth later
      })
      .select()
      .single();

    if (bookingError) throw bookingError;

    // Update available seats
    const { error: updateError } = await req.supabase
      .from('trips')
      .update({ 
        available_seats: trip.available_seats - seats_booked 
      })
      .eq('id', trip_id);

    if (updateError) throw updateError;

    res.status(201).json({
      message: 'Booking created successfully',
      booking,
      total_amount
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get booking by ID
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('bookings')
      .select(`
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
      `)
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    res.status(404).json({ error: 'Booking not found' });
  }
});

// Cancel a booking
router.delete('/:id', async (req, res) => {
  try {
    // Get the booking first
    const { data: booking, error: bookingError } = await req.supabase
      .from('bookings')
      .select('*, trips(*)')
      .eq('id', req.params.id)
      .single();

    if (bookingError) throw new Error('Booking not found');

    // Restore the seats to the trip
    const { error: updateError } = await req.supabase
      .from('trips')
      .update({ 
        available_seats: booking.trips.available_seats + booking.seats_booked 
      })
      .eq('id', booking.trip_id);

    if (updateError) throw updateError;

    // Delete the booking
    const { error: deleteError } = await req.supabase
      .from('bookings')
      .delete()
      .eq('id', req.params.id);

    if (deleteError) throw deleteError;

    res.json({
      message: 'Booking cancelled successfully',
      seats_restored: booking.seats_booked
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;