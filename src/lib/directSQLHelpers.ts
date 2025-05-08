import { supabaseAdmin } from './supabaseEnhanced';
import { supabase } from '@/lib/supabase';

// Function to create tables and populate them with data
export async function setupDatabaseTables() {
  try {
    // Check if execute_sql function exists first
    const canExecuteSQL = await checkExecuteSQLFunction();
    
    if (!canExecuteSQL) {
      console.error("execute_sql function not available. Cannot set up tables directly.");
      return false;
    }

    console.log("Setting up database tables with direct SQL...");

    // Create RLS policy helper function
    await supabaseAdmin.rpc('execute_sql', {
      sql_query: `
        CREATE OR REPLACE FUNCTION check_is_admin_or_superadmin() 
        RETURNS BOOLEAN AS $$
        BEGIN
          RETURN (
            (SELECT is_admin FROM users WHERE id = auth.uid()) = TRUE OR
            (SELECT is_superadmin FROM users WHERE id = auth.uid()) = TRUE
          );
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    });

    // Create tables if they don't exist
    await supabaseAdmin.rpc('execute_sql', {
      sql_query: `
        -- Create island_groups table
        CREATE TABLE IF NOT EXISTS island_groups (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create regions table
        CREATE TABLE IF NOT EXISTS regions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR NOT NULL,
          code VARCHAR,
          island_group_id UUID REFERENCES island_groups(id),
          priority VARCHAR DEFAULT 'medium',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create provinces table
        CREATE TABLE IF NOT EXISTS provinces (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR NOT NULL,
          region_id UUID REFERENCES regions(id),
          farmers INTEGER DEFAULT 0,
          organizations INTEGER DEFAULT 0,
          status VARCHAR DEFAULT 'active',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          CONSTRAINT unique_province_per_region UNIQUE (name, region_id)
        );

        -- Create region_budgets table
        CREATE TABLE IF NOT EXISTS region_budgets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          region_id UUID REFERENCES regions(id),
          fiscal_year INTEGER NOT NULL,
          amount NUMERIC(15, 2) DEFAULT 0,
          allocated BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          CONSTRAINT unique_region_budget UNIQUE (region_id, fiscal_year)
        );

        -- Create organization_budgets table
        CREATE TABLE IF NOT EXISTS organization_budgets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id),
          fiscal_year INTEGER NOT NULL,
          total_allocation NUMERIC(15, 2) DEFAULT 0,
          remaining_balance NUMERIC(15, 2) DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          CONSTRAINT unique_org_budget UNIQUE (organization_id, fiscal_year)
        );

        -- Create budget_allocations table
        CREATE TABLE IF NOT EXISTS annual_budgets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          fiscal_year INTEGER NOT NULL UNIQUE,
          amount NUMERIC(15, 2) DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create agricultural_data table
        CREATE TABLE IF NOT EXISTS agricultural_data (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          region_id UUID REFERENCES regions(id) UNIQUE,
          major_crops TEXT[] DEFAULT '{}',
          land_area_hectares NUMERIC(15, 2),
          agricultural_land_percentage NUMERIC(5, 2),
          annual_rainfall_mm NUMERIC(10, 2),
          climate_type VARCHAR,
          soil_type TEXT[] DEFAULT '{}',
          terrain_description TEXT,
          farming_households INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    // Set up RLS policies
    await supabaseAdmin.rpc('execute_sql', {
      sql_query: `
        -- Enable RLS on all tables
        ALTER TABLE island_groups ENABLE ROW LEVEL SECURITY;
        ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
        ALTER TABLE provinces ENABLE ROW LEVEL SECURITY;
        ALTER TABLE region_budgets ENABLE ROW LEVEL SECURITY;
        ALTER TABLE organization_budgets ENABLE ROW LEVEL SECURITY;
        ALTER TABLE annual_budgets ENABLE ROW LEVEL SECURITY;
        ALTER TABLE agricultural_data ENABLE ROW LEVEL SECURITY;

        -- Create policies for island_groups
        DROP POLICY IF EXISTS "Allow select for all" ON island_groups;
        CREATE POLICY "Allow select for all" ON island_groups
          FOR SELECT USING (true);
          
        DROP POLICY IF EXISTS "Allow insert/update/delete for admins" ON island_groups;
        CREATE POLICY "Allow insert/update/delete for admins" ON island_groups
          FOR ALL USING (check_is_admin_or_superadmin());

        -- Create policies for regions
        DROP POLICY IF EXISTS "Allow select for all" ON regions;
        CREATE POLICY "Allow select for all" ON regions
          FOR SELECT USING (true);
          
        DROP POLICY IF EXISTS "Allow insert/update/delete for admins" ON regions;
        CREATE POLICY "Allow insert/update/delete for admins" ON regions
          FOR ALL USING (check_is_admin_or_superadmin());

        -- Create policies for provinces
        DROP POLICY IF EXISTS "Allow select for all" ON provinces;
        CREATE POLICY "Allow select for all" ON provinces
          FOR SELECT USING (true);
          
        DROP POLICY IF EXISTS "Allow insert/update/delete for admins" ON provinces;
        CREATE POLICY "Allow insert/update/delete for admins" ON provinces
          FOR ALL USING (check_is_admin_or_superadmin());

        -- Create policies for region_budgets
        DROP POLICY IF EXISTS "Allow select for all" ON region_budgets;
        CREATE POLICY "Allow select for all" ON region_budgets
          FOR SELECT USING (true);
          
        DROP POLICY IF EXISTS "Allow insert/update/delete for admins" ON region_budgets;
        CREATE POLICY "Allow insert/update/delete for admins" ON region_budgets
          FOR ALL USING (check_is_admin_or_superadmin());

        -- Create policies for organization_budgets
        DROP POLICY IF EXISTS "Allow select for all" ON organization_budgets;
        CREATE POLICY "Allow select for all" ON organization_budgets
          FOR SELECT USING (true);
          
        DROP POLICY IF EXISTS "Allow insert/update/delete for admins" ON organization_budgets;
        CREATE POLICY "Allow insert/update/delete for admins" ON organization_budgets
          FOR ALL USING (check_is_admin_or_superadmin());

        -- Create policies for annual_budgets
        DROP POLICY IF EXISTS "Allow select for all" ON annual_budgets;
        CREATE POLICY "Allow select for all" ON annual_budgets
          FOR SELECT USING (true);
          
        DROP POLICY IF EXISTS "Allow insert/update/delete for admins" ON annual_budgets;
        CREATE POLICY "Allow insert/update/delete for admins" ON annual_budgets
          FOR ALL USING (check_is_admin_or_superadmin());

        -- Create policies for agricultural_data
        DROP POLICY IF EXISTS "Allow select for all" ON agricultural_data;
        CREATE POLICY "Allow select for all" ON agricultural_data
          FOR SELECT USING (true);
          
        DROP POLICY IF EXISTS "Allow insert/update/delete for admins" ON agricultural_data;
        CREATE POLICY "Allow insert/update/delete for admins" ON agricultural_data
          FOR ALL USING (check_is_admin_or_superadmin());
      `
    });

    // Insert default data if needed
    await supabaseAdmin.rpc('execute_sql', {
      sql_query: `
        -- Insert default island groups if they don't exist
        INSERT INTO island_groups (id, name)
        VALUES 
          ('luzon-island', 'Luzon'),
          ('visayas-island', 'Visayas'),
          ('mindanao-island', 'Mindanao')
        ON CONFLICT DO NOTHING;
        
        -- Insert regions for Luzon
        INSERT INTO regions (name, code, island_group_id)
        VALUES 
          ('Ilocos Region', 'R1', 'luzon-island'),
          ('Cagayan Valley', 'R2', 'luzon-island'),
          ('Central Luzon', 'R3', 'luzon-island'),
          ('CALABARZON', 'R4A', 'luzon-island'),
          ('MIMAROPA', 'R4B', 'luzon-island'),
          ('Bicol Region', 'R5', 'luzon-island'),
          ('National Capital Region', 'NCR', 'luzon-island'),
          ('Cordillera Administrative Region', 'CAR', 'luzon-island')
        ON CONFLICT DO NOTHING;
        
        -- Insert regions for Visayas
        INSERT INTO regions (name, code, island_group_id)
        VALUES 
          ('Western Visayas', 'R6', 'visayas-island'),
          ('Central Visayas', 'R7', 'visayas-island'),
          ('Eastern Visayas', 'R8', 'visayas-island')
        ON CONFLICT DO NOTHING;
        
        -- Insert regions for Mindanao
        INSERT INTO regions (name, code, island_group_id)
        VALUES 
          ('Zamboanga Peninsula', 'R9', 'mindanao-island'),
          ('Northern Mindanao', 'R10', 'mindanao-island'),
          ('Davao Region', 'R11', 'mindanao-island'),
          ('SOCCSKSARGEN', 'R12', 'mindanao-island'),
          ('Caraga', 'R13', 'mindanao-island'),
          ('Bangsamoro Autonomous Region in Muslim Mindanao', 'BARMM', 'mindanao-island')
        ON CONFLICT DO NOTHING;
      `
    });

    console.log("Database setup completed successfully");
    return true;
  } catch (error) {
    console.error("Error setting up database tables:", error);
    return false;
  }
}

export async function populatePhilippineProvinces(): Promise<boolean> {
  try {
    console.log('Starting to populate Philippine provinces...');
    
    // Check if there are existing provinces
    const { count, error: countError } = await supabase
      .from('provinces')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Error checking provinces:', countError);
      return false;
    }
    
    console.log(`Found ${count} existing provinces`);
    
    // Get all regions first
    const { data: regions, error: regionsError } = await supabase
      .from('regions')
      .select('id, code, name');
    
    if (regionsError) {
      console.error('Error fetching regions:', regionsError);
      return false;
    }
    
    if (!regions || regions.length === 0) {
      console.error('No regions found. Please create regions first.');
      return false;
    }
    
    console.log(`Found ${regions.length} regions`);
    
    // Map of region code/name to region ID
    const regionMap: Record<string, string> = {};
    regions.forEach(region => {
      // Map both by code and name for flexibility
      if (region.code) {
        regionMap[region.code] = region.id;
        // Also map without the 'R' prefix for flexibility
        if (region.code.startsWith('R')) {
          regionMap[region.code.substring(1)] = region.id;
        }
      }
      
      regionMap[region.name] = region.id;
      
      // Also map variations of region names
      const simplifiedName = region.name.replace(/region|–|-/gi, '').trim();
      regionMap[simplifiedName] = region.id;
      
      // For Ilocos Region, CALABARZON, etc. special cases
      if (region.name === 'Ilocos Region') regionMap['Region I'] = region.id;
      if (region.name === 'Cagayan Valley') regionMap['Region II'] = region.id;
      if (region.name === 'Central Luzon') regionMap['Region III'] = region.id;
      if (region.name === 'CALABARZON') regionMap['Region IV-A'] = region.id;
      if (region.name === 'MIMAROPA') regionMap['Region IV-B'] = region.id;
      if (region.name === 'Bicol Region') regionMap['Region V'] = region.id;
      if (region.name === 'Western Visayas') regionMap['Region VI'] = region.id;
      if (region.name === 'Central Visayas') regionMap['Region VII'] = region.id;
      if (region.name === 'Eastern Visayas') regionMap['Region VIII'] = region.id;
      if (region.name === 'Zamboanga Peninsula') regionMap['Region IX'] = region.id;
      if (region.name === 'Northern Mindanao') regionMap['Region X'] = region.id;
      if (region.name === 'Davao Region') regionMap['Region XI'] = region.id;
      if (region.name === 'SOCCSKSARGEN') regionMap['Region XII'] = region.id;
      if (region.name === 'Caraga') regionMap['Region XIII'] = region.id;
    });
    
    // Define Philippine provinces by region
    const philippineProvinces: Record<string, string[]> = {
      'R1': ['Ilocos Norte', 'Ilocos Sur', 'La Union', 'Pangasinan'],
      'R2': ['Batanes', 'Cagayan', 'Isabela', 'Nueva Vizcaya', 'Quirino'],
      'R3': ['Aurora', 'Bataan', 'Bulacan', 'Nueva Ecija', 'Pampanga', 'Tarlac', 'Zambales'],
      'R4A': ['Batangas', 'Cavite', 'Laguna', 'Quezon', 'Rizal'],
      'R4B': ['Marinduque', 'Occidental Mindoro', 'Oriental Mindoro', 'Palawan', 'Romblon'],
      'R5': ['Albay', 'Camarines Norte', 'Camarines Sur', 'Catanduanes', 'Masbate', 'Sorsogon'],
      'NCR': [], // No provinces in NCR
      'CAR': ['Abra', 'Apayao', 'Benguet', 'Ifugao', 'Kalinga', 'Mountain Province'],
      'R6': ['Aklan', 'Antique', 'Capiz', 'Guimaras', 'Iloilo', 'Negros Occidental'],
      'R7': ['Bohol', 'Cebu', 'Negros Oriental', 'Siquijor'],
      'R8': ['Biliran', 'Eastern Samar', 'Leyte', 'Northern Samar', 'Samar', 'Southern Leyte'],
      'R9': ['Zamboanga del Norte', 'Zamboanga del Sur', 'Zamboanga Sibugay'],
      'R10': ['Bukidnon', 'Camiguin', 'Lanao del Norte', 'Misamis Occidental', 'Misamis Oriental'],
      'R11': ['Davao de Oro', 'Davao del Norte', 'Davao del Sur', 'Davao Occidental', 'Davao Oriental'],
      'R12': ['Cotabato', 'Sarangani', 'South Cotabato', 'Sultan Kudarat'],
      'R13': ['Agusan del Norte', 'Agusan del Sur', 'Dinagat Islands', 'Surigao del Norte', 'Surigao del Sur'],
      'BARMM': ['Basilan', 'Lanao del Sur', 'Maguindanao del Norte', 'Maguindanao del Sur', 'Sulu', 'Tawi-Tawi']
    };
    
    // Batch insert provinces
    for (const [regionName, provinces] of Object.entries(philippineProvinces)) {
      const regionId = regionMap[regionName];
      
      if (!regionId) {
        console.warn(`No matching region ID found for ${regionName}`);
        continue;
      }
      
      console.log(`Adding ${provinces.length} provinces to ${regionName} (${regionId})`);
      
      for (const provinceName of provinces) {
        try {
          // Check if province already exists
          const { data: existingProvince, error: checkError } = await supabase
            .from('provinces')
            .select('id')
            .eq('name', provinceName)
            .eq('region_id', regionId)
            .maybeSingle();
          
          if (checkError) {
            console.error(`Error checking if province ${provinceName} exists:`, checkError);
            continue;
          }
          
          if (existingProvince) {
            console.log(`Province ${provinceName} already exists, skipping`);
            continue;
          }
          
          // Insert province
          const { error: insertError } = await supabase
            .from('provinces')
            .insert({
              name: provinceName,
              region_id: regionId,
              farmers: 0,
              organizations: 0,
              status: 'active'
            });
          
          if (insertError) {
            console.error(`Error inserting province ${provinceName}:`, insertError);
          } else {
            console.log(`Added province ${provinceName} to region ${regionName}`);
          }
        } catch (error) {
          console.error(`Error processing province ${provinceName}:`, error);
        }
      }
    }
    
    console.log('Finished populating Philippine provinces');
    return true;
  } catch (error) {
    console.error('Error in populatePhilippineProvinces:', error);
    return false;
  }
}

export async function checkExecuteSQLFunction() {
  try {
    // Test if the execute_sql function exists and is available
    const { data, error } = await supabaseAdmin.rpc('execute_sql', {
      sql_query: 'SELECT 1 as test'
    });
    
    if (error) {
      console.error("Error checking execute_sql function:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("execute_sql function not available:", error);
    return false;
  }
} 