/**
 * Utility functions for direct database access bypassing RLS
 * These functions use direct fetch calls to the Supabase REST API
 */

import { supabase } from '@/lib/supabase';

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
 * Direct method to assign a regional administrator to a region
 * This bypasses RLS by using a stored procedure
 */
export const assignRegionalAdmin = async (userId: string, regionId: string) => {
  try {
    // Call the stored procedure with the correct name
    const { data, error } = await supabase.rpc('assign_regional_admin', {
      p_user_id: userId,
      p_region_id: regionId
    });
    
    if (error) throw error;
    
    return { success: true, data };
  } catch (error: any) {
    console.error('Error in assignRegionalAdmin:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Direct method to update region budget allocations
 * This bypasses RLS by using a stored procedure
 */
export const updateRegionBudgetDirect = async (
  regionId: string, 
  amount: number,
  fiscalYear: number = new Date().getFullYear()
) => {
  try {
    // Call a stored procedure that will be created in the database
    const { data, error } = await supabase.rpc('admin_update_region_budget', {
      p_region_id: regionId,
      p_amount: amount,
      p_fiscal_year: fiscalYear
    });
    
    if (error) throw error;
    
    return { success: true, data };
  } catch (error: any) {
    console.error('Error in updateRegionBudgetDirect:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Direct method to process a budget request
 */
export const directProcessBudgetRequest = async (
  requestId: string,
  status: "approved" | "rejected",
  response: string = "",
  userId?: string
) => {
  try {
    // Call the stored procedure
    const { data, error } = await supabase.rpc('admin_process_budget_request', {
      p_request_id: requestId,
      p_status: status,
      p_response: response,
      p_user_id: userId
    });
    
    if (error) throw error;
    
    return { success: true, data };
  } catch (error: any) {
    console.error('Error in directProcessBudgetRequest:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Get all regions with their budget allocations
 * Direct method that bypasses RLS
 */
export const getRegionBudgetsDirect = async () => {
  try {
    const { data, error } = await supabase.rpc('admin_get_region_budgets');
    
    if (error) throw error;
    
    return { success: true, data };
  } catch (error: any) {
    console.error('Error in getRegionBudgetsDirect:', error);
    return { success: false, message: error.message, data: [] };
  }
};

/**
 * Save all region budget allocations in a batch
 */
export const saveRegionBudgetsBatch = async (allocations: Record<string, number>) => {
  try {
    // Convert allocations object to array format
    const allocationsArray = Object.entries(allocations).map(([regionId, amount]) => ({
      region_id: regionId,
      amount: amount
    }));
    
    const { data, error } = await supabase.rpc('admin_save_region_budgets_batch', {
      p_allocations: allocationsArray
    });
    
    if (error) throw error;
    
    return { success: true, data };
  } catch (error: any) {
    console.error('Error in saveRegionBudgetsBatch:', error);
    return { success: false, message: error.message };
  }
};

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