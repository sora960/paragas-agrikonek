// This script installs the execute_sql function to Supabase
// This is needed for other scripts to work correctly

const fs = require('fs');
const path = require('path');

// Try to load environment variables from .env file
try {
  require('dotenv').config();
} catch (error) {
  console.log('dotenv not found, assuming environment variables are already set');
}

async function installSQLFunction() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'create-execute-sql-function.sql'), 'utf8');
    
    // Get Supabase credentials from environment variables
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Error: Supabase URL and key must be set in environment variables');
      console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set');
      process.exit(1);
    }
    
    console.log('Installing execute_sql function to Supabase...');
    console.log(`Using Supabase URL: ${supabaseUrl}`);
    
    // Make the API request to execute the SQL
    // We're using the REST API directly since we can't use the function we're trying to create
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        query: sql
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to install function. Using SQL Editor instead...');
      
      // Print instructions for manual installation
      console.log('\nPlease install the function manually:');
      console.log('1. Go to your Supabase dashboard');
      console.log('2. Navigate to the SQL Editor');
      console.log('3. Create a new query');
      console.log('4. Copy and paste the following SQL:');
      console.log('\n-------------------------------------------------');
      console.log(sql);
      console.log('-------------------------------------------------\n');
      console.log('5. Run the query');
      
      process.exit(1);
    }
    
    console.log('SQL function installed successfully!');
  } catch (error) {
    console.error('Error installing SQL function:', error.message);
    process.exit(1);
  }
}

// Run the installation
installSQLFunction(); 