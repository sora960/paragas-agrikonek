-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop all existing conversation-related tables and recreate them 
-- to ensure consistent schema (UNCOMMENT THIS BLOCK IF NEEDED)
/*
DO $$
BEGIN
  -- Drop views first
  DROP VIEW IF EXISTS public.conversation_previews;
  DROP VIEW IF EXISTS public.unread_message_counts;
  
  -- Drop triggers
  DROP TRIGGER IF EXISTS create_message_status ON public.messages;
  
  -- Drop tables in reverse dependency order
  DROP TABLE IF EXISTS public.message_status;
  DROP TABLE IF EXISTS public.messages;
  DROP TABLE IF EXISTS public.conversation_participants;
  DROP TABLE IF EXISTS public.conversations;
  
  RAISE NOTICE 'Dropped existing messaging tables for a clean rebuild';
END
$$;
*/

-- Check if conversations table exists and has the required columns
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'conversations'
  ) THEN
    -- Table exists, check if created_by column exists
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'conversations' 
      AND column_name = 'created_by'
    ) THEN
      -- Add the missing column
      ALTER TABLE public.conversations 
      ADD COLUMN created_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
      
      RAISE NOTICE 'Added created_by column to conversations table';
    ELSE
      RAISE NOTICE 'created_by column already exists in conversations table';
    END IF;
    
    -- Check if type column exists
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'conversations' 
      AND column_name = 'type'
    ) THEN
      -- First drop the constraint if it exists to allow adding nullable column first
      BEGIN
        -- Add the missing type column (initially nullable to allow adding to existing rows)
        ALTER TABLE public.conversations ADD COLUMN type VARCHAR(20);
        
        -- Update existing rows to have a type value
        UPDATE public.conversations SET type = 'direct' WHERE type IS NULL;
        
        -- Now make it NOT NULL and add the check constraint
        ALTER TABLE public.conversations ALTER COLUMN type SET NOT NULL;
        ALTER TABLE public.conversations ADD CONSTRAINT conversations_type_check 
          CHECK (type IN ('direct', 'group', 'announcement'));
        
        RAISE NOTICE 'Added type column to conversations table';
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error adding type column: %', SQLERRM;
      END;
    ELSE
      RAISE NOTICE 'type column already exists in conversations table';
    END IF;
  ELSE
    -- Create the full messaging schema since the table doesn't exist
    
    -- CONVERSATIONS TABLE
    CREATE TABLE IF NOT EXISTS public.conversations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(255),
        type VARCHAR(20) NOT NULL CHECK (type IN ('direct', 'group', 'announcement')),
        created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
        organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- CONVERSATION PARTICIPANTS TABLE
    CREATE TABLE IF NOT EXISTS public.conversation_participants (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
        user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
        role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('member', 'admin')),
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        is_active BOOLEAN DEFAULT TRUE,
        UNIQUE(conversation_id, user_id)
    );

    -- MESSAGES TABLE
    CREATE TABLE IF NOT EXISTS public.messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
        sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
        content TEXT NOT NULL,
        content_type VARCHAR(20) DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'file', 'system')),
        attachment_url TEXT,
        attachment_type VARCHAR(50),
        is_edited BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- MESSAGE STATUS TABLE
    CREATE TABLE IF NOT EXISTS public.message_status (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
        user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
        is_read BOOLEAN DEFAULT FALSE,
        is_delivered BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMP WITH TIME ZONE,
        delivered_at TIMESTAMP WITH TIME ZONE,
        UNIQUE(message_id, user_id)
    );

    -- CREATE INDEXES
    CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
    CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON public.conversation_participants(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON public.conversation_participants(user_id);
    CREATE INDEX IF NOT EXISTS idx_message_status_message_id ON public.message_status(message_id);
    CREATE INDEX IF NOT EXISTS idx_message_status_user_id ON public.message_status(user_id);

    -- CREATE VIEW FOR UNREAD MESSAGE COUNT
    CREATE OR REPLACE VIEW public.unread_message_counts AS
    SELECT 
        cp.user_id,
        cp.conversation_id,
        COUNT(m.id) AS unread_count
    FROM 
        public.conversation_participants cp
        JOIN public.messages m ON m.conversation_id = cp.conversation_id
        LEFT JOIN public.message_status ms ON ms.message_id = m.id AND ms.user_id = cp.user_id
    WHERE 
        m.sender_id != cp.user_id
        AND (ms.is_read = FALSE OR ms.is_read IS NULL)
        AND cp.is_active = TRUE
        AND m.created_at > cp.last_read_at
    GROUP BY 
        cp.user_id, cp.conversation_id;

    -- CREATE VIEW FOR CONVERSATION PREVIEWS
    CREATE OR REPLACE VIEW public.conversation_previews AS
    SELECT 
        c.id AS conversation_id,
        c.title,
        c.type,
        lm.id AS last_message_id,
        lm.content AS last_message_content,
        lm.created_at AS last_message_time,
        lm.sender_id AS last_message_sender,
        COUNT(DISTINCT cp.user_id) AS participant_count,
        u.first_name || ' ' || u.last_name AS last_sender_name
    FROM 
        public.conversations c
        JOIN public.conversation_participants cp ON cp.conversation_id = c.id
        LEFT JOIN (
            SELECT DISTINCT ON (conversation_id) *
            FROM public.messages
            ORDER BY conversation_id, created_at DESC
        ) lm ON lm.conversation_id = c.id
        LEFT JOIN public.users u ON u.id = lm.sender_id
    GROUP BY 
        c.id, c.title, c.type, lm.id, lm.content, lm.created_at, lm.sender_id, u.first_name, u.last_name;
    
    RAISE NOTICE 'Created complete messaging schema';
  END IF;
END
$$;

-- Add grant permissions to ensure proper access for users
DO $$
BEGIN
  -- Grant permissions on all messaging tables
  EXECUTE 'GRANT ALL ON public.conversations TO authenticated, anon';
  EXECUTE 'GRANT ALL ON public.conversation_participants TO authenticated, anon';
  EXECUTE 'GRANT ALL ON public.messages TO authenticated, anon';
  
  -- Grant permissions on message_status if it exists
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'message_status'
  ) THEN
    EXECUTE 'GRANT ALL ON public.message_status TO authenticated, anon';
  END IF;
  
  -- Grant permissions on views
  IF EXISTS (
    SELECT FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'unread_message_counts'
  ) THEN
    EXECUTE 'GRANT ALL ON public.unread_message_counts TO authenticated, anon';
  END IF;
  
  IF EXISTS (
    SELECT FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'conversation_previews'
  ) THEN
    EXECUTE 'GRANT ALL ON public.conversation_previews TO authenticated, anon';
  END IF;
  
  RAISE NOTICE 'Granted permissions on messaging tables';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error granting permissions: %', SQLERRM;
END
$$;

-- CREATE FUNCTION AND TRIGGER FOR MESSAGE STATUS
CREATE OR REPLACE FUNCTION create_message_status()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.message_status (message_id, user_id, is_delivered, delivered_at)
    SELECT 
        NEW.id, 
        cp.user_id, 
        FALSE, 
        NULL
    FROM 
        public.conversation_participants cp
    WHERE 
        cp.conversation_id = NEW.conversation_id
        AND cp.user_id != NEW.sender_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'create_message_status'
  ) THEN
    CREATE TRIGGER create_message_status
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION create_message_status();
    
    RAISE NOTICE 'Created message status trigger';
  END IF;
END
$$; 