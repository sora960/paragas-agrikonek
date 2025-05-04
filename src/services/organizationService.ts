import { supabase } from '@/lib/supabase';
import type { Organization, OrganizationMember, Budget, BudgetAllocation, FinancialReport, RegionBudget, BudgetAllocationSummary, BudgetExpense, BudgetUtilization, CategoryDistribution } from '@/types/organization';

export const organizationService = {
  // Organization Operations
  async getOrganization(id: string): Promise<Organization | null> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async getOrganizationByMember(userId: string): Promise<Organization | null> {
    type OrgResponse = {
      organization: {
        id: string;
        name: string;
        description?: string;
        created_at: string;
        updated_at: string;
        status: 'active' | 'inactive';
        region_id: string;
      };
    };

    const { data, error } = await supabase
      .from('organization_members')
      .select('organization:organization_id(*)')
      .eq('farmer_id', userId)
      .single<OrgResponse>();
    
    if (error) throw error;
    return data?.organization ? {
      id: data.organization.id,
      name: data.organization.name,
      description: data.organization.description,
      created_at: data.organization.created_at,
      updated_at: data.organization.updated_at,
      status: data.organization.status,
      region_id: data.organization.region_id
    } : null;
  },

  async createOrganization(organizationData: {
    name: string;
    island_group_id?: string;
    region_id: string;
    province_id?: string;
    registration_number: string;
    address: string;
    contact_person: string;
    contact_email: string;
    contact_phone: string;
    description?: string;
    status?: 'pending' | 'active' | 'inactive';
  }): Promise<Organization> {
    const { data, error } = await supabase
      .from('organizations')
      .insert({
        name: organizationData.name,
        island_group_id: organizationData.island_group_id,
        region_id: organizationData.region_id,
        province_id: organizationData.province_id,
        registration_number: organizationData.registration_number,
        address: organizationData.address,
        contact_person: organizationData.contact_person,
        contact_email: organizationData.contact_email,
        contact_phone: organizationData.contact_phone,
        description: organizationData.description || '',
        status: organizationData.status || 'pending'
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Budget Operations
  async getCurrentBudget(organizationId: string): Promise<Budget | null> {
    const currentYear = new Date().getFullYear();
    const { data, error } = await supabase
      .from('organization_budgets')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('fiscal_year', currentYear)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async getBudgetAllocations(budgetId: string): Promise<BudgetAllocation[]> {
    const { data, error } = await supabase
      .from('budget_allocations')
      .select('*')
      .eq('budget_id', budgetId);
    
    if (error) throw error;
    return data || [];
  },

  async createBudgetAllocation(allocation: Partial<BudgetAllocation>): Promise<BudgetAllocation> {
    const { data, error } = await supabase
      .from('budget_allocations')
      .insert(allocation)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateBudgetAllocation(id: string, updates: Partial<BudgetAllocation>): Promise<BudgetAllocation> {
    const { data, error } = await supabase
      .from('budget_allocations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Financial Reporting
  async createFinancialReport(report: Partial<FinancialReport>): Promise<FinancialReport> {
    const { data, error } = await supabase
      .from('financial_reports')
      .insert(report)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getFinancialReports(organizationId: string, fiscalYear?: number): Promise<FinancialReport[]> {
    let query = supabase
      .from('financial_reports')
      .select('*')
      .eq('organization_id', organizationId);
    
    if (fiscalYear) {
      query = query.eq('fiscal_year', fiscalYear);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // Budget Request Operations
  async requestBudgetIncrease(
    organizationId: string,
    currentBudget: number,
    requestedAmount: number,
    reason: string
  ): Promise<FinancialReport> {
    const report = {
      organization_id: organizationId,
      report_type: 'budget_request' as const,
      fiscal_year: new Date().getFullYear(),
      amount: requestedAmount,
      description: reason,
      status: 'submitted' as const,
    };

    return this.createFinancialReport(report);
  },

  // Regional Budget Operations
  async getRegionBudget(regionId: string, fiscalYear?: number): Promise<RegionBudget | null> {
    const year = fiscalYear || new Date().getFullYear();
    const { data, error } = await supabase
      .from('region_budgets')
      .select('*')
      .eq('region_id', regionId)
      .eq('fiscal_year', year)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async getRegionBudgetSummary(regionId: string, fiscalYear?: number): Promise<BudgetAllocationSummary | null> {
    const year = fiscalYear || new Date().getFullYear();
    const { data, error } = await supabase
      .from('budget_allocation_summary')
      .select('*')
      .eq('region_id', regionId)
      .eq('fiscal_year', year)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async getOrganizationRegion(organizationId: string): Promise<{ id: string; name: string } | null> {
    type RegionResponse = {
      regions: {
        id: string;
        name: string;
      };
    };

    const { data, error } = await supabase
      .from('organizations')
      .select('regions:region_id(id, name)')
      .eq('id', organizationId)
      .single<RegionResponse>();
    
    if (error) throw error;
    return data?.regions ? {
      id: data.regions.id,
      name: data.regions.name
    } : null;
  },

  // Budget Expense & Utilization Operations
  async createBudgetExpense(expense: Omit<BudgetExpense, 'id' | 'created_at' | 'updated_at'>): Promise<BudgetExpense> {
    const { data, error } = await supabase
      .from('budget_expenses')
      .insert(expense)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getBudgetExpenses(allocationId: string): Promise<BudgetExpense[]> {
    const { data, error } = await supabase
      .from('budget_expenses')
      .select('*')
      .eq('allocation_id', allocationId)
      .order('expense_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async updateExpenseStatus(expenseId: string, status: BudgetExpense['status']): Promise<BudgetExpense> {
    const { data, error } = await supabase
      .from('budget_expenses')
      .update({ status })
      .eq('id', expenseId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getBudgetUtilization(allocationId: string, year: number): Promise<BudgetUtilization[]> {
    const { data, error } = await supabase
      .from('budget_utilization')
      .select('*')
      .eq('allocation_id', allocationId)
      .eq('year', year)
      .order('month', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  async getCategoryDistribution(budgetId: string): Promise<CategoryDistribution[]> {
    const { data, error } = await supabase
      .rpc('get_category_distribution', { budget_id: budgetId });
    
    if (error) throw error;
    return data || [];
  },

  async recordExpense(
    allocationId: string, 
    amount: number, 
    description: string,
    expenseDate: string,
    receiptUrl?: string
  ): Promise<{ expense: BudgetExpense; updatedAllocation: BudgetAllocation }> {
    // Start a Supabase transaction
    const { data, error } = await supabase
      .rpc('record_budget_expense', {
        p_allocation_id: allocationId,
        p_amount: amount,
        p_description: description,
        p_expense_date: expenseDate,
        p_receipt_url: receiptUrl
      });

    if (error) throw error;
    return data;
  }
}; 