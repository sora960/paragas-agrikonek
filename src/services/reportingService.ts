import { supabase } from '@/lib/supabase';

export interface BudgetReport {
  total_budget: number;
  total_allocated: number;
  total_utilized: number;
  allocation_by_region: Record<string, number>;
  utilization_by_category: Record<string, number>;
  monthly_spending: Record<string, number>;
}

export interface OrganizationReport {
  organization_id: string;
  total_allocation: number;
  utilized_amount: number;
  remaining_amount: number;
  spending_by_category: Record<string, number>;
  monthly_trend: Record<string, number>;
  budget_requests: Array<{
    amount: number;
    status: string;
    request_date: string;
  }>;
}

export const reportingService = {
  async generateRegionalReport(regionId: string, fiscalYear: number): Promise<BudgetReport> {
    const { data: budgetData, error: budgetError } = await supabase
      .rpc('generate_regional_budget_report', {
        p_region_id: regionId,
        p_fiscal_year: fiscalYear
      });

    if (budgetError) throw budgetError;
    return budgetData;
  },

  async generateOrganizationReport(organizationId: string, fiscalYear: number): Promise<OrganizationReport> {
    const { data: orgReport, error: orgError } = await supabase
      .rpc('generate_organization_report', {
        p_organization_id: organizationId,
        p_fiscal_year: fiscalYear
      });

    if (orgError) throw orgError;
    return orgReport;
  },

  async generateUtilizationTrends(regionId: string, startDate: string, endDate: string) {
    const { data: trends, error: trendsError } = await supabase
      .rpc('generate_utilization_trends', {
        p_region_id: regionId,
        p_start_date: startDate,
        p_end_date: endDate
      });

    if (trendsError) throw trendsError;
    return trends;
  },

  async generateCategoryAnalysis(organizationId: string, fiscalYear: number) {
    const { data: analysis, error: analysisError } = await supabase
      .rpc('generate_category_analysis', {
        p_organization_id: organizationId,
        p_fiscal_year: fiscalYear
      });

    if (analysisError) throw analysisError;
    return analysis;
  },

  async exportBudgetReport(regionId: string, fiscalYear: number, format: 'csv' | 'pdf') {
    const { data: report, error: reportError } = await supabase
      .rpc('export_budget_report', {
        p_region_id: regionId,
        p_fiscal_year: fiscalYear,
        p_format: format
      });

    if (reportError) throw reportError;
    return report;
  }
}; 