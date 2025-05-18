// fix-user-regions-online.js
// Run this with Node.js to fix user_regions permissions directly via Supabase API
// Usage: node fix-user-regions-online.js

require('dotenv').config(); // Load environment variables from .env file
const fs = require('fs');
const fetch = require('node-fetch');

// Read SQL from file
const sql = fs.readFileSync('./fix-user-regions-permissions.sql', 'utf8');

// Get Supabase URL and key from environment variables or hardcode them
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://supabase.eztechsolutions.pro';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || ''; // Add your key here if needed

async function fixPermissions() {
  console.log('Fixing user_regions permissions via Supabase API...');
  console.log('URL:', supabaseUrl);
  console.log('API Key Length:', supabaseKey?.length || 0);
  
  try {
    // Make the API request
    const response = await fetch(`${supabaseUrl}/rest/v1/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        query: sql
      })
    });
    
    // Check if request was successful
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error fixing permissions:', response.status, errorText);
      console.log('\nThis approach requires admin/service role API key with SQL execution privileges.');
      console.log('Please try running the SQL manually in the Supabase dashboard SQL editor.');
      return;
    }
    
    const result = await response.json();
    console.log('Success! Permissions updated for user_regions table.');
    console.log('Result:', result);
    
  } catch (error) {
    console.error('Error executing SQL:', error);
    console.log('\nPlease try running the SQL manually in the Supabase dashboard SQL editor.');
  }
}

// Run the function
fixPermissions(); 