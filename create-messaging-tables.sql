-- This script creates the messaging system tables

-- Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_time TIMESTAMPTZ,
  is_group BOOLEAN DEFAULT false
);

-- Create conversation_participants table
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_time TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(conversation_id, user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_system_message BOOLEAN DEFAULT false,
  attachments JSONB
);

-- Create unread_message_counts view
CREATE OR REPLACE VIEW public.unread_message_counts AS
SELECT
  cp.user_id,
  cp.conversation_id,
  COUNT(m.id) AS unread_count
FROM
  public.conversation_participants cp
LEFT JOIN
  public.messages m ON m.conversation_id = cp.conversation_id AND 
    (m.created_at > COALESCE(cp.last_read_time, '1970-01-01'::TIMESTAMPTZ)) AND
    m.sender_id != cp.user_id
WHERE
  cp.is_active = true
GROUP BY
  cp.user_id, cp.conversation_id;

-- Create farmers view to fix 404 on farmers
CREATE OR REPLACE VIEW public.farmers AS
SELECT
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  u.role,
  fp.id AS farmer_profile_id,
  fp.farm_name,
  fp.farm_address,
  fp.province_id,
  fp.organization_id
FROM
  public.users u
LEFT JOIN
  public.farmer_profiles fp ON u.id = fp.user_id
WHERE
  u.role = 'farmer';

-- Create regions table (needed for organizations)
CREATE TABLE IF NOT EXISTS public.regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT,
  country TEXT DEFAULT 'Philippines',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert some sample regions
INSERT INTO public.regions (name, code) VALUES
  ('Luzon', 'LUZ'),
  ('Visayas', 'VIS'),
  ('Mindanao', 'MIN')
ON CONFLICT DO NOTHING;

-- Add region_id to organizations if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'organizations'
    AND column_name = 'region_id'
  ) THEN
    ALTER TABLE public.organizations ADD COLUMN region_id UUID REFERENCES public.regions(id);
  END IF;
END $$;

-- Add status to organizations if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'organizations'
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.organizations ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'inactive'));
  END IF;
END $$;

-- Enable RLS on all new tables
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;

-- Create policies for conversations
CREATE POLICY "Enable all access for all users on conversations" ON public.conversations
  FOR ALL USING (true) WITH CHECK (true);

-- Create policies for conversation_participants
CREATE POLICY "Enable all access for all users on conversation_participants" ON public.conversation_participants
  FOR ALL USING (true) WITH CHECK (true);

-- Create policies for messages
CREATE POLICY "Enable all access for all users on messages" ON public.messages
  FOR ALL USING (true) WITH CHECK (true);

-- Create policies for regions
CREATE POLICY "Enable all access for all users on regions" ON public.regions
  FOR ALL USING (true) WITH CHECK (true);

-- Grant permissions on all tables
GRANT ALL ON public.conversations TO anon, authenticated;
GRANT ALL ON public.conversation_participants TO anon, authenticated;
GRANT ALL ON public.messages TO anon, authenticated;
GRANT ALL ON public.regions TO anon, authenticated;
GRANT ALL ON public.unread_message_counts TO anon, authenticated;
GRANT ALL ON public.farmers TO anon, authenticated;

-- Verify tables were created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN (
  'conversations', 
  'conversation_participants', 
  'messages',
  'regions'
); 