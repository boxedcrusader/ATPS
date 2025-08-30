 -- Routes table
CREATE TABLE routes (
  id SERIAL PRIMARY KEY,
  origin VARCHAR(100) NOT NULL,
  destination VARCHAR(100) NOT NULL,
  distance_km INTEGER,
  duration_minutes INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Trips table  
CREATE TABLE trips (
  id SERIAL PRIMARY KEY,
  route_id INTEGER REFERENCES routes(id),
  departure_time TIMESTAMP NOT NULL,
  arrival_time TIMESTAMP NOT NULL,
  vehicle_type VARCHAR(50) DEFAULT 'bus',
  total_seats INTEGER NOT NULL,
  available_seats INTEGER NOT NULL,
  price_per_seat DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Bookings table
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  trip_id INTEGER REFERENCES trips(id),
  seats_booked INTEGER NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  booking_status VARCHAR(20) DEFAULT 'confirmed',
  passenger_name VARCHAR(100) NOT NULL,
  passenger_phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);