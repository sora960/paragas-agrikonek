// This script runs the notification setup SQL files
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSqlFile(filename) {
  try {
    console.log(`Reading SQL file: ${filename}`);
    const sql = fs.readFileSync(filename, 'utf8');
    
    console.log(`Executing SQL from ${filename}...`);
    
    // This is using the direct SQL execution capability
    // Note: this requires appropriate permissions
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error(`Error executing SQL from ${filename}:`, error);
      return false;
    }
    
    console.log(`Successfully executed SQL from ${filename}`);
    
    if (data) {
      console.log('Result:', data);
    }
    
    return true;
  } catch (err) {
    console.error(`Error processing ${filename}:`, err);
    return false;
  }
}

async function main() {
  console.log('Setting up notification system...');
  
  // First run the notification system setup
  const success1 = await runSqlFile('./create-notification-system.sql');
  if (!success1) {
    console.error('Failed to set up notification tables and functions. Aborting.');
    process.exit(1);
  }
  
  // Then run the test data generation
  const testDataSql = `
DO $$
DECLARE
  user_rec RECORD;
BEGIN
  RAISE NOTICE 'Creating test notifications for users...';
  
  FOR user_rec IN SELECT id, first_name, role FROM public.users
  LOOP
    -- Create default preferences for this user
    INSERT INTO public.notification_preferences (user_id)
    VALUES (user_rec.id)
    ON CONFLICT DO NOTHING;
    
    -- Send a welcome notification
    PERFORM public.send_notification_from_template(
      user_rec.id,
      'welcome',
      jsonb_build_object('name', COALESCE(user_rec.first_name, 'User'))
    );
  END LOOP;
  
  RAISE NOTICE 'Created test notifications for users';
END $$;
  `;
  
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: testDataSql });
  
  if (error) {
    console.error('Error creating test notifications:', error);
    process.exit(1);
  }
  
  console.log('Notification system has been successfully set up!');
}

// Run the main function
main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 