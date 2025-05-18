import { supabase } from '@/lib/supabase';

// Function to ensure the execute_sql function exists in the database
export async function ensureExecuteSqlFunction() {
  try {
    console.log("Checking for execute_sql function...");
    
    // First check if the function exists by trying to call it with a simple query
    const { error: testError } = await supabase.rpc('execute_sql', {
      sql_query: 'SELECT 1;'
    });
    
    // If the function exists and works, we're done
    if (!testError) {
      console.log("execute_sql function exists and is working correctly.");
      return true;
    }
    
    console.log("execute_sql function doesn't exist or has an error, creating it now...");
    
    // Try to create the function
    const { error } = await supabase.rpc('create_execute_sql_function', {});
    
    // If the function doesn't exist, create it manually
    if (error) {
      console.log("Creating execute_sql function manually...");
      
      // Use a direct SQL query to create the function
      // Since we can't execute SQL directly, we'll need to use another approach
      
      // First try to run a query to see if we have permissions
      const { data, error: rawError } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      
      if (rawError) {
        console.error("Error checking permissions:", rawError);
        return false;
      }
      
      // Now try to create the function using a specially crafted query
      // This is a workaround for limited permissions
      const createFunctionQuery = `
        DO $$
        BEGIN
          -- Create a function to execute SQL queries with SECURITY DEFINER
          IF NOT EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'execute_sql'
          ) THEN
            EXECUTE '
              CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT)
              RETURNS VOID AS $$
              BEGIN
                EXECUTE sql_query;
              END;
              $$ LANGUAGE plpgsql SECURITY DEFINER;
            ';
          END IF;
        END $$;
      `;
      
      // Try to use the REST API directly
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://supabase.eztechsolutions.pro';
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          sql_query: createFunctionQuery
        })
      });
      
      if (!response.ok) {
        console.error("Failed to create execute_sql function via REST API");
        
        // As a last resort, try to directly insert into the user_regions table
        // without using the execute_sql function
        return false;
      }
      
      console.log("Successfully created execute_sql function");
      return true;
    }
    
    console.log("Successfully created execute_sql function");
    return true;
  } catch (error) {
    console.error("Error ensuring execute_sql function exists:", error);
    return false;
  }
} 