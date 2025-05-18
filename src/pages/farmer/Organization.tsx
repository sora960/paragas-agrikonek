import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Loader2, Building, Users, Mail, Phone, MapPin, Crown, 
  ArrowLeft, ArrowRight, UserPlus 
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link, useNavigate } from "react-router-dom";

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
}

interface PendingOrganization {
  id: string;
  name: string;
  registration_number: string;
  description?: string;
  region_name?: string;
  province_name?: string;
}

interface Member {
  id: string;
  farmer_id: string;
  role: string;
  status: string;
  join_date: string;
  farmer: {
    full_name: string;
    email: string;
    phone: string;
    farm_name: string;
  };
}

interface FarmerProfile {
  id: string;
  user_id: string;
}

export default function Organization() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState("overview");
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [farmerProfile, setFarmerProfile] = useState<FarmerProfile | null>(null);
  const [membershipStatus, setMembershipStatus] = useState<string | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [pendingOrganization, setPendingOrganization] = useState<PendingOrganization | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchFarmerProfile();
    }
  }, [user]);

  useEffect(() => {
    if (farmerProfile?.id) {
      fetchOrganization();
    }
  }, [farmerProfile]);

  const fetchFarmerProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("farmer_profiles")
        .select("id, user_id")
        .eq("user_id", user?.id)
        .single();

      if (error) {
        console.error("Error fetching farmer profile:", error);
        setError("No farmer profile found. Please complete your profile first.");
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

  const fetchOrganization = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, get the organization membership
      const { data: memberData, error: memberError } = await supabase
        .from("organization_members")
        .select("organization_id, role, status, id")
        .eq("farmer_id", farmerProfile?.id)
        .order("join_date", { ascending: false });

      if (memberError) {
        console.error("Error fetching member data:", memberError);
        setError("Failed to load your organization membership. Please try again later.");
        setLoading(false);
        return;
      }

      // If there are no memberships at all
      if (!memberData || memberData.length === 0) {
        setLoading(false);
        return;
      }

      // Check for active memberships first
      const activeMembership = memberData.find(m => m.status === 'active');
      if (activeMembership) {
        setMembershipStatus(activeMembership.role);
        await loadActiveOrganization(activeMembership.organization_id);
        return;
      }

      // If no active membership, check for pending invitations
      const pendingInvites = memberData.filter(m => m.status === 'pending');
      if (pendingInvites.length > 0) {
        setPendingInvitations(pendingInvites);
        
        // Load organization details for the first pending invitation
        await loadOrganizationDetails(pendingInvites[0].organization_id);
      }
      
      setLoading(false);
    } catch (error: any) {
      console.error("Error fetching organization:", error);
      setError("Failed to load organization information. Please try again later.");
      setLoading(false);
    }
  };

  const loadActiveOrganization = async (organizationId: string) => {
    try {
      // Now fetch the organization details
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select(`
          *,
          regions:region_id(name),
          provinces:province_id(name)
        `)
        .eq("id", organizationId)
        .single();

      if (orgError) {
        console.error("Error fetching organization data:", orgError);
        setError("Failed to load organization details. Please try again later.");
        setLoading(false);
        return;
      }

      setOrganization({
        id: orgData.id,
        name: orgData.name,
        registration_number: orgData.registration_number,
        address: orgData.address || "",
        contact_person: orgData.contact_person || "",
        contact_email: orgData.contact_email || "",
        contact_phone: orgData.contact_phone || "",
        description: orgData.description,
        status: orgData.status,
        region_name: orgData.regions?.name,
        province_name: orgData.provinces?.name,
      });

      // Fetch organization members
      await fetchMembers(orgData.id);
      setLoading(false);
    } catch (error: any) {
      console.error("Error loading active organization:", error);
      setError("Failed to load organization details. Please try again later.");
      setLoading(false);
    }
  };

  const loadOrganizationDetails = async (organizationId: string) => {
    try {
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select(`
          *,
          regions:region_id(name),
          provinces:province_id(name)
        `)
        .eq("id", organizationId)
        .single();

      if (orgError) {
        console.error("Error loading organization details:", orgError);
        setError("Failed to load pending organization details.");
        return;
      }

      setPendingOrganization({
        id: orgData.id,
        name: orgData.name,
        registration_number: orgData.registration_number,
        description: orgData.description,
        region_name: orgData.regions?.name,
        province_name: orgData.provinces?.name,
      });

    } catch (error: any) {
      console.error("Error loading organization details:", error);
      setError("Failed to load pending organization details.");
    }
  };

  const acceptInvitation = async (invitationId: string) => {
    try {
      const { data, error } = await supabase
        .from("organization_members")
        .update({
          status: "active",
          join_date: new Date().toISOString(),
        })
        .eq("id", invitationId)
        .select("organization_id, organizations:organization_id(name)")
        .single();

      if (error) {
        console.error("Error accepting invitation:", error);
        toast.error("Failed to accept invitation");
        return;
      }

      toast.success("You have successfully joined the organization");
      
      // Create a notification for organization admins
      try {
        // Insert notification directly
        await supabase.from('notifications').insert({
          title: "New Member Joined",
          content: `A new farmer has accepted the invitation to join an organization.`,
          type: "membership",
          user_id: null, // Will be filled by a trigger or should be the organization admin ID
          for_role: "organization_admin",
          reference_id: data.organization_id,
          created_at: new Date().toISOString(),
          is_read: false
        });
      } catch (notifError) {
        console.error("Error creating notification:", notifError);
      }

      // Reload the page to show the active organization
      setLoading(true);
      fetchOrganization();
    } catch (error: any) {
      console.error("Error accepting invitation:", error);
      toast.error("Failed to accept invitation");
    }
  };

  const declineInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from("organization_members")
        .update({
          status: "rejected",
        })
        .eq("id", invitationId);

      if (error) {
        console.error("Error declining invitation:", error);
        toast.error("Failed to decline invitation");
        return;
      }

      toast.success("Invitation declined");
      setPendingInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      
      // If there are other pending invitations, show the next one
      if (pendingInvitations.length > 1) {
        const nextInvitation = pendingInvitations.find(inv => inv.id !== invitationId);
        if (nextInvitation) {
          loadOrganizationDetails(nextInvitation.organization_id);
        }
      } else {
        setPendingOrganization(null);
      }
    } catch (error: any) {
      console.error("Error declining invitation:", error);
      toast.error("Failed to decline invitation");
    }
  };

  const leaveOrganization = async () => {
    if (!organization?.id || !farmerProfile?.id) return;
    
    try {
      // Update the membership status to inactive
      const { error } = await supabase
        .from("organization_members")
        .update({ status: "inactive" })
        .eq("organization_id", organization.id)
        .eq("farmer_id", farmerProfile.id);

      if (error) throw error;

      toast.success("You have left the organization");
      
      // Reset states
      setOrganization(null);
      setMembers([]);
      setMembershipStatus(null);
      
      // Refresh data
      fetchOrganization();
    } catch (error: any) {
      console.error("Error leaving organization:", error);
      toast.error("Failed to leave organization: " + error.message);
    }
  };

  const fetchMembers = async (organizationId: string) => {
    try {
      const { data, error } = await supabase
        .from("organization_members")
        .select(`
          id,
          farmer_id,
          role,
          status,
          join_date,
          farmer_profiles:farmer_id (
            id,
            farm_name,
            farm_address,
            user_id,
            full_name,
            email,
            phone
          )
        `)
        .eq("organization_id", organizationId)
        .eq("status", "active");

      if (error) {
        console.error("Error fetching members:", error);
        return;
      }

      const formattedMembers = data.map((item: any) => {
        const profile = item.farmer_profiles || {};
        return {
          id: item.id,
          farmer_id: item.farmer_id,
          role: item.role,
          status: item.status,
          join_date: item.join_date,
          farmer: {
            full_name: profile.full_name || 'Unknown Member',
            email: profile.email || '',
            phone: profile.phone || '',
            farm_name: profile.farm_name || 'Unknown Farm'
          }
        };
      });

      setMembers(formattedMembers);
    } catch (error) {
      console.error("Error fetching members:", error);
    }
  };

  const getInitials = (name: string) => {
    if (!name || name === 'Unknown Member') return 'UM';
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  if (loading) {
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
            Go to Profile
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Display pending invitation
  if (pendingOrganization && pendingInvitations.length > 0) {
    const invitation = pendingInvitations[0];
    return (
      <DashboardLayout userRole="farmer">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Organization Invitation</h1>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="mr-2 h-5 w-5" />
                <span>{pendingOrganization.name}</span>
              </CardTitle>
              <CardDescription>
                Registration Number: {pendingOrganization.registration_number}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">About</h3>
                <p className="text-muted-foreground">{pendingOrganization.description || "No description available."}</p>
              </div>
              
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>
                  {pendingOrganization.province_name && pendingOrganization.region_name 
                    ? `${pendingOrganization.province_name}, ${pendingOrganization.region_name}`
                    : "Location not specified"}
                </span>
              </div>
              
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-2">Invitation</h3>
                <p>You have been invited to join this organization. Would you like to accept?</p>
                
                <div className="flex space-x-4 mt-4">
                  <Button onClick={() => acceptInvitation(invitation.id)}>
                    Accept Invitation
                  </Button>
                  <Button variant="outline" onClick={() => declineInvitation(invitation.id)}>
                    Decline
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // No organization
  if (!organization) {
    return (
      <DashboardLayout userRole="farmer">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Organization</h1>
          </div>
          
          <Card className="text-center p-8">
            <CardContent className="pt-6 space-y-6">
              <Building className="mx-auto h-12 w-12 text-muted-foreground" />
              <h2 className="text-2xl font-bold">Not a Member Yet</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                You are not currently a member of any farming organization. Join an organization to access resources, connect with other farmers, and participate in community events.
              </p>
              <Button size="lg" onClick={() => window.location.href = "/farmer/apply"}>
                Find Organizations
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Active organization
  return (
    <DashboardLayout userRole="farmer">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Organization</h1>
            <p className="text-muted-foreground">Manage your organization membership</p>
          </div>
          {!organization && !pendingInvitations.length && (
            <Button onClick={() => navigate("/farmer/apply")} className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Apply to Organization
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Error</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => navigate("/farmer/profile")}>
                Complete Your Profile
              </Button>
            </CardContent>
          </Card>
        ) : organization ? (
          // Show active organization
          <>
            <Tabs defaultValue="overview" value={tabValue} onValueChange={setTabValue}>
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="members">Members</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <Building className="h-6 w-6 text-primary" />
                      {organization.name}
                      <Badge>{organization.status}</Badge>
                    </CardTitle>
                    <CardDescription>
                      Registration: {organization.registration_number}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {organization.description && (
                      <div>
                        <h3 className="font-medium mb-2">About</h3>
                        <p className="text-muted-foreground">{organization.description}</p>
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-medium mb-2">Contact Information</h3>
                        <ul className="space-y-2">
                          {organization.contact_person && (
                            <li className="flex items-center gap-2 text-sm">
                              <Crown className="h-4 w-4 text-muted-foreground" />
                              <span>{organization.contact_person}</span>
                            </li>
                          )}
                          {organization.contact_email && (
                            <li className="flex items-center gap-2 text-sm">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span>{organization.contact_email}</span>
                            </li>
                          )}
                          {organization.contact_phone && (
                            <li className="flex items-center gap-2 text-sm">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span>{organization.contact_phone}</span>
                            </li>
                          )}
                          {organization.address && (
                            <li className="flex items-center gap-2 text-sm">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span>{organization.address}</span>
                            </li>
                          )}
                        </ul>
                      </div>

                      <div>
                        <h3 className="font-medium mb-2">Location</h3>
                        <p className="text-sm">
                          {organization.province_name && `${organization.province_name}, `}
                          {organization.region_name || "Location not specified"}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium mb-2">Membership Status</h3>
                      <Badge variant="outline">
                        {membershipStatus === "admin" ? "Administrator" : 
                         membershipStatus === "manager" ? "Manager" : "Member"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="flex gap-4">
                    <Button variant="outline" onClick={() => navigate("/farmer/announcements")}>
                      View Announcements
                    </Button>
                    {membershipStatus !== "admin" && (
                      <Button variant="destructive" onClick={leaveOrganization}>
                        Leave Organization
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="members" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Organization Members</CardTitle>
                    <CardDescription>
                      Members of your organization
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {members.length === 0 ? (
                      <div className="text-center py-10">
                        <Users className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No members found</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {members.map((member) => (
                          <div key={member.id} className="flex items-center justify-between p-3 border rounded-md">
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-10 w-10 bg-primary">
                                <AvatarFallback>{getInitials(member.farmer.full_name)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium flex items-center">
                                  {member.farmer.full_name}
                                  {member.role === 'admin' && (
                                    <span className="ml-2 inline-flex items-center">
                                      <Crown className="h-3 w-3 text-amber-500" />
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground">{member.farmer.farm_name}</div>
                              </div>
                            </div>
                            <Badge variant={member.role === 'admin' ? "default" : "outline"}>
                              {member.role === 'admin' ? 'Admin' : 'Member'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        ) : pendingInvitations.length > 0 && pendingOrganization ? (
          // Show pending invitation
          <Card>
            <CardHeader>
              <CardTitle>Organization Invitation</CardTitle>
              <CardDescription>
                You have been invited to join an organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{getInitials(pendingOrganization.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">{pendingOrganization.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {pendingOrganization.region_name && `${pendingOrganization.region_name}`}
                    {pendingOrganization.province_name && pendingOrganization.region_name && ', '}
                    {pendingOrganization.province_name}
                  </p>
                </div>
              </div>

              {pendingOrganization.description && (
                <div>
                  <h4 className="font-medium mb-1">About the organization</h4>
                  <p className="text-sm text-muted-foreground">{pendingOrganization.description}</p>
                </div>
              )}

              <div className="flex justify-end gap-4 mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => declineInvitation(pendingInvitations[0].id)}
                >
                  Decline Invitation
                </Button>
                <Button 
                  onClick={() => acceptInvitation(pendingInvitations[0].id)}
                >
                  Accept Invitation
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          // Show "no organization" card
          <Card>
            <CardHeader>
              <CardTitle>No Organization Membership</CardTitle>
              <CardDescription>
                You are not a member of any organization yet
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">
                Join an agricultural organization to access benefits such as:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Budget allocation for farming expenses</li>
                <li>Agricultural training and resources</li>
                <li>Networking with other farmers</li>
                <li>Access to shared equipment and resources</li>
                <li>Marketing opportunities for your products</li>
              </ul>
              <Button 
                onClick={() => navigate("/farmer/apply")} 
                className="w-full sm:w-auto flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Apply to Organization
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
} 