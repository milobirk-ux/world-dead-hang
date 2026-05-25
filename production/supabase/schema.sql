-- WDHC Supabase Schema
-- Based on current Google Sheets "Custom Form Submissions" structure

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- === ATHLETES ===
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

-- Index for fast lookups
CREATE INDEX idx_athletes_email ON athletes(email);
CREATE INDEX idx_athletes_name ON athletes(name);

-- === SUBMISSIONS ===
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE,
  time_seconds INTEGER NOT NULL,
  time_display TEXT NOT NULL, -- "4:42" format
  grip_age DECIMAL(4,1),
  tier TEXT,
  attempt_date DATE NOT NULL,
  video_url TEXT,
  notes TEXT,
  
  -- Status fields
  reviewed BOOLEAN DEFAULT FALSE,
  verified BOOLEAN DEFAULT FALSE, -- Checkmark / "verified" status
  approved BOOLEAN DEFAULT FALSE, -- On leaderboard
  is_pr BOOLEAN DEFAULT FALSE,
  previous_best_seconds INTEGER,
  
  -- Metadata
  source TEXT DEFAULT 'portal', -- 'portal', 'sheet', 'api'
  submission_id TEXT UNIQUE, -- "SUB-1234567890-xyz"
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_submissions_athlete ON submissions(athlete_id);
CREATE INDEX idx_submissions_date ON submissions(attempt_date DESC);
CREATE INDEX idx_submissions_time ON submissions(time_seconds DESC);

-- === MAGIC LINKS (for portal auth) ===
CREATE TABLE magic_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_magic_links_token ON magic_links(token);
CREATE INDEX idx_magic_links_email ON magic_links(email);

-- === SESSIONS (active portal sessions) ===
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_sessions_token ON sessions(session_token);

-- === LEADERBOARD CACHE (for fast leaderboard reads) ===
CREATE TABLE leaderboard_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data JSONB NOT NULL, -- Pre-computed leaderboard array
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- === FUNCTIONS ===

-- Get or create athlete by email
CREATE OR REPLACE FUNCTION get_or_create_athlete(
  p_email TEXT,
  p_name TEXT,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_dob DATE DEFAULT NULL,
  p_gender TEXT DEFAULT 'Male',
  p_bodyweight_lbs INTEGER DEFAULT NULL,
  p_height_inches INTEGER DEFAULT NULL,
  p_grip_training TEXT DEFAULT 'None',
  p_country TEXT DEFAULT NULL,
  p_city_state TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  athlete_uuid UUID;
BEGIN
  -- Try to find existing
  SELECT id INTO athlete_uuid FROM athletes WHERE email = p_email;
  
  IF athlete_uuid IS NULL THEN
    -- Create new
    INSERT INTO athletes (email, name, first_name, last_name, dob, gender, bodyweight_lbs, height_inches, grip_training, country, city_state)
    VALUES (p_email, p_name, p_first_name, p_last_name, p_dob, p_gender, p_bodyweight_lbs, p_height_inches, p_grip_training, p_country, p_city_state)
    RETURNING id INTO athlete_uuid;
  END IF;
  
  RETURN athlete_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate grip age
CREATE OR REPLACE FUNCTION calc_grip_age(
  p_dob DATE,
  p_bodyweight_lbs INTEGER,
  p_gender TEXT,
  p_time_seconds INTEGER,
  p_height_inches INTEGER,
  p_grip_training TEXT
)
RETURNS DECIMAL(4,1) AS $$
DECLARE
  age_years INTEGER;
  bodyweight_factor DECIMAL(4,3);
  height_factor DECIMAL(4,3);
  training_factor DECIMAL(4,3);
  grip_age DECIMAL(4,1);
BEGIN
  -- Calculate chronological age
  age_years := EXTRACT(YEAR FROM AGE(p_dob));
  
  -- Bodyweight factor (heavier = more stress = younger grip age)
  IF p_bodyweight_lbs IS NULL OR p_bodyweight_lbs = 0 THEN
    bodyweight_factor := 1.0;
  ELSIF p_bodyweight_lbs < 140 THEN bodyweight_factor := 1.15;
  ELSIF p_bodyweight_lbs < 170 THEN bodyweight_factor := 1.0;
  ELSIF p_bodyweight_lbs < 200 THEN bodyweight_factor := 0.9;
  ELSE bodyweight_factor := 0.85;
  END IF;
  
  -- Height factor (taller = more decompressing = younger grip age)
  IF p_height_inches IS NULL OR p_height_inches = 0 THEN
    height_factor := 1.0;
  ELSIF p_height_inches < 65 THEN height_factor := 1.1;
  ELSIF p_height_inches < 70 THEN height_factor := 1.0;
  ELSIF p_height_inches < 75 THEN height_factor := 0.95;
  ELSE height_factor := 0.9;
  END IF;
  
  -- Training factor (more training = younger grip age)
  CASE p_grip_training
    WHEN 'None' THEN training_factor := 1.2;
    WHEN 'Beginner' THEN training_factor := 1.1;
    WHEN 'Intermediate' THEN training_factor := 1.0;
    WHEN 'Advanced' THEN training_factor := 0.9;
    WHEN 'Elite' THEN training_factor := 0.8;
    ELSE training_factor := 1.0;
  END CASE;
  
  -- Calculate base grip age from time (quadratic)
  -- Based on: 60s = ~80 yrs, 120s = ~40 yrs, 180s = ~20 yrs, 240s = ~10 yrs, 300s = ~5 yrs
  grip_age := (age_years - (
    (0.000003 * POWER(p_time_seconds, 3))
    - (0.002 * POWER(p_time_seconds, 2))
    + (0.5 * p_time_seconds)
    - 10
  ) * bodyweight_factor * height_factor * training_factor);
  
  RETURN ROUND(greatest(5, least(100, grip_age)), 1);
END;
$$ LANGUAGE plpgsql;

-- Get tier from time
CREATE OR REPLACE FUNCTION get_tier(p_seconds INTEGER)
RETURNS TABLE(tier TEXT, color TEXT, next_tier TEXT, next_seconds INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN p_seconds >= 360 THEN 'Freak'
      WHEN p_seconds >= 300 THEN 'Legend'
      WHEN p_seconds >= 240 THEN 'Elite'
      WHEN p_seconds >= 180 THEN 'Pro'
      WHEN p_seconds >= 120 THEN 'Amateur'
      WHEN p_seconds >= 60 THEN 'Challenger'
      ELSE 'Rookie'
    END AS tier,
    CASE
      WHEN p_seconds >= 360 THEN '#FF00FF'
      WHEN p_seconds >= 300 THEN '#D4AF37'
      WHEN p_seconds >= 240 THEN '#00FF00'
      WHEN p_seconds >= 180 THEN '#00FFFF'
      WHEN p_seconds >= 120 THEN '#4169E1'
      WHEN p_seconds >= 60 THEN '#FF8C00'
      ELSE '#808080'
    END AS color,
    CASE
      WHEN p_seconds >= 360 THEN NULL
      WHEN p_seconds >= 300 THEN 'Freak'
      WHEN p_seconds >= 240 THEN 'Legend'
      WHEN p_seconds >= 180 THEN 'Elite'
      WHEN p_seconds >= 120 THEN 'Pro'
      WHEN p_seconds >= 60 THEN 'Amateur'
      ELSE 'Challenger'
    END AS next_tier,
    CASE
      WHEN p_seconds >= 360 THEN NULL
      WHEN p_seconds >= 300 THEN 360
      WHEN p_seconds >= 240 THEN 300
      WHEN p_seconds >= 180 THEN 240
      WHEN p_seconds >= 120 THEN 180
      WHEN p_seconds >= 60 THEN 120
      ELSE 60
    END AS next_seconds;
END;
$$ LANGUAGE plpgsql;

-- === KEEP AWAKE CRON ===
-- This will be called by a cron job to prevent Supabase from pausing
CREATE OR REPLACE FUNCTION keep_awake()
RETURNS void AS $$
BEGIN
  -- Simply touch the leaderboard_cache to update timestamp
  INSERT INTO leaderboard_cache (data, generated_at)
  VALUES ('{"awake": true}', NOW())
  ON CONFLICT (id) DO UPDATE SET generated_at = NOW()
  WHERE false;
END;
$$ LANGUAGE plpgsql;

-- Row level security (optional - can disable for now)
-- ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;