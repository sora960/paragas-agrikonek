import { supabase } from '@/lib/supabase';

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

export const budgetService = {
  // Regional Budget Operations
  async getRegionalBudget(regionId: string) {
    const { data, error } = await supabase
      .from('region_budgets')
      .select('*')
      .eq('region_id', regionId)
      .eq('fiscal_year', new Date().getFullYear())
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
        p_fiscal_year: fiscal_year
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
      .eq('fiscal_year', new Date().getFullYear())
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

  async processBudgetRequest(requestId: string, status: 'approved' | 'rejected', notes: string) {
    const { data, error } = await supabase
      .rpc('process_budget_request', {
        p_request_id: requestId,
        p_status: status,
        p_notes: notes
      });

    if (error) throw error;
    return data;
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