import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Link } from 'react-router-dom';

interface Notification {
  id: string;
  title: string;
  content: string;
  created_at: string;
  is_read: boolean;
  link?: string;
  type?: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      if (!user?.id) return;

      // First try to fetch notifications from the notifications table
      let { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        // If there's an error (like table doesn't exist), use mock data
        console.warn("Could not fetch notifications, using mock data:", error);
        data = generateMockNotifications();
      }

      setNotifications(data || []);
      setUnreadCount((data || []).filter(n => !n.is_read).length);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // Only proceed if the table is likely to exist
      if (notifications.length === 0 || notifications[0].id === 'mock') {
        return;
      }

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      // Only proceed if the table is likely to exist
      if (notifications.length === 0 || notifications[0].id === 'mock') {
        // Just update local state for mock data
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
        return;
      }

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user?.id)
        .is('is_read', false);

      if (error) throw error;

      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const generateMockNotifications = (): Notification[] => {
    return [
      {
        id: 'mock1',
        title: 'Welcome to AgriConnect',
        content: 'Thank you for joining our platform! Explore features to get started.',
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        is_read: false,
        link: '/dashboard'
      },
      {
        id: 'mock2',
        title: 'Complete Your Profile',
        content: 'Add more details to your profile to help organizations know you better.',
        created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        is_read: true,
        link: '/farmer/profile'
      },
      {
        id: 'mock3',
        title: 'New Feature Available',
        content: 'Check out the new crop management tool in your dashboard.',
        created_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
        is_read: false,
        link: '/farmer/crops'
      }
    ];
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    setOpen(false);
  };

  // Function to format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) {
      return interval === 1 ? '1 year ago' : `${interval} years ago`;
    }
    
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) {
      return interval === 1 ? '1 month ago' : `${interval} months ago`;
    }
    
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) {
      return interval === 1 ? '1 day ago' : `${interval} days ago`;
    }
    
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) {
      return interval === 1 ? '1 hour ago' : `${interval} hours ago`;
    }
    
    interval = Math.floor(seconds / 60);
    if (interval >= 1) {
      return interval === 1 ? '1 minute ago' : `${interval} minutes ago`;
    }
    
    return seconds < 10 ? 'just now' : `${Math.floor(seconds)} seconds ago`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Notifications</CardTitle>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                  Mark all as read
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="max-h-[300px] overflow-auto">
            <div className="space-y-2">
              {notifications.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No notifications yet
                </p>
              ) : (
                notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted ${
                      !notification.is_read ? 'bg-accent/40' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    {notification.link ? (
                      <Link to={notification.link} className="block">
                        <div className="mb-1">
                          <span className="font-medium text-sm">{notification.title}</span>
                          {!notification.is_read && (
                            <span className="ml-2 bg-primary rounded-full h-2 w-2 inline-block"></span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{notification.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTimeAgo(notification.created_at)}
                        </p>
                      </Link>
                    ) : (
                      <>
                        <div className="mb-1">
                          <span className="font-medium text-sm">{notification.title}</span>
                          {!notification.is_read && (
                            <span className="ml-2 bg-primary rounded-full h-2 w-2 inline-block"></span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{notification.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTimeAgo(notification.created_at)}
                        </p>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
          <CardFooter className="border-t p-3">
            <Button variant="ghost" size="sm" className="w-full text-sm" asChild>
              <Link to="/settings/notifications">Notification Settings</Link>
            </Button>
          </CardFooter>
        </Card>
      </PopoverContent>
    </Popover>
  );
} 