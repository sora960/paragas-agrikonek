import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Building, Users, Mail, Phone, MapPin, Crown } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState("overview");
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [farmerProfile, setFarmerProfile] = useState<FarmerProfile | null>(null);
  const [membershipStatus, setMembershipStatus] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchFarmerProfile();
    }
  }, [user]);

  useEffect(() => {
    if (farmerProfile) {
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
        return;
      }

      setFarmerProfile(data);
    } catch (error: any) {
      console.error("Error fetching farmer profile:", error);
    }
  };

  const fetchOrganization = async () => {
    try {
      setLoading(true);

      // First, get the organization membership
      const { data: memberData, error: memberError } = await supabase
        .from("organization_members")
        .select("organization_id, role, status")
        .eq("farmer_id", farmerProfile?.id)
        .eq("status", "active")
        .single();

      if (memberError) {
        if (memberError.code === "PGRST116") {
          // No active memberships found
          setLoading(false);
          return;
        }
        throw memberError;
      }

      setMembershipStatus(memberData.role);

      // Now fetch the organization details
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select(`
          *,
          regions:region_id(name),
          provinces:province_id(name)
        `)
        .eq("id", memberData.organization_id)
        .single();

      if (orgError) throw orgError;

      setOrganization({
        id: orgData.id,
        name: orgData.name,
        registration_number: orgData.registration_number,
        address: orgData.address,
        contact_person: orgData.contact_person,
        contact_email: orgData.contact_email,
        contact_phone: orgData.contact_phone,
        description: orgData.description,
        status: orgData.status,
        region_name: orgData.regions?.name,
        province_name: orgData.provinces?.name,
      });

      // Fetch organization members
      fetchMembers(orgData.id);
    } catch (error) {
      console.error("Error fetching organization:", error);
      toast({
        title: "Error",
        description: "Failed to load organization information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
            full_name, 
            email, 
            phone,
            farm_name
          )
        `)
        .eq("organization_id", organizationId)
        .eq("status", "active");

      if (error) throw error;

      const formattedMembers = data.map((member: any) => ({
        id: member.id,
        farmer_id: member.farmer_id,
        role: member.role,
        status: member.status,
        join_date: member.join_date,
        farmer: {
          full_name: member.farmer_profiles?.full_name || "Unknown",
          email: member.farmer_profiles?.email || "",
          phone: member.farmer_profiles?.phone || "",
          farm_name: member.farmer_profiles?.farm_name || "Unknown Farm"
        },
      }));

      setMembers(formattedMembers);
      
      // Update the organization's member count to match the actual number of active members
      try {
        await supabase
          .from("organizations")
          .update({ member_count: formattedMembers.length })
          .eq("id", organizationId);
      } catch (updateError) {
        console.error("Error updating member count:", updateError);
      }
    } catch (error) {
      console.error("Error fetching members:", error);
      toast({
        title: "Error",
        description: "Failed to load organization members",
        variant: "destructive",
      });
    }
  };

  // Helper function to get initials from name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  if (loading) {
    return (
      <DashboardLayout userRole="farmer">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!organization) {
    return (
      <DashboardLayout userRole="farmer">
        <div className="p-6 space-y-6">
          <h1 className="text-3xl font-bold">My Organization</h1>
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <Building className="mx-auto h-12 w-12 text-muted-foreground" />
                <h2 className="text-xl font-medium">Not a Member of Any Organization</h2>
                <p className="text-muted-foreground">
                  You are not currently a member of any active organization.
                </p>
                <Button 
                  onClick={() => window.location.href = "/farmer/apply"}
                  className="mt-2"
                >
                  Find Organizations to Join
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="farmer">
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">My Organization</h1>
          
          {membershipStatus && (
            <Badge className={membershipStatus === "admin" ? "bg-purple-500" : "bg-green-500"}>
              {membershipStatus === "admin" ? "Admin" : "Member"}
            </Badge>
          )}
        </div>

        <Tabs value={tabValue} onValueChange={setTabValue} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{organization.name}</CardTitle>
                <CardDescription>
                  {organization.region_name && organization.province_name
                    ? `${organization.province_name}, ${organization.region_name}`
                    : organization.region_name || organization.province_name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {organization.description && (
                    <div className="col-span-2">
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Description</h3>
                      <p>{organization.description}</p>
                    </div>
                  )}
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Address</h3>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span>{organization.address}</span>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Contact Person</h3>
                    <p>{organization.contact_person}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Email</h3>
                    <div className="flex items-start gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span>{organization.contact_email}</span>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Phone</h3>
                    <div className="flex items-start gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span>{organization.contact_phone}</span>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Registration Number</h3>
                    <p>{organization.registration_number}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Members</h3>
                    <div className="flex items-start gap-2">
                      <Users className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span>{members.length} active members</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Organization Members</CardTitle>
                <CardDescription>
                  View all active members of {organization.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {members.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No active members found
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="py-3 px-4 text-left font-medium">Member</th>
                          <th className="py-3 px-4 text-left font-medium">Farm</th>
                          <th className="py-3 px-4 text-left font-medium">Contact</th>
                          <th className="py-3 px-4 text-left font-medium">Role</th>
                          <th className="py-3 px-4 text-left font-medium">Joined</th>
                        </tr>
                      </thead>
                      <tbody>
                        {members.map((member) => (
                          <tr key={member.id} className="border-b hover:bg-muted/50">
                            <td className="py-2 px-4">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>
                                    {getInitials(member.farmer.full_name || "User")}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{member.farmer.full_name}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-2 px-4">{member.farmer.farm_name}</td>
                            <td className="py-2 px-4">
                              <div>{member.farmer.email}</div>
                              <div className="text-muted-foreground">{member.farmer.phone || "No phone"}</div>
                            </td>
                            <td className="py-2 px-4">
                              <div className="flex items-center">
                                {member.role === "admin" && (
                                  <Crown className="h-4 w-4 text-amber-500 mr-1" />
                                )}
                                <Badge variant={member.role === "admin" ? "default" : "outline"}>
                                  {member.role === "admin" ? "Admin" : "Member"}
                                </Badge>
                              </div>
                            </td>
                            <td className="py-2 px-4">
                              {new Date(member.join_date).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
} 