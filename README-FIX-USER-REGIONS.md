# Fixing User-Region Assignment Permissions

This guide provides several methods to fix the permissions issues with the `user_regions` table that prevent regional admin assignment.

## The Problem

When trying to assign a Regional Admin to a region, you encounter permission errors:
```
permission denied for table user_regions
```

This occurs because the database has Row Level Security (RLS) policies that prevent inserting records into the `user_regions` table.

## Solution Options

### Option 1: Directly in Supabase Dashboard (Recommended)

1. Login to your Supabase dashboard
2. Go to the SQL Editor
3. Paste and run the following SQL:

```sql
-- Fix permissions for user_regions table
BEGIN;

-- Disable Row Level Security on the user_regions table
ALTER TABLE public.user_regions DISABLE ROW LEVEL SECURITY;

-- Grant all permissions to all roles
GRANT ALL ON public.user_regions TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Grant permissions for sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

COMMIT;
```

### Option 2: Using the Batch File (Local Development)

If you're using a local Supabase instance or have direct PostgreSQL access:

1. Run the provided batch file:
```
fix-user-regions-permissions.bat
```

2. If asked for a password, enter your PostgreSQL password.

### Option 3: Using Node.js (Remote Supabase)

If you have Node.js installed and have the necessary API permissions:

1. Install required packages:
```
npm install dotenv node-fetch
```

2. Update your Supabase credentials in `.env` file or directly in the script
3. Run the Node.js script:
```
node fix-user-regions-online.js
```

## Confirming the Fix

After applying any of these solutions:

1. Return to the Regional Admin assignment screen
2. Try assigning a Regional Admin to a region again
3. It should now work without permission errors

## Alternative Solutions

If you still encounter issues and don't want to modify RLS policies:

1. **Use a Service Role Key**: Modify your application to use a service role key for this specific operation
2. **Create a Custom Function**: Create a PostgreSQL function with `SECURITY DEFINER` that handles the insert operation
3. **Contact Supabase Support**: If you're on a paid plan, contact Supabase support for assistance

## Need Further Help?

If you continue experiencing issues, please:
1. Check PostgreSQL logs for detailed error messages
2. Ensure your Supabase API key has sufficient privileges
3. Consider reinstating RLS with more permissive policies 