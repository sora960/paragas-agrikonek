import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { organizationService } from "@/services/organizationService";
import { useAuth } from "@/lib/AuthContext";
import { Loader2 } from "lucide-react";
import { OrganizationGroupChat } from "@/components/messaging/OrganizationGroupChat";

export default function OrganizationDashboard() {
  const { user, userRole } = useAuth();
  const [organization, setOrganization] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrganization = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        
        let org = null;
        
        // If user is an org admin, get their organization differently
        if (userRole === "org_admin" || userRole === "organization_admin") {
          const orgs = await organizationService.getOrganizationByAdmin(user.id);
          if (orgs && orgs.length > 0) {
            org = orgs[0];
          }
        } else {
          // Otherwise, try to get the organization for a member
          org = await organizationService.getOrganizationForMember(user.id);
        }
        
        setOrganization(org);
      } catch (error) {
        console.error("Error loading organization:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadOrganization();
  }, [user, userRole]);

  if (loading) {
    return (
      <DashboardLayout userRole="organization">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!organization) {
    return (
      <DashboardLayout userRole="organization">
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">Organization Dashboard</h1>
          <Card>
            <CardHeader>
              <CardTitle>No Organization Found</CardTitle>
              <CardDescription>You are not associated with any organization</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Please contact an administrator if you believe this is an error.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="organization">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">{organization.name} Dashboard</h1>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Farmers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">124</div>
              <p className="text-xs text-muted-foreground">+8 from last month</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Crop Yield</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,842 tons</div>
              <p className="text-xs text-muted-foreground">+76 from last season</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">42</div>
              <p className="text-xs text-muted-foreground">+5 from last month</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-muted-foreground">+1 from last month</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Organization Group Chat for communication */}
        <OrganizationGroupChat
          organizationId={organization.id}
          organizationName={organization.name}
        />
        
        {userRole !== "farmer" && (
          <Card>
            <CardHeader>
              <CardTitle>Organization Management</CardTitle>
              <CardDescription>Administrative tools and options</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-6 text-center text-muted-foreground border border-dashed rounded-lg">
                Organization management tools will be displayed here for admins.
              </div>
            </CardContent>
          </Card>
        )}
        
        <Card>
          <CardHeader>
            <CardTitle>Organization Overview</CardTitle>
            <CardDescription>View organization's agricultural operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-6 text-center text-muted-foreground border border-dashed rounded-lg">
              Organization data and project statistics will be displayed here.
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
} 