-- Setup script for notifications system
-- This script sets up the complete notification system

-- Verify the database connection
DO $$
BEGIN
  RAISE NOTICE 'Setting up notification system on database: %', current_database();
END $$;

-- Run the notification tables setup
DO $$
BEGIN
  RAISE NOTICE 'Creating notification tables and functions...';
END $$;

-- Include the notification system SQL here directly
\ir create-notification-system.sql

-- Create a test notification for each user
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
    
    -- Send a role-specific notification
    CASE user_rec.role
      WHEN 'farmer' THEN
        PERFORM public.send_notification(
          user_rec.id,
          'Farm Updates Available',
          'New farming techniques and resources are available in your learning center.',
          'farm',
          '/farmer/resources',
          jsonb_build_object('type', 'resource_update'),
          'medium'
        );
      WHEN 'org_admin' THEN
        PERFORM public.send_notification(
          user_rec.id,
          'Organization Budget Updated',
          'The organization budget has been updated with new allocations.',
          'budget',
          '/organization/budget',
          jsonb_build_object('type', 'budget_update'),
          'high'
        );
      WHEN 'regional_admin' THEN
        PERFORM public.send_notification(
          user_rec.id,
          'Regional Report Available',
          'A new regional performance report is available for review.',
          'report',
          '/regional/reports',
          jsonb_build_object('type', 'report_available'),
          'medium'
        );
      WHEN 'superadmin' THEN
        PERFORM public.send_notification(
          user_rec.id,
          'System Upgrade Complete',
          'The system has been successfully upgraded with new features.',
          'system',
          '/superadmin/settings',
          jsonb_build_object('type', 'system_update'),
          'low'
        );
      ELSE
        PERFORM public.send_notification(
          user_rec.id,
          'Account Setup',
          'Your account has been successfully set up.',
          'system',
          null,
          jsonb_build_object('type', 'account_setup'),
          'medium'
        );
    END CASE;
  END LOOP;
  
  RAISE NOTICE 'Created test notifications for % users', (SELECT COUNT(*) FROM public.users);
END $$;

-- Report successful completion
DO $$
BEGIN
  RAISE NOTICE 'Notification system has been successfully set up!';
END $$; 