export interface Organization {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  status: 'active' | 'inactive';
  island_group_id?: string;
  region_id: string;
  province_id?: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  farmer_id: string;
  role: 'admin' | 'member';
  join_date: string;
  status: 'active' | 'inactive' | 'pending' | 'rejected';
}

export interface Budget {
  id: string;
  organization_id: string;
  fiscal_year: number;
  total_allocation: number;
  utilized_amount: number;
  remaining_amount: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface BudgetAllocation {
  id: string;
  budget_id: string;
  category: string;
  allocated_amount: number;
  utilized_amount: number;
  remaining_amount: number;
  status: 'active' | 'depleted' | 'pending';
  created_at: string;
  updated_at: string;
}

export interface FinancialReport {
  id: string;
  organization_id: string;
  report_type: 'expense' | 'income' | 'budget_request';
  fiscal_year: number;
  amount: number;
  description: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface RegionBudget {
  id: string;
  region_id: string;
  fiscal_year: number;
  amount: number;
  allocated: boolean;
  created_at: string;
  updated_at: string;
}

export interface AnnualBudget {
  id: string;
  fiscal_year: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

export interface BudgetAllocationSummary {
  region_id: string;
  fiscal_year: number;
  total_budget: number;
  allocated_budget: number;
  remaining_budget: number;
  organization_count: number;
}

export interface BudgetExpense {
  id: string;
  allocation_id: string;
  amount: number;
  description: string;
  expense_date: string;
  receipt_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface BudgetUtilization {
  allocation_id: string;
  month: number;
  year: number;
  amount: number;
  created_at: string;
}

export interface CategoryDistribution {
  category: string;
  total_allocated: number;
  total_utilized: number;
  expense_count: number;
  last_expense_date?: string;
} 