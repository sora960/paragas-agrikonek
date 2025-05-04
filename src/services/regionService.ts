import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// Get the API key for manual requests
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://supabase.eztechsolutions.pro';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnc2VleHVlcGZva25qeHB5bG1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTY0MTcyMzksImV4cCI6MjAzMTk5MzIzOX0.nOE0hOyIxeDPp7UlHJUEjRB_rvQo3eMQvLwWJkNLPJ4';

// Create a dedicated supabase client with the auth headers properly set
const directClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`
    }
  }
});

// Define auth headers object for reuse
const authHeaders = {
  'apikey': supabaseAnonKey,
  'Authorization': `Bearer ${supabaseAnonKey}`
};

// Function to update the direct client with latest auth information
export async function updateDirectClientWithAuth() {
  try {
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.access_token) {
      // Update the auth headers with the latest authentication token
      Object.assign(authHeaders, {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${session.access_token}`
      });
      
      // Create a new client with updated headers
      const updatedClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        },
        global: {
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      });
      
      // Replace the directClient methods with the updated client's methods
      Object.assign(directClient, updatedClient);
      
      console.log('Updated direct client with authenticated session');
      return true;
    } else {
      // Fall back to anon key if no session
      console.log('No authenticated session found, using anon key');
      return false;
    }
  } catch (error) {
    console.error('Error updating direct client auth:', error);
    return false;
  }
}

// Types for region management
export interface Province {
  id: string;
  name: string;
  region_id?: string;
  region_code?: string;
  farmers: number;
  organizations: number;
  status: 'active' | 'pending';
  created_at: string;
  updated_at: string;
}

export interface Region {
  id: string;
  code: string;
  name: string;
  island_group_id: string;
  priority: 'high' | 'medium' | 'low';
  created_at: string;
  updated_at: string;
  province_count?: number;
  total_farmers?: number;
  total_organizations?: number;
  budget_amount?: number;
  is_budget_allocated?: boolean;
  // Agricultural data fields
  major_crops?: string[];
  land_area_hectares?: number;
  agricultural_land_percentage?: number;
  annual_rainfall_mm?: number;
  climate_type?: string;
  soil_type?: string[];
  terrain_description?: string;
  farming_households?: number;
  // For UI state
  provinces?: Province[];
  allocation?: number;
}

export interface IslandGroup {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  regions?: Region[];
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

// Cache for column name to avoid repeated checks
let provinceRegionColumnName: string | null = null;

// Service functions
export const regionService = {
  // Helper function to determine the region column in provinces table
  async getProvinceRegionColumnName(): Promise<string> {
    // If we already determined the column name, return it
    if (provinceRegionColumnName) {
      return provinceRegionColumnName;
    }
    
    // Check if region_id column exists
    const { data: regionIdColumn } = await directClient
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'provinces')
      .eq('column_name', 'region_id')
      .maybeSingle();
      
    if (regionIdColumn) {
      provinceRegionColumnName = 'region_id';
      return 'region_id';
    }
    
    // Check if region_code column exists
    const { data: regionCodeColumn } = await directClient
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'provinces')
      .eq('column_name', 'region_code')
      .maybeSingle();
      
    if (regionCodeColumn) {
      provinceRegionColumnName = 'region_code';
      return 'region_code';
    }
    
    // Default to region_id if neither exists (for new installations)
    provinceRegionColumnName = 'region_id';
    return 'region_id';
  },

  // Island Group Operations
  async getIslandGroups(): Promise<IslandGroup[]> {
    console.log('Fetching island groups...');
    const { data, error } = await directClient
      .from('island_groups')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching island groups:', error);
      throw error;
    }
    console.log('Successfully fetched island groups:', data);
    return data || [];
  },

  // Region Operations
  async getRegions(): Promise<Region[]> {
    console.log('Fetching regions...');
    try {
      const { data, error } = await directClient
        .from('regions')
        .select(`
          *,
          island_groups (name)
        `)
        .order('name');
      
      if (error) {
        console.error('Error fetching regions:', error);
        throw error;
      }
      console.log('Successfully fetched regions:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('Error in getRegions:', error);
      return [];
    }
  },

  async getRegionsByIslandGroup(islandGroupId: string): Promise<Region[]> {
    try {
      console.log(`Fetching regions for island group: ${islandGroupId}`);
      
      // Don't validate the IDs since they appear to be UUIDs in the database
      // Remove any validation that checks if the ID is "luzon-island", etc.
      
      const { data, error } = await supabase
        .from('regions')
        .select('*')
        .eq('island_group_id', islandGroupId)
        .order('name');
      
      if (error) {
        console.error('Error fetching regions by island group:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getRegionsByIslandGroup:', error);
      return [];
    }
  },

  async getRegionDetails(regionId: string): Promise<Region> {
    try {
      const { data, error } = await directClient
        .from('regions')
        .select(`
          *,
          islands:island_group_id (name)
        `)
        .eq('id', regionId)
        .single();
      
      if (error) throw error;
      
      // Fetch agricultural data from agricultural_data table if it exists
      try {
        const { data: agData, error: agError } = await directClient
          .from('agricultural_data')
          .select('*')
          .eq('region_id', regionId)
          .maybeSingle();
        
        if (!agError && agData) {
          // Merge agricultural data into the region data
          return {
            ...data,
            major_crops: agData.major_crops,
            land_area_hectares: agData.land_area_hectares,
            agricultural_land_percentage: agData.agricultural_land_percentage,
            annual_rainfall_mm: agData.annual_rainfall_mm,
            climate_type: agData.climate_type,
            soil_type: agData.soil_type,
            terrain_description: agData.terrain_description,
            farming_households: agData.farming_households
          };
        }
      } catch (agDataError) {
        console.error("Error fetching agricultural data:", agDataError);
        // Continue without agricultural data
      }
      
      return data;
    } catch (error) {
      console.error("Error in getRegionDetails:", error);
      throw error;
    }
  },

  async createRegion(region: {
    name: string;
    code: string;
    island_group_id: string;
    priority?: 'high' | 'medium' | 'low';
  }): Promise<Region> {
    const { data, error } = await directClient
      .from('regions')
      .insert({
        name: region.name,
        code: region.code,
        island_group_id: region.island_group_id,
        priority: region.priority || 'medium'
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateRegionPriority(regionId: string, priority: 'high' | 'medium' | 'low'): Promise<void> {
    const { error } = await directClient
      .from('regions')
      .update({ priority })
      .eq('id', regionId);
    
    if (error) throw error;
  },

  // Update region (name, code, island_group_id)
  async updateRegion(regionId: string, region: {
    name?: string;
    code?: string;
    island_group_id?: string;
    priority?: 'high' | 'medium' | 'low';
  }): Promise<Region> {
    const { data, error } = await directClient
      .from('regions')
      .update(region)
      .eq('id', regionId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete a region
  async deleteRegion(regionId: string): Promise<void> {
    // First check if this region has any provinces
    const { data: provinces, error: provincesError } = await directClient
      .from('provinces')
      .select('id')
      .eq('region_id', regionId)
      .limit(1);
    
    if (provincesError) throw provincesError;
    
    if (provinces && provinces.length > 0) {
      throw new Error('Cannot delete a region that has associated provinces');
    }
    
    // Check if there are any budget allocations
    const { data: budgets, error: budgetsError } = await directClient
      .from('region_budgets')
      .select('id')
      .eq('region_id', regionId)
      .limit(1);
    
    if (budgetsError) throw budgetsError;
    
    // Delete budget allocations if they exist
    if (budgets && budgets.length > 0) {
      const { error: deleteBudgetsError } = await directClient
        .from('region_budgets')
        .delete()
        .eq('region_id', regionId);
      
      if (deleteBudgetsError) throw deleteBudgetsError;
    }
    
    // Now delete the region
    const { error } = await directClient
      .from('regions')
      .delete()
      .eq('id', regionId);
    
    if (error) throw error;
  },

  // Province Operations
  async getProvinces(regionId: string): Promise<Province[]> {
    console.log(`Fetching provinces for region: ${regionId}`);
    try {
      // Use supabase directly instead of directClient which has connection issues
      const { data, error } = await supabase
        .from('provinces')
        .select('*')
        .eq('region_id', regionId)
        .order('name');
      
      if (error) {
        console.error('Error fetching provinces:', error);
        return [];
      }
      
      console.log(`Found ${data?.length || 0} provinces for region ${regionId}`);
      
      return data?.map(province => ({
        id: province.id,
        name: province.name,
        region_id: province.region_id,
        farmers: province.farmers || 0,
        organizations: province.organizations || 0,
        status: province.status || 'active',
        created_at: province.created_at,
        updated_at: province.updated_at
      })) || [];
    } catch (error) {
      console.error('Error in getProvinces:', error);
      return [];
    }
  },

  // Agricultural data operations
  async updateAgriculturalData(regionId: string, data: {
    major_crops?: string[];
    land_area_hectares?: number;
    agricultural_land_percentage?: number;
    annual_rainfall_mm?: number;
    climate_type?: string;
    soil_type?: string[];
    terrain_description?: string;
    farming_households?: number;
  }): Promise<void> {
    try {
      // Check if agricultural data already exists
      const { data: existingData, error: checkError } = await directClient
        .from('agricultural_data')
        .select('id')
        .eq('region_id', regionId)
        .maybeSingle();
      
      if (checkError) throw checkError;
      
      if (existingData) {
        // Update existing record
        const { error: updateError } = await directClient
          .from('agricultural_data')
          .update({
            ...data,
            updated_at: new Date().toISOString()
          })
          .eq('region_id', regionId);
        
        if (updateError) throw updateError;
      } else {
        // Insert new record
        const { error: insertError } = await directClient
          .from('agricultural_data')
          .insert({
            region_id: regionId,
            ...data
          });
        
        if (insertError) throw insertError;
      }
    } catch (error) {
      console.error('Error updating agricultural data:', error);
      throw error;
    }
  },

  async getAgriculturalData(regionId: string): Promise<{
    major_crops?: string[];
    land_area_hectares?: number;
    agricultural_land_percentage?: number;
    annual_rainfall_mm?: number;
    climate_type?: string;
    soil_type?: string[];
    terrain_description?: string;
    farming_households?: number;
  } | null> {
    try {
      const { data, error } = await directClient
        .from('agricultural_data')
        .select('*')
        .eq('region_id', regionId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching agricultural data:', error);
      return null;
    }
  },

  async createProvince(province: {
    name: string;
    region_id: string;
    farmers?: number;
    organizations?: number;
    status?: 'active' | 'pending';
  }): Promise<Province> {
    const { data, error } = await directClient
      .from('provinces')
      .insert({
        name: province.name,
        region_id: province.region_id,
        farmers: province.farmers || 0,
        organizations: province.organizations || 0,
        status: province.status || 'active'
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateProvince(provinceId: string, province: {
    name?: string;
    region_id?: string;
    farmers?: number;
    organizations?: number;
    status?: 'active' | 'pending';
  }): Promise<Province> {
    const { data, error } = await directClient
      .from('provinces')
      .update({
        ...province,
        updated_at: new Date().toISOString()
      })
      .eq('id', provinceId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteProvince(provinceId: string): Promise<void> {
    const { error } = await directClient
      .from('provinces')
      .delete()
      .eq('id', provinceId);
    
    if (error) throw error;
  },

  // Budget Operations
  async getRegionBudgets(fiscalYear: number): Promise<RegionBudget[]> {
    console.log(`Fetching region budgets for fiscal year: ${fiscalYear}`);
    try {
      const { data, error } = await directClient
        .from('region_budgets')
        .select(`
          *,
          regions (name, code)
        `)
        .eq('fiscal_year', fiscalYear);
      
      if (error) {
        console.error('Error fetching region budgets:', error);
        // Return empty array instead of throwing
        return [];
      }
      
      console.log('Successfully fetched region budgets:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('Error in getRegionBudgets:', error);
      // Return empty array instead of throwing
      return [];
    }
  },

  async setRegionBudget(regionId: string, amount: number, fiscalYear: number): Promise<RegionBudget> {
    // Check if budget already exists
    const { data: existingBudget, error: fetchError } = await directClient
      .from('region_budgets')
      .select('id')
      .eq('region_id', regionId)
      .eq('fiscal_year', fiscalYear)
      .maybeSingle();
    
    if (fetchError) throw fetchError;
    
    if (existingBudget) {
      // Update existing budget
      const { data, error } = await directClient
        .from('region_budgets')
        .update({ 
          amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingBudget.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } else {
      // Create new budget
      const { data, error } = await directClient
        .from('region_budgets')
        .insert({
          region_id: regionId,
          fiscal_year: fiscalYear,
          amount,
          allocated: false
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }
  },

  async getAnnualBudget(fiscalYear: number): Promise<number> {
    console.log(`Fetching annual budget for fiscal year: ${fiscalYear}`);
    try {
      const { data, error } = await directClient
        .from('annual_budgets')
        .select('total_amount')
        .eq('fiscal_year', fiscalYear)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching annual budget:', error);
        // Return default budget instead of throwing
        return 100000000; // 100M default
      }
      
      console.log('Successfully fetched annual budget:', data?.total_amount || 0);
      return data?.total_amount || 100000000; // Return 100M if data is null or amount is 0
    } catch (error) {
      console.error('Error in getAnnualBudget:', error);
      // Return default budget instead of throwing
      return 100000000; // 100M default
    }
  },

  async setAnnualBudget(fiscalYear: number, totalAmount: number): Promise<void> {
    // Check if annual budget already exists
    const { data: existingBudget, error: fetchError } = await directClient
      .from('annual_budgets')
      .select('id')
      .eq('fiscal_year', fiscalYear)
      .maybeSingle();
    
    if (fetchError) throw fetchError;
    
    if (existingBudget) {
      // Update existing budget
      const { error } = await directClient
        .from('annual_budgets')
        .update({ 
          total_amount: totalAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingBudget.id);
      
      if (error) throw error;
    } else {
      // Create new budget
      const { error } = await directClient
        .from('annual_budgets')
        .insert({
          fiscal_year: fiscalYear,
          total_amount: totalAmount
        });
      
      if (error) throw error;
    }
  },

  // Get actual counts of farmers and organizations from database
  async getRealCounts(): Promise<{ totalFarmers: number, totalOrganizations: number }> {
    try {
      // Get count of farmers (users with role 'farmer')
      const { count: farmerCount, error: farmerError } = await directClient
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'farmer');
      
      if (farmerError) {
        console.error('Error fetching farmer count:', farmerError);
        throw farmerError;
      }
      
      // Get count of organizations
      const { count: orgCount, error: orgError } = await directClient
        .from('organizations')
        .select('*', { count: 'exact', head: true });
      
      if (orgError) {
        console.error('Error fetching organization count:', orgError);
        throw orgError;
      }
      
      return {
        totalFarmers: farmerCount || 0,
        totalOrganizations: orgCount || 0
      };
    } catch (error) {
      console.error('Error in getRealCounts:', error);
      return { totalFarmers: 0, totalOrganizations: 0 };
    }
  },

  // Clean up dummy provinces
  async cleanupDummyProvinces(): Promise<number> {
    try {
      // Find provinces with names like "XXX Province 1", "XXX Province 2"
      const { data: dummyProvinces, error: findError } = await directClient
        .from('provinces')
        .select('id, name')
        .or('name.ilike.%Province 1%,name.ilike.%Province 2%,name.ilike.%Province 3%');
      
      if (findError) {
        console.error('Error finding dummy provinces:', findError);
        return 0;
      }

      if (!dummyProvinces || dummyProvinces.length === 0) {
        console.log('No dummy provinces found');
        return 0;
      }

      console.log(`Found ${dummyProvinces.length} dummy provinces to remove`);
      
      // Delete these provinces
      const dummyIds = dummyProvinces.map(p => p.id);
      const { error: deleteError } = await directClient
        .from('provinces')
        .delete()
        .in('id', dummyIds);
      
      if (deleteError) {
        console.error('Error deleting dummy provinces:', deleteError);
        return 0;
      }
      
      console.log(`Successfully removed ${dummyProvinces.length} dummy provinces`);
      return dummyProvinces.length;
    } catch (error) {
      console.error('Error cleaning up dummy provinces:', error);
      return 0;
    }
  }
}; 