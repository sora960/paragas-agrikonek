-- Create messages table for regional admins to communicate with organizations

-- Create the messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES auth.users(id),
  sender_type TEXT NOT NULL, -- 'regional_admin', 'organization_admin', 'system', etc.
  recipient_id UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES public.organizations(id),
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_organization_id ON public.messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON public.messages(is_read);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

-- RLS policies

-- Users can see messages they sent or received
DROP POLICY IF EXISTS "Users can see their own messages" ON public.messages;
CREATE POLICY "Users can see their own messages" 
ON public.messages 
FOR SELECT 
TO authenticated 
USING (
  sender_id = auth.uid() OR recipient_id = auth.uid()
);

-- Users can send messages
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages" 
ON public.messages 
FOR INSERT 
TO authenticated 
WITH CHECK (
  sender_id = auth.uid()
);

-- Users can mark messages they received as read
DROP POLICY IF EXISTS "Users can mark received messages as read" ON public.messages;
CREATE POLICY "Users can mark received messages as read" 
ON public.messages 
FOR UPDATE 
TO authenticated 
USING (
  recipient_id = auth.uid() AND
  sender_id <> auth.uid()
)
WITH CHECK (
  recipient_id = auth.uid() AND
  sender_id <> auth.uid() AND
  is_read = true
);

-- Create function to mark a message as read
CREATE OR REPLACE FUNCTION mark_message_as_read(message_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.messages
  SET 
    is_read = true,
    read_at = NOW()
  WHERE 
    id = message_id 
    AND recipient_id = auth.uid()
    AND is_read = false;
  
  RETURN FOUND;
END;
$$;

-- Create a function to create the messages table if it doesn't exist (to be called from client)
CREATE OR REPLACE FUNCTION create_messages_table_if_not_exists()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the table exists
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'messages'
  ) THEN
    -- Create the messages table
    CREATE TABLE public.messages (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      sender_id UUID REFERENCES auth.users(id),
      sender_type TEXT NOT NULL,
      recipient_id UUID REFERENCES auth.users(id),
      organization_id UUID REFERENCES public.organizations(id),
      subject TEXT NOT NULL,
      content TEXT NOT NULL,
      is_read BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      read_at TIMESTAMP WITH TIME ZONE
    );

    -- Create indexes
    CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
    CREATE INDEX idx_messages_recipient_id ON public.messages(recipient_id);
    CREATE INDEX idx_messages_organization_id ON public.messages(organization_id);
    CREATE INDEX idx_messages_is_read ON public.messages(is_read);

    -- Enable RLS
    ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

    -- Create policies
    CREATE POLICY "Users can see their own messages" 
    ON public.messages 
    FOR SELECT 
    TO authenticated 
    USING (
      sender_id = auth.uid() OR recipient_id = auth.uid()
    );

    CREATE POLICY "Users can send messages" 
    ON public.messages 
    FOR INSERT 
    TO authenticated 
    WITH CHECK (
      sender_id = auth.uid()
    );

    CREATE POLICY "Users can mark received messages as read" 
    ON public.messages 
    FOR UPDATE 
    TO authenticated 
    USING (
      recipient_id = auth.uid() AND
      sender_id <> auth.uid()
    )
    WITH CHECK (
      recipient_id = auth.uid() AND
      sender_id <> auth.uid() AND
      is_read = true
    );

    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_messages_table_if_not_exists() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION mark_message_as_read(UUID) TO authenticated, service_role; 