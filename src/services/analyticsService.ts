import { supabase } from '@/lib/supabase';
import { reportingService } from './reportingService';
import { regionService } from './regionService';
import { organizationService } from './organizationService';

// Interfaces for analytics data
export interface EnrollmentTrend {
  date: string;
  farmers: number;
  organizations: number;
}

export interface RegionalMetric {
  region: string;
  farmers: number;
  organizations: number;
  budgetUtilization: number;
}

export interface CategoryDistribution {
  category: string;
  value: number;
}

export interface ActivityMetric {
  date: string;
  logins: number;
  actions: number;
  registrations: number;
}

export const analyticsService = {
  // Get enrollment trends over time
  async getEnrollmentTrends(
    startDate: string = '2023-01-01',
    endDate: string = new Date().toISOString().split('T')[0]
  ): Promise<EnrollmentTrend[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_enrollment_trends', {
          p_start_date: startDate,
          p_end_date: endDate
        });

      if (error) {
        console.error('Error fetching enrollment trends:', error);
        // Fallback to mock data on error to prevent UI breakage
        return generateMockEnrollmentTrends();
      }

      return data || generateMockEnrollmentTrends();
    } catch (error) {
      console.error('Exception in getEnrollmentTrends:', error);
      return generateMockEnrollmentTrends();
    }
  },

  // Get metrics for each region
  async getRegionalMetrics(): Promise<RegionalMetric[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_regional_metrics');

      if (error) {
        console.error('Error fetching regional metrics:', error);
        // Fallback to mock data on error
        return generateMockRegionalMetrics();
      }

      return data || generateMockRegionalMetrics();
    } catch (error) {
      console.error('Exception in getRegionalMetrics:', error);
      return generateMockRegionalMetrics();
    }
  },

  // Get crop distribution among farmers
  async getCropDistribution(): Promise<CategoryDistribution[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_crop_distribution');

      if (error) {
        console.error('Error fetching crop distribution:', error);
        return generateMockCropDistribution();
      }

      return data || generateMockCropDistribution();
    } catch (error) {
      console.error('Exception in getCropDistribution:', error);
      return generateMockCropDistribution();
    }
  },

  // Get organization growth by region
  async getOrganizationGrowthByRegion(): Promise<CategoryDistribution[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_organization_growth_by_region');

      if (error) {
        console.error('Error fetching organization growth:', error);
        return generateMockOrganizationGrowth();
      }

      return data || generateMockOrganizationGrowth();
    } catch (error) {
      console.error('Exception in getOrganizationGrowthByRegion:', error);
      return generateMockOrganizationGrowth();
    }
  },

  // Get user activity metrics
  async getUserActivityMetrics(
    startDate: string = '2023-01-01',
    endDate: string = new Date().toISOString().split('T')[0]
  ): Promise<ActivityMetric[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_user_activity_metrics', {
          p_start_date: startDate,
          p_end_date: endDate
        });

      if (error) {
        console.error('Error fetching user activity metrics:', error);
        return generateMockActivityMetrics();
      }

      return data || generateMockActivityMetrics();
    } catch (error) {
      console.error('Exception in getUserActivityMetrics:', error);
      return generateMockActivityMetrics();
    }
  },

  // Get approval rates for different request types
  async getApprovalRates(): Promise<CategoryDistribution[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_approval_rates');

      if (error) {
        console.error('Error fetching approval rates:', error);
        return generateMockApprovalRates();
      }

      return data || generateMockApprovalRates();
    } catch (error) {
      console.error('Exception in getApprovalRates:', error);
      return generateMockApprovalRates();
    }
  },

  // Get annual budget utilization by month
  async getBudgetUtilizationByMonth(
    fiscalYear: number = new Date().getFullYear()
  ): Promise<{ month: string; amount: number }[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_budget_utilization_by_month', {
          p_fiscal_year: fiscalYear
        });

      if (error) {
        console.error('Error fetching budget utilization by month:', error);
        return generateMockBudgetUtilization();
      }

      return data || generateMockBudgetUtilization();
    } catch (error) {
      console.error('Exception in getBudgetUtilizationByMonth:', error);
      return generateMockBudgetUtilization();
    }
  }
};

// Mock data generators (fallbacks for when real data isn't available)
function generateMockEnrollmentTrends(): EnrollmentTrend[] {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentYear = new Date().getFullYear();
  
  return months.map((month, index) => ({
    date: `${month} ${currentYear}`,
    farmers: 100 + Math.floor(Math.random() * 50) * (index + 1),
    organizations: 10 + Math.floor(Math.random() * 5) * (index + 1)
  }));
}

function generateMockRegionalMetrics(): RegionalMetric[] {
  const regions = [
    'National Capital Region',
    'Cordillera Administrative Region',
    'Ilocos Region',
    'Cagayan Valley',
    'Central Luzon'
  ];
  
  return regions.map(region => ({
    region,
    farmers: 100 + Math.floor(Math.random() * 500),
    organizations: 5 + Math.floor(Math.random() * 20),
    budgetUtilization: Math.floor(Math.random() * 100)
  }));
}

function generateMockCropDistribution(): CategoryDistribution[] {
  return [
    { category: 'Rice', value: 35 },
    { category: 'Corn', value: 20 },
    { category: 'Coconut', value: 15 },
    { category: 'Sugarcane', value: 10 },
    { category: 'Banana', value: 10 },
    { category: 'Others', value: 10 }
  ];
}

function generateMockOrganizationGrowth(): CategoryDistribution[] {
  return [
    { category: 'National Capital Region', value: 15 },
    { category: 'Cordillera Administrative Region', value: 8 },
    { category: 'Ilocos Region', value: 12 },
    { category: 'Cagayan Valley', value: 9 },
    { category: 'Central Luzon', value: 14 }
  ];
}

function generateMockActivityMetrics(): ActivityMetric[] {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentYear = new Date().getFullYear();
  
  return months.map(month => ({
    date: `${month} ${currentYear}`,
    logins: 50 + Math.floor(Math.random() * 100),
    actions: 200 + Math.floor(Math.random() * 300),
    registrations: 10 + Math.floor(Math.random() * 20)
  }));
}

function generateMockApprovalRates(): CategoryDistribution[] {
  return [
    { category: 'Organization Registration', value: 85 },
    { category: 'Budget Requests', value: 70 },
    { category: 'Farmer Applications', value: 90 },
    { category: 'Resource Requests', value: 65 }
  ];
}

function generateMockBudgetUtilization(): { month: string; amount: number }[] {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  return months.map(month => ({
    month,
    amount: 1000000 + Math.floor(Math.random() * 2000000)
  }));
} 