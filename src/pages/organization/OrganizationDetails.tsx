import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { Progress } from "@/components/ui/progress";
import OrganizationAdmins from "@/components/organization/OrganizationAdmins";
import { OrganizationGroupChat } from "@/components/messaging/OrganizationGroupChat";
import { organizationService } from "@/services/organizationService";
import { AlertCircle, Edit, Trash2, MoveDown, ChevronDown, ChevronRight } from "lucide-react";
import EditContactDialog from "@/components/organization/EditContactDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

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

// CollapsibleCard component (local for now)
function CollapsibleCard({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-lg mb-4 bg-white">
      <div
        className="flex items-center justify-between px-4 py-2 cursor-pointer select-none"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="font-semibold">{title}</div>
        {open ? <ChevronDown /> : <ChevronRight />}
      </div>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

export default function OrganizationDetails() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditContactDialogOpen, setIsEditContactDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (id) {
      loadOrganizationData();
    }
  }, [id]);

  const loadOrganizationData = async () => {
    if (!id) return;
    
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

  const handleEditOrganization = () => {
    // Navigate to edit page (this would need to be implemented)
    // For now we'll just show a toast
    toast({
      title: "Edit Organization",
      description: "Navigating to edit organization page",
    });
    // Uncomment when the edit page is available:
    // navigate(`/superadmin/organizations/edit/${id}`);
  };

  const handleDeactivateOrganization = async () => {
    if (!organization || !id) return;
    
    try {
      setProcessing(true);
      
      // Toggle the status (if active, make inactive and vice versa)
      const newStatus = organization.status === 'active' ? 'inactive' : 'active';
      
      const { error } = await supabase
        .from('organizations')
        .update({ status: newStatus })
        .eq('id', id);
        
      if (error) throw error;
      
      // Update local state
      setOrganization({
        ...organization,
        status: newStatus
      });
      
      toast({
        title: "Status Updated",
        description: `Organization ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
      });
      
    } catch (error) {
      console.error('Error updating organization status:', error);
      toast({
        title: "Error",
        description: "Failed to update organization status",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
      setIsDeactivateDialogOpen(false);
    }
  };

  const handleDeleteOrganization = async () => {
    if (!organization || !id) return;
    
    try {
      setProcessing(true);
      
      const success = await organizationService.deleteOrganization(id);
      
      if (success) {
        toast({
          title: "Organization Deleted",
          description: "Organization has been permanently deleted",
        });
        
        // Navigate back to organizations list
        navigate('/superadmin/organizations');
      } else {
        throw new Error("Failed to delete organization");
      }
    } catch (error) {
      console.error('Error deleting organization:', error);
      toast({
        title: "Error",
        description: "Failed to delete organization",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
      setIsDeleteDialogOpen(false);
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Contact Information</CardTitle>
                  <CardDescription>Primary contact details for the organization</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsEditContactDialogOpen(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
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

        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-amber-600">Note About Organization Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">
                Organizations can function without a dedicated administrator. Super administrators can always 
                manage all organizations from the admin dashboard. You can add an organization administrator later 
                using the "Add Admin" button above.
              </p>
              <p className="text-sm">
                <strong>Member Communication:</strong> Members can still communicate with each other using the organization 
                group chat below. This allows collaboration even without an assigned administrator. All communications are 
                visible to all organization members and super administrators.
              </p>
            </div>
          </CardContent>
        </Card>

        <CollapsibleCard title="Organization Chat" defaultOpen={false}>
          <OrganizationGroupChat 
            organizationId={organization.id}
            organizationName={organization.name}
          />
        </CollapsibleCard>

        <div className="flex justify-end space-x-4">
          <Button 
            variant="outline" 
            onClick={handleEditOrganization}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Organization
          </Button>
          <Button 
            variant={organization.status === 'active' ? "destructive" : "default"}
            onClick={() => setIsDeactivateDialogOpen(true)}
          >
            <MoveDown className="h-4 w-4 mr-2" />
            {organization.status === 'active' ? 'Deactivate' : 'Activate'} Organization
          </Button>
          <Button 
            variant="destructive"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Organization
          </Button>
        </div>
      </div>
      
      {/* Edit Contact Dialog */}
      {organization && (
        <EditContactDialog
          open={isEditContactDialogOpen}
          onOpenChange={setIsEditContactDialogOpen}
          organizationId={organization.id}
          initialData={{
            contact_person: organization.contact_person,
            contact_email: organization.contact_email,
            contact_phone: organization.contact_phone
          }}
          onContactUpdated={loadOrganizationData}
        />
      )}
      
      {/* Deactivate Organization Dialog */}
      <AlertDialog 
        open={isDeactivateDialogOpen} 
        onOpenChange={setIsDeactivateDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {organization.status === 'active' ? 'Deactivate' : 'Activate'} Organization
            </AlertDialogTitle>
            <AlertDialogDescription>
              {organization.status === 'active' 
                ? 'This will deactivate the organization and prevent members from accessing it. Are you sure?'
                : 'This will reactivate the organization and allow members to access it again. Continue?'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivateOrganization}
              disabled={processing}
              className={organization.status === 'active' ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {organization.status === 'active' ? 'Deactivate' : 'Activate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Delete Organization Dialog */}
      <AlertDialog 
        open={isDeleteDialogOpen} 
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              Delete Organization Permanently
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. It will permanently delete the organization and all associated data, including members, admins, and activity records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOrganization}
              disabled={processing}
              className="bg-destructive hover:bg-destructive/90"
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
} 