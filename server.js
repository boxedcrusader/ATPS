import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import authRoute from './routes/auth.js'
import tripsRoutes from './routes/trips.js';
import bookingsRoutes from './routes/bookings.js';
import redis from './config/redisClient.js'

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
app.use(express.static("public"));

// Make supabase available to all routes
app.use((req, res, next) => {
  req.supabase = supabase;
  next();
});

app.use((req, res, next) => {
  req.redis = redis;
  next()
})

app.use('/api/auth', authRoute);
app.use('/api/trips', tripsRoutes);
app.use('/api/bookings', bookingsRoutes);

// Basic test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running with ES modules!' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});