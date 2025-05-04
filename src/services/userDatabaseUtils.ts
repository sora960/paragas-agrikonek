
import { supabase } from '@/lib/supabase';

/**
 * Helper function to check if a table exists
 */
export async function checkTableExists(tableName: string) {
  try {
    // Try to select a single record from the table
    const { error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    // If there's no error, the table exists
    return !error;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error);
    return false;
  }
}
