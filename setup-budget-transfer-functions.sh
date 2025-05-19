#!/bin/bash
echo "Setting up budget transfer functions..."

# Get Supabase URL and Key from .env file if it exists
SUPABASE_URL=""
SUPABASE_KEY=""

if [ -f .env ]; then
  SUPABASE_URL=$(grep VITE_SUPABASE_URL .env | cut -d '=' -f2)
  SUPABASE_KEY=$(grep VITE_SUPABASE_SERVICE_KEY .env | cut -d '=' -f2)
fi

if [ -z "$SUPABASE_URL" ]; then
  echo "Please enter your Supabase URL:"
  read SUPABASE_URL
fi

if [ -z "$SUPABASE_KEY" ]; then
  echo "Please enter your Supabase service role key:"
  read SUPABASE_KEY
fi

echo "Checking if curl is available..."
if ! command -v curl &> /dev/null; then
  echo "curl is not found. Please install curl and try again."
  exit 1
fi

echo "Running SQL to set up budget transfer functions..."
SQL_CONTENT=$(cat src/sql/farmer-budget-transaction-functions.sql)

curl -X POST \
  "$SUPABASE_URL/rest/v1/rpc/exec_sql" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d "{\"query\": \"$SQL_CONTENT\"}"

if [ $? -ne 0 ]; then
  echo "Error executing SQL. Please check your Supabase URL and key."
  exit 1
fi

echo "Budget transfer functions set up successfully!"
echo ""
echo "You can now approve/reject budget requests with automatic budget transfers." 