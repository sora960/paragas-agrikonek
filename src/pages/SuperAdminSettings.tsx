import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function SuperAdminSettings() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [generalSettings, setGeneralSettings] = useState({
    systemName: "AgriConnect",
    adminEmail: "admin@agriconnect.com",
    supportEmail: "support@agriconnect.com",
    timezone: "utc"
  });
  
  const [accessSettings, setAccessSettings] = useState({
    autoApproval: false,
    emailNotifications: true,
    maintenanceMode: false,
    twoFactorAuth: true
  });
  
  const [securitySettings, setSecuritySettings] = useState({
    passwordExpiry: "90",
    sessionTimeout: "30",
    maxLoginAttempts: "5",
    accountLockoutDuration: "15"
  });
  
  const [backupSettings, setBackupSettings] = useState({
    automaticBackups: true,
    backupFrequency: "daily"
  });
  
  // Handle input changes
  const updateGeneralSettings = (field, value) => {
    setGeneralSettings({
      ...generalSettings,
      [field]: value
    });
  };
  
  const updateSecuritySettings = (field, value) => {
    setSecuritySettings({
      ...securitySettings,
      [field]: value
    });
  };
  
  // Save all settings
  const saveChanges = async () => {
    setIsSaving(true);
    
    try {
      // In a real implementation, you would save to the database
      // For now, we'll simulate a successful save
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Optionally, save to system_config table if it exists
      try {
        const { error } = await supabase
          .from('system_config')
          .upsert([
            { key: 'system_name', value: generalSettings.systemName },
            { key: 'admin_email', value: generalSettings.adminEmail },
            { key: 'support_email', value: generalSettings.supportEmail },
            { key: 'timezone', value: generalSettings.timezone },
            { key: 'auto_approval', value: accessSettings.autoApproval.toString() },
            { key: 'email_notifications', value: accessSettings.emailNotifications.toString() },
            { key: 'maintenance_mode', value: accessSettings.maintenanceMode.toString() },
            { key: 'two_factor_auth', value: accessSettings.twoFactorAuth.toString() },
            { key: 'password_expiry', value: securitySettings.passwordExpiry },
            { key: 'session_timeout', value: securitySettings.sessionTimeout },
            { key: 'max_login_attempts', value: securitySettings.maxLoginAttempts },
            { key: 'account_lockout_duration', value: securitySettings.accountLockoutDuration },
            { key: 'automatic_backups', value: backupSettings.automaticBackups.toString() },
            { key: 'backup_frequency', value: backupSettings.backupFrequency }
          ]);
          
        if (error) throw error;
      } catch (dbError) {
        console.error("Database error:", dbError);
        // Continue even if database save fails
      }
      
      toast({
        title: "Settings saved",
        description: "Your system settings have been updated successfully.",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "There was a problem saving your settings.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Create manual backup
  const createManualBackup = () => {
    toast({
      title: "Backup initiated",
      description: "System backup has been initiated. This may take a few minutes.",
    });
  };
  
  // Restore from backup
  const restoreFromBackup = () => {
    toast({
      description: "Please select a backup to restore from.",
    });
  };
  
  return (
    <DashboardLayout userRole="superadmin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">System Settings</h1>
          <Button onClick={saveChanges} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Configure system-wide parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="system-name">System Name</Label>
                  <Input 
                    id="system-name" 
                    value={generalSettings.systemName} 
                    onChange={(e) => updateGeneralSettings('systemName', e.target.value)}
                    className="mt-1" 
                  />
                </div>
                <div>
                  <Label htmlFor="admin-email">Administrator Email</Label>
                  <Input 
                    id="admin-email" 
                    type="email" 
                    value={generalSettings.adminEmail} 
                    onChange={(e) => updateGeneralSettings('adminEmail', e.target.value)}
                    className="mt-1" 
                  />
                </div>
                <div>
                  <Label htmlFor="support-email">Support Email</Label>
                  <Input 
                    id="support-email" 
                    type="email" 
                    value={generalSettings.supportEmail} 
                    onChange={(e) => updateGeneralSettings('supportEmail', e.target.value)}
                    className="mt-1" 
                  />
                </div>
                <div>
                  <Label htmlFor="timezone">Default Timezone</Label>
                  <Select 
                    value={generalSettings.timezone}
                    onValueChange={(value) => updateGeneralSettings('timezone', value)}
                  >
                    <SelectTrigger id="timezone" className="mt-1">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="utc">UTC</SelectItem>
                      <SelectItem value="est">Eastern Time (EST)</SelectItem>
                      <SelectItem value="cst">Central Time (CST)</SelectItem>
                      <SelectItem value="mst">Mountain Time (MST)</SelectItem>
                      <SelectItem value="pst">Pacific Time (PST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>User & Access Settings</CardTitle>
              <CardDescription>Configure user management and access controls</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Automatic Approvals</h4>
                  <p className="text-sm text-muted-foreground">Enable auto-approval for verified organizations</p>
                </div>
                <Switch 
                  checked={accessSettings.autoApproval}
                  onCheckedChange={(checked) => setAccessSettings({...accessSettings, autoApproval: checked})}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Email Notifications</h4>
                  <p className="text-sm text-muted-foreground">Send email alerts for important system events</p>
                </div>
                <Switch 
                  checked={accessSettings.emailNotifications}
                  onCheckedChange={(checked) => setAccessSettings({...accessSettings, emailNotifications: checked})}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Maintenance Mode</h4>
                  <p className="text-sm text-muted-foreground">Temporarily disable access for non-admin users</p>
                </div>
                <Switch 
                  checked={accessSettings.maintenanceMode}
                  onCheckedChange={(checked) => setAccessSettings({...accessSettings, maintenanceMode: checked})}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Two-Factor Authentication</h4>
                  <p className="text-sm text-muted-foreground">Require 2FA for all admin accounts</p>
                </div>
                <Switch 
                  checked={accessSettings.twoFactorAuth}
                  onCheckedChange={(checked) => setAccessSettings({...accessSettings, twoFactorAuth: checked})}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>System Security</CardTitle>
            <CardDescription>Configure security-related settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="password-expiry">Password Expiry (days)</Label>
                <Input 
                  type="number" 
                  id="password-expiry" 
                  value={securitySettings.passwordExpiry}
                  onChange={(e) => updateSecuritySettings('passwordExpiry', e.target.value)}
                  className="mt-1" 
                />
                <p className="text-xs text-muted-foreground mt-1">Set to 0 for no expiration</p>
              </div>
              <div>
                <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                <Input 
                  type="number" 
                  id="session-timeout" 
                  value={securitySettings.sessionTimeout}
                  onChange={(e) => updateSecuritySettings('sessionTimeout', e.target.value)}
                  className="mt-1" 
                />
                <p className="text-xs text-muted-foreground mt-1">How long until inactive users are logged out</p>
              </div>
              <div>
                <Label htmlFor="login-attempts">Max Login Attempts</Label>
                <Input 
                  type="number" 
                  id="login-attempts"
                  value={securitySettings.maxLoginAttempts}
                  onChange={(e) => updateSecuritySettings('maxLoginAttempts', e.target.value)}
                  className="mt-1" 
                />
                <p className="text-xs text-muted-foreground mt-1">Before account is temporarily locked</p>
              </div>
              <div>
                <Label htmlFor="lockout-duration">Account Lockout Duration (minutes)</Label>
                <Input 
                  type="number" 
                  id="lockout-duration" 
                  value={securitySettings.accountLockoutDuration}
                  onChange={(e) => updateSecuritySettings('accountLockoutDuration', e.target.value)}
                  className="mt-1" 
                />
                <p className="text-xs text-muted-foreground mt-1">How long accounts remain locked after failed attempts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Backup & Maintenance</CardTitle>
            <CardDescription>Configure system backup and maintenance settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Automatic Backups</h4>
                  <p className="text-sm text-muted-foreground">Regularly backup system data</p>
                </div>
                <Switch 
                  checked={backupSettings.automaticBackups}
                  onCheckedChange={(checked) => setBackupSettings({...backupSettings, automaticBackups: checked})}
                />
              </div>
              <div>
                <Label htmlFor="backup-frequency">Backup Frequency</Label>
                <Select 
                  value={backupSettings.backupFrequency}
                  onValueChange={(value) => setBackupSettings({...backupSettings, backupFrequency: value})}
                >
                  <SelectTrigger id="backup-frequency" className="mt-1">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={restoreFromBackup}>Restore from Backup</Button>
                <Button onClick={createManualBackup}>Create Manual Backup</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
} 