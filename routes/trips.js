import express from 'express';
const router = express.Router();

// Get all available trips
router.get('/', async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('trips')
      .select(`
        *,
        routes (
          origin,
          destination,
          distance_km,
          duration_minutes
        )
      `)
      .gt('available_seats', 0)
      .gte('departure_time', new Date().toISOString());

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search trips by origin and destination
router.get('/search', async (req, res) => {
  const { origin, destination, date } = req.query;
  
  try {
    const { data, error } = await req.supabase
      .from('trips')
      .select(`
        *,
        routes!inner (
          origin,
          destination,
          distance_km,
          duration_minutes
        )
      `)
      .eq('routes.origin', origin)
      .eq('routes.destination', destination)
    //   .gte('departure_time', date || new Date().toISOString())
      .gt('available_seats', 0);

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;