import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { adminService } from "@/services/adminService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useUser } from "@/hooks/useUser";
import { Loader2, Users, Building2, Receipt, FileText, MessageCircle } from "lucide-react";

interface AdminOrganization {
  id: string;
  name: string;
  region_id?: string;
  region_name?: string;
}

export default function OrganizationAdminDashboard() {
  const { user } = useUser();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<AdminOrganization[]>([]);
  const [activeOrganization, setActiveOrganization] = useState<AdminOrganization | null>(null);

  useEffect(() => {
    if (user) {
      loadAdminOrganizations();
    }
  }, [user]);

  const loadAdminOrganizations = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const orgs = await adminService.getUserAdminOrganizations(user.id);
      setOrganizations(orgs);
      
      // Set the first organization as active if available
      if (orgs.length > 0) {
        setActiveOrganization(orgs[0]);
      }
    } catch (error) {
      console.error("Error loading admin organizations:", error);
      toast({
        title: "Error",
        description: "Failed to load your organizations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOrganizationSelect = (org: AdminOrganization) => {
    setActiveOrganization(org);
  };

  if (loading) {
    return (
      <DashboardLayout userRole="organization">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (organizations.length === 0) {
    return (
      <DashboardLayout userRole="organization">
        <Card>
          <CardHeader>
            <CardTitle>No Organizations</CardTitle>
            <CardDescription>
              You are not currently assigned as an administrator to any organizations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>
              Please contact a super admin to be assigned as an administrator to an organization.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="organization">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Organization Admin Dashboard</h1>
          
          {organizations.length > 1 && (
            <div className="space-x-2">
              {organizations.map(org => (
                <Button
                  key={org.id}
                  variant={activeOrganization?.id === org.id ? "default" : "outline"}
                  onClick={() => handleOrganizationSelect(org)}
                >
                  {org.name}
                </Button>
              ))}
            </div>
          )}
        </div>

        {activeOrganization && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{activeOrganization.name}</CardTitle>
                <CardDescription>
                  {activeOrganization.region_name 
                    ? `Located in ${activeOrganization.region_name}` 
                    : "Organization details"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p>You have administrator access to this organization.</p>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/organization-admin/members?org=${activeOrganization.id}`)}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg">Manage Members</CardTitle>
                  <Users className="h-6 w-6 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    View and manage organization members
                  </p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/organization/budget?org=${activeOrganization.id}`)}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg">Budget</CardTitle>
                  <Building2 className="h-6 w-6 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Manage organization budget and allocations
                  </p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/organization/expenses?org=${activeOrganization.id}`)}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg">Expenses</CardTitle>
                  <Receipt className="h-6 w-6 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Track and record organization expenses
                  </p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/organization-admin/messages`)}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg">Messaging</CardTitle>
                  <MessageCircle className="h-6 w-6 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Communicate with farmers and other admins
                  </p>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
} 