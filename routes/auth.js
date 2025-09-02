import express from 'express';
const authRoute = express.Router();

// Test route (no auth required)
authRoute.get('/test', (req, res) => {
  res.json({ message: 'Auth routes working' });
});

// Sign up
authRoute.post('/signup', async (req, res) => {
  const { email, password, full_name } = req.body;
  
  console.log('Signup attempt:', { email, full_name });
  
  try {
    const { data, error } = await req.supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name }
      }
    });

    console.log('Signup result:', { data: !!data, error });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      message: 'Account created successfully',
      user: data.user,
      session: data.session
    });
    
  } catch (error) {
    console.log('Signup error:', error);
    res.status(500).json({ error: 'Server error during signup' });
  }
});

// Sign in  
authRoute.post('/signin', async (req, res) => {
  const { email, password } = req.body;
  
  console.log('Signin attempt:', { email });
  
  try {
    const { data, error } = await req.supabase.auth.signInWithPassword({
      email,
      password
    });

    console.log('Signin result:', { 
      user: !!data.user, 
      session: !!data.session,
      error: error?.message 
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!data.session) {
      return res.status(400).json({ error: 'No session created' });
    }

    res.json({
      message: 'Login successful',
      user: data.user,
      session: data.session
    });
    
  } catch (error) {
    console.log('Signin error:', error);
    res.status(500).json({ error: 'Server error during signin' });
  }
});

// Get user info (protected)
authRoute.get('/user', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    
    const { data: { user }, error } = await req.supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    res.json({ user });
    
  } catch (error) {
    console.log('Get user error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
});

export default authRoute;