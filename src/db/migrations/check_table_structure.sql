-- Check the current structure of the table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'organization_announcements'
ORDER BY ordinal_position; 