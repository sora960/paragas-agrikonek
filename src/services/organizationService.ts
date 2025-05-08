import { supabase } from '@/lib/supabase';
import type { Organization, OrganizationMember, Budget, BudgetAllocation, FinancialReport, RegionBudget, BudgetAllocationSummary, BudgetExpense, BudgetUtilization, CategoryDistribution } from '@/types/organization';

export const organizationService = {
  // Organization Operations
  async getOrganization(id: string): Promise<Organization | null> {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error("Error fetching organization:", error);
        return null;
      }
      return data;
    } catch (error) {
      console.error("Exception fetching organization:", error);
      return null;
    }
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
  },

  // Member Operations
  async getOrganizationMembers(organizationId: string): Promise<any[]> {
    try {
      // First fetch the members from organization_members table
      const { data: memberData, error: memberError } = await supabase
        .from("organization_members")
        .select(`
          id, 
          farmer_id,
          role,
          status,
          join_date
        `)
        .eq("organization_id", organizationId);
      
      if (memberError) {
        console.error("Error fetching organization members:", memberError);
        return [];
      }

      // If no members found, return empty array
      if (!memberData || memberData.length === 0) {
        return [];
      }

      // Extract farmer IDs to fetch farmer details
      const farmerIds = memberData.map(member => member.farmer_id);
      
      // Fetch farmer profiles
      const { data: farmerProfiles, error: farmerError } = await supabase
        .from("farmer_profiles")
        .select(`
          id,
          user_id,
          full_name,
          farm_name,
          email,
          phone
        `)
        .in("id", farmerIds);
      
      if (farmerError) {
        console.error("Error fetching farmer profiles:", farmerError);
        // Return basic member data without farmer details
        return memberData;
      }

      // Create a map of farmer profiles for easy lookup
      const farmerMap = farmerProfiles.reduce((acc, farmer) => {
        acc[farmer.id] = farmer;
        return acc;
      }, {});

      // Combine member data with farmer profiles
      return memberData.map(member => ({
        id: member.id,
        farmer_id: member.farmer_id,
        role: member.role,
        status: member.status,
        join_date: member.join_date,
        farmer: farmerMap[member.farmer_id] || {
          full_name: "Unknown Farmer",
          farm_name: "",
          email: "",
          phone: ""
        }
      }));
    } catch (error) {
      console.error("Exception fetching organization members:", error);
      return [];
    }
  },

  // Organization delete operation
  async deleteOrganization(organizationId: string): Promise<boolean> {
    try {
      // 1. Delete the organization admin relationships first
      const { error: adminError } = await supabase
        .from('organization_admins')
        .delete()
        .eq('organization_id', organizationId);
      
      if (adminError) {
        console.error("Error deleting organization admin relationships:", adminError);
        throw adminError;
      }
      
      // 2. Delete the organization members
      const { error: membersError } = await supabase
        .from('organization_members')
        .delete()
        .eq('organization_id', organizationId);
      
      if (membersError) {
        console.error("Error deleting organization members:", membersError);
        throw membersError;
      }
      
      // 3. Finally delete the organization itself
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', organizationId);
      
      if (error) {
        console.error("Error deleting organization:", error);
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error("Exception deleting organization:", error);
      return false;
    }
  },

  // Get next available registration number
  async getNextRegistrationNumber(): Promise<string> {
    try {
      // Get all existing registration numbers
      const { data, error } = await supabase
        .from('organizations')
        .select('registration_number')
        .order('registration_number', { ascending: false });
      
      if (error) {
        console.error("Error fetching registration numbers:", error);
        return "1"; // Default to 1 if there's an error
      }
      
      if (!data || data.length === 0) {
        return "1"; // First organization
      }
      
      // Find the highest numeric registration number
      let highestNumber = 0;
      
      data.forEach(org => {
        // Try to parse the registration number as an integer
        const regNum = parseInt(org.registration_number, 10);
        if (!isNaN(regNum) && regNum > highestNumber) {
          highestNumber = regNum;
        }
      });
      
      // Return the next number as a string
      return (highestNumber + 1).toString();
    } catch (error) {
      console.error("Exception getting next registration number:", error);
      return "1"; // Default to 1 if there's an exception
    }
  },

  // Get organization for a farmer member (for direct access)
  async getOrganizationForMember(userId: string): Promise<{ id: string; name: string } | null> {
    try {
      // First check if this user is a farmer
      const { data: farmerProfile, error: farmerError } = await supabase
        .from('farmer_profiles')
        .select('id, organization_id')
        .eq('user_id', userId)
        .single();
        
      if (farmerError) {
        console.error("Error fetching farmer profile:", farmerError);
        return null;
      }
      
      // If the farmer has an organization_id directly in their profile
      if (farmerProfile?.organization_id) {
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('id, name')
          .eq('id', farmerProfile.organization_id)
          .single();
          
        if (orgError) {
          console.error("Error fetching organization:", orgError);
          return null;
        }
        
        return org;
      }
      
      // If not found in profile, check organization_members table
      if (farmerProfile?.id) {
        const { data: membership, error: membershipError } = await supabase
          .from('organization_members')
          .select('organization_id, organizations:organization_id(id, name)')
          .eq('farmer_id', farmerProfile.id)
          .eq('status', 'active')
          .single();
          
        if (membershipError) {
          console.error("Error fetching membership:", membershipError);
          return null;
        }
        
        if (membership?.organizations) {
          return {
            id: membership.organizations.id,
            name: membership.organizations.name
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error("Exception getting organization for member:", error);
      return null;
    }
  },

  // Get organizations managed by an admin
  async getOrganizationByAdmin(userId: string): Promise<Array<{ id: string; name: string }>> {
    try {
      const { data, error } = await supabase
        .from('organization_admins')
        .select(`
          organization_id,
          organizations:organization_id (
            id,
            name
          )
        `)
        .eq('user_id', userId);
      
      if (error) {
        console.error("Error fetching admin organizations:", error);
        return [];
      }
      
      return data.map(item => ({
        id: item.organizations.id,
        name: item.organizations.name
      }));
    } catch (error) {
      console.error("Exception getting admin organizations:", error);
      return [];
    }
  },

  async updateOrganization(
    id: string, 
    updates: Partial<{
      name: string;
      address: string;
      contact_person: string;
      contact_email: string;
      contact_phone: string;
      description: string;
      status: 'pending' | 'active' | 'inactive';
    }>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', id);
      
      if (error) {
        console.error("Error updating organization:", error);
        return false;
      }
      return true;
    } catch (error) {
      console.error("Exception updating organization:", error);
      return false;
    }
  }
}; 