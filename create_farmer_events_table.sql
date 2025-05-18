-- Script to create the farmer_events table for the calendar

-- Create farmer_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS farmer_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  event_type TEXT NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS on the table
ALTER TABLE farmer_events DISABLE ROW LEVEL SECURITY;

-- Grant full permissions to all authenticated users
GRANT ALL PRIVILEGES ON TABLE farmer_events TO authenticated;
GRANT ALL PRIVILEGES ON TABLE farmer_events TO anon; 