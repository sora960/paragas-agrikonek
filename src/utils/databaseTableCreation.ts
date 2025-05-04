
import { supabase } from '@/lib/supabase';

/**
 * Create the users table
 */
export async function createUsersTable() {
  // First check if table exists
  const { error: checkError } = await supabase
    .from('users')
    .select()
    .limit(1);

  if (!checkError) {
    console.log("Users table already exists, skipping creation");
    return;
  }

  // Use SQL query to create the table with proper role check constraint
  const { error } = await supabase.rpc('execute_sql', { 
    sql_query: `
      CREATE TABLE IF NOT EXISTS public.users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email TEXT NOT NULL UNIQUE,
        first_name TEXT,
        last_name TEXT,
        role TEXT NOT NULL CHECK (role IN ('farmer', 'org_admin', 'regional_admin', 'superadmin')),
        status TEXT DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  });

  if (error) {
    console.error("Error creating users table:", error);
    throw error;
  }
}

/**
 * Create the user_credentials table
 */
export async function createUserCredentialsTable() {
  // First check if table exists
  const { error: checkError } = await supabase
    .from('user_credentials')
    .select()
    .limit(1);

  if (!checkError) {
    console.log("User credentials table already exists, skipping creation");
    return;
  }

  // Use SQL query to create the table
  const { error } = await supabase.rpc('execute_sql', { 
    sql_query: `
      CREATE TABLE IF NOT EXISTS public.user_credentials (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  });

  if (error) {
    console.error("Error creating user_credentials table:", error);
    throw error;
  }
}

/**
 * Create the user_regions table
 */
export async function createUserRegionsTable() {
  // First check if table exists
  const { error: checkError } = await supabase
    .from('user_regions')
    .select()
    .limit(1);

  if (!checkError) {
    console.log("User regions table already exists, skipping creation");
    return;
  }

  // Use SQL query to create the table
  const { error } = await supabase.rpc('execute_sql', { 
    sql_query: `
      CREATE TABLE IF NOT EXISTS public.user_regions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        region_id TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  });

  if (error) {
    console.error("Error creating user_regions table:", error);
    throw error;
  }
}

/**
 * Create the regions table with default data
 */
export async function createRegionsTable() {
  // First check if table exists
  const { error: checkError } = await supabase
    .from('regions')
    .select()
    .limit(1);

  if (!checkError) {
    console.log("Regions table already exists, skipping creation");
    return;
  }

  // Use SQL query to create the table
  const { error: createError } = await supabase.rpc('execute_sql', { 
    sql_query: `
      CREATE TABLE IF NOT EXISTS public.regions (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  });

  if (createError) {
    console.error("Error creating regions table:", createError);
    throw createError;
  }

  // Insert base regions
  const { error: insertError } = await supabase
    .from('regions')
    .insert([
      {
        id: 'luzon-R1',
        code: 'R1',
        name: 'Ilocos Region'
      },
      {
        id: 'luzon-R2',
        code: 'R2',
        name: 'Cagayan Valley'
      },
      {
        id: 'luzon-R3',
        code: 'R3',
        name: 'Central Luzon'
      },
      {
        id: 'luzon-NCR',
        code: 'NCR',
        name: 'National Capital Region'
      }
    ]);

  if (insertError) {
    console.error("Error inserting regions:", insertError);
    throw insertError;
  }
}
