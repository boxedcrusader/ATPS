-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.bookings (
  id integer NOT NULL DEFAULT nextval('bookings_id_seq'::regclass),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  trip_id integer,
  seats_booked integer NOT NULL,
  total_amount numeric NOT NULL,
  booking_status character varying DEFAULT 'confirmed'::character varying,
  passenger_name character varying NOT NULL,
  passenger_phone character varying,
  created_at timestamp without time zone DEFAULT now(),
  is_cancelled boolean DEFAULT false,
  CONSTRAINT bookings_pkey PRIMARY KEY (id),
  CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT bookings_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id)
);
CREATE TABLE public.drivers (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  full_name text NOT NULL,
  license_number text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'offline'::text,
  CONSTRAINT drivers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.payments (
  id integer NOT NULL DEFAULT nextval('payments_id_seq'::regclass),
  booking_id integer,
  paystack_reference character varying NOT NULL UNIQUE,
  amount numeric NOT NULL,
  currency character varying DEFAULT 'NGN'::character varying,
  status character varying DEFAULT 'pending'::character varying,
  channel character varying,
  paid_at timestamp with time zone,
  raw_response jsonb,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id)
);
CREATE TABLE public.reports (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  reported_at timestamp with time zone NOT NULL DEFAULT now(),
  trip_id integer NOT NULL,
  driver_id bigint NOT NULL,
  report_type text NOT NULL,
  description character varying NOT NULL,
  CONSTRAINT reports_pkey PRIMARY KEY (id),
  CONSTRAINT reports_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id),
  CONSTRAINT reports_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.drivers(id)
);
CREATE TABLE public.routes (
  id integer NOT NULL DEFAULT nextval('routes_id_seq'::regclass),
  origin character varying NOT NULL,
  destination character varying NOT NULL,
  distance_km integer,
  duration_minutes integer,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT routes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.trips (
  id integer NOT NULL DEFAULT nextval('trips_id_seq'::regclass),
  route_id integer,
  departure_time timestamp without time zone NOT NULL,
  arrival_time timestamp without time zone NOT NULL,
  vehicle_type character varying DEFAULT 'bus'::character varying,
  total_seats integer NOT NULL,
  available_seats integer NOT NULL,
  price_per_seat numeric NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  driver_assigned bigint,
  CONSTRAINT trips_pkey PRIMARY KEY (id),
  CONSTRAINT trips_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(id),
  CONSTRAINT trips_driver_assigned_fkey FOREIGN KEY (driver_assigned) REFERENCES public.drivers(id)
);
CREATE TABLE public.vehicle (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  vehicle_type text NOT NULL,
  vehicle_license text NOT NULL,
  driver_assigned bigint NOT NULL,
  CONSTRAINT vehicle_pkey PRIMARY KEY (id),
  CONSTRAINT vehicle_driver_assigned_fkey FOREIGN KEY (driver_assigned) REFERENCES public.drivers(id)
);
CREATE TABLE public.waitlist (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  email text,
  CONSTRAINT waitlist_pkey PRIMARY KEY (id)
);
CREATE TABLE public.wallet_transactions (
  id integer NOT NULL DEFAULT nextval('wallet_transactions_id_seq'::regclass),
  wallet_id integer,
  amount numeric,
  type character varying,
  description text,
  reference character varying,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT wallet_transactions_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id)
);
CREATE TABLE public.wallets (
  id integer NOT NULL DEFAULT nextval('wallets_id_seq'::regclass),
  user_id uuid,
  balance numeric DEFAULT 0.00,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT wallets_pkey PRIMARY KEY (id),
  CONSTRAINT wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- FUNCTIONS --
-- INCREMENT SEATS --
begin
  update trips
  set available_seats = available_seats + seats
  where id = trip_id;
end;

-- RESTORE SEATS --

begin
  update trips
  set available_seats = available_seats + seats
  where id = trip_id;
end;
