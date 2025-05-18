import { supabase } from '@/lib/supabase';

/**
 * Fix permissions for the user_regions table by disabling Row Level Security.
 * This should be called when permission issues occur with regional admin assignments.
 */
export async function fixUserRegionsPermissions(): Promise<boolean> {
  try {
    console.log("Fixing user_regions table permissions...");
    
    // Use the execute_sql RPC function to disable RLS on the user_regions table
    const { error } = await supabase.rpc('execute_sql', {
      sql_query: `
        -- Disable Row Level Security on the user_regions table
        ALTER TABLE public.user_regions DISABLE ROW LEVEL SECURITY;
        
        -- Grant all privileges to the table
        GRANT ALL ON public.user_regions TO anon, authenticated, service_role;
      `
    });
    
    if (error) {
      console.error("Error fixing user_regions permissions:", error);
      
      // Try an alternative approach using a direct API call
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://supabase.eztechsolutions.pro';
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
        
        // Make a direct SQL query using the REST API
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            sql_query: `
              -- Disable Row Level Security on the user_regions table
              ALTER TABLE public.user_regions DISABLE ROW LEVEL SECURITY;
              
              -- Grant all privileges to the table
              GRANT ALL ON public.user_regions TO anon, authenticated, service_role;
            `
          })
        });
        
        if (!response.ok) {
          console.error("Failed to fix user_regions permissions via REST API:", await response.text());
          return false;
        }
        
        console.log("Successfully fixed user_regions permissions via REST API");
        return true;
      } catch (directError) {
        console.error("Error fixing user_regions permissions via direct API:", directError);
        return false;
      }
    }
    
    console.log("Successfully fixed user_regions permissions");
    return true;
  } catch (error) {
    console.error("Error in fixUserRegionsPermissions:", error);
    return false;
  }
}

/**
 * Check if the user_regions table has RLS enabled
 */
export async function checkUserRegionsRLS(): Promise<{ enabled: boolean, message: string }> {
  try {
    const { data, error } = await supabase.rpc('execute_sql', {
      sql_query: `
        SELECT 
          c.relname AS table_name,
          CASE WHEN c.relrowsecurity THEN true ELSE false END AS rls_enabled
        FROM 
          pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE 
          n.nspname = 'public' AND
          c.relname = 'user_regions';
      `
    });
    
    if (error) {
      console.error("Error checking user_regions RLS:", error);
      return { enabled: true, message: "Error checking RLS status" };
    }
    
    if (!data || !data.length) {
      return { enabled: false, message: "Could not determine RLS status" };
    }
    
    const rlsEnabled = data[0].rls_enabled;
    return { 
      enabled: rlsEnabled, 
      message: rlsEnabled ? 
        "RLS is enabled on user_regions table, which may cause permission issues" : 
        "RLS is disabled on user_regions table, permissions should work properly" 
    };
  } catch (error) {
    console.error("Error in checkUserRegionsRLS:", error);
    return { enabled: true, message: "Error checking RLS status" };
  }
}

/**
 * Fix permissions for the organization_admins table by disabling Row Level Security.
 * This should be called when permission issues occur with organization admin assignments.
 */
export async function fixOrganizationAdminsPermissions(): Promise<boolean> {
  try {
    console.log("Fixing organization_admins table permissions...");
    
    // Use the execute_sql RPC function to disable RLS on the organization_admins table
    const { error } = await supabase.rpc('execute_sql', {
      sql_query: `
        -- Disable Row Level Security on the organization_admins table
        ALTER TABLE public.organization_admins DISABLE ROW LEVEL SECURITY;
        
        -- Grant all privileges to the table
        GRANT ALL ON public.organization_admins TO anon, authenticated, service_role;
      `
    });
    
    if (error) {
      console.error("Error fixing organization_admins permissions:", error);
      
      // Try an alternative approach using a direct API call
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://supabase.eztechsolutions.pro';
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
        
        // Make a direct SQL query using the REST API
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            sql_query: `
              -- Disable Row Level Security on the organization_admins table
              ALTER TABLE public.organization_admins DISABLE ROW LEVEL SECURITY;
              
              -- Grant all privileges to the table
              GRANT ALL ON public.organization_admins TO anon, authenticated, service_role;
            `
          })
        });
        
        if (!response.ok) {
          console.error("Failed to fix organization_admins permissions via REST API:", await response.text());
          return false;
        }
        
        console.log("Successfully fixed organization_admins permissions via REST API");
        return true;
      } catch (directError) {
        console.error("Error fixing organization_admins permissions via direct API:", directError);
        return false;
      }
    }
    
    console.log("Successfully fixed organization_admins permissions");
    return true;
  } catch (error) {
    console.error("Error in fixOrganizationAdminsPermissions:", error);
    return false;
  }
}

/**
 * Check if the organization_admins table has RLS enabled
 */
export async function checkOrganizationAdminsRLS(): Promise<{ enabled: boolean, message: string }> {
  try {
    const { data, error } = await supabase.rpc('execute_sql', {
      sql_query: `
        SELECT 
          c.relname AS table_name,
          CASE WHEN c.relrowsecurity THEN true ELSE false END AS rls_enabled
        FROM 
          pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE 
          n.nspname = 'public' AND
          c.relname = 'organization_admins';
      `
    });
    
    if (error) {
      console.error("Error checking organization_admins RLS:", error);
      return { enabled: true, message: "Error checking RLS status" };
    }
    
    if (!data || !data.length) {
      return { enabled: false, message: "Could not determine RLS status" };
    }
    
    const rlsEnabled = data[0].rls_enabled;
    return { 
      enabled: rlsEnabled, 
      message: rlsEnabled ? 
        "RLS is enabled on organization_admins table, which may cause permission issues" : 
        "RLS is disabled on organization_admins table, permissions should work properly" 
    };
  } catch (error) {
    console.error("Error in checkOrganizationAdminsRLS:", error);
    return { enabled: true, message: "Error checking RLS status" };
  }
} 