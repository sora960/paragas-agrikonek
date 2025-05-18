import { supabase } from "@/lib/supabase";

// Function to directly update region budget by bypassing RLS
// This should be executed by the superadmin only
export async function directUpdateRegionBudget(regionId: string, amount: number) {
  console.log(`DIRECT SQL: Updating region budget: ${regionId}, amount: ${amount}`);
  
  try {
    // This uses a raw SQL query to bypass RLS
    // Only works if user has sufficient database privileges
    const { data, error } = await supabase.rpc(
      'admin_execute_sql',
      {
        sql_query: `
          INSERT INTO region_budgets (region_id, amount, allocated)
          VALUES ('${regionId}', ${amount}, false)
          ON CONFLICT (region_id)
          DO UPDATE SET amount = ${amount}, updated_at = NOW()
          RETURNING id, region_id, amount, allocated, created_at, updated_at
        `
      }
    );
    
    if (error) {
      console.error('Error executing direct SQL:', error);
      throw error;
    }
    
    console.log('Direct SQL result:', data);
    return data?.[0] || null;
  } catch (error) {
    console.error('Error in directUpdateRegionBudget:', error);
    throw error;
  }
}

// Function to directly insert a budget request by bypassing RLS
export async function directInsertBudgetRequest(
  regionId: string,
  userId: string,
  amount: number,
  reason: string
) {
  console.log(`DIRECT SQL: Creating budget request for region: ${regionId}, amount: ${amount}`);
  
  try {
    // This uses a raw SQL query to bypass RLS
    const { data, error } = await supabase.rpc(
      'admin_execute_sql',
      {
        sql_query: `
          INSERT INTO budget_requests (
            region_id, 
            user_id, 
            requested_amount, 
            reason, 
            status, 
            request_date,
            created_at
          )
          VALUES (
            '${regionId}', 
            '${userId}', 
            ${amount}, 
            '${reason.replace(/'/g, "''")}', 
            'pending', 
            NOW(),
            NOW()
          )
          RETURNING id, region_id, requested_amount, reason, status
        `
      }
    );
    
    if (error) {
      console.error('Error executing direct SQL for budget request:', error);
      throw error;
    }
    
    console.log('Direct budget request result:', data);
    return data?.[0] || null;
  } catch (error) {
    console.error('Error in directInsertBudgetRequest:', error);
    throw error;
  }
}

// Function to directly process a budget request by bypassing RLS
export async function directProcessBudgetRequest(
  requestId: string, 
  status: 'approved' | 'rejected', 
  notes: string,
  adminId?: string
) {
  console.log(`DIRECT SQL: Processing budget request: ${requestId}, status: ${status}`);
  
  try {
    // First get the budget request details
    const { data: request, error: requestError } = await supabase
      .from('budget_requests')
      .select('*')
      .eq('id', requestId)
      .single();
      
    if (requestError) {
      console.error('Error fetching request:', requestError);
      throw requestError;
    }
    
    if (!request) {
      throw new Error('Budget request not found');
    }
    
    console.log('Budget request details:', request);
    
    // If approved, update the region budget
    if (status === 'approved') {
      // Get current region budget - just use the region_id without fiscal year
      const { data: currentBudget } = await supabase.rpc(
        'admin_execute_sql',
        {
          sql_query: `
            SELECT amount FROM region_budgets 
            WHERE region_id = '${request.region_id}'
          `
        }
      );
      
      const currentAmount = currentBudget?.[0]?.amount || 0;
      const newAmount = currentAmount + Number(request.requested_amount);
      
      console.log(`Updating budget from ${currentAmount} to ${newAmount}`);
      
      // Update the region budget without fiscal year
      await supabase.rpc(
        'admin_execute_sql',
        {
          sql_query: `
            INSERT INTO region_budgets (region_id, amount, allocated, updated_at)
            VALUES ('${request.region_id}', ${newAmount}, false, NOW())
            ON CONFLICT (region_id)
            DO UPDATE SET amount = ${newAmount}, updated_at = NOW()
            RETURNING id, region_id, amount, allocated, created_at, updated_at
          `
        }
      );
      
      // Create notifications for regional admins
      try {
        const { data: regionUsers } = await supabase
          .from('user_regions')
          .select('user_id')
          .eq('region_id', request.region_id);
          
        if (regionUsers && regionUsers.length > 0) {
          const { data: regionData } = await supabase
            .from('regions')
            .select('name')
            .eq('id', request.region_id)
            .single();
            
          const regionName = regionData?.name || 'your region';
          
          // Create notification entries directly with SQL
          const notifications = regionUsers.map(ru => ({
            user_id: ru.user_id,
            title: 'Budget Request Approved',
            message: `Your budget request for ₱${request.requested_amount.toLocaleString()} has been approved. The funds have been added to ${regionName}'s budget.`,
            is_read: false,
            created_at: new Date().toISOString(),
            type: 'budget_request_approved',
            reference_id: requestId
          }));
          
          // Insert notifications
          await supabase.from('notifications').insert(notifications);
        }
      } catch (notifyError) {
        console.error('Error creating notifications:', notifyError);
        // Continue processing even if notifications fail
      }
    }
    
    // Update request status with direct SQL
    const { data: updateResult, error: updateError } = await supabase.rpc(
      'admin_execute_sql',
      {
        sql_query: `
          UPDATE budget_requests
          SET 
            status = '${status}',
            notes = '${notes || ''}',
            processed_by = ${adminId ? `'${adminId}'` : 'NULL'},
            processed_date = NOW()
          WHERE id = '${requestId}'
          RETURNING *
        `
      }
    );
    
    if (updateError) {
      console.error('Error updating request status:', updateError);
      throw updateError;
    }
    
    console.log('Request processed successfully:', updateResult);
    return updateResult?.[0] || null;
  } catch (error) {
    console.error('Error in directProcessBudgetRequest:', error);
    throw error;
  }
}

// Create RLS bypass function for the database
// This is a SQL function that needs to be created in the database
export const createAdminExecuteSqlFunction = `
CREATE OR REPLACE FUNCTION admin_execute_sql(sql_query text)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- This makes it run with the privileges of the function creator
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Only allow superusers to execute this
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles 
    WHERE rolname = current_user 
    AND rolsuper = true
  ) THEN
    RAISE EXCEPTION 'Only superusers can execute this function';
  END IF;

  EXECUTE 'WITH result AS (' || sql_query || ') SELECT jsonb_agg(row_to_json(result)) FROM result' INTO result;
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION admin_execute_sql TO authenticated;
`; 