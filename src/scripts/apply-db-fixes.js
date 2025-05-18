// Script to apply database fixes
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Get environment variables from .env file
require('dotenv').config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Database connection parameters
const dbUrl = process.env.VITE_SUPABASE_URL || '';
const dbKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!dbUrl || !dbKey) {
  console.error('Error: Database URL or key not found in environment variables.');
  console.error('Make sure you have a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Get the database host and credentials from the URL
const dbUrlObj = new URL(dbUrl);
const dbHost = dbUrlObj.hostname;
const dbName = dbUrlObj.pathname.split('/').pop();

console.log('This script will apply SQL fixes to fix the region_budgets permissions issue.');
console.log('Make sure you have PostgreSQL client installed on your system.');
console.log('\nReview SQL files:');
console.log('1. Fix region budgets permissions');
console.log('2. Create admin utility functions');
console.log('3. Apply both');
console.log('4. Cancel');

rl.question('\nEnter your choice (1-4): ', (choice) => {
  switch (choice) {
    case '1':
      applyFixRegionBudgetsPermissions();
      break;
    case '2':
      applyAdminFunctions();
      break;
    case '3':
      applyFixRegionBudgetsPermissions();
      applyAdminFunctions();
      break;
    case '4':
      console.log('Operation cancelled.');
      rl.close();
      break;
    default:
      console.log('Invalid choice. Operation cancelled.');
      rl.close();
  }
});

function applyFixRegionBudgetsPermissions() {
  try {
    console.log('\nApplying region_budgets permissions fix...');
    
    const sqlFile = path.join(__dirname, '..', 'sql', 'fix-region-budgets-permissions.sql');
    
    if (!fs.existsSync(sqlFile)) {
      console.error(`Error: SQL file not found: ${sqlFile}`);
      return false;
    }
    
    // Get service role key for admin access
    rl.question('Enter Supabase service role key: ', (serviceKey) => {
      if (!serviceKey) {
        console.error('Service role key is required for admin operations.');
        rl.close();
        return;
      }
      
      // Execute the SQL file
      try {
        const curlCmd = `curl -X POST "${dbUrl}/rest/v1/rpc/execute_sql" \\
          -H "apikey: ${serviceKey}" \\
          -H "Authorization: Bearer ${serviceKey}" \\
          -H "Content-Type: application/json" \\
          -d '{"sql_query": "${fs.readFileSync(sqlFile, 'utf8').replace(/\n/g, ' ').replace(/"/g, '\\"')}"}'`;
        
        execSync(curlCmd, { stdio: 'inherit' });
        console.log('Region budgets permissions fix applied successfully!');
        rl.close();
      } catch (error) {
        console.error('Error applying SQL fix:', error.message);
        rl.close();
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error:', error.message);
    return false;
  }
}

function applyAdminFunctions() {
  try {
    console.log('\nApplying admin functions...');
    
    const sqlFile = path.join(__dirname, '..', 'sql', 'create-admin-functions.sql');
    
    if (!fs.existsSync(sqlFile)) {
      console.error(`Error: SQL file not found: ${sqlFile}`);
      return false;
    }
    
    // Get service role key for admin access
    rl.question('Enter Supabase service role key: ', (serviceKey) => {
      if (!serviceKey) {
        console.error('Service role key is required for admin operations.');
        rl.close();
        return;
      }
      
      // Execute the SQL file
      try {
        const curlCmd = `curl -X POST "${dbUrl}/rest/v1/rpc/execute_sql" \\
          -H "apikey: ${serviceKey}" \\
          -H "Authorization: Bearer ${serviceKey}" \\
          -H "Content-Type: application/json" \\
          -d '{"sql_query": "${fs.readFileSync(sqlFile, 'utf8').replace(/\n/g, ' ').replace(/"/g, '\\"')}"}'`;
        
        execSync(curlCmd, { stdio: 'inherit' });
        console.log('Admin functions created successfully!');
        rl.close();
      } catch (error) {
        console.error('Error applying SQL fix:', error.message);
        rl.close();
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error:', error.message);
    return false;
  }
} 