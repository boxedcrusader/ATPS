import express from "express";
import requireAuth from "../middleware/auth.js";
const router = express.Router();

// Sign up
router.post("/auth/signup", async (req, res) => {
  const { email, password, full_name, license_number } = req.body;

  try {
    // Create user in Supabase Auth
    const { data, error } = await req.supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name }, // metadata
      },
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const userId = data.user.id; // Auth user id

    // Add record to drivers table
    const { error: driverError } = await req.supabase.from("drivers").insert([
      {
        user_id: userId,
        full_name,
        license_number,
        status: "offline",
      },
    ]);

    if (driverError) {
      return res.status(400).json({ error: driverError.message });
    }

    res.status(201).json({
      message: "Account created successfully",
      user: data.user,
      token: data.session?.access_token,
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Server error during signup" });
  }
});

// Log in
router.post("/auth/log-in", async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data, error } = await req.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!data.session) {
      return res.status(400).json({ error: "No session created" });
    }

    // Fetch driver profile
    const { data: driverData } = await req.supabase
      .from("drivers")
      .select("*")
      .eq("user_id", data.user.id)
      .single();

    res.json({
      message: "Login successful",
      user: data.user,
      driver: driverData, // Include driver info
      token: data.session.access_token,
    });
  } catch (error) {
    console.log("Log-in error:", error);
    res.status(500).json({ error: "Server error during signin" });
  }
});

// Get user info (protected)
router.get("/user", requireAuth,async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "No authorization header" });
    }

    const token = authHeader.replace("Bearer ", "");

    const {
      data: { user },
      error,
    } = await req.supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    res.json({ user });
  } catch (error) {
    console.log("Get user error:", error);
    res.status(401).json({ error: "Authentication failed" });
  }
});
export default router;
