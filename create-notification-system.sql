-- Create notifications table and related database objects

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

-- Create function to send notification
CREATE OR REPLACE FUNCTION public.send_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_category TEXT DEFAULT 'system',
  p_link TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_priority TEXT DEFAULT 'medium'
) RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_user_prefs JSONB;
  v_category_enabled BOOLEAN;
BEGIN
  -- Check if user has opted out of this category
  SELECT category_preferences->p_category INTO v_category_enabled
  FROM public.notification_preferences
  WHERE user_id = p_user_id;
  
  -- Default to true if no preferences found
  IF v_category_enabled IS NULL THEN
    v_category_enabled := TRUE;
  END IF;
  
  -- Only insert if user wants this category
  IF v_category_enabled THEN
    INSERT INTO public.notifications (
      user_id, title, message, category, link, metadata, priority
    ) VALUES (
      p_user_id, p_title, p_message, p_category, p_link, p_metadata, p_priority
    ) RETURNING id INTO v_notification_id;
  END IF;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to send notification using template
CREATE OR REPLACE FUNCTION public.send_notification_from_template(
  p_user_id UUID,
  p_template_name TEXT,
  p_params JSONB DEFAULT '{}'::jsonb,
  p_link TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_priority TEXT DEFAULT 'medium'
) RETURNS UUID AS $$
DECLARE
  v_title TEXT;
  v_message TEXT;
  v_category TEXT;
  v_notification_id UUID;
  v_template RECORD;
  v_key TEXT;
BEGIN
  -- Get the template
  SELECT title_template, message_template, category INTO v_template
  FROM public.notification_templates
  WHERE name = p_template_name;
  
  IF v_template IS NULL THEN
    RAISE EXCEPTION 'Notification template % not found', p_template_name;
  END IF;
  
  -- Replace parameters in title and message
  v_title := v_template.title_template;
  v_message := v_template.message_template;
  v_category := v_template.category;
  
  -- This is a simplistic parameter replacement
  -- In a real implementation, you'd use a more robust templating system
  FOR v_key IN (SELECT jsonb_object_keys(p_params))
  LOOP
    v_title := REPLACE(v_title, '{{' || v_key || '}}', p_params->>v_key);
    v_message := REPLACE(v_message, '{{' || v_key || '}}', p_params->>v_key);
  END LOOP;
  
  -- Call the send_notification function
  v_notification_id := public.send_notification(
    p_user_id, v_title, v_message, v_category, p_link, p_metadata, p_priority
  );
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Create notification_batch_send function for sending to multiple users
CREATE OR REPLACE FUNCTION public.send_notification_batch(
  p_user_ids UUID[],
  p_title TEXT,
  p_message TEXT,
  p_category TEXT DEFAULT 'system',
  p_link TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_priority TEXT DEFAULT 'medium'
) RETURNS SETOF UUID AS $$
DECLARE
  v_user_id UUID;
  v_notification_id UUID;
BEGIN
  FOREACH v_user_id IN ARRAY p_user_ids
  LOOP
    v_notification_id := public.send_notification(
      v_user_id, p_title, p_message, p_category, p_link, p_metadata, p_priority
    );
    IF v_notification_id IS NOT NULL THEN
      RETURN NEXT v_notification_id;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

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

-- Create function to mark all notifications as read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.notifications 
  SET is_read = TRUE
  WHERE user_id = p_user_id AND is_read = FALSE;
END;
$$ LANGUAGE plpgsql;

-- Test the notification system
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
    
    -- Send a test notification
    PERFORM public.send_notification(
      v_user_id,
      'Test Notification',
      'This is a test notification from the system.',
      'system',
      '/dashboard',
      '{"test": true}'::jsonb,
      'medium'
    );
    
    -- Send a test notification using template
    PERFORM public.send_notification_from_template(
      v_user_id,
      'welcome',
      '{"name": "Test User"}'::jsonb
    );
  END IF;
END $$; 