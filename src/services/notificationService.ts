import { supabase } from '@/lib/supabase';

export interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  category: 'system' | 'message' | 'task' | 'alert' | 'report' | 'farm' | 'budget' | 'other';
  created_at: string;
  link?: string;
  expires_at?: string;
  metadata?: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  category_preferences: Record<string, boolean>;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  title_template: string;
  message_template: string;
  category: string;
}

/**
 * Get all notifications for the current user
 */
export const getUserNotifications = async (limit = 50, onlyUnread = false): Promise<Notification[]> => {
  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (onlyUnread) {
      query = query.eq('is_read', false);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
    
    return data as Notification[];
  } catch (error) {
    console.error('Error in getUserNotifications:', error);
    return [];
  }
};

/**
 * Get the count of unread notifications
 */
export const getUnreadNotificationCount = async (): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('unread_notifications_count')
      .select('count')
      .single();
    
    if (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
    
    return data?.count || 0;
  } catch (error) {
    console.error('Error in getUnreadNotificationCount:', error);
    return 0;
  }
};

/**
 * Mark a specific notification as read
 */
export const markNotificationAsRead = async (notificationId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
    
    if (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in markNotificationAsRead:', error);
    return false;
  }
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = async (): Promise<boolean> => {
  try {
    const { error } = await supabase
      .rpc('mark_all_notifications_read');
    
    if (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in markAllNotificationsAsRead:', error);
    return false;
  }
};

/**
 * Get user notification preferences
 */
export const getUserNotificationPreferences = async (): Promise<NotificationPreferences | null> => {
  try {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .single();
    
    if (error) {
      console.error('Error fetching notification preferences:', error);
      return null;
    }
    
    return data as NotificationPreferences;
  } catch (error) {
    console.error('Error in getUserNotificationPreferences:', error);
    return null;
  }
};

/**
 * Update user notification preferences
 */
export const updateNotificationPreferences = async (
  preferences: Partial<NotificationPreferences>
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notification_preferences')
      .upsert(preferences);
    
    if (error) {
      console.error('Error updating notification preferences:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in updateNotificationPreferences:', error);
    return false;
  }
};

/**
 * Create a new notification
 */
export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  category: string = 'system',
  link?: string,
  metadata?: Record<string, any>,
  priority: string = 'medium'
): Promise<string | null> => {
  try {
    // Call the RPC function to create a notification
    const { data, error } = await supabase
      .rpc('send_notification', {
        p_user_id: userId,
        p_title: title,
        p_message: message,
        p_category: category,
        p_link: link,
        p_metadata: metadata,
        p_priority: priority
      });
    
    if (error) {
      console.error('Error creating notification:', error);
      return null;
    }
    
    return data as string;
  } catch (error) {
    console.error('Error in createNotification:', error);
    return null;
  }
};

/**
 * Create a notification from a template
 */
export const createNotificationFromTemplate = async (
  userId: string,
  templateName: string,
  params: Record<string, any>,
  link?: string,
  metadata?: Record<string, any>,
  priority: string = 'medium'
): Promise<string | null> => {
  try {
    // Call the RPC function to create a notification from template
    const { data, error } = await supabase
      .rpc('send_notification_from_template', {
        p_user_id: userId,
        p_template_name: templateName,
        p_params: params,
        p_link: link,
        p_metadata: metadata,
        p_priority: priority
      });
    
    if (error) {
      console.error('Error creating notification from template:', error);
      return null;
    }
    
    return data as string;
  } catch (error) {
    console.error('Error in createNotificationFromTemplate:', error);
    return null;
  }
};

/**
 * Send a notification to multiple users
 */
export const sendBatchNotification = async (
  userIds: string[],
  title: string,
  message: string,
  category: string = 'system',
  link?: string,
  metadata?: Record<string, any>,
  priority: string = 'medium'
): Promise<string[] | null> => {
  try {
    // Call the RPC function to send batch notifications
    const { data, error } = await supabase
      .rpc('send_notification_batch', {
        p_user_ids: userIds,
        p_title: title,
        p_message: message,
        p_category: category,
        p_link: link,
        p_metadata: metadata,
        p_priority: priority
      });
    
    if (error) {
      console.error('Error sending batch notifications:', error);
      return null;
    }
    
    return data as string[];
  } catch (error) {
    console.error('Error in sendBatchNotification:', error);
    return null;
  }
};

/**
 * Delete a notification
 */
export const deleteNotification = async (notificationId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);
    
    if (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteNotification:', error);
    return false;
  }
}; 