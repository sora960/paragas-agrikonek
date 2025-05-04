import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Building, MapPin, Phone, Mail, UserPlus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
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
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
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
      fetchOrganizations();

      // Set up a periodic refresh to check for status updates
      const intervalId = setInterval(() => {
        fetchOrganizations(true); // true for silent refresh (no loading indicator)
      }, 30000); // Check every 30 seconds
      
      return () => clearInterval(intervalId); // Clean up on unmount
    }
  }, [user]);

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
        toast({
          title: "Error",
          description: "You need to complete your farmer profile before applying to organizations",
          variant: "destructive",
        });
        return;
      }

      setFarmerProfile(data);
    } catch (error: any) {
      console.error("Error fetching farmer profile:", error);
    }
  };

  const fetchOrganizations = async (silent = false) => {
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

      if (error) throw error;

      // Format the data
      const formattedOrgs = data.map((org) => ({
        id: org.id,
        name: org.name,
        registration_number: org.registration_number,
        address: org.address,
        contact_person: org.contact_person,
        contact_email: org.contact_email,
        contact_phone: org.contact_phone,
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
    } catch (error) {
      console.error("Error fetching organizations:", error);
      if (!silent) {
        toast({
          title: "Error",
          description: "Failed to load organizations",
          variant: "destructive",
        });
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
            toast({
              title: "Application Exists",
              description: `You already have a ${data.status} application for this organization.`,
              variant: "default"
            });
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
      } catch (error) {
        console.error("Error checking existing application:", error);
        // Reset form and open dialog anyway
        setApplicationForm({
          reason: "",
          experienceLevel: "beginner",
          hasPreviousOrganizations: false,
          previousOrganizations: "",
          farmDescription: ""
        });
        setApplicationDialogOpen(true);
      }
    } else {
      // No farmer profile, just reset the form
      setApplicationForm({
        reason: "",
        experienceLevel: "beginner",
        hasPreviousOrganizations: false,
        previousOrganizations: "",
        farmDescription: ""
      });
      setApplicationDialogOpen(true);
    }
  };

  const handleFormChange = (field: keyof ApplicationFormData, value: any) => {
    setApplicationForm(prev => ({ ...prev, [field]: value }));
  };

  const handleApplySubmit = async () => {
    if (!farmerProfile || !selectedOrganization) {
      return;
    }

    try {
      setApplying(prev => ({ ...prev, [selectedOrganization.id]: true }));

      // Check if there's an existing application that we need to update instead of insert
      const { data: existingApp, error: checkError } = await supabase
        .from("organization_members")
        .select("id, status")
        .eq("organization_id", selectedOrganization.id)
        .eq("farmer_id", farmerProfile.id)
        .maybeSingle();
      
      let result;
      
      if (existingApp) {
        // Update existing application instead of creating a new one
        const { data, error } = await supabase
          .from("organization_members")
          .update({
            status: "pending", // Try to set as pending
            application_reason: applicationForm.reason,
            experience_level: applicationForm.experienceLevel,
            has_previous_organizations: applicationForm.hasPreviousOrganizations,
            previous_organizations: applicationForm.previousOrganizations,
            farm_description: applicationForm.farmDescription
          })
          .eq("id", existingApp.id)
          .select();
          
        if (error) {
          // If pending fails, try active
          const { data: activeData, error: activeError } = await supabase
            .from("organization_members")
            .update({
              status: "active",
              application_reason: applicationForm.reason,
              experience_level: applicationForm.experienceLevel,
              has_previous_organizations: applicationForm.hasPreviousOrganizations,
              previous_organizations: applicationForm.previousOrganizations,
              farm_description: applicationForm.farmDescription
            })
            .eq("id", existingApp.id)
            .select();
            
          if (activeError) throw activeError;
          result = activeData;
        } else {
          result = data;
        }
      } else {
        // Try inserting with 'pending' status first
        const { data, error } = await supabase
          .from("organization_members")
          .insert({
            organization_id: selectedOrganization.id,
            farmer_id: farmerProfile.id,
            role: "member",
            status: "pending",
            application_reason: applicationForm.reason,
            experience_level: applicationForm.experienceLevel,
            has_previous_organizations: applicationForm.hasPreviousOrganizations,
            previous_organizations: applicationForm.previousOrganizations,
            farm_description: applicationForm.farmDescription
          })
          .select();

        if (error) {
          // If pending fails, try with active
          const { data: activeData, error: activeError } = await supabase
            .from("organization_members")
            .insert({
              organization_id: selectedOrganization.id,
              farmer_id: farmerProfile.id,
              role: "member",
              status: "active",
              application_reason: applicationForm.reason,
              experience_level: applicationForm.experienceLevel,
              has_previous_organizations: applicationForm.hasPreviousOrganizations,
              previous_organizations: applicationForm.previousOrganizations,
              farm_description: applicationForm.farmDescription
            })
            .select();
            
          if (activeError) throw activeError;
          result = activeData;
        } else {
          result = data;
        }
      }

      toast({
        title: "Success",
        description: "Application submitted successfully",
      });

      // Update the membership status
      setMembershipStatus(prev => ({ ...prev, [selectedOrganization.id]: "pending" }));
      
      // Close the dialog
      setApplicationDialogOpen(false);
      
      // Refresh organizations to get the latest status
      fetchOrganizations();
    } catch (error: any) {
      console.error("Error applying to organization:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to apply to organization",
        variant: "destructive",
      });
    } finally {
      setApplying(prev => ({ ...prev, [selectedOrganization.id]: false }));
    }
  };

  const getMembershipLabel = (orgId: string) => {
    const status = membershipStatus[orgId];
    
    if (!status) return null;
    
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Member</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-500">Application Pending</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspended</Badge>;
      case 'inactive':
        return <Badge variant="outline">Inactive</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Application Rejected</Badge>;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout userRole="farmer">
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Find Organizations</h1>
        </div>
        
        {!farmerProfile && (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="pt-6">
              <div className="flex gap-2 items-center text-yellow-800">
                <p>You need to complete your farmer profile before applying to organizations.</p>
                <Button variant="outline" onClick={() => window.location.href = "/farmer/profile"}>
                  Complete Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-4 items-center">
          <Input
            placeholder="Search organizations by name, description, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-lg"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredOrgs.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                No organizations found matching your search criteria.
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredOrgs.map((org) => (
              <Card key={org.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl">{org.name}</CardTitle>
                    {getMembershipLabel(org.id)}
                  </div>
                  <CardDescription>
                    {org.region_name && org.province_name ? (
                      <>
                        {org.province_name}, {org.region_name}
                      </>
                    ) : (
                      org.region_name || org.province_name
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{org.address}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{org.contact_email}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{org.contact_phone}</span>
                  </div>
                  {org.description && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {org.description.length > 100
                        ? `${org.description.substring(0, 100)}...`
                        : org.description}
                    </p>
                  )}
                  <div className="text-sm font-medium">
                    Members: {org.member_count}
                  </div>
                </CardContent>
                <CardFooter>
                  {membershipStatus[org.id] ? (
                    membershipStatus[org.id] === 'active' ? (
                      <Button variant="outline" className="w-full" disabled>
                        Already a Member
                      </Button>
                    ) : membershipStatus[org.id] === 'rejected' ? (
                      <Button variant="outline" className="w-full" disabled>
                        Application Rejected
                      </Button>
                    ) : membershipStatus[org.id] === 'pending' ? (
                      <Button variant="outline" className="w-full" disabled>
                        Application Pending
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full" disabled>
                        Application {membershipStatus[org.id]}
                      </Button>
                    )
                  ) : (
                    <Button 
                      className="w-full" 
                      onClick={() => openApplicationDialog(org)}
                      disabled={!farmerProfile || applying[org.id]}
                    >
                      {applying[org.id] ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Applying...
                        </>
                      ) : (
                        <>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Apply to Join
                        </>
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Application Form Dialog */}
      <Dialog open={applicationDialogOpen} onOpenChange={setApplicationDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Apply to Join {selectedOrganization?.name}</DialogTitle>
            <DialogDescription>
              Please complete this application form to join the organization
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Why do you want to join this organization?</Label>
              <Textarea 
                id="reason" 
                placeholder="Explain your reasons for joining..." 
                value={applicationForm.reason}
                onChange={(e) => handleFormChange('reason', e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="experienceLevel">Your farming experience level</Label>
              <Select 
                value={applicationForm.experienceLevel}
                onValueChange={(value) => handleFormChange('experienceLevel', value)}
              >
                <SelectTrigger id="experienceLevel">
                  <SelectValue placeholder="Select your experience level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner (0-2 years)</SelectItem>
                  <SelectItem value="intermediate">Intermediate (3-5 years)</SelectItem>
                  <SelectItem value="experienced">Experienced (6-10 years)</SelectItem>
                  <SelectItem value="veteran">Veteran (10+ years)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="farmDescription">Describe your farm/agricultural activities</Label>
              <Textarea 
                id="farmDescription" 
                placeholder="Tell us about your farm, size, crops, etc..." 
                value={applicationForm.farmDescription}
                onChange={(e) => handleFormChange('farmDescription', e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            
            <div className="flex items-start space-x-2 pt-2">
              <Checkbox 
                id="hasPreviousOrganizations" 
                checked={applicationForm.hasPreviousOrganizations}
                onCheckedChange={(checked) => handleFormChange('hasPreviousOrganizations', !!checked)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="hasPreviousOrganizations"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Have you been a member of other agricultural organizations?
                </Label>
              </div>
            </div>
            
            {applicationForm.hasPreviousOrganizations && (
              <div className="space-y-2">
                <Label htmlFor="previousOrganizations">Previous organizations</Label>
                <Textarea 
                  id="previousOrganizations" 
                  placeholder="List previous organizations you've been a member of..." 
                  value={applicationForm.previousOrganizations}
                  onChange={(e) => handleFormChange('previousOrganizations', e.target.value)}
                />
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplicationDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleApplySubmit}
              disabled={!applicationForm.reason || !applicationForm.farmDescription || applying[selectedOrganization?.id || '']}
            >
              {applying[selectedOrganization?.id || ''] ? (
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