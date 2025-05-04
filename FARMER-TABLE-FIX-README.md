# Farmer Tables Fix Utility

This utility fixes issues with the `farmer_profiles` and `organization_members` tables in Supabase by recreating them with Row Level Security (RLS) disabled.

## Problem

The application is encountering the following errors when trying to access these tables:

```
supabase.eztechsolutions.pro/rest/v1/organization_members?select=...&organization_id=eq.7cce32b2-602a-417a-aab7-378a59abc9e4&order=join_date.desc:1 - Failed to load resource: the server responded with a status of 404 ()

supabase.eztechsolutions.pro/rest/v1/farmer_profiles?select=id%2Cuser_id%2Cfull_name%2Cemail%2Cphone%2Cfarm_name:1 - Failed to load resource: the server responded with a status of 400 ()
```

These errors indicate either:
1. The tables don't exist in the database
2. The tables exist but have restrictive Row Level Security (RLS) policies preventing access
3. The tables have incorrect column definitions

## Solution

The fix utility recreates these tables with proper structure and disables RLS to ensure the application can access them.

## Files Included

- `create-execute-sql-function.sql` - SQL script to create a function for executing SQL via API
- `install-sql-function.js` - Script to install the SQL execution function
- `recreate_farmer_profiles.sql` - SQL script to recreate the farmer_profiles table
- `recreate_organization_members.sql` - SQL script to recreate the organization_members table
- `recreate-farmer-tables.js` - Script to execute both SQL scripts
- `fix-farmer-tables.bat` - Windows batch file to run all scripts in sequence

## How to Use

### Automatic Method (Windows)

1. Make sure your Supabase credentials are set in the environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

2. Run the `fix-farmer-tables.bat` file by double-clicking it or running it from the command line.

3. Follow the prompts in the console.

### Manual Method (Any OS)

1. Make sure Node.js is installed on your system.

2. Set the environment variables:
   ```
   export VITE_SUPABASE_URL="your-supabase-url"
   export VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"
   ```
   (Use `set` instead of `export` on Windows)

3. Install the SQL execution function:
   ```
   node install-sql-function.js
   ```

4. Recreate the tables:
   ```
   node recreate-farmer-tables.js
   ```

### SQL Editor Method

If the automated methods don't work, you can run the SQL scripts directly in the Supabase SQL Editor:

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Create a new query
4. Copy and paste the contents of each SQL file (in order)
5. Run the queries

## Table Structure

### farmer_profiles

The recreated `farmer_profiles` table has the following structure:

```sql
CREATE TABLE IF NOT EXISTS public.farmer_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    province_id UUID REFERENCES public.provinces(id) ON DELETE SET NULL,
    full_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    farm_name VARCHAR(100) NOT NULL,
    farm_size DECIMAL(10, 2),
    farm_address TEXT,
    years_of_experience INTEGER DEFAULT 0,
    main_crops TEXT[],
    farm_type VARCHAR(50),
    certification_status VARCHAR(50) DEFAULT 'none',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### organization_members

The recreated `organization_members` table has the following structure:

```sql
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    farmer_id UUID REFERENCES public.farmer_profiles(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    status VARCHAR(50) DEFAULT 'active',
    join_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, farmer_id)
);
```

## Caution

These scripts disable RLS on the tables, which means any user can access them. In a production environment, you may want to add appropriate RLS policies after confirming the application works correctly. 