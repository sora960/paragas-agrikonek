// Script to install analytics functions into the database
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project-url.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'your-service-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function installAnalyticsFunctions() {
  try {
    console.log('Starting installation of analytics functions...');
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, '..', 'src', 'sql', 'analytics_functions.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Split SQL file by function (each function is separated by a semicolon)
    const functions = sqlContent.split(';').filter(func => func.trim().length > 0);
    
    console.log(`Found ${functions.length} functions to install.`);
    
    // Execute each function definition
    for (let i = 0; i < functions.length; i++) {
      const functionSql = functions[i].trim() + ';';
      const functionName = functionSql.match(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+(\w+)/i)?.[1];
      
      console.log(`Installing function ${i + 1}/${functions.length}: ${functionName || 'Unknown'}`);
      
      // Execute the SQL
      const { error } = await supabase.rpc('execute_sql', { sql: functionSql });
      
      if (error) {
        console.error(`Error installing function ${functionName}:`, error);
      } else {
        console.log(`Successfully installed function: ${functionName}`);
      }
    }
    
    console.log('Installation complete.');
  } catch (error) {
    console.error('Error installing analytics functions:', error);
  }
}

// Execute the installation
installAnalyticsFunctions()
  .then(() => {
    console.log('Analytics functions installation script completed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  }); 