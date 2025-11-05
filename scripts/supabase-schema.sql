-- Supabase PostgreSQL Schema for BotCheckin
-- Copy and paste this into Supabase SQL Editor

-- Drop existing tables if needed (careful!)
-- DROP TABLE IF EXISTS sessions CASCADE;
-- DROP TABLE IF EXISTS checkins CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL,
  supervisor_id INTEGER,
  active INTEGER DEFAULT 1,
  password TEXT,
  categories TEXT,
  expected_weekly_hours REAL DEFAULT 40.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create checkins table with GPS and audit trail columns
CREATE TABLE IF NOT EXISTS checkins (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  location TEXT,
  edited_by INTEGER,
  edited_at TIMESTAMP,
  original_timestamp TIMESTAMP,
  latitude REAL,
  longitude REAL,
  location_verified INTEGER DEFAULT 1,
  distance_meters INTEGER,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  phone TEXT NOT NULL,
  logged_in_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_checkins_user ON checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_timestamp ON checkins(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_phone ON sessions(phone);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Enable Row Level Security (RLS) - Optional but recommended
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated access
-- These policies allow all operations for now - customize based on your needs
CREATE POLICY "Enable all for authenticated users" ON users
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all for authenticated users" ON checkins
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all for authenticated users" ON sessions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- For anon key (service_role should bypass RLS anyway)
CREATE POLICY "Enable all for anon" ON users
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all for anon" ON checkins
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all for anon" ON sessions
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Verify tables were created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('users', 'checkins', 'sessions');
