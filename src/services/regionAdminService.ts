import { supabase } from '@/lib/supabase';

/**
 * Service for managing regional administrators
 */
export const regionAdminService = {
  /**
   * Assign a user as a regional admin
   * @param userId The ID of the user to assign
   * @param regionId The ID of the region to assign the user to
   * @returns Promise<{ success: boolean, message: string, data?: any }>
   */
  async assignRegionalAdmin(userId: string, regionId: string): Promise<{ success: boolean, message: string, data?: any }> {
    try {
      console.log(`Assigning user ${userId} as admin for region ${regionId}`);
      
      // Try to use an RPC function first (if it exists)
      const { data: rpcResult, error: rpcError } = await supabase.rpc('assign_regional_admin', { 
        p_user_id: userId, 
        p_region_id: regionId 
      });
      
      // If the RPC function worked, return its result
      if (!rpcError) {
        console.log("Successfully assigned regional admin via RPC function");
        return rpcResult;
      }
      
      // If the RPC function doesn't exist or failed with a specific error, try to use execute_sql
      console.log("RPC function failed, trying execute_sql:", rpcError);
      
      // Try the execute_sql approach
      const { data, error: sqlError } = await supabase.rpc('execute_sql', {
        sql_query: `
          -- First check if the assignment already exists
          DO $$
          DECLARE
            v_exists BOOLEAN;
          BEGIN
            -- Check if the assignment already exists
            SELECT EXISTS(
              SELECT 1 FROM user_regions
              WHERE user_id = '${userId}' AND region_id = '${regionId}'
            ) INTO v_exists;
            
            -- If it doesn't exist, create it
            IF NOT v_exists THEN
              INSERT INTO user_regions (user_id, region_id, created_at)
              VALUES ('${userId}', '${regionId}', NOW());
              
              -- Update the user's role to regional_admin if needed
              UPDATE users
              SET role = 'regional_admin',
                  updated_at = NOW()
              WHERE id = '${userId}'
              AND role NOT IN ('regional_admin', 'superadmin');
            END IF;
          END $$;
        `
      });
      
      if (sqlError) {
        console.error("Error executing SQL for regional admin assignment:", sqlError);
        return { success: false, message: sqlError.message || 'Failed to assign regional admin' };
      }
      
      console.log("Successfully assigned regional admin via execute_sql");
      return { success: true, message: 'User assigned as regional admin' };
    } catch (error: any) {
      console.error('Error assigning regional admin:', error);
      return { success: false, message: error.message || 'An unexpected error occurred' };
    }
  },
  
  /**
   * Get all regional admins with their respective regions
   * @returns Promise<Array<{ id: string, user_id: string, region_id: string, user_name: string, region_name: string }>>
   */
  async getAllRegionalAdmins() {
    try {
      const { data, error } = await supabase
        .from('user_regions')
        .select(`
          id,
          user_id,
          region_id,
          users:user_id (first_name, last_name, email),
          regions:region_id (name)
        `);
        
      if (error) throw error;
      
      return data.map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        region_id: item.region_id,
        user_name: `${item.users.first_name} ${item.users.last_name}`,
        user_email: item.users.email,
        region_name: item.regions.name
      }));
    } catch (error) {
      console.error('Error fetching regional admins:', error);
      return [];
    }
  }
}; 