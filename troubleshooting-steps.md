# Troubleshooting Supabase Connection Issues

## Problem
You're trying to connect your React application to a self-hosted Supabase instance at `https://supabase.eztechsolutions.pro`, but tasks are not being added to the database.

## Step 1: Verify Environment Variables

Your console logs show that the application is trying to connect to `https://supabase.eztechsolutions.pro`. Make sure your `.env.local` file has the correct format:

```
VITE_SUPABASE_URL=https://supabase.eztechsolutions.pro
VITE_SUPABASE_ANON_KEY=your-actual-anon-key
```

**Important**: After changing your `.env.local` file, you need to restart your development server for the changes to take effect.

## Step 2: Check Server Status and Connectivity

1. Open your browser and navigate to `https://supabase.eztechsolutions.pro` to verify the Supabase instance is running.
2. Check if there are any SSL certificate issues (browser warnings about invalid certificates).
3. Test connectivity using the `supabase-test.html` file I provided - just open it in a browser.

## Step 3: Verify Table Existence and RLS Policies

Your console errors show that the application couldn't find the `todos` table. Run the SQL commands in `supabase-sql-fix.sql` to:

1. Check if the `todos` table exists
2. Create the table if it doesn't exist
3. Set up proper Row Level Security (RLS) policies
4. Insert a test record

This is crucial because even if the table exists, without proper RLS policies, anonymous operations will be blocked.

## Step 4: Update Application Code

1. Open your application in development mode:
   ```
   npm run dev
   ```

2. Check the browser console for detailed errors:
   - Connection errors
   - Permission/RLS errors
   - Table not found errors

3. If you see specific error codes in the console:
   - `42P01`: Table does not exist
   - `42501`: Permission denied (likely an RLS issue)
   - `401`: Unauthorized (likely an authentication issue)

## Step 5: Test with Direct API Calls

Use the browser's developer tools to test direct API calls:

1. Open DevTools (F12)
2. Go to the Console tab
3. Run this code (replace with your actual anon key):

```javascript
const supabaseUrl = 'https://supabase.eztechsolutions.pro';
const supabaseKey = 'your-actual-anon-key';

fetch(`${supabaseUrl}/rest/v1/todos?select=*`, {
  headers: {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`
  }
})
.then(response => {
  console.log('Status:', response.status);
  return response.json();
})
.then(data => console.log('Data:', data))
.catch(error => console.error('Error:', error));
```

## Step 6: Common Causes and Solutions

### CORS Issues
If you're seeing CORS errors in the console, make sure your Supabase instance allows requests from your application's origin.

### RLS Policies
If you're seeing permission errors, check your RLS policies:
- Run `SELECT * FROM pg_policies WHERE tablename = 'todos';` to see existing policies
- Make sure there's a policy allowing anonymous access

### Network/Firewall Issues
If you can't connect at all, check:
- Firewall settings
- Network configuration
- VPN settings that might be blocking the connection

### SSL Issues
If you're using HTTPS but see certificate errors:
- Make sure your Supabase instance has a valid SSL certificate
- Try connecting with HTTP if available for testing

## Step 7: Debugging in the Application

1. Look for specific error messages in the browser console.
2. Check network requests to see what's being sent to the Supabase API.
3. Verify if the request payloads are correctly formatted.

## Final Check

Once everything is set up correctly:
1. You should be able to add, update, and delete todos
2. The Supabase SQL editor should show the updated data
3. The application should display the data without errors

If issues persist, please provide the specific error messages from your browser console for further troubleshooting. 