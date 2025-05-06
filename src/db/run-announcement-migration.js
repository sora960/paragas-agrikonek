const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Read Supabase credentials from .env file
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please check your .env file');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('Starting organization announcements migration...');
    
    // Read the migration SQL file
    const sqlFilePath = path.join(__dirname, 'migrations', 'organization_announcements.sql');
    let sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Split the SQL file into individual statements
    const statements = sqlContent
      .split(';')
      .filter(statement => statement.trim() !== '')
      .map(statement => statement.trim() + ';');
    
    // Execute each statement separately
    for (const [index, statement] of statements.entries()) {
      try {
        console.log(`Executing statement ${index + 1} of ${statements.length}...`);
        
        // Execute the SQL statement
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          console.error(`Error executing statement ${index + 1}:`, error);
          console.error('Statement:', statement);
        } else {
          console.log(`Statement ${index + 1} executed successfully.`);
        }
      } catch (err) {
        console.error(`Error with statement ${index + 1}:`, err);
        console.error('Statement:', statement);
      }
    }
    
    console.log('Migration completed!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Add a stored procedure to execute SQL
async function createExecSqlFunction() {
  try {
    console.log('Creating exec_sql function if it doesn\'t exist...');
    
    const createFunctionSql = `
    CREATE OR REPLACE FUNCTION exec_sql(sql text)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql;
    END;
    $$;
    `;
    
    const { error } = await supabase.rpc('exec_sql', { sql: createFunctionSql });
    
    if (error) {
      // If the function doesn't exist yet, create it directly
      const { error: rawError } = await supabase.from('_raw_sql').insert({ query: createFunctionSql });
      if (rawError) {
        console.error('Error creating exec_sql function:', rawError);
        console.log('Creating function directly with PostgreSQL extension...');
        
        // Try creating with PostgreSQL extension
        const { error: pgError } = await supabase.rpc('pgcode_exec', { code: createFunctionSql });
        if (pgError) {
          console.error('Failed to create exec_sql function:', pgError);
          console.log('You may need to manually create this function in the Supabase dashboard.');
          return false;
        }
      }
    }
    
    console.log('exec_sql function is ready.');
    return true;
  } catch (error) {
    console.error('Error setting up exec_sql function:', error);
    return false;
  }
}

// Main execution
async function main() {
  const success = await createExecSqlFunction();
  if (success) {
    await runMigration();
  } else {
    console.log('Migration aborted due to setup issues.');
  }
}

main(); 