import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, CheckCircle, XCircle, BadgeInfo } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { organizationService } from "@/services/organizationService";
import { adminService } from "@/services/adminService";
import { createNotification } from "@/services/notificationService";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Application {
  id: string;
  farmer_id: string;
  organization_id: string;
  status: string;
  application_date: string;
  application_reason: string;
  experience_level: string;
  has_previous_organizations: boolean;
  previous_organizations: string;
  farm_description: string;
  farmer: {
    full_name: string;
    email: string;
    phone: string;
    farm_name: string;
  };
}

export default function OrganizationApplications() {
  const [searchParams] = useSearchParams();
  const organizationId = searchParams.get("org");
  const { toast } = useToast();
  const [organization, setOrganization] = useState<any>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingApplication, setProcessingApplication] = useState<{[key: string]: boolean}>({});
  const [adminOrganizations, setAdminOrganizations] = useState<any[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    // Load admin's organizations if no org ID is provided in URL
    if (!organizationId) {
      loadAdminOrganizations();
    } else {
      loadOrganizationData();
      loadApplications();
    }
  }, [organizationId]);

  const loadAdminOrganizations = async () => {
    try {
      setLoading(true);
      // Get the current user's ID from local storage
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        toast({
          title: "Error",
          description: "User information not found",
          variant: "destructive",
        });
        return;
      }
      
      const user = JSON.parse(userStr);
      const orgs = await adminService.getUserAdminOrganizations(user.id);
      
      setAdminOrganizations(orgs);
      
      // If there's only one organization, automatically select it
      if (orgs.length === 1) {
        // Use the history API to update the URL without causing a navigation
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set("org", orgs[0].id);
        window.history.replaceState({}, "", newUrl.toString());
        
        // Set organization and load its data
        setOrganization(orgs[0]);
        loadOrganizationData(orgs[0].id);
        loadApplications(orgs[0].id);
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

  const loadOrganizationData = async (orgId = organizationId) => {
    if (!orgId) return;
    
    try {
      const org = await organizationService.getOrganization(orgId);
      setOrganization(org);
    } catch (error) {
      console.error("Error loading organization:", error);
      toast({
        title: "Error",
        description: "Failed to load organization data",
        variant: "destructive",
      });
    }
  };

  const loadApplications = async (orgId = organizationId) => {
    if (!orgId) return;
    
    try {
      setLoading(true);
      
      // First get all applications with application data
      // We need to check for applications with relevant data rather than just status
      const { data, error } = await supabase
        .from("organization_members")
        .select(`
          id, 
          farmer_id, 
          organization_id,
          status,
          created_at,
          application_reason,
          experience_level,
          has_previous_organizations,
          previous_organizations,
          farm_description
        `)
        .eq("organization_id", orgId)
        .not("application_reason", "is", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      if (data && data.length > 0) {
        // Filter to include only pending applications
        const pendingApplications = data.filter(app => 
          app.status === "pending"
        );
        
        if (pendingApplications.length === 0) {
          setApplications([]);
          setLoading(false);
          return;
        }
        
        // Get all farmer details in a separate query
        const farmerIds = pendingApplications.map(app => app.farmer_id);
        const { data: farmerData, error: farmerError } = await supabase
          .from("farmer_profiles")
          .select(`id, full_name, phone, email, farm_name`)
          .in('id', farmerIds);
          
        if (farmerError) throw farmerError;
        
        // Create a map for easy lookup
        const farmerMap = (farmerData || []).reduce((acc, farmer) => {
          acc[farmer.id] = farmer;
          return acc;
        }, {} as Record<string, any>);
        
        // Combine the data
        const applicationsWithFarmerInfo = pendingApplications.map(app => ({
          ...app,
          application_date: app.created_at, // Rename field for consistency
          farmer: farmerMap[app.farmer_id] || {
            full_name: "Unknown Farmer",
            phone: "",
            email: "",
            farm_name: "Unknown Farm"
          }
        }));
        
        setApplications(applicationsWithFarmerInfo as Application[]);
      } else {
        setApplications([]);
      }
    } catch (error) {
      console.error("Error loading applications:", error);
      toast({
        title: "Error",
        description: "Failed to load membership applications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const approveApplication = async (applicationId: string) => {
    try {
      setProcessingApplication(prev => ({ ...prev, [applicationId]: true }));
      
      // Find the application in our local state to get the farmer data
      const application = applications.find(app => app.id === applicationId);
      if (!application) {
        throw new Error("Application not found");
      }
      
      // Update the application status to active and set join_date to now
      const { error } = await supabase
        .from("organization_members")
        .update({ 
          status: "active",
          join_date: new Date().toISOString()
        })
        .eq("id", applicationId);

      if (error) throw error;

      // Also update farmer profile with any missing information if needed
      if (application.farmer) {
        const { error: farmerError } = await supabase
          .from("farmer_profiles")
          .update({
            full_name: application.farmer.full_name || application.farmer.farm_name,
            // Don't override existing data if it exists
            phone: application.farmer.phone || null,
            email: application.farmer.email || null
          })
          .eq("id", application.farmer_id)
          .not("full_name", "is", null); // Only update if full_name is null
          
        if (farmerError) {
          console.error("Error updating farmer profile:", farmerError);
        }
        
        // Send notification to the farmer about the approved application
        if (organization) {
          await createNotification(
            application.farmer_id,
            `Application Approved for ${organization.name}`,
            `Your application to join ${organization.name} has been approved. You are now a member of this organization.`,
            'system',
            `/farmer/organization?org=${organization.id}`,
            { organizationId: organization.id, organizationName: organization.name },
            'high'
          );
        }
      }

      toast({
        title: "Success",
        description: "Application approved successfully",
      });

      // Refresh the applications list
      loadApplications();
      
      // Update organization member count
      if (organization) {
        await supabase
          .from("organizations")
          .update({ 
            member_count: (organization.member_count || 0) + 1 
          })
          .eq("id", organization.id);
      }
    } catch (error) {
      console.error("Error approving application:", error);
      toast({
        title: "Error",
        description: "Failed to approve application",
        variant: "destructive",
      });
    } finally {
      setProcessingApplication(prev => ({ ...prev, [applicationId]: false }));
    }
  };

  const rejectApplication = async (applicationId: string) => {
    try {
      setProcessingApplication(prev => ({ ...prev, [applicationId]: true }));
      
      // Find the application to get farmer data
      const application = applications.find(app => app.id === applicationId);
      if (!application) {
        throw new Error("Application not found");
      }
      
      // Reject the application by setting status to rejected
      const { error } = await supabase
        .from("organization_members")
        .update({ status: "rejected" })
        .eq("id", applicationId);

      if (error) throw error;

      // Send notification to the farmer about the rejected application
      if (application.farmer && organization) {
        await createNotification(
          application.farmer_id,
          `Application Rejected for ${organization.name}`,
          `Your application to join ${organization.name} has been rejected. You may contact the organization administrator for more information.`,
          'system',
          `/farmer/apply`,
          { organizationId: organization.id, organizationName: organization.name },
          'medium'
        );
      }

      toast({
        title: "Application Rejected",
        description: "The application has been rejected",
      });

      // Refresh the applications list
      loadApplications();
    } catch (error) {
      console.error("Error rejecting application:", error);
      toast({
        title: "Error",
        description: "Failed to reject application",
        variant: "destructive",
      });
    } finally {
      setProcessingApplication(prev => ({ ...prev, [applicationId]: false }));
    }
  };

  const viewApplicationDetails = (application: Application) => {
    setSelectedApplication(application);
    setDetailsOpen(true);
  };

  // If no organization is selected and we have multiple admin organizations, show org selection
  if (!organizationId && adminOrganizations.length > 1) {
    return (
      <DashboardLayout userRole="organization">
        <div className="p-6 space-y-6">
          <h1 className="text-3xl font-bold">Select an Organization</h1>
          <Card>
            <CardHeader>
              <CardTitle>Your Organizations</CardTitle>
              <CardDescription>
                Select an organization to manage membership applications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {adminOrganizations.map(org => (
                  <Card 
                    key={org.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      const newUrl = new URL(window.location.href);
                      newUrl.searchParams.set("org", org.id);
                      window.location.href = newUrl.toString();
                    }}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{org.name}</CardTitle>
                      {org.region_name && (
                        <CardDescription>{org.region_name}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Click to manage applications
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // If no organization ID and no admin organizations
  if (!organizationId && adminOrganizations.length === 0 && !loading) {
    return (
      <DashboardLayout userRole="organization">
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>No Organizations</CardTitle>
              <CardDescription>
                You are not an administrator for any organizations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Please contact a system administrator to be assigned as an administrator to an organization.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="organization">
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">
            Membership Applications
            {organization && ` - ${organization.name}`}
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pending Applications</CardTitle>
            <CardDescription>
              Review and process membership applications for your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No pending applications for this organization
              </div>
            ) : (
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="py-3 px-4 text-left font-medium">Applicant</th>
                      <th className="py-3 px-4 text-left font-medium">Farm Name</th>
                      <th className="py-3 px-4 text-left font-medium">Contact</th>
                      <th className="py-3 px-4 text-left font-medium">Date Applied</th>
                      <th className="py-3 px-4 text-center font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((app) => (
                      <tr key={app.id} className="border-b">
                        <td className="py-3 px-4">{app.farmer?.full_name || "N/A"}</td>
                        <td className="py-3 px-4">{app.farmer?.farm_name || "N/A"}</td>
                        <td className="py-3 px-4">
                          <div>{app.farmer?.email || "N/A"}</div>
                          <div className="text-muted-foreground">{app.farmer?.phone || "N/A"}</div>
                        </td>
                        <td className="py-3 px-4">
                          {new Date(app.application_date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex justify-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8"
                              onClick={() => viewApplicationDetails(app)}
                            >
                              <BadgeInfo className="h-4 w-4 mr-1" />
                              Details
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              className="h-8 bg-green-600 hover:bg-green-700"
                              onClick={() => approveApplication(app.id)}
                              disabled={processingApplication[app.id]}
                            >
                              {processingApplication[app.id] ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4 mr-1" />
                              )}
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-8"
                              onClick={() => rejectApplication(app.id)}
                              disabled={processingApplication[app.id]}
                            >
                              {processingApplication[app.id] ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <XCircle className="h-4 w-4 mr-1" />
                              )}
                              Reject
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Application Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription>
              Review the farmer's application information
            </DialogDescription>
          </DialogHeader>
          
          {selectedApplication && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 p-1">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium">Applicant Name</h3>
                    <p>{selectedApplication.farmer.full_name}</p>
                  </div>
                  <div>
                    <h3 className="font-medium">Farm Name</h3>
                    <p>{selectedApplication.farmer.farm_name}</p>
                  </div>
                  <div>
                    <h3 className="font-medium">Email</h3>
                    <p>{selectedApplication.farmer.email}</p>
                  </div>
                  <div>
                    <h3 className="font-medium">Phone</h3>
                    <p>{selectedApplication.farmer.phone || "Not provided"}</p>
                  </div>
                  <div>
                    <h3 className="font-medium">Date Applied</h3>
                    <p>{new Date(selectedApplication.application_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <h3 className="font-medium">Experience Level</h3>
                    <p className="capitalize">{selectedApplication.experience_level || "Not specified"}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium">Application Reason</h3>
                  <p className="whitespace-pre-line">{selectedApplication.application_reason || "No reason provided"}</p>
                </div>

                <div>
                  <h3 className="font-medium">Farm Description</h3>
                  <p className="whitespace-pre-line">{selectedApplication.farm_description || "No description provided"}</p>
                </div>

                {selectedApplication.has_previous_organizations && (
                  <div>
                    <h3 className="font-medium">Previous Organizations</h3>
                    <p className="whitespace-pre-line">{selectedApplication.previous_organizations || "Not specified"}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
          
          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
            
            <div className="flex space-x-2">
              {selectedApplication && (
                <>
                  <Button
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      approveApplication(selectedApplication.id);
                      setDetailsOpen(false);
                    }}
                    disabled={selectedApplication && processingApplication[selectedApplication.id]}
                  >
                    {selectedApplication && processingApplication[selectedApplication.id] ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-1" />
                    )}
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      rejectApplication(selectedApplication.id);
                      setDetailsOpen(false);
                    }}
                    disabled={selectedApplication && processingApplication[selectedApplication.id]}
                  >
                    {selectedApplication && processingApplication[selectedApplication.id] ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-1" />
                    )}
                    Reject
                  </Button>
                </>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
} 