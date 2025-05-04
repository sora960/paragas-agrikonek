import { createClient } from '@supabase/supabase-js'

// Get environment variables from .env file or use fallback values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://supabase.eztechsolutions.pro'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnc2VleHVlcGZva25qeHB5bG1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTY0MTcyMzksImV4cCI6MjAzMTk5MzIzOX0.nOE0hOyIxeDPp7UlHJUEjRB_rvQo3eMQvLwWJkNLPJ4'

// Log environment variable status for debugging
console.log('Supabase URL available:', !!supabaseUrl)
console.log('Supabase Anon Key available:', !!supabaseAnonKey)

// Log the actual URL for debugging (masking the key for security)
console.log('Actual Supabase URL being used:', supabaseUrl)
console.log('Anon Key length:', supabaseAnonKey ? supabaseAnonKey.length : 0)

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key not found in environment variables')
  console.error('Using fallback values instead. For production, create a proper .env.local file.')
}

// Create Supabase client with additional options
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'implicit',
      storageKey: 'agrikonek-auth',
      storage: window.localStorage
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-application-name': 'AgriConnect',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
    },
  }
)

// Simple function to test Supabase connection
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('island_groups').select('*').limit(1)
    
    if (error) {
      console.error('Supabase connection test failed:', error)
      return false
    }
    
    console.log('Supabase connection test successful:', data)
    return true
  } catch (error) {
    console.error('Error testing Supabase connection:', error)
    return false
  }
} 