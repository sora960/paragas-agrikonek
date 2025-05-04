-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  category TEXT CHECK (category IN ('system', 'message', 'task', 'alert', 'report', 'farm', 'budget', 'other')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  metadata JSONB,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium'
);

-- Create notification_templates table for reusable templates
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  title_template TEXT NOT NULL,
  message_template TEXT NOT NULL,
  category TEXT CHECK (category IN ('system', 'message', 'task', 'alert', 'report', 'farm', 'budget', 'other')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create notification_preferences table to store user preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  email_enabled BOOLEAN DEFAULT TRUE,
  push_enabled BOOLEAN DEFAULT TRUE, 
  category_preferences JSONB DEFAULT '{"system": true, "message": true, "task": true, "alert": true, "report": true, "farm": true, "budget": true, "other": true}'::jsonb,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on all new tables
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can see only their notifications" 
  ON public.notifications FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can update only their notifications" 
  ON public.notifications FOR UPDATE 
  USING (user_id = auth.uid());

CREATE POLICY "Allow all access to notification_templates" 
  ON public.notification_templates FOR ALL 
  USING (true);

CREATE POLICY "Users can manage only their notification preferences" 
  ON public.notification_preferences FOR ALL 
  USING (user_id = auth.uid());

-- Grant permissions
GRANT ALL ON public.notifications TO anon, authenticated;
GRANT ALL ON public.notification_templates TO anon, authenticated;
GRANT ALL ON public.notification_preferences TO anon, authenticated;

-- Insert some default notification templates
INSERT INTO public.notification_templates (name, title_template, message_template, category)
VALUES 
  ('welcome', 'Welcome to AgriConnect, {{name}}!', 'Thanks for joining AgriConnect. Start exploring the platform to connect with agricultural resources.', 'system'),
  ('new_message', 'New message from {{sender}}', '{{sender}} sent you a message: "{{preview}}"', 'message'),
  ('task_assigned', 'New task assigned: {{task_name}}', 'You have been assigned a new task: {{task_name}}. Due date: {{due_date}}.', 'task'),
  ('weather_alert', 'Weather Alert: {{alert_type}}', 'Weather alert for your area: {{alert_message}}', 'alert'),
  ('new_report', 'New report available: {{report_name}}', 'A new report "{{report_name}}" is now available for your review.', 'report'),
  ('budget_approval', 'Budget {{status}}: {{budget_name}}', 'Your budget "{{budget_name}}" has been {{status}}.', 'budget')
ON CONFLICT DO NOTHING;

-- Create unread_notifications_count view
CREATE OR REPLACE VIEW public.unread_notifications_count AS
SELECT
  user_id,
  COUNT(*) AS count
FROM
  public.notifications
WHERE
  is_read = FALSE
GROUP BY
  user_id;

-- Grant access to view
GRANT ALL ON public.unread_notifications_count TO anon, authenticated;

-- Create test notifications for a sample user
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get a test user ID
  SELECT id INTO v_user_id FROM public.users LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    -- Create default preferences for this user
    INSERT INTO public.notification_preferences (user_id)
    VALUES (v_user_id)
    ON CONFLICT DO NOTHING;
    
    -- Create test notification
    INSERT INTO public.notifications (
      user_id, title, message, category, link, metadata, priority
    ) VALUES (
      v_user_id, 
      'Test Notification', 
      'This is a test notification from the system.', 
      'system',
      '/dashboard',
      '{"test": true}'::jsonb,
      'medium'
    );
    
    -- Create welcome notification
    INSERT INTO public.notifications (
      user_id, title, message, category
    ) VALUES (
      v_user_id,
      'Welcome to AgriConnect!',
      'Thanks for joining AgriConnect. Start exploring the platform to connect with agricultural resources.',
      'system'
    );
  END IF;
END $$; 