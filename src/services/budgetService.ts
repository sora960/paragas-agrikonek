import { supabase } from '@/lib/supabase';
import { regionService } from './regionService';

interface BudgetAllocation {
  organization_id: string;
  amount: number;
  fiscal_year: number;
}

interface BudgetRequest {
  organization_id: string;
  current_amount: number;
  requested_amount: number;
  reason: string;
}

interface BudgetExpense {
  organization_id: string;
  amount: number;
  description: string;
  expense_date: string;
}

// Helper function to get the current fiscal year (using next calendar year)
export const getCurrentFiscalYear = (): number => {
  return new Date().getFullYear() + 1;
};

export const budgetService = {
  // Regional Budget Operations
  async getRegionalBudget(regionId: string) {
    const { data, error } = await supabase
      .from('region_budgets')
      .select('*')
      .eq('region_id', regionId)
      .eq('fiscal_year', getCurrentFiscalYear())
      .single();

    if (error) throw error;
    return data;
  },

  async getRegionalBudgetSummary(regionId: string) {
    const { data, error } = await supabase
      .from('budget_allocation_summary')
      .select('*')
      .eq('region_id', regionId)
      .single();

    if (error) throw error;
    return data;
  },

  async allocateOrganizationBudget({ organization_id, amount, fiscal_year }: BudgetAllocation) {
    const { data, error } = await supabase
      .rpc('allocate_organization_budget', {
        p_organization_id: organization_id,
        p_amount: amount,
        p_fiscal_year: fiscal_year || getCurrentFiscalYear()
      });

    if (error) throw error;
    return data;
  },

  // Organization Budget Operations
  async getOrganizationBudget(organizationId: string) {
    const { data, error } = await supabase
      .from('organization_budgets')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('fiscal_year', getCurrentFiscalYear())
      .single();

    if (error) throw error;
    return data;
  },

  async getOrganizationBudgetSummary(organizationId: string) {
    const { data, error } = await supabase
      .from('organization_budget_summary')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    if (error) throw error;
    return data;
  },

  async recordExpense({ organization_id, amount, description, expense_date }: BudgetExpense) {
    const { data, error } = await supabase
      .rpc('record_organization_expense', {
        p_organization_id: organization_id,
        p_amount: amount,
        p_description: description,
        p_expense_date: expense_date
      });

    if (error) throw error;
    return data;
  },

  async requestBudgetIncrease({ organization_id, current_amount, requested_amount, reason }: BudgetRequest) {
    const { data, error } = await supabase
      .rpc('request_budget_increase', {
        p_organization_id: organization_id,
        p_current_amount: current_amount,
        p_requested_amount: requested_amount,
        p_reason: reason
      });

    if (error) throw error;
    return data;
  },

  async getBudgetRequests(organizationId: string) {
    const { data, error } = await supabase
      .from('budget_requests')
      .select('*')
      .eq('organization_id', organizationId)
      .order('request_date', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getPendingBudgetRequests(regionId: string) {
    const { data, error } = await supabase
      .from('budget_requests')
      .select(`
        *,
        organizations (
          id,
          name,
          region_id
        )
      `)
      .eq('status', 'pending')
      .eq('organizations.region_id', regionId);

    if (error) throw error;
    return data;
  },

  async processBudgetRequest(requestId: string, status: 'approved' | 'rejected', notes: string, superadminId?: string): Promise<any> {
    console.log(`Processing budget request ${requestId} with status ${status}`);
    
    // Don't rely on session which might not be available with custom auth
    try {
      // First try the direct admin RPC approach for superadmins
      try {
        console.log('Attempting to process request via admin RPC...');
        const { data: rpcResult, error: rpcError } = await supabase
          .rpc('admin_process_budget_request', {
            p_request_id: requestId,
            p_status: status,
            p_notes: notes || '',
            p_admin_id: superadminId || null
          });
          
        if (!rpcError && rpcResult) {
          console.log('Successfully processed budget request via admin RPC:', rpcResult);
          return rpcResult;
        }
        
        console.log('Admin RPC method failed or not available:', rpcError);
      } catch (rpcErr) {
        console.log('Admin RPC method not available, using standard approach:', rpcErr);
      }
      
      // Fetch the request details
      const { data: request, error: fetchError } = await supabase
        .from('budget_requests')
        .select('*')
        .eq('id', requestId)
        .single();
        
      if (fetchError) {
        console.error('Error fetching budget request:', fetchError);
        throw fetchError;
      }
      
      if (!request) {
        throw new Error('Budget request not found');
      }
      
      console.log('Budget request details:', request);

      // If approved, update the region's budget
      if (status === 'approved') {
        try {
          // Get the current region budget
          const fiscalYear = new Date(request.request_date).getFullYear();
          console.log(`Updating budget for region ${request.region_id} for fiscal year ${fiscalYear}`);
          
          const { data: regionBudget, error: regionBudgetError } = await supabase
            .from('region_budgets')
            .select('*')
            .eq('region_id', request.region_id)
            .eq('fiscal_year', fiscalYear)
            .maybeSingle();
            
          if (regionBudgetError && regionBudgetError.code !== 'PGRST116') {
            console.error('Error fetching region budget:', regionBudgetError);
            throw regionBudgetError;
          }
          
          const currentAmount = regionBudget?.amount || 0;
          const newAmount = currentAmount + Number(request.requested_amount);
          console.log(`Updating region budget from ${currentAmount} to ${newAmount}`);
          
          // Update or create the region budget
          await regionService.setRegionBudget(request.region_id, newAmount, fiscalYear);
          console.log('Region budget updated successfully');
          
          // Create a notification for the regional admin
          try {
            const { data: regionUsers } = await supabase
              .from('user_regions')
              .select('user_id')
              .eq('region_id', request.region_id);
            
            if (regionUsers && regionUsers.length > 0) {
              // Get the region name for the notification
              const { data: regionData } = await supabase
                .from('regions')
                .select('name')
                .eq('id', request.region_id)
                .single();
              
              const regionName = regionData?.name || 'your region';
              
              // Create notifications for all regional admins
              const notifications = regionUsers.map(ru => ({
                user_id: ru.user_id,
                title: 'Budget Request Approved',
                message: `Your budget request for ₱${request.requested_amount.toLocaleString()} has been approved. The funds have been added to ${regionName}'s budget.`,
                is_read: false,
                created_at: new Date().toISOString(),
                type: 'budget_request_approved',
                reference_id: requestId
              }));
              
              console.log('Creating notifications for regional admins:', notifications);
              // Insert all notifications
              const { error: notificationError } = await supabase
                .from('notifications')
                .insert(notifications);
                
              if (notificationError) {
                console.error('Error creating notifications:', notificationError);
                // Don't throw here, just log the error since notifications are non-critical
              } else {
                console.log('Notifications created successfully');
              }
            }
          } catch (notificationError) {
            console.error('Error processing notifications:', notificationError);
            // Don't throw here, continue with status update
          }
        } catch (budgetError: any) {
          console.error('Error updating region budget:', budgetError);
          throw budgetError;
        }
      }

      // Update the request status and processed fields
      console.log(`Updating request ${requestId} status to ${status}`);
      const { data, error } = await supabase
        .from('budget_requests')
        .update({
          status,
          notes,
          processed_by: superadminId || null,
          processed_date: new Date().toISOString()
        })
        .eq('id', requestId)
        .select()
        .single();
        
      if (error) {
        console.error('Error updating budget request status:', error);
        throw error;
      }
      
      console.log('Budget request processed successfully:', data);
      return data;
    } catch (error: any) {
      console.error('Error in processBudgetRequest:', error);
      throw error;
    }
  },

  // Budget Reporting
  async getBudgetUtilization(organizationId: string) {
    const { data, error } = await supabase
      .from('budget_expenses')
      .select(`
        amount,
        expense_date,
        description,
        status,
        budget_allocations (
          category
        )
      `)
      .eq('organization_id', organizationId)
      .order('expense_date', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getCategoryDistribution(organizationId: string) {
    const { data, error } = await supabase
      .from('budget_allocations')
      .select(`
        category,
        amount,
        utilized_amount,
        remaining_amount
      `)
      .eq('organization_id', organizationId)
      .eq('fiscal_year', new Date().getFullYear());

    if (error) throw error;
    return data;
  }
}; 