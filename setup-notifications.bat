@echo off
echo Setting up notification system...

echo Step 1: Creating notification tables
psql -f notifications-direct.sql

echo Step 2: Creating notification functions
psql -f notification-functions.sql

echo Notification system setup complete!
pause 