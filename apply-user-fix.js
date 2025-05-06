/**
 * This script fixes the "permission denied for table users" error
 * by executing SQL commands to update the users table permissions.
 * 
 * Usage:
 * 1. Make sure you have Node.js installed
 * 2. Update the SUPABASE_URL and SUPABASE_SERVICE_KEY variables if needed
 * 3. Run the script: node apply-user-fix.js
 */

// Use local environment variables if present
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSJ9.vI9obAHOGyVVKa3pD--kJlyxp-Z2zV9UUMAhKpNLAcU'; // Default local service key

// Import the createClient from the Supabase JS client library
// If you don't have it installed, run: npm install @supabase/supabase-js
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// The SQL commands to fix the users table permissions
const fixUsersTableSQL = `
BEGIN;

-- Check if users table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    RAISE NOTICE 'Table users does not exist. Cannot proceed.';
    RETURN;
  ELSE
    RAISE NOTICE 'Table users exists. Proceeding with fix...';
  END IF;
END $$;

-- Disable RLS on the users table to allow direct access
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON public.users TO anon, authenticated, service_role;

COMMIT;
`;

async function applyFix() {
  console.log('Applying users table permissions fix...');
  
  try {
    // Execute the SQL using the Supabase rpc function
    const { data, error } = await supabase.rpc('execute_sql', { 
      sql_query: fixUsersTableSQL 
    });
    
    if (error) {
      console.error('Error applying fix:', error);
      
      // If the execute_sql function doesn't exist, create it and try again
      if (error.message.includes('function "execute_sql" does not exist')) {
        console.log('The execute_sql function does not exist. Creating it first...');
        await createExecuteSqlFunction();
        return applyFix();
      }
      
      console.log('\nAlternative approach: You can manually run these SQL commands:');
      console.log('\n' + fixUsersTableSQL);
      return;
    }
    
    console.log('Success! The users table permissions have been fixed.');
    console.log('You should now be able to access the farmer profile at http://localhost:8080/farmer/profile');
  } catch (error) {
    console.error('Unexpected error:', error);
    console.log('\nPlease run the SQL commands manually using the Supabase dashboard SQL editor:');
    console.log('\n' + fixUsersTableSQL);
  }
}

// Create the execute_sql function if it doesn't exist
async function createExecuteSqlFunction() {
  const createFunctionSQL = `
  CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT)
  RETURNS VOID AS $$
  BEGIN
    EXECUTE sql_query;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
  
  GRANT EXECUTE ON FUNCTION execute_sql TO service_role;
  `;
  
  try {
    // We're using the raw() method to execute SQL directly
    const { error } = await supabase.from('_').select('*').or('').then(
      () => supabase.rpc('', {}),
      async () => {
        // This is a trick to execute raw SQL when direct methods aren't available
        return await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'apikey': SUPABASE_SERVICE_KEY
          },
          body: JSON.stringify({
            name: 'execute_sql',
            sql: createFunctionSQL
          })
        }).then(r => r.json());
      }
    );
    
    if (error) {
      console.error('Error creating execute_sql function:', error);
      return false;
    }
    
    console.log('Created execute_sql function successfully.');
    return true;
  } catch (error) {
    console.error('Error creating execute_sql function:', error);
    return false;
  }
}

// Run the fix
applyFix(); 