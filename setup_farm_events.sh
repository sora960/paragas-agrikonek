#!/bin/bash

# This script will execute the farm_events.sql file in your Supabase database
# Make sure you have the Supabase CLI installed and configured

echo "Creating farm_events table..."
cat farm_events.sql

echo -e "\nExecuting SQL file in Supabase..."
echo "Note: You might need to copy and run this SQL in the Supabase SQL Editor manually if this fails."

# Attempt to run with Supabase CLI
if command -v supabase &> /dev/null; then
    supabase db execute --file farm_events.sql
    echo "SQL execution complete!"
else
    echo "Supabase CLI not found. Please install it, or run this SQL in the Supabase dashboard SQL editor."
    echo "You can copy the SQL from farm_events.sql and paste it into the SQL editor."
fi 