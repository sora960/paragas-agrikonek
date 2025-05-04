import { supabase } from '@/lib/supabase'

/**
 * Simplified check if a table exists in the Supabase database
 * This uses a direct query approach instead of information_schema
 */
export async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    // Try to select a single record from the table with a limit
    // If the table doesn't exist, this will throw an error
    const { error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)
    
    // If there's no error, the table exists
    return !error
  } catch (error) {
    console.error('Failed to check table existence:', error)
    return false
  }
}

/**
 * Check the structure of the 'todos' table using a simplified approach
 */
export async function checkTodosTable(): Promise<boolean> {
  try {
    console.log('Checking todos table structure...')
    
    // First check if table exists by trying to query it
    const tableExists = await checkTableExists('todos')
    
    if (!tableExists) {
      console.error('The "todos" table does not exist or cannot be accessed')
      return false
    }
    
    console.log('Todos table is accessible')
    return true
  } catch (error) {
    console.error('Failed to check todos table structure:', error)
    return false
  }
}

/**
 * Verify Supabase connection and configuration using a simplified approach
 */
export async function verifySupabaseConnection(): Promise<void> {
  try {
    // Check if environment variables are set
    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY
    
    console.log('Supabase configuration check:')
    console.log('- URL set:', !!url)
    console.log('- API key set:', !!key)
    
    if (!url || !key) {
      console.error('ERROR: Missing Supabase environment variables')
      console.error('Please make sure your .env file contains:')
      console.error('VITE_SUPABASE_URL=your-supabase-url')
      console.error('VITE_SUPABASE_ANON_KEY=your-supabase-anon-key')
      return
    }
    
    // Simple connectivity test - try to access todos table
    const { data, error } = await supabase.from('todos').select('*').limit(1)
    
    if (error) {
      if (error.code === '42P01') { // Table doesn't exist error
        console.error('Supabase connection successful, but todos table does not exist')
      } else {
        console.error('Supabase connection test failed:', error)
      }
    } else {
      console.log('Supabase connection test successful')
      console.log(`Found ${data?.length || 0} existing todos`)
    }
  } catch (error) {
    console.error('Error verifying Supabase connection:', error)
  }
} 