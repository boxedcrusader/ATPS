import express from "express";
const router = express.Router();

// Get all available trips
router.get("/", async (req, res) => {
  try {
    const cacheKey = "trips:all";

    const cached = await req.redis.get(cacheKey);
    if (cached) {
      return res.json({ source: "cache", trips: JSON.parse(cached) });
    }

    const { data, error } = await req.supabase
      .from("trips")
      .select(
        `
        *,
        routes (
          origin,
          destination,
          distance_km,
          duration_minutes
        )
      `
      )
      .gt("available_seats", 0)
      .gte("departure_time", new Date().toISOString());

    if (error) throw error;
    try {
      await req.redis.set(cacheKey, JSON.stringify(data), "EX", 60);
    } catch (cacheError) {
      console.error("Cache set failed:", cacheError);
    }

    res.json({ source: "database", trips: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search trips by origin and destination
router.get("/search", async (req, res) => {
  const { origin, destination, date } = req.query;

  if (!origin || !destination) {
    return res
      .status(400)
      .json({ error: "Origin and destination are required" });
  }

  const cacheKey = `trips:search:${origin}:${destination}:${date || "any"}`;

  try {
    // Check cache first
    const cached = await req.redis.get(cacheKey);
    if (cached) {
      const cachedData = JSON.parse(cached);
      return res.json({ source: "cache", trips: cachedData });
    }

    // Build query with better error handling
    let query = req.supabase
      .from("trips")
      .select(`
        *,
        routes!inner (
          origin,
          destination,
          distance_km,
          duration_minutes
        )
      `)
      .gt("available_seats", 0)
      .order('departure_time', { ascending: true });

    // Add case-insensitive filtering for origin/destination
    query = query
      .ilike("routes.origin", origin.trim())
      .ilike("routes.destination", destination.trim());

    // Add date filter if provided
    if (date) {
      const searchDate = new Date(date);
      if (!isNaN(searchDate.getTime())) {
        query = query.gte("departure_time", searchDate.toISOString());
      }
    } else {
      // Default: only future trips
      query = query.gte("departure_time", new Date().toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase query error:", error);
      throw error;
    }

    // Always return results, even if empty
    const trips = data || [];
    
    // Only cache non-empty successful results
    if (trips.length > 0) {
      try {
        await req.redis.set(cacheKey, JSON.stringify(trips), "EX", 300);
      } catch (cacheError) {
        console.error("Cache set failed:", cacheError);
        // Don't fail the request if caching fails
      }
    }

    res.json({ 
      source: "database", 
      trips,
      count: trips.length,
      filters: { origin, destination, date }
    });

  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ 
      error: "Failed to search trips",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

//Get all locations
router.get("/locations", async (req, res) => {
  try {
    const cacheKey = "trips:locations";

    // Check cache first
    const cached = await req.redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached)); // Return cached cities array directly
    }

    // Query database
    const { data, error } = await req.supabase
      .from("routes")
      .select("origin, destination");

    if (error) throw error;

    // Process data to get unique cities
    const cities = new Set();
    data.forEach((route) => {
      cities.add(route.origin);
      cities.add(route.destination);
    });

    const uniqueCities = Array.from(cities).sort();

    // Cache the processed result (unique cities)
    try {
      await req.redis.set(cacheKey, JSON.stringify(uniqueCities), "EX", 3600); // Cache for 1 hour
    } catch (cacheError) {
      console.error("Cache set failed:", cacheError);
    }

    // Send single response
    res.json(uniqueCities);
  } catch (error) {
    console.error("Get locations error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
