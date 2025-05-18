import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowLeft } from "lucide-react";
import { 
  getUserNotificationPreferences, 
  updateNotificationPreferences, 
  NotificationPreferences 
} from "@/services/notificationService";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";


export default function NotificationSettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const categoryLabels = {
    system: "System Notifications",
    budget: "Budget Updates",
    message: "Messages",
    alert: "Alerts and Reminders"
  };

  useEffect(() => {
    const fetchPreferences = async () => {
      setIsLoading(true);
      try {
        const prefs = await getUserNotificationPreferences();
        if (prefs) {
          setPreferences(prefs);
        } else {
          // Create default preferences if none exist
          setPreferences({
            id: "",
            user_id: user?.id || "",
            email_enabled: true,
            push_enabled: true,
            category_preferences: {
              system: true,
              budget: true,
              message: true,
              alert: true
            },
            quiet_hours_start: undefined,
            quiet_hours_end: undefined
          });
        }
      } catch (error) {
        console.error("Error fetching notification preferences:", error);
        toast({
          title: "Error",
          description: "Failed to load notification preferences",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchPreferences();
    }
  }, [user, toast]);

  const handleSavePreferences = async () => {
    if (!preferences) return;
    
    setIsSaving(true);
    try {
      const success = await updateNotificationPreferences(preferences);
      
      if (success) {
        toast({
          title: "Success",
          description: "Notification preferences saved",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to save notification preferences",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving notification preferences:", error);
      toast({
        title: "Error",
        description: "An error occurred while saving preferences",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleCategory = (category: string, enabled: boolean) => {
    if (!preferences) return;
    
    setPreferences({
      ...preferences,
      category_preferences: {
        ...preferences.category_preferences,
        [category]: enabled
      }
    });
  };

  const handleToggleDeliveryMethod = (method: "email" | "push", enabled: boolean) => {
    if (!preferences) return;
    
    if (method === "email") {
      setPreferences({
        ...preferences,
        email_enabled: enabled
      });
    } else {
      setPreferences({
        ...preferences,
        push_enabled: enabled
      });
    }
  };

  const handleBack = () => {
    navigate(-1); // Go back to the previous page
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center mb-6">
        <Button variant="outline" size="sm" onClick={handleBack} className="mr-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Notification Settings</h1>
      </div>
      
      <Tabs defaultValue="channels">
        <TabsList className="mb-6">
          <TabsTrigger value="channels">Notification Channels</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="schedules">Quiet Hours</TabsTrigger>
        </TabsList>
        
        {/* Delivery Methods Tab */}
        <TabsContent value="channels">
          <Card>
            <CardHeader>
              <CardTitle>Notification Channels</CardTitle>
              <CardDescription>
                Choose how you want to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-notifications" className="text-base">
                    Email Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={preferences?.email_enabled}
                  onCheckedChange={(checked) => 
                    handleToggleDeliveryMethod("email", checked)
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="push-notifications" className="text-base">
                    Push Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications in the browser
                  </p>
                </div>
                <Switch
                  id="push-notifications"
                  checked={preferences?.push_enabled}
                  onCheckedChange={(checked) => 
                    handleToggleDeliveryMethod("push", checked)
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Categories Tab */}
        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Notification Categories</CardTitle>
              <CardDescription>
                Choose which types of notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {preferences && Object.entries(categoryLabels).map(([category, label]) => (
                <div key={category} className="flex items-center justify-between">
                  <div>
                    <Label htmlFor={`category-${category}`} className="text-base">
                      {label}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {getNotificationDescription(category)}
                    </p>
                  </div>
                  <Switch
                    id={`category-${category}`}
                    checked={preferences.category_preferences[category] ?? true}
                    onCheckedChange={(checked) => 
                      handleToggleCategory(category, checked)
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Quiet Hours Tab */}
        <TabsContent value="schedules">
          <Card>
            <CardHeader>
              <CardTitle>Quiet Hours</CardTitle>
              <CardDescription>
                Set times when you don't want to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col space-y-4">
                <div>
                  <Label htmlFor="quiet-hours-start" className="text-base mb-2 block">
                    Start Time
                  </Label>
                  <input
                    id="quiet-hours-start"
                    type="time"
                    className="w-full max-w-xs border border-input bg-background px-3 py-2 rounded-md"
                    value={preferences?.quiet_hours_start || ""}
                    onChange={(e) => {
                      if (preferences) {
                        setPreferences({
                          ...preferences,
                          quiet_hours_start: e.target.value
                        });
                      }
                    }}
                  />
                </div>
                
                <div>
                  <Label htmlFor="quiet-hours-end" className="text-base mb-2 block">
                    End Time
                  </Label>
                  <input
                    id="quiet-hours-end"
                    type="time"
                    className="w-full max-w-xs border border-input bg-background px-3 py-2 rounded-md"
                    value={preferences?.quiet_hours_end || ""}
                    onChange={(e) => {
                      if (preferences) {
                        setPreferences({
                          ...preferences,
                          quiet_hours_end: e.target.value
                        });
                      }
                    }}
                  />
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground">
                During quiet hours, you'll still receive notifications, but they won't
                trigger alerts. You can view them when you next check the application.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="mt-6 flex justify-end">
        <Button 
          onClick={handleSavePreferences} 
          disabled={isSaving}
          className="px-6"
        >
          {isSaving ? 
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </> : 
            'Save Changes'
          }
        </Button>
      </div>
    </div>
  );
}

// Helper function to get descriptions for each notification type
function getNotificationDescription(category: string): string {
  switch (category) {
    case 'system':
      return 'Important updates about the system, including maintenance and new features';
    case 'budget':
      return 'Updates about budget allocations, approvals, and financial activities';
    case 'message':
      return 'Notifications when you receive new messages from other users';
    case 'alert':
      return 'Time-sensitive alerts and important reminders';
    default:
      return '';
  }
} 