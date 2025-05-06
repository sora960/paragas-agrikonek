import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import UserManagementTable from "@/components/admin/UserManagementTable";
import OrganizationAdminsTable from "@/components/admin/OrganizationAdminsTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function UserManagement() {
  const [activeTab, setActiveTab] = useState("all-users");

  return (
    <DashboardLayout userRole="superadmin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage user accounts and permissions across the platform
          </p>
        </div>

        <Tabs defaultValue="all-users" onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="all-users">All Users</TabsTrigger>
            <TabsTrigger value="regional-admins">Regional Admins</TabsTrigger>
            <TabsTrigger value="org-admins">Organization Admins</TabsTrigger>
            <TabsTrigger value="farmers">Farmers</TabsTrigger>
            <TabsTrigger value="audit-logs">Audit Logs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all-users">
            <UserManagementTable />
          </TabsContent>
          
          <TabsContent value="regional-admins">
            <Card>
              <CardHeader>
                <CardTitle>Regional Administrators</CardTitle>
                <CardDescription>Manage administrators for specific regions</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Existing Regional Admin UI can be integrated here */}
                <p className="text-muted-foreground">
                  This section shows regional administrators and allows you to manage their access.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="org-admins">
            <OrganizationAdminsTable />
          </TabsContent>
          
          <TabsContent value="farmers">
            <Card>
              <CardHeader>
                <CardTitle>Farmer Accounts</CardTitle>
                <CardDescription>
                  Manage all farmer accounts in the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  This section shows farmer accounts and allows you to manage their profiles and access.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="audit-logs">
            <Card>
              <CardHeader>
                <CardTitle>System Access Audit</CardTitle>
                <CardDescription>
                  Review login and system access activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  View audit logs of system access and user activities.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
} 