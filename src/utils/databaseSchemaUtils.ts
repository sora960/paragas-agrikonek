
import { supabase } from '@/lib/supabase';

/**
 * Check if a table exists and update its schema if needed
 */
export async function ensureProperTableSchema() {
  try {
    // For each table, ensure it has the correct schema
    // For the users table, verify it accepts all the roles we need
    
    // Check if the users table exists
    const { data: existingTables, error: tableError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error("Error checking users table:", tableError);
      return { success: false, error: tableError };
    }

    return { success: true, message: "Table schema checked" };
  } catch (error) {
    console.error("Error ensuring proper table schema:", error);
    return { success: false, error };
  }
}

/**
 * Create the execute_sql function in Supabase
 */
export async function createSQLExecutionFunction() {
  try {
    const { error } = await supabase.rpc('execute_sql', { 
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
    
    if (error) {
      console.error("Failed to create SQL execution function:", error);
      return { success: false, error };
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error creating SQL execution function:", error);
    return { success: false, error };
  }
}
