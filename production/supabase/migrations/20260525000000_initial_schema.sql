-- Enable UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ATHLETES table
CREATE TABLE athletes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  dob DATE,
  gender TEXT DEFAULT 'Male',
  bodyweight_lbs INTEGER,
  height_inches INTEGER,
  grip_training TEXT DEFAULT 'None',
  country TEXT,
  city_state TEXT,
  occupation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SUBMISSIONS table
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE,
  time_seconds INTEGER NOT NULL,
  time_display TEXT NOT NULL,
  grip_age DECIMAL(4,1),
  tier TEXT,
  attempt_date DATE NOT NULL,
  video_url TEXT,
  notes TEXT,
  reviewed BOOLEAN DEFAULT FALSE,
  verified BOOLEAN DEFAULT FALSE,
  approved BOOLEAN DEFAULT FALSE,
  is_pr BOOLEAN DEFAULT FALSE,
  previous_best_seconds INTEGER,
  source TEXT DEFAULT 'portal',
  submission_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MAGIC LINKS table
CREATE TABLE magic_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SESSIONS table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Indexes
CREATE INDEX idx_athletes_email ON athletes(email);
CREATE INDEX idx_submissions_athlete ON submissions(athlete_id);
CREATE INDEX idx_submissions_time ON submissions(time_seconds DESC);
CREATE INDEX idx_magic_links_token ON magic_links(token);
CREATE INDEX idx_sessions_token ON sessions(session_token);