import express from "express";
const authRoute = express.Router();

// Sign up
authRoute.post("/signup", async (req, res) => {
  const { email, password, full_name } = req.body;

  try {
    const { data, error } = await req.supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name },
      },
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      message: "Account created successfully",
      user: data.user,
      token: data.session.access_token,
    });
  } catch (error) {
    console.log("Signup error:", error);
    res.status(500).json({ error: "Server error during signup" });
  }
});

// Sign in
authRoute.post("/log-in", async (req, res) => {
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

    res.json({
      message: "Login successful",
      user: data.user,
      token: data.session.access_token,
    });
  } catch (error) {
    console.log("Log-in error:", error);
    res.status(500).json({ error: "Server error during signin" });
  }
});

// Get user info (protected)
authRoute.get("/user", async (req, res) => {
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

export default authRoute;
