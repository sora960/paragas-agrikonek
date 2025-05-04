const fs = require('fs');
const path = require('path');

// Import dotenv to load environment variables from .env file
try {
  require('dotenv').config();
} catch (error) {
  console.log('dotenv not found, assuming environment variables are already set');
}

// Function to execute SQL
async function executeSQL(filename) {
  try {
    const sql = fs.readFileSync(path.join(__dirname, filename), 'utf8');
    
    // Get Supabase credentials from environment variables
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase URL and key must be set in environment variables');
      process.exit(1);
    }
    
    console.log(`Executing SQL from ${filename}...`);
    
    // Use fetch to make API call to Supabase
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ sql })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SQL execution failed: ${errorText}`);
    }
    
    const result = await response.json();
    console.log(`Successfully executed ${filename}`);
    console.log('Result:', result);
    return result;
  } catch (error) {
    console.error(`Error executing ${filename}:`, error.message);
    throw error;
  }
}

// Main function to run the scripts in order
async function main() {
  try {
    console.log('Starting recreation of farmer tables...');
    
    // First recreate the farmer_profiles table
    await executeSQL('recreate_farmer_profiles.sql');
    
    // Then recreate the organization_members table
    await executeSQL('recreate_organization_members.sql');
    
    console.log('All tables successfully recreated!');
  } catch (error) {
    console.error('Error recreating tables:', error.message);
    process.exit(1);
  }
}

// Run the main function
main(); 