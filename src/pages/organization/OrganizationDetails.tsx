import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { Progress } from "@/components/ui/progress";
import OrganizationAdmins from "@/components/organization/OrganizationAdmins";

interface Organization {
  id: string;
  name: string;
  registration_number: string;
  status: 'pending' | 'active' | 'suspended' | 'inactive';
  verification_status: 'unverified' | 'in_review' | 'verified' | 'rejected';
  address: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  description: string;
  member_count: number;
  created_at: string;
  updated_at: string;
  allocated_budget: number;
  utilized_budget: number;
  region: {
    name: string;
    code: string;
  };
  province?: {
    name: string;
  };
}

export default function OrganizationDetails() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<Organization | null>(null);

  useEffect(() => {
    loadOrganizationData();
  }, [id]);

  const loadOrganizationData = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          *,
          region:region_id (
            name,
            code
          ),
          province:province_id (
            name
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setOrganization(data);

    } catch (error) {
      console.error('Error loading organization:', error);
      toast({
        title: "Error",
        description: "Failed to load organization details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate budget utilization percentage
  const calculateUtilization = (allocated: number, utilized: number) => {
    if (!allocated || allocated <= 0) return 0;
    return Math.min(Math.round((utilized / allocated) * 100), 100);
  };

  if (loading) {
    return (
      <DashboardLayout userRole="superadmin">
        <div className="flex items-center justify-center h-full">
          Loading organization details...
        </div>
      </DashboardLayout>
    );
  }

  if (!organization) {
    return (
      <DashboardLayout userRole="superadmin">
        <div className="flex items-center justify-center h-full">
          Organization not found
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="superadmin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{organization.name}</h1>
          <div className="space-x-2">
            <Badge variant={organization.status === 'active' ? 'default' : 'secondary'}>
              {organization.status}
            </Badge>
            <Badge variant={organization.verification_status === 'verified' ? 'default' : 'secondary'}>
              {organization.verification_status}
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Organization registration and contact details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium">Registration Number</p>
                <p className="text-sm text-muted-foreground">{organization.registration_number}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Region</p>
                <p className="text-sm text-muted-foreground">
                  {organization.region.name} ({organization.region.code})
                </p>
              </div>
              {organization.province && (
                <div>
                  <p className="text-sm font-medium">Province</p>
                  <p className="text-sm text-muted-foreground">{organization.province.name}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium">Address</p>
                <p className="text-sm text-muted-foreground">{organization.address}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Member Count</p>
                <p className="text-sm text-muted-foreground">{organization.member_count} members</p>
              </div>
              <div>
                <p className="text-sm font-medium">Registration Date</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(organization.created_at).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>Primary contact details for the organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium">Contact Person</p>
                <p className="text-sm text-muted-foreground">{organization.contact_person}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">
                  <a href={`mailto:${organization.contact_email}`} className="text-blue-600 hover:underline">
                    {organization.contact_email}
                  </a>
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Phone</p>
                <p className="text-sm text-muted-foreground">
                  <a href={`tel:${organization.contact_phone}`} className="text-blue-600 hover:underline">
                    {organization.contact_phone}
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Budget Information</CardTitle>
              <CardDescription>Financial allocations and utilization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium">Allocated Budget</p>
                <p className="text-xl font-semibold">₱{(organization.allocated_budget || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Budget Utilization</p>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Utilized: ₱{(organization.utilized_budget || 0).toLocaleString()}</span>
                    <span>{calculateUtilization(organization.allocated_budget, organization.utilized_budget)}%</span>
                  </div>
                  <Progress 
                    value={calculateUtilization(organization.allocated_budget, organization.utilized_budget)} 
                    className="h-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Organization Description</CardTitle>
              <CardDescription>Details about the organization's activities</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                {organization.description || "No description provided."}
              </p>
            </CardContent>
          </Card>
        </div>

        <OrganizationAdmins 
          organizationId={organization.id} 
          organizationName={organization.name} 
        />

        <div className="flex justify-end space-x-4">
          <Button variant="outline">Edit Organization</Button>
          <Button variant="destructive">Deactivate Organization</Button>
        </div>
      </div>
    </DashboardLayout>
  );
} 