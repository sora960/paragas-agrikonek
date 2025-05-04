import { supabase } from './supabase';
import { supabaseAdmin, executeSQL } from './supabaseEnhanced';

/**
 * Initialize default database tables and data if they don't exist
 * This is a client-side function that can be called from the app
 */
export async function initializeDatabase() {
  try {
    console.log('Checking and initializing database...');
    
    // Create tables if they don't exist using direct SQL
    await createTablesDirectly();
    
    // Check if island_groups table exists and has data
    const { data: islandGroups, error: islandGroupsError } = await supabaseAdmin
      .from('island_groups')
      .select('id')
      .limit(1);
      
    if (islandGroupsError) {
      console.error('Error checking island_groups table:', islandGroupsError);
      // Create island_groups if error is about relation not existing
      if (islandGroupsError.message.includes('does not exist')) {
        await createIslandGroups();
      }
    } else if (!islandGroups || islandGroups.length === 0) {
      // Create default island groups if table exists but has no data
      await createIslandGroups();
    } else {
      console.log('Island groups table exists and has data');
    }
    
    // Check if regions table exists and has data
    const { data: regions, error: regionsError } = await supabaseAdmin
      .from('regions')
      .select('id')
      .limit(1);
      
    if (regionsError) {
      console.error('Error checking regions table:', regionsError);
      // Create regions if error is about relation not existing
      if (regionsError.message.includes('does not exist')) {
        await createRegions();
      }
    } else if (!regions || regions.length === 0) {
      // Create default regions if table exists but has no data
      await createRegions();
    } else {
      console.log('Regions table exists and has data');
    }
    
    // Check if annual_budgets table exists and has data
    const { data: budgets, error: budgetsError } = await supabaseAdmin
      .from('annual_budgets')
      .select('id')
      .limit(1);
      
    if (budgetsError) {
      console.error('Error checking annual_budgets table:', budgetsError);
      // Create annual_budgets if error is about relation not existing
      if (budgetsError.message.includes('does not exist')) {
        await createAnnualBudgets();
      }
    } else if (!budgets || budgets.length === 0) {
      // Create default annual budgets if table exists but has no data
      await createAnnualBudgets();
    } else {
      console.log('Annual budgets table exists and has data');
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    return false;
  }
}

// Create tables directly with SQL
async function createTablesDirectly() {
  console.log('Creating tables directly with SQL...');
  
  // SQL to create island_groups table
  const createIslandGroupsSQL = `
    CREATE TABLE IF NOT EXISTS island_groups (
      id VARCHAR PRIMARY KEY,
      name VARCHAR NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;
  
  // SQL to create regions table
  const createRegionsSQL = `
    CREATE TABLE IF NOT EXISTS regions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR NOT NULL UNIQUE,
      name VARCHAR NOT NULL,
      island_group_id VARCHAR REFERENCES island_groups(id),
      priority VARCHAR DEFAULT 'medium',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;
  
  // SQL to create annual_budgets table
  const createBudgetsSQL = `
    CREATE TABLE IF NOT EXISTS annual_budgets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      fiscal_year INTEGER NOT NULL,
      total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(fiscal_year)
    );
  `;
  
  // SQL to create region_budgets table
  const createRegionBudgetsSQL = `
    CREATE TABLE IF NOT EXISTS region_budgets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      region_id UUID REFERENCES regions(id),
      fiscal_year INTEGER NOT NULL,
      amount DECIMAL(15,2) NOT NULL DEFAULT 0,
      allocated BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(region_id, fiscal_year)
    );
  `;
  
  try {
    // Try to execute SQL directly with postgREST
    await executeSQL(createIslandGroupsSQL);
    await executeSQL(createRegionsSQL);
    await executeSQL(createBudgetsSQL);
    await executeSQL(createRegionBudgetsSQL);
    
    console.log('Tables created successfully with direct SQL');
    return true;
  } catch (error) {
    console.error('Error creating tables with direct SQL:', error);
    return false;
  }
}

async function createIslandGroups() {
  console.log('Creating island_groups table and data...');
  
  // Insert directly if table exists
  const { error: insertError } = await supabaseAdmin
    .from('island_groups')
    .insert([
      { id: 'luzon-island', name: 'Luzon' },
      { id: 'visayas-island', name: 'Visayas' },
      { id: 'mindanao-island', name: 'Mindanao' }
    ]);
    
  if (insertError) {
    console.error('Error inserting island groups:', insertError);
    
    // Try direct SQL
    const insertSQL = `
      INSERT INTO island_groups (id, name, created_at, updated_at)
      VALUES 
        ('luzon-island', 'Luzon', NOW(), NOW()),
        ('visayas-island', 'Visayas', NOW(), NOW()),
        ('mindanao-island', 'Mindanao', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `;
    
    await executeSQL(insertSQL);
    console.log('Attempted to insert island groups with direct SQL');
  } else {
    console.log('Successfully inserted island groups');
  }
}

async function createRegions() {
  console.log('Creating regions table and data...');
  
  // Insert Luzon regions
  const { error: luzonError } = await supabaseAdmin
    .from('regions')
    .insert([
      { code: 'NCR', name: 'National Capital Region', island_group_id: 'luzon-island', priority: 'high' },
      { code: 'CAR', name: 'Cordillera Administrative Region', island_group_id: 'luzon-island', priority: 'medium' },
      { code: 'I', name: 'Ilocos Region', island_group_id: 'luzon-island', priority: 'medium' },
      { code: 'II', name: 'Cagayan Valley', island_group_id: 'luzon-island', priority: 'medium' },
      { code: 'III', name: 'Central Luzon', island_group_id: 'luzon-island', priority: 'high' },
      { code: 'IV-A', name: 'CALABARZON', island_group_id: 'luzon-island', priority: 'high' },
      { code: 'IV-B', name: 'MIMAROPA', island_group_id: 'luzon-island', priority: 'medium' },
      { code: 'V', name: 'Bicol Region', island_group_id: 'luzon-island', priority: 'medium' }
    ]);
    
  // Insert Visayas regions
  const { error: visayasError } = await supabaseAdmin
    .from('regions')
    .insert([
      { code: 'VI', name: 'Western Visayas', island_group_id: 'visayas-island', priority: 'medium' },
      { code: 'VII', name: 'Central Visayas', island_group_id: 'visayas-island', priority: 'high' },
      { code: 'VIII', name: 'Eastern Visayas', island_group_id: 'visayas-island', priority: 'medium' }
    ]);
    
  // Insert Mindanao regions
  const { error: mindanaoError } = await supabaseAdmin
    .from('regions')
    .insert([
      { code: 'IX', name: 'Zamboanga Peninsula', island_group_id: 'mindanao-island', priority: 'medium' },
      { code: 'X', name: 'Northern Mindanao', island_group_id: 'mindanao-island', priority: 'medium' },
      { code: 'XI', name: 'Davao Region', island_group_id: 'mindanao-island', priority: 'high' },
      { code: 'XII', name: 'SOCCSKSARGEN', island_group_id: 'mindanao-island', priority: 'medium' },
      { code: 'XIII', name: 'Caraga', island_group_id: 'mindanao-island', priority: 'medium' },
      { code: 'BARMM', name: 'Bangsamoro Autonomous Region in Muslim Mindanao', island_group_id: 'mindanao-island', priority: 'high' }
    ]);
    
  if (luzonError || visayasError || mindanaoError) {
    console.error('Error inserting regions:', luzonError || visayasError || mindanaoError);
    
    // Try direct SQL
    const insertSQL = `
      INSERT INTO regions (code, name, island_group_id, priority, created_at, updated_at)
      VALUES
        ('NCR', 'National Capital Region', 'luzon-island', 'high', NOW(), NOW()),
        ('CAR', 'Cordillera Administrative Region', 'luzon-island', 'medium', NOW(), NOW()),
        ('I', 'Ilocos Region', 'luzon-island', 'medium', NOW(), NOW()),
        ('II', 'Cagayan Valley', 'luzon-island', 'medium', NOW(), NOW()),
        ('III', 'Central Luzon', 'luzon-island', 'high', NOW(), NOW()),
        ('IV-A', 'CALABARZON', 'luzon-island', 'high', NOW(), NOW()),
        ('IV-B', 'MIMAROPA', 'luzon-island', 'medium', NOW(), NOW()),
        ('V', 'Bicol Region', 'luzon-island', 'medium', NOW(), NOW()),
        ('VI', 'Western Visayas', 'visayas-island', 'medium', NOW(), NOW()),
        ('VII', 'Central Visayas', 'visayas-island', 'high', NOW(), NOW()),
        ('VIII', 'Eastern Visayas', 'visayas-island', 'medium', NOW(), NOW()),
        ('IX', 'Zamboanga Peninsula', 'mindanao-island', 'medium', NOW(), NOW()),
        ('X', 'Northern Mindanao', 'mindanao-island', 'medium', NOW(), NOW()),
        ('XI', 'Davao Region', 'mindanao-island', 'high', NOW(), NOW()),
        ('XII', 'SOCCSKSARGEN', 'mindanao-island', 'medium', NOW(), NOW()),
        ('XIII', 'Caraga', 'mindanao-island', 'medium', NOW(), NOW()),
        ('BARMM', 'Bangsamoro Autonomous Region in Muslim Mindanao', 'mindanao-island', 'high', NOW(), NOW())
      ON CONFLICT (code) DO NOTHING;
    `;
    
    await executeSQL(insertSQL);
    console.log('Attempted to insert regions with direct SQL');
  } else {
    console.log('Successfully inserted regions');
  }
}

async function createAnnualBudgets() {
  console.log('Creating annual_budgets table and data...');
  
  // Insert default budget for 2024
  const { error: insertError } = await supabaseAdmin
    .from('annual_budgets')
    .insert([
      { fiscal_year: 2024, total_amount: 100000000 }
    ]);
    
  if (insertError) {
    console.error('Error inserting annual budget:', insertError);
    
    // Try direct SQL
    const insertSQL = `
      INSERT INTO annual_budgets (fiscal_year, total_amount, created_at, updated_at)
      VALUES (2024, 100000000, NOW(), NOW())
      ON CONFLICT (fiscal_year) DO NOTHING;
    `;
    
    await executeSQL(insertSQL);
    console.log('Attempted to insert annual budget with direct SQL');
  } else {
    console.log('Successfully inserted annual budget');
  }
} 