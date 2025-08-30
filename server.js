import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import tripsRoutes from './routes/trips.js';
import bookingsRoutes from './routes/bookings.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Make supabase available to all routes
app.use((req, res, next) => {
  req.supabase = supabase;
  next();
});

app.use('/api/trips', tripsRoutes);
app.use('/api/bookings', bookingsRoutes);

// Basic test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running with ES modules!' });
});

// Test Supabase connection
app.get('/api/test-db', async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('routes')
      .select('*')
      .limit(1);
    
    if (error) throw error;
    
    res.json({ 
      message: 'Database connected successfully!', 
      data: data 
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Database connection failed', 
      details: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});