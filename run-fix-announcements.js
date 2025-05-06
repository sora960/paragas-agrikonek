const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Use the same Supabase URL and key as your app
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://supabase.eztechsolutions.pro';
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
// If you don't have a service key, use the anon key (less secure but will work for this fix)
const supabaseKey = supabaseServiceKey || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase URL or key not found in environment variables');
  process.exit(1);
}

console.log('Using Supabase URL:', supabaseUrl);
console.log('Using key with length:', supabaseKey ? supabaseKey.length : 0);

// Create a Supabase client with appropriate permissions
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSQL() {
  try {
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'fix-announcements-all.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('Running SQL to fix announcements for both admins and members...');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('execute_sql', {
      sql_query: sqlContent
    });
    
    if (error) {
      console.error('Error executing SQL:', error);
      
      // Fallback - try executing SQL in smaller chunks if the stored procedure isn't working
      console.log('Attempting to execute SQL directly in chunks...');
      
      // Split SQL into individual statements, respecting BEGIN/COMMIT blocks
      const statements = [];
      let currentStatement = '';
      
      // Split the content by semicolons but keep function definitions intact
      const lines = sqlContent.split('\n');
      let insideFunction = false;
      
      for (const line of lines) {
        // Add the line to the current statement
        currentStatement += line + '\n';
        
        // Check if we're entering or leaving a function definition
        if (line.includes('AS $$')) {
          insideFunction = true;
        } else if (line.includes('$$;') && insideFunction) {
          insideFunction = false;
          // Add the complete function definition as a statement
          statements.push(currentStatement);
          currentStatement = '';
        } else if (!insideFunction && line.trim().endsWith(';')) {
          // Regular statement ended with semicolon
          statements.push(currentStatement);
          currentStatement = '';
        }
      }
      
      // Add any remaining statement
      if (currentStatement.trim()) {
        statements.push(currentStatement);
      }
      
      console.log(`Executing ${statements.length} SQL statements individually...`);
      
      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i].trim();
        if (!stmt) continue;
        
        console.log(`Executing statement ${i+1}/${statements.length}...`);
        
        try {
          const { error } = await supabase.rpc('execute_sql', { 
            sql_query: stmt 
          });
          
          if (error) {
            console.error('Error executing statement:', error);
            console.error('Statement:', stmt);
          } else {
            console.log(`Statement ${i+1} executed successfully`);
          }
        } catch (stmtError) {
          console.error('Exception executing statement:', stmtError);
          console.error('Statement:', stmt);
        }
      }
      
      return;
    }
    
    console.log('SQL executed successfully!');
    console.log('Data:', data);
  } catch (error) {
    console.error('Exception running SQL script:', error);
  }
}

// Execute the SQL
executeSQL().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
}); 