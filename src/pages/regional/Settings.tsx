import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Settings as SettingsIcon, Bell, User, UserCog, Lock, Mail } from "lucide-react";

export default function RegionalSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>({});
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    budgetRequestNotifications: true,
    messageNotifications: true,
    organizationUpdates: true,
  });
  const [userRegion, setUserRegion] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchUserRegion();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();
        
      if (error) {
        if (error.code === "PGRST116") {
          // Profile not found, create a new one
          await createDefaultProfile();
        } else {
          throw error;
        }
      } else if (data) {
        setProfile(data);
      }
    } catch (err: any) {
      console.error("Error fetching user profile:", err);
      toast({
        title: "Error",
        description: "Failed to load your profile.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRegion = async () => {
    if (!user) return;
    
    try {
      const { data: regionData, error: regionError } = await supabase
        .from("user_regions")
        .select("region_id, regions(id, name)")
        .eq("user_id", user.id)
        .single();
        
      if (regionError) throw regionError;
      
      if (regionData) {
        setUserRegion(regionData.regions);
      } else {
        toast({
          title: "No Region Assigned",
          description: "You don't have any assigned region.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("Error fetching user region:", err);
    }
  };

  const createDefaultProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .insert([
          {
            id: user!.id,
            display_name: user!.email?.split('@')[0] || "Regional Admin",
            avatar_url: null,
            email_notifications: true,
          },
        ])
        .select()
        .single();
        
      if (error) throw error;
      
      setProfile(data);
    } catch (err: any) {
      console.error("Error creating default profile:", err);
      toast({
        title: "Error",
        description: "Failed to create your profile.",
        variant: "destructive",
      });
    }
  };

  const saveProfile = async (profileData: any) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update(profileData)
        .eq("id", user!.id);
        
      if (error) throw error;
      
      setProfile({ ...profile, ...profileData });
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (err: any) {
      console.error("Error updating profile:", err);
      toast({
        title: "Error",
        description: "Failed to update your profile.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveNotificationSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          email_notifications: notificationSettings.emailNotifications,
          notification_settings: notificationSettings,
        })
        .eq("id", user!.id);
        
      if (error) throw error;
      
      toast({
        title: "Settings saved",
        description: "Your notification settings have been updated.",
      });
    } catch (err: any) {
      console.error("Error saving notification settings:", err);
      toast({
        title: "Error",
        description: "Failed to save notification settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout userRole="regional">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">
              Manage your account settings and preferences
            </p>
          </div>
        </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="region">
              <UserCog className="h-4 w-4 mr-2" />
              Region
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information and how you appear in the system
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={profile.avatar_url || ""} />
                        <AvatarFallback className="text-xl">
                          {(profile.display_name || user?.email || "RA")
                            .substring(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-lg font-medium">{profile.display_name || user?.email}</h3>
                        <p className="text-sm text-muted-foreground">Regional Admin</p>
                        <p className="text-sm text-muted-foreground">{userRegion?.name || "No region assigned"}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="displayName">Display Name</Label>
                      <Input
                        id="displayName"
                        value={profile.display_name || ""}
                        onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={user?.email || ""}
                        disabled
                      />
                      <p className="text-xs text-muted-foreground">
                        Email address cannot be changed
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={profile.bio || ""}
                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                        placeholder="Tell us a little about yourself"
                        rows={4}
                      />
                    </div>
                  </>
                )}
              </CardContent>
              <CardFooter className="justify-end">
                <Button
                  onClick={() => saveProfile({
                    display_name: profile.display_name,
                    bio: profile.bio,
                  })}
                  disabled={loading || saving}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>
                  Configure how you want to receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {loading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="emailNotifications">Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive notifications via email
                        </p>
                      </div>
                      <Switch
                        id="emailNotifications"
                        checked={notificationSettings.emailNotifications}
                        onCheckedChange={(checked) =>
                          setNotificationSettings({ ...notificationSettings, emailNotifications: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="budgetRequestNotifications">Budget Request Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Notify me when there are new budget requests
                        </p>
                      </div>
                      <Switch
                        id="budgetRequestNotifications"
                        checked={notificationSettings.budgetRequestNotifications}
                        onCheckedChange={(checked) =>
                          setNotificationSettings({ ...notificationSettings, budgetRequestNotifications: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="messageNotifications">Message Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Notify me when I receive new messages
                        </p>
                      </div>
                      <Switch
                        id="messageNotifications"
                        checked={notificationSettings.messageNotifications}
                        onCheckedChange={(checked) =>
                          setNotificationSettings({ ...notificationSettings, messageNotifications: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="organizationUpdates">Organization Updates</Label>
                        <p className="text-sm text-muted-foreground">
                          Notify me about changes to organizations in my region
                        </p>
                      </div>
                      <Switch
                        id="organizationUpdates"
                        checked={notificationSettings.organizationUpdates}
                        onCheckedChange={(checked) =>
                          setNotificationSettings({ ...notificationSettings, organizationUpdates: checked })
                        }
                      />
                    </div>
                  </>
                )}
              </CardContent>
              <CardFooter className="justify-end">
                <Button
                  onClick={saveNotificationSettings}
                  disabled={loading || saving}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Save Preferences
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="region" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Region Information</CardTitle>
                <CardDescription>
                  View information about your assigned region
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading || !userRegion ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <div className="bg-muted rounded-lg p-6">
                      <h3 className="text-lg font-medium mb-4">{userRegion.name}</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Region ID:</span>
                          <span className="font-mono">{userRegion.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Your Role:</span>
                          <span>Regional Administrator</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                      Region information can only be updated by a system administrator.
                      Please contact support if you need to make changes.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
} 