import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { 
  Notification, 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadNotificationCount
} from '@/services/notificationService';
import { useToast } from '@/components/ui/use-toast';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  removeNotification: (notificationId: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch notifications when user changes
  useEffect(() => {
    if (user) {
      refreshNotifications();
      
      // Set up polling for new notifications
      const interval = setInterval(() => {
        refreshUnreadCount();
      }, 30000); // Check for new notifications every 30 seconds
      
      return () => clearInterval(interval);
    } else {
      // Clear notifications when user logs out
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user]);

  // Function to refresh the notifications list
  const refreshNotifications = async (): Promise<void> => {
    if (!user) return;
    
    setLoading(true);
    try {
      const notifs = await getUserNotifications(50);
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.is_read).length);
      setError(null);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications');
      toast({
        title: 'Error',
        description: 'Failed to load notifications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to refresh only the unread count
  const refreshUnreadCount = async (): Promise<void> => {
    if (!user) return;
    
    try {
      const count = await getUnreadNotificationCount();
      
      // If there are new notifications, refresh the full list
      if (count > unreadCount) {
        await refreshNotifications();
        // No need to show toast for new notifications - we'll use the bell icon badge
      } else {
        setUnreadCount(count);
      }
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  };

  // Mark a notification as read
  const markAsRead = async (notificationId: string): Promise<void> => {
    try {
      const success = await markNotificationAsRead(notificationId);
      if (success) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId 
              ? { ...n, is_read: true } 
              : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
      toast({
        title: 'Error',
        description: 'Failed to mark notification as read',
        variant: 'destructive',
      });
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async (): Promise<void> => {
    try {
      const success = await markAllNotificationsAsRead();
      if (success) {
        setNotifications(prev => 
          prev.map(n => ({ ...n, is_read: true }))
        );
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      toast({
        title: 'Error',
        description: 'Failed to mark all notifications as read',
        variant: 'destructive',
      });
    }
  };

  // Remove a notification
  const removeNotification = async (notificationId: string): Promise<void> => {
    try {
      const success = await deleteNotification(notificationId);
      if (success) {
        const removed = notifications.find(n => n.id === notificationId);
        setNotifications(prev => 
          prev.filter(n => n.id !== notificationId)
        );
        
        // Update unread count if needed
        if (removed && !removed.is_read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (err) {
      console.error('Error removing notification:', err);
      toast({
        title: 'Error',
        description: 'Failed to remove notification',
        variant: 'destructive',
      });
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        error,
        markAsRead,
        markAllAsRead,
        removeNotification,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

// Hook to use the notification context
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
} 