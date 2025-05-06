import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Building, MapPin, Phone, Mail, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface Organization {
  id: string;
  name: string;
  registration_number: string;
  address: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  description?: string;
  status: string;
  region_name?: string;
  province_name?: string;
  member_count: number;
}

interface FarmerProfile {
  id: string;
  user_id: string;
}

interface ApplicationFormData {
  reason: string;
  experienceLevel: string;
  hasPreviousOrganizations: boolean;
  previousOrganizations: string;
  farmDescription: string;
}

export default function Apply() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState<{[key: string]: boolean}>({});
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [filteredOrgs, setFilteredOrgs] = useState<Organization[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [farmerProfile, setFarmerProfile] = useState<FarmerProfile | null>(null);
  const [membershipStatus, setMembershipStatus] = useState<{[key: string]: string}>({});
  const [applicationDialogOpen, setApplicationDialogOpen] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [applicationForm, setApplicationForm] = useState<ApplicationFormData>({
    reason: "",
    experienceLevel: "beginner",
    hasPreviousOrganizations: false,
    previousOrganizations: "",
    farmDescription: ""
  });

  useEffect(() => {
    if (user?.id) {
      fetchFarmerProfile();

      // Set up a periodic refresh to check for status updates
      const intervalId = setInterval(() => {
        if (farmerProfile) {
          fetchOrganizations(true); // true for silent refresh (no loading indicator)
        }
      }, 30000); // Check every 30 seconds
      
      return () => clearInterval(intervalId); // Clean up on unmount
    }
  }, [user]);

  useEffect(() => {
    if (farmerProfile?.id) {
      fetchOrganizations();
    }
  }, [farmerProfile]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredOrgs(organizations);
    } else {
      const lowercaseQuery = searchQuery.toLowerCase();
      const filtered = organizations.filter((org) => {
        return (
          org.name.toLowerCase().includes(lowercaseQuery) ||
          (org.description && org.description.toLowerCase().includes(lowercaseQuery)) ||
          (org.region_name && org.region_name.toLowerCase().includes(lowercaseQuery)) ||
          (org.province_name && org.province_name.toLowerCase().includes(lowercaseQuery))
        );
      });
      setFilteredOrgs(filtered);
    }
  }, [searchQuery, organizations]);

  const fetchFarmerProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("farmer_profiles")
        .select("id, user_id")
        .eq("user_id", user?.id)
        .single();

      if (error) {
        console.error("Error fetching farmer profile:", error);
        setError("You need to complete your farmer profile before applying to organizations");
        setLoading(false);
        return;
      }

      setFarmerProfile(data);
    } catch (error: any) {
      console.error("Error fetching farmer profile:", error);
      setError("Failed to load your farmer profile. Please try again later.");
      setLoading(false);
    }
  };

  const fetchOrganizations = async (silent = false) => {
    if (!farmerProfile) return;
    
    try {
      if (!silent) {
        setLoading(true);
      }
      
      // Get all organizations with their region and province names
      const { data, error } = await supabase
        .from("organizations")
        .select(`
          *,
          regions:region_id(name),
          provinces:province_id(name),
          member_count
        `)
        .eq("status", "active");

      if (error) {
        console.error("Error fetching organizations:", error);
        if (!silent) {
          setError("Failed to load organizations. Please try again later.");
          setLoading(false);
        }
        return;
      }

      // Format the data
      const formattedOrgs = data.map((org) => ({
        id: org.id,
        name: org.name,
        registration_number: org.registration_number,
        address: org.address || "",
        contact_person: org.contact_person || "",
        contact_email: org.contact_email || "",
        contact_phone: org.contact_phone || "",
        description: org.description,
        status: org.status,
        region_name: org.regions?.name,
        province_name: org.provinces?.name,
        member_count: org.member_count || 0,
      }));

      setOrganizations(formattedOrgs);
      setFilteredOrgs(formattedOrgs);

      // Check membership status for each organization
      if (farmerProfile) {
        const statuses: {[key: string]: string} = {};
        
        for (const org of formattedOrgs) {
          const { data: memberData } = await supabase
            .from("organization_members")
            .select("status")
            .eq("organization_id", org.id)
            .eq("farmer_id", farmerProfile.id)
            .single();
          
          if (memberData) {
            statuses[org.id] = memberData.status;
          }
        }
        
        setMembershipStatus(statuses);
      }
    } catch (error: any) {
      console.error("Error fetching organizations:", error);
      if (!silent) {
        setError("Failed to load organizations. Please try again later.");
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const openApplicationDialog = async (org: Organization) => {
    setSelectedOrganization(org);
    
    // Check if there's an existing application to retrieve its status
    if (farmerProfile) {
      try {
        const { data, error } = await supabase
          .from("organization_members")
          .select("id, status, application_reason, experience_level, has_previous_organizations, previous_organizations, farm_description")
          .eq("organization_id", org.id)
          .eq("farmer_id", farmerProfile.id)
          .single();
        
        if (data) {
          // If application exists but not showing in the UI status, update the UI status
          setMembershipStatus(prev => ({ ...prev, [org.id]: data.status }));
          
          // If it's a rejected application, allow reapplying by prefilling the form with previous data
          if (data.status === 'rejected') {
            setApplicationForm({
              reason: data.application_reason || "",
              experienceLevel: data.experience_level || "beginner",
              hasPreviousOrganizations: data.has_previous_organizations || false,
              previousOrganizations: data.previous_organizations || "",
              farmDescription: data.farm_description || ""
            });
            setApplicationDialogOpen(true);
          } else {
            // For other statuses, show a message
            toast.info(`You already have a ${data.status} application for this organization.`);
          }
        } else {
          // No existing application, reset form and open dialog
          setApplicationForm({
            reason: "",
            experienceLevel: "beginner",
            hasPreviousOrganizations: false,
            previousOrganizations: "",
            farmDescription: ""
          });
          setApplicationDialogOpen(true);
        }
      } catch (error: any) {
        console.error("Error checking application status:", error);
        toast.error("Failed to check application status");
      }
    }
  };

  const handleFormChange = (field: keyof ApplicationFormData, value: any) => {
    setApplicationForm(prev => ({ ...prev, [field]: value }));
  };

  const handleApplySubmit = async () => {
    if (!selectedOrganization || !farmerProfile) {
      toast.error("Missing organization or farmer profile information");
      return;
    }

    if (!applicationForm.reason.trim()) {
      toast.error("Please provide a reason for joining");
      return;
    }

    setApplying(prev => ({ ...prev, [selectedOrganization.id]: true }));

    try {
      // Check if there's an existing record (for reapplying after rejection)
      const { data: existingApp, error: checkError } = await supabase
        .from("organization_members")
        .select("id, status")
        .eq("organization_id", selectedOrganization.id)
        .eq("farmer_id", farmerProfile.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned" which is expected if no prior application
        throw checkError;
      }

      let result;
      
      if (existingApp && existingApp.status === 'rejected') {
        // Update the existing application
        result = await supabase
          .from("organization_members")
          .update({
            status: "pending",
            application_reason: applicationForm.reason,
            experience_level: applicationForm.experienceLevel,
            has_previous_organizations: applicationForm.hasPreviousOrganizations,
            previous_organizations: applicationForm.previousOrganizations,
            farm_description: applicationForm.farmDescription,
            updated_at: new Date().toISOString()
          })
          .eq("id", existingApp.id);
      } else {
        // Create a new application
        result = await supabase
          .from("organization_members")
          .insert({
            organization_id: selectedOrganization.id,
            farmer_id: farmerProfile.id,
            status: "pending",
            role: "member",
            application_reason: applicationForm.reason,
            experience_level: applicationForm.experienceLevel,
            has_previous_organizations: applicationForm.hasPreviousOrganizations,
            previous_organizations: applicationForm.previousOrganizations,
            farm_description: applicationForm.farmDescription,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }

      if (result.error) throw result.error;

      toast.success(`Application submitted to ${selectedOrganization.name}`);
      setApplicationDialogOpen(false);
      
      // Update local state
      setMembershipStatus(prev => ({
        ...prev,
        [selectedOrganization.id]: "pending"
      }));
      
    } catch (error: any) {
      console.error("Error submitting application:", error);
      toast.error(`Failed to submit application: ${error.message}`);
    } finally {
      setApplying(prev => ({ ...prev, [selectedOrganization.id]: false }));
    }
  };

  const getMembershipLabel = (orgId: string) => {
    const status = membershipStatus[orgId];
    if (!status) return null;

    switch (status) {
      case "active":
        return <Badge className="bg-green-500">Member</Badge>;
      case "pending":
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Pending</Badge>;
      case "rejected":
        return <Badge variant="outline" className="border-red-500 text-red-600">Rejected</Badge>;
      default:
        return null;
    }
  };

  if (loading && !farmerProfile) {
    return (
      <DashboardLayout userRole="farmer">
        <div className="flex justify-center items-center h-96">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout userRole="farmer">
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-destructive mb-2">Error</h2>
            <p className="text-muted-foreground">{error}</p>
          </div>
          <Button onClick={() => window.location.href = "/farmer/profile"}>
            Complete Your Profile
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="farmer">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Find Organizations</h1>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search organizations by name, description, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            Array(3).fill(0).map((_, i) => (
              <Card key={i} className="opacity-50">
                <CardHeader>
                  <div className="h-6 w-3/4 bg-muted rounded animate-pulse mb-2"></div>
                  <div className="h-4 w-1/2 bg-muted rounded animate-pulse"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-4 w-full bg-muted rounded animate-pulse mb-2"></div>
                  <div className="h-4 w-full bg-muted rounded animate-pulse mb-2"></div>
                  <div className="h-4 w-2/3 bg-muted rounded animate-pulse"></div>
                </CardContent>
              </Card>
            ))
          ) : filteredOrgs.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <Building className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-xl font-medium mb-2">No Organizations Found</h2>
              <p className="text-muted-foreground">
                {searchQuery ? "Try a different search term" : "No active organizations available"}
              </p>
            </div>
          ) : (
            filteredOrgs.map((org) => (
              <Card key={org.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="truncate">{org.name}</span>
                    {getMembershipLabel(org.id)}
                  </CardTitle>
                  <CardDescription className="flex items-center">
                    {org.province_name && org.region_name ? (
                      <span className="flex items-center">
                        <MapPin className="h-3.5 w-3.5 mr-1" />
                        {org.province_name}, {org.region_name}
                      </span>
                    ) : (
                      <span>Unknown location</span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="text-sm line-clamp-3 text-muted-foreground">
                    {org.description || "No description available."}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 text-xs mt-2">
                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      <span>{org.member_count} members</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t bg-muted/50 p-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    disabled={!!membershipStatus[org.id] || applying[org.id]}
                    onClick={() => openApplicationDialog(org)}
                  >
                    {applying[org.id] ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Applying...
                      </>
                    ) : membershipStatus[org.id] ? (
                      membershipStatus[org.id] === "pending" ? "Application Pending" :
                      membershipStatus[org.id] === "active" ? "Already a Member" :
                      membershipStatus[org.id] === "rejected" ? "Apply Again" : 
                      "Apply to Join"
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Apply to Join
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      </div>
      
      {/* Application Dialog */}
      <Dialog open={applicationDialogOpen} onOpenChange={setApplicationDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Apply to Join {selectedOrganization?.name}
            </DialogTitle>
            <DialogDescription>
              Please provide some information about why you want to join this organization.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="reason">Why do you want to join this organization? <span className="text-red-500">*</span></Label>
              <Textarea
                id="reason"
                value={applicationForm.reason}
                onChange={(e) => handleFormChange("reason", e.target.value)}
                placeholder="Explain why you're interested in joining and what you hope to gain from membership."
                rows={4}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="experienceLevel">Your farming experience level</Label>
              <Select 
                value={applicationForm.experienceLevel} 
                onValueChange={(value) => handleFormChange("experienceLevel", value)}
              >
                <SelectTrigger id="experienceLevel">
                  <SelectValue placeholder="Select experience level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner (0-2 years)</SelectItem>
                  <SelectItem value="intermediate">Intermediate (3-5 years)</SelectItem>
                  <SelectItem value="experienced">Experienced (6-10 years)</SelectItem>
                  <SelectItem value="expert">Expert (10+ years)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="hasPreviousOrgs" 
                  checked={applicationForm.hasPreviousOrganizations}
                  onCheckedChange={(checked) => 
                    handleFormChange("hasPreviousOrganizations", checked === true)
                  }
                />
                <Label htmlFor="hasPreviousOrgs">I have been a member of other farming organizations</Label>
              </div>
            </div>
            
            {applicationForm.hasPreviousOrganizations && (
              <div className="space-y-2">
                <Label htmlFor="previousOrganizations">Previous organizations</Label>
                <Textarea
                  id="previousOrganizations"
                  value={applicationForm.previousOrganizations}
                  onChange={(e) => handleFormChange("previousOrganizations", e.target.value)}
                  placeholder="List the names of organizations you've previously been a member of."
                  rows={2}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="farmDescription">Brief description of your farm</Label>
              <Textarea
                id="farmDescription"
                value={applicationForm.farmDescription}
                onChange={(e) => handleFormChange("farmDescription", e.target.value)}
                placeholder="Describe your farm, including size, crops, and any other relevant information."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setApplicationDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleApplySubmit}
              disabled={!applicationForm.reason.trim() || applying[selectedOrganization?.id || ""]}
            >
              {applying[selectedOrganization?.id || ""] ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Application"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
} 