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

-- Create a helper function to apply template parameters
CREATE OR REPLACE FUNCTION public.apply_template_params(
  p_template TEXT,
  p_params JSONB
) RETURNS TEXT AS $$
DECLARE
  v_result TEXT;
  v_key TEXT;
  v_keys TEXT[];
BEGIN
  v_result := p_template;
  
  -- Extract all keys from the JSONB object
  SELECT array_agg(k) INTO v_keys
  FROM jsonb_object_keys(p_params) AS k;
  
  -- Apply each parameter
  IF v_keys IS NOT NULL THEN
    FOREACH v_key IN ARRAY v_keys
    LOOP
      v_result := replace(v_result, '{{' || v_key || '}}', p_params->>v_key);
    END LOOP;
  END IF;
  
  RETURN v_result;
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
BEGIN
  -- Get the template
  SELECT title_template, message_template, category INTO v_template
  FROM public.notification_templates
  WHERE name = p_template_name;
  
  IF v_template IS NULL THEN
    RAISE EXCEPTION 'Notification template % not found', p_template_name;
  END IF;
  
  -- Apply template parameters using helper function
  v_title := public.apply_template_params(v_template.title_template, p_params);
  v_message := public.apply_template_params(v_template.message_template, p_params);
  v_category := v_template.category;
  
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

-- Create function to mark all notifications as read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.notifications 
  SET is_read = TRUE
  WHERE user_id = p_user_id AND is_read = FALSE;
END;
$$ LANGUAGE plpgsql; 