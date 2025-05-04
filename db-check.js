// Simple Node.js script to check database schema using Supabase client
// Save this as db-check.js and run with: node db-check.js

const { createClient } = require('@supabase/supabase-js');

// Set your Supabase URL and anon key here
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('Checking database schema...');
  
  try {
    // Check if provinces table exists
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'provinces');
    
    if (tablesError) {
      console.error('Error checking tables:', tablesError);
      return;
    }
    
    if (!tables || tables.length === 0) {
      console.log('The provinces table does not exist in the database.');
      return;
    }
    
    console.log('The provinces table exists.');
    
    // Check provinces columns
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_schema', 'public')
      .eq('table_name', 'provinces')
      .order('ordinal_position');
    
    if (columnsError) {
      console.error('Error checking columns:', columnsError);
      return;
    }
    
    console.log('\nProvinces table columns:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    
    // Check if region_id or region_code exists
    const hasRegionId = columns.some(col => col.column_name === 'region_id');
    const hasRegionCode = columns.some(col => col.column_name === 'region_code');
    
    console.log('\nRegion column check:');
    console.log(`  - Has region_id column: ${hasRegionId}`);
    console.log(`  - Has region_code column: ${hasRegionCode}`);
    
    if (!hasRegionId && !hasRegionCode) {
      console.log('\nWARNING: Neither region_id nor region_code column exists in the provinces table');
    }
    
    // Check table constraints
    const { data: constraints, error: constraintsError } = await supabase
      .from('information_schema.table_constraints')
      .select(`
        constraint_name,
        constraint_type
      `)
      .eq('table_schema', 'public')
      .eq('table_name', 'provinces');
    
    if (constraintsError) {
      console.error('Error checking constraints:', constraintsError);
      return;
    }
    
    console.log('\nProvinces table constraints:');
    if (constraints.length === 0) {
      console.log('  - No constraints found');
    } else {
      constraints.forEach(constraint => {
        console.log(`  - ${constraint.constraint_name} (${constraint.constraint_type})`);
      });
    }
    
    // Based on findings, suggest fixes
    console.log('\nSuggested actions:');
    if (!hasRegionId && !hasRegionCode) {
      console.log('  - Add either region_id or region_code column to provinces table');
    } else if (hasRegionId) {
      console.log('  - Use region_id in your code and SQL scripts');
    } else if (hasRegionCode) {
      console.log('  - Use region_code in your code and SQL scripts');
    }
    
  } catch (error) {
    console.error('An unexpected error occurred:', error);
  }
}

checkSchema(); 