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

// Add a way to execute direct SQL for admin operations
export async function executeSuperAdminOperation(operation: string, params: any = {}) {
  console.log(`Executing superadmin operation: ${operation}`, params);
  
  try {
    // This should be an endpoint that requires superadmin auth
    const response = await fetch('/api/admin/execute-operation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Include current auth token if available
        'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
      },
      body: JSON.stringify({
        operation,
        params
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error executing superadmin operation:', errorText);
      throw new Error(`Admin operation failed: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Admin operation result:', result);
    return result;
  } catch (error) {
    console.error('Error in executeSuperAdminOperation:', error);
    throw error;
  }
}

// Add a direct method to update region budget
export async function updateRegionBudgetDirect(regionId: string, amount: number, fiscalYear: number) {
  console.log(`Direct update of region budget: Region ${regionId}, Amount ${amount}, Year ${fiscalYear}`);
  
  try {
    // First try direct API approach for superadmins
    try {
      const adminOpResult = await executeSuperAdminOperation('update_region_budget', {
        region_id: regionId,
        amount,
        fiscal_year: fiscalYear
      });
      
      console.log('Direct admin operation successful:', adminOpResult);
      return adminOpResult;
    } catch (adminOpError) {
      console.log('Admin operation failed, falling back to normal methods:', adminOpError);
    }
    
    // Fall back to standard methods if admin operation fails
    const { data: existingBudget, error: fetchError } = await supabase
      .from('region_budgets')
      .select('id')
      .eq('region_id', regionId)
      .eq('fiscal_year', fiscalYear)
      .maybeSingle();
    
    if (fetchError) throw fetchError;
    
    let result;
    
    if (existingBudget) {
      // Update existing budget
      const { data, error } = await supabase
        .from('region_budgets')
        .update({ amount })
        .eq('id', existingBudget.id)
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    } else {
      // Create new budget
      const { data, error } = await supabase
        .from('region_budgets')
        .insert({
          region_id: regionId,
          fiscal_year: fiscalYear,
          amount,
          allocated: false
        })
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    }
    
    return result;
  } catch (error) {
    console.error('Error in updateRegionBudgetDirect:', error);
    throw error;
  }
} 