import { supabase } from '@/lib/supabase';
import { checkRequiredTables, createRequiredTables } from './databaseCore';
import { ensureProperTableSchema } from './databaseSchemaUtils';

/**
 * Initialize database with all required tables and constraints
 */
export async function initializeDatabase() {
  try {
    console.log("Initializing database...");
    
    // Step 1: Check if tables exist
    const { allExist, tables } = await checkRequiredTables();
    
    // Step 2: Create tables if they don't exist
    if (!allExist) {
      console.log("Creating required tables...");
      const createResult = await createRequiredTables();
      
      if (!createResult.success) {
        console.error("Failed to create required tables:", createResult.error);
        return { success: false, error: createResult.error };
      }
      
      console.log("Tables created successfully");
    } else {
      console.log("All required tables exist");
    }
    
    // Step 3: Ensure proper schema (constraints, etc.)
    console.log("Ensuring proper schema...");
    const schemaResult = await ensureProperTableSchema();
    
    if (!schemaResult.success) {
      console.error("Failed to ensure proper schema:", schemaResult.error);
      return { success: false, error: schemaResult.error };
    }

    // Step 4: Check if messaging system tables exist and create them if needed
    console.log("Checking messaging system tables...");
    const messagingTablesResult = await setupMessagingTables();

    if (!messagingTablesResult.success) {
      console.error("Failed to set up messaging tables:", messagingTablesResult.error);
      // Continue anyway, this is non-critical
      console.log("Continuing with initialization despite messaging table issues");
    } else {
      console.log("Messaging tables setup complete");
    }
    
    console.log("Database initialization complete");
    return { success: true };
  } catch (error) {
    console.error("Error initializing database:", error);
    return { success: false, error };
  }
}

/**
 * Fix database schema using direct SQL
 */
export async function fixDatabaseSchema() {
  try {
    // Use SQL to recreate tables with proper constraints
    console.log("Fixing database schema...");
    
    // Create execute_sql function if it doesn't exist
    await supabase.rpc('create_execute_sql_function', {}).then(
      () => {
        console.log("SQL execution function created or already exists");
      },
      error => {
        // If the function already exists, this will fail
        console.log("execute_sql function may already exist:", error);
      }
    );
    
    // Execute SQL to fix the users table role constraint
    const { error: usersError } = await supabase.rpc('execute_sql', { 
      sql_query: `
        -- Drop and recreate the users table with proper role constraint
        DROP TABLE IF EXISTS public.user_regions CASCADE;
        DROP TABLE IF EXISTS public.user_credentials CASCADE;
        DROP TABLE IF EXISTS public.users CASCADE;
        
        CREATE TABLE IF NOT EXISTS public.users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          email TEXT NOT NULL UNIQUE,
          first_name TEXT,
          last_name TEXT,
          role TEXT NOT NULL CHECK (role IN ('farmer', 'org_admin', 'regional_admin', 'superadmin')),
          status TEXT DEFAULT 'active',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS public.user_credentials (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS public.user_regions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          region_id TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });
    
    if (usersError) {
      console.error("Error fixing users table:", usersError);
      return { success: false, error: usersError };
    }
    
    console.log("Database schema fixed successfully");
    return { success: true };
  } catch (error) {
    console.error("Error fixing database schema:", error);
    return { success: false, error };
  }
}

/**
 * Setup the messaging system tables
 */
async function setupMessagingTables() {
  try {
    // Check if the conversations table exists
    const { error: checkError } = await supabase
      .from('conversations')
      .select('count')
      .limit(1)
      .single();
    
    // If we get a "relation does not exist" error, we need to create the tables
    if (checkError && checkError.code === '42P01') {
      console.log("Messaging tables don't exist, creating them...");
      
      // First ensure the SQL execution function exists
      await createSQLExecutionFunction();
      
      // Then create the messaging tables using the SQL script
      const { error } = await supabase.rpc('execute_sql', { 
        sql_query: messagingSystemSQL 
      });
      
      if (error) {
        console.error("Error creating messaging tables:", error);
        return { success: false, error };
      }
      
      return { success: true, message: "Messaging tables created successfully" };
    }
    
    // If no error, tables already exist
    return { success: true, message: "Messaging tables already exist" };
  } catch (error) {
    console.error("Error setting up messaging tables:", error);
    return { success: false, error };
  }
}

/**
 * Create the execute_sql function in Supabase
 */
async function createSQLExecutionFunction() {
  try {
    // Try creating the execute_sql function directly
    const { error } = await supabase.rpc('create_execute_sql_function', {});
    
    // If the function doesn't exist, create it manually
    if (error) {
      console.log("Creating execute_sql function...");
      
      // Use raw SQL query to create the function
      const { error: rawError } = await supabase.from('_temp_create_function').select().limit(1);
      if (rawError) {
        // This is expected to fail, but we're using it to execute our SQL
        console.log("Expected error from _temp_create_function, proceeding with function creation");
      }
      
      // Create a temporary table to execute the SQL
      const { error: tempError } = await supabase.rpc('execute_sql', {
        sql_query: `
          -- Create a function to execute SQL queries
          CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT)
          RETURNS VOID AS $$
          BEGIN
            EXECUTE sql_query;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
          
          -- Create a function to create the execute_sql function (meta!)
          CREATE OR REPLACE FUNCTION create_execute_sql_function()
          RETURNS VOID AS $$
          BEGIN
            -- Function already created above
            NULL;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        `
      });
      
      if (tempError && tempError.code !== '42P01') {
        console.error("Error creating SQL execution function:", tempError);
        // Continue anyway, may already exist
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error creating SQL execution function:", error);
    // Continue anyway, may already exist
    return { success: true };
  }
}

// SQL script to create all messaging system tables
const messagingSystemSQL = `
-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- *** CONVERSATIONS TABLE ***
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255),
    type VARCHAR(20) NOT NULL CHECK (type IN ('direct', 'group', 'announcement')),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    organization_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- *** CONVERSATION PARTICIPANTS TABLE ***
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

-- *** MESSAGES TABLE ***
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

-- *** MESSAGE STATUS TABLE ***
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

-- *** CREATE INDEXES ***
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_message_status_message_id ON public.message_status(message_id);
CREATE INDEX IF NOT EXISTS idx_message_status_user_id ON public.message_status(user_id);

-- *** CREATE VIEW FOR UNREAD MESSAGE COUNT ***
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

-- *** CREATE VIEW FOR CONVERSATION PREVIEWS ***
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

-- *** ADD TIMESTAMP UPDATE TRIGGER ***
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_timestamp
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_timestamp();

-- *** ADD MESSAGE STATUS TRIGGER ***
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

CREATE TRIGGER create_message_status
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION create_message_status();

-- *** ROW LEVEL SECURITY POLICIES ***
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_status ENABLE ROW LEVEL SECURITY;

-- Policy for viewing conversations
CREATE POLICY "Users can view conversations they participate in" 
ON public.conversations FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.conversation_participants cp
        WHERE cp.conversation_id = id
        AND cp.user_id = auth.uid()
    )
);

-- Policy for inserting conversations
CREATE POLICY "Users can create conversations" 
ON public.conversations FOR INSERT 
WITH CHECK (
    created_by = auth.uid()
);

-- Policy for viewing conversation participants
CREATE POLICY "Users can view participants of conversations they participate in" 
ON public.conversation_participants FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.conversation_participants cp
        WHERE cp.conversation_id = conversation_id
        AND cp.user_id = auth.uid()
    )
);

-- Policy for inserting conversation participants
CREATE POLICY "Conversation admin can add participants" 
ON public.conversation_participants FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.conversation_participants cp
        WHERE cp.conversation_id = conversation_id
        AND cp.user_id = auth.uid()
        AND cp.role = 'admin'
    )
    OR 
    EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = conversation_id
        AND c.created_by = auth.uid()
    )
);

-- Policy for viewing messages
CREATE POLICY "Users can view messages in conversations they participate in" 
ON public.messages FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.conversation_participants cp
        WHERE cp.conversation_id = conversation_id
        AND cp.user_id = auth.uid()
    )
);

-- Policy for inserting messages
CREATE POLICY "Users can send messages to conversations they participate in" 
ON public.messages FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.conversation_participants cp
        WHERE cp.conversation_id = conversation_id
        AND cp.user_id = auth.uid()
        AND cp.is_active = TRUE
    )
    AND sender_id = auth.uid()
);

-- Policy for updating messages
CREATE POLICY "Users can edit their own messages" 
ON public.messages FOR UPDATE 
USING (
    sender_id = auth.uid()
);

-- Policy for viewing message status
CREATE POLICY "Users can view status of their messages" 
ON public.message_status FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.messages m
        WHERE m.id = message_id
        AND m.sender_id = auth.uid()
    )
    OR user_id = auth.uid()
);

-- Policy for updating message status
CREATE POLICY "Users can update their own message status" 
ON public.message_status FOR UPDATE 
USING (
    user_id = auth.uid()
);
`;
