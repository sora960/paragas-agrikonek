
import { supabase } from '@/lib/supabase';
import { checkTableExists } from '@/services/userDatabaseUtils';

/**
 * Check if required tables exist
 */
export async function checkRequiredTables() {
  const requiredTables = ['users', 'user_credentials', 'user_regions', 'regions'];
  const results: Record<string, boolean> = {};
  let allExist = true;
  
  for (const table of requiredTables) {
    try {
      const exists = await checkTableExists(table);
      results[table] = exists;
      
      if (!exists) {
        allExist = false;
      }
    } catch {
      results[table] = false;
      allExist = false;
    }
  }
  
  return { allExist, tables: results };
}

/**
 * Create required tables if they don't exist
 */
export async function createRequiredTables() {
  const { allExist, tables } = await checkRequiredTables();
  
  if (allExist) {
    return { success: true, message: "All required tables already exist" };
  }
  
  const tablesToCreate = Object.entries(tables)
    .filter(([_, exists]) => !exists)
    .map(([name]) => name);
  
  try {
    // Import table creation functions from the new module
    const { 
      createUsersTable, 
      createUserCredentialsTable, 
      createUserRegionsTable, 
      createRegionsTable 
    } = await import('./databaseTableCreation');
    
    // These functions will handle the creation of each table
    for (const table of tablesToCreate) {
      switch (table) {
        case 'users':
          await createUsersTable();
          break;
          
        case 'user_credentials':
          await createUserCredentialsTable();
          break;
          
        case 'user_regions':
          await createUserRegionsTable();
          break;
          
        case 'regions':
          await createRegionsTable();
          break;
      }
    }
    
    return { success: true, message: "Created all required tables" };
  } catch (error) {
    console.error("Error creating required tables:", error);
    return { success: false, error };
  }
}
