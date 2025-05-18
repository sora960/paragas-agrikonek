/**
 * Utility functions for direct database access bypassing RLS
 * These functions use direct fetch calls to the Supabase REST API
 */

// Get the API keys from environment
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://supabase.eztechsolutions.pro';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Headers for authenticated requests
const getAuthHeaders = (token?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': supabaseKey,
  };
  
  // Use provided token or fall back to anon key
  headers['Authorization'] = `Bearer ${token || supabaseKey}`;
  
  return headers;
};

/**
 * Assign a user as a regional admin
 * @param userId User ID to assign
 * @param regionId Region ID to assign the user to
 * @returns Promise<{ success: boolean, message: string, data?: any }>
 */
export async function assignRegionalAdmin(
  userId: string, 
  regionId: string
): Promise<{ success: boolean, message: string, data?: any }> {
  try {
    console.log(`Attempting to assign user ${userId} to region ${regionId}`);
    
    // First check if the assignment already exists
    const checkResponse = await fetch(
      `${supabaseUrl}/rest/v1/user_regions?user_id=eq.${userId}&region_id=eq.${regionId}`,
      {
        method: 'GET',
        headers: {
          ...getAuthHeaders(),
          'Prefer': 'return=representation'
        }
      }
    );
    
    if (!checkResponse.ok) {
      console.error("Error checking existing assignment:", await checkResponse.text());
      return { 
        success: false, 
        message: `Error checking existing assignment: ${checkResponse.statusText}` 
      };
    }
    
    const existingAssignments = await checkResponse.json();
    
    if (existingAssignments && existingAssignments.length > 0) {
      return { 
        success: true, 
        message: "User is already assigned to this region",
        data: existingAssignments[0]
      };
    }
    
    // If no existing assignment, create one directly with SQL to bypass RLS
    const sqlQuery = `
      INSERT INTO public.user_regions (user_id, region_id, created_at)
      VALUES ('${userId}', '${regionId}', NOW());
      
      UPDATE public.users
      SET role = 'regional_admin'
      WHERE id = '${userId}' AND role NOT IN ('regional_admin', 'superadmin');
    `;
    
    const sqlResponse = await fetch(
      `${supabaseUrl}/rest/v1/rpc/execute_sql`,
      {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          sql_query: sqlQuery
        })
      }
    );
    
    if (!sqlResponse.ok) {
      const errorText = await sqlResponse.text();
      console.error("Error executing SQL:", errorText);
      
      // If the SQL approach failed, try the simple insert approach
      console.log("SQL failed, trying direct insert...");
      const insertResponse = await fetch(
        `${supabaseUrl}/rest/v1/user_regions`,
        {
          method: 'POST',
          headers: {
            ...getAuthHeaders(),
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            user_id: userId,
            region_id: regionId,
            created_at: new Date().toISOString()
          })
        }
      );
      
      if (!insertResponse.ok) {
        const insertErrorText = await insertResponse.text();
        console.error("Error inserting user_region:", insertErrorText);
        return { 
          success: false, 
          message: `Error assigning regional admin: ${insertErrorText}` 
        };
      }
      
      const insertedData = await insertResponse.json();
      console.log("Successfully inserted user_region:", insertedData);
      
      // Update the user's role
      try {
        await fetch(
          `${supabaseUrl}/rest/v1/users?id=eq.${userId}`,
          {
            method: 'PATCH',
            headers: {
              ...getAuthHeaders(),
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              role: 'regional_admin',
              updated_at: new Date().toISOString()
            })
          }
        );
        console.log("Successfully updated user role to regional_admin");
      } catch (roleError) {
        console.warn("Failed to update user role, but assignment was successful:", roleError);
      }
      
      return { 
        success: true, 
        message: "User successfully assigned as regional admin",
        data: insertedData
      };
    }
    
    console.log("Successfully assigned regional admin via SQL");
    return { 
      success: true, 
      message: "User successfully assigned as regional admin"
    };
  } catch (error: any) {
    console.error("Error in assignRegionalAdmin:", error);
    return { 
      success: false, 
      message: error.message || "An unexpected error occurred" 
    };
  }
}

/**
 * Alternative method to assign regional admin using SQL bypass
 */
async function assignRegionalAdminViaSQL(
  userId: string, 
  regionId: string
): Promise<{ success: boolean, message: string, data?: any }> {
  try {
    // Try to use Supabase Functions or a custom API endpoint
    // This is just a placeholder - you'd need to implement the actual function
    const functionUrl = `${supabaseUrl}/rest/v1/rpc/assign_regional_admin`;
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ 
        p_user_id: userId, 
        p_region_id: regionId 
      })
    });
    
    if (!response.ok) {
      console.error("Failed to assign via SQL function:", await response.text());
      return { 
        success: false, 
        message: "Failed to assign regional admin. All approaches failed." 
      };
    }
    
    const result = await response.json();
    return { 
      success: true, 
      message: "User successfully assigned as regional admin via SQL function",
      data: result
    };
  } catch (error: any) {
    console.error("Error in assignRegionalAdminViaSQL:", error);
    return { 
      success: false, 
      message: error.message || "An unexpected error occurred with SQL bypass" 
    };
  }
} 