import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, Trash2, UserPlus, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { organizationService } from "@/services/organizationService";
import { adminService } from "@/services/adminService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast as sonnerToast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

// Get Supabase URL and key from env vars or use the same defaults as in the supabase.ts file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://supabase.eztechsolutions.pro';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnc2VleHVlcGZva25qeHB5bG1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTY0MTcyMzksImV4cCI6MjAzMTk5MzIzOX0.nOE0hOyIxeDPp7UlHJUEjRB_rvQo3eMQvLwWJkNLPJ4';

// Add a helper function to refresh the Supabase session
async function refreshSession() {
  try {
    // Check if there's a session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error("Error getting session:", sessionError);
      return false;
    }
    
    if (!session) {
      console.log("No active session found");
      return false;
    }
    
    // Try to refresh the session
    const { error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) {
      console.error("Error refreshing session:", refreshError);
      return false;
    }
    
    console.log("Session refreshed successfully");
    return true;
  } catch (error) {
    console.error("Exception refreshing session:", error);
    return false;
  }
}

interface Member {
  id: string;
  farmer_id: string;
  role: string;
  status: string;
  join_date: string;
  farmer: {
    user_id: string;
    full_name: string;
    phone: string;
    email: string;
    farm_name: string;
  };
}

interface FarmerProfile {
  id: string;
  user_id: string;
  full_name?: string;
  email?: string;
  phone?: string;
  farm_name?: string;
}

export default function OrganizationAdminMembers() {
  const [searchParams] = useSearchParams();
  const organizationId = searchParams.get("org");
  const { toast } = useToast();
  const [organization, setOrganization] = useState<any>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [allFarmerProfiles, setAllFarmerProfiles] = useState<FarmerProfile[]>([]);
  const [filteredFarmers, setFilteredFarmers] = useState<FarmerProfile[]>([]);
  const [loadingFarmers, setLoadingFarmers] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [adminOrganizations, setAdminOrganizations] = useState<any[]>([]);

  // Create a ref for the fallback data timer to prevent continuous fetching
  const fallbackTimerRef = useRef<number | null>(null);

  useEffect(() => {
    // Load admin's organizations if no org ID is provided in URL
    if (!organizationId) {
      loadAdminOrganizations();
    } else {
      loadOrganizationData();
      loadMembers();
    }
  }, [organizationId]);

  // Filter farmers when search query changes
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredFarmers(allFarmerProfiles);
    } else {
      const lowercaseQuery = searchQuery.toLowerCase();
      const filtered = allFarmerProfiles.filter(farmer => {
        return (
          (farmer.full_name && farmer.full_name.toLowerCase().includes(lowercaseQuery)) ||
          (farmer.email && farmer.email.toLowerCase().includes(lowercaseQuery)) ||
          (farmer.phone && farmer.phone.toLowerCase().includes(lowercaseQuery)) ||
          (farmer.farm_name && farmer.farm_name.toLowerCase().includes(lowercaseQuery))
        );
      });
      setFilteredFarmers(filtered);
    }
  }, [searchQuery, allFarmerProfiles]);

  // Load all farmer profiles when dialog opens
  useEffect(() => {
    if (addDialogOpen) {
      loadAllFarmerProfiles();
    }
  }, [addDialogOpen]);

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
        loadMembers(orgs[0].id);
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
      if (org) {
        setOrganization(org);
      } else {
        console.warn("Organization not found or could not be loaded");
        // Set a default organization object to prevent UI from breaking
        setOrganization({
          id: orgId,
          name: "Organization",
          status: "active",
          region_id: "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
        toast({
          title: "Warning",
          description: "Some organization details could not be loaded",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error loading organization:", error);
      // Set a default organization object to prevent UI from breaking
      setOrganization({
        id: orgId,
        name: "Organization",
        status: "active",
        region_id: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      toast({
        title: "Error",
        description: "Failed to load organization data",
        variant: "destructive",
      });
    }
  };

  const loadMembers = async (orgId = organizationId) => {
    if (!orgId) return;
    
    try {
      setLoading(true);
      console.log("Loading members for organization:", orgId);
      
      // Use the improved organization service to fetch members
      const members = await organizationService.getOrganizationMembers(orgId);
      
      if (members && members.length > 0) {
        setMembers(members);
      } else {
        setMembers([]);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error loading members:", error);
      toast({
        title: "Error",
        description: "Failed to load organization members. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const loadAllFarmerProfiles = async () => {
    try {
      setLoadingFarmers(true);
      
      // First get all farmers from the farmer_profiles table with only the columns we're sure exist
      const { data: farmerProfiles, error: farmerError } = await supabase
        .from("farmer_profiles")
        .select("id, user_id, farm_name, email, phone, full_name");
      
      if (farmerError) throw farmerError;
      
      if (!farmerProfiles || farmerProfiles.length === 0) {
        setAllFarmerProfiles([]);
        setFilteredFarmers([]);
        return;
      }
      
      // Get existing member farmer IDs to filter them out
      const existingFarmerIds = members.map(m => m.farmer_id);
      
      // Filter out farmers who are already members
      const availableFarmers = farmerProfiles.filter(farmer => !existingFarmerIds.includes(farmer.id));
      
      // If there are no availableFarmers, simply set empty arrays and return
      if (availableFarmers.length === 0) {
        setAllFarmerProfiles([]);
        setFilteredFarmers([]);
        return;
      }
      
      // Get list of user IDs from farmer profiles
      const userIds = availableFarmers.map(f => f.user_id).filter(id => id); // Filter out null/undefined
      
      // Only query users if we have IDs to query
      if (userIds.length === 0) {
        setAllFarmerProfiles(availableFarmers);
        setFilteredFarmers(availableFarmers);
        return;
      }
      
      // Try alternative approach to get user details since the regular query might fail with 400 errors
      try {
        console.log("Trying alternative approach to fetch farmer user details");
        // Fetch one user at a time to avoid potential issues with IN clause
        const userDetails = [];
        
        for (const userId of userIds) {
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select(`id, first_name, last_name, email`)
            .eq('id', userId)
            .single();
            
          if (!userError && userData) {
            userDetails.push(userData);
          } else {
            console.log(`Could not fetch details for user ${userId}:`, userError);
          }
        }
        
        if (userDetails.length > 0) {
          console.log(`Successfully fetched ${userDetails.length} user details individually for farmers`);
          
          // Merge user data with farmer profiles
          const enrichedFarmers = availableFarmers.map(farmer => {
            const matchingUser = userDetails.find(u => u.id === farmer.user_id);
            if (matchingUser) {
              return {
                ...farmer,
                full_name: matchingUser.first_name || matchingUser.last_name ? 
                  `${matchingUser.first_name || ''} ${matchingUser.last_name || ''}`.trim() :
                  farmer.full_name || 
                  `Farmer (${farmer.farm_name || 'Unknown'})`,
                email: matchingUser.email || '',
                phone: farmer.phone || ""
              };
            }
            return {
              ...farmer,
              full_name: `Farmer (${farmer.farm_name || 'Unknown'})`,
              email: "",
              phone: ""
            };
          });
          
          setAllFarmerProfiles(enrichedFarmers);
          setFilteredFarmers(enrichedFarmers);
          setLoadingFarmers(false);
          return;
        }
      } catch (altError) {
        console.error("Alternative user details approach for farmers failed:", altError);
      }
      
      // Fall back to original approach if alternative fails
      try {
        // Get user data to supplement farmer profiles
        const { data: users, error: usersError } = await supabase
          .from("users")
          .select("id, first_name, last_name, email")
          .in("id", userIds)
          .order('last_name');
        
        if (usersError) throw usersError;
        
        // Merge user data with farmer profiles
        const enrichedFarmers = availableFarmers.map(farmer => {
          const matchingUser = (users || []).find(u => u.id === farmer.user_id);
          if (matchingUser) {
            return {
              ...farmer,
              full_name: matchingUser.first_name || matchingUser.last_name ? 
                `${matchingUser.first_name || ''} ${matchingUser.last_name || ''}`.trim() :
                farmer.full_name || 
                `Farmer (${farmer.farm_name || 'Unknown'})`,
              email: matchingUser.email || '',
              phone: farmer.phone || ""
            };
          }
          return {
            ...farmer,
            full_name: `Farmer (${farmer.farm_name || 'Unknown'})`,
            email: "",
            phone: ""
          };
        });
        
        setAllFarmerProfiles(enrichedFarmers);
        setFilteredFarmers(enrichedFarmers);
      } catch (error) {
        console.error("Error enriching farmer data:", error);
        
        // Use available data without user details
        const basicFarmers = availableFarmers.map(farmer => ({
          ...farmer,
          full_name: farmer.full_name || `Farmer (${farmer.farm_name || 'Unknown'})`,
          email: farmer.email || "",
          phone: farmer.phone || ""
        }));
        
        setAllFarmerProfiles(basicFarmers);
        setFilteredFarmers(basicFarmers);
      }
    } catch (error) {
      console.error("Error loading farmer profiles:", error);
      toast({
        title: "Error",
        description: "Failed to load farmer profiles",
        variant: "destructive",
      });
      // Even if there's an error, set empty arrays to prevent UI from breaking
      setAllFarmerProfiles([]);
      setFilteredFarmers([]);
    } finally {
      setLoadingFarmers(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const addMember = async (farmerId: string) => {
    const currentOrgId = organizationId || (adminOrganizations.length === 1 ? adminOrganizations[0].id : null);
    if (!currentOrgId) {
      toast({
        title: "Error",
        description: "No organization selected",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setAddingMember(true);
      
      // First, verify this farmer profile exists and get the right ID
      const selectedFarmer = allFarmerProfiles.find(farmer => farmer.id === farmerId);
      if (!selectedFarmer) {
        throw new Error("Farmer profile not found");
      }
      
      // Check if this farmer already has an invitation or membership
      const { data: existingMember, error: existingCheckError } = await supabase
        .from("organization_members")
        .select("id, status")
        .eq("organization_id", currentOrgId)
        .eq("farmer_id", farmerId)
        .maybeSingle();
        
      if (existingCheckError) throw existingCheckError;
      
      // If farmer is already a member or has a pending invitation
      if (existingMember) {
        if (existingMember.status === 'active') {
          toast({
            title: "Already a Member",
            description: "This farmer is already a member of your organization",
          });
          return;
        } else if (existingMember.status === 'pending') {
          toast({
            title: "Invitation Exists",
            description: "This farmer already has a pending invitation to your organization",
          });
          return;
        }
      }
      
      // Create a new invitation (pending membership)
      const { data: newMember, error: insertError } = await supabase
        .from("organization_members")
        .insert({
          organization_id: currentOrgId,
          farmer_id: farmerId,
          role: "member", // Default role
          status: "pending", // Set as pending until farmer accepts
          join_date: new Date().toISOString()
        })
        .select()
        .single();
        
      if (insertError) throw insertError;
      
      toast({
        title: "Invitation Sent",
        description: "Invitation has been sent to the farmer to join your organization",
      });
      
      // Refresh member list to include the new pending invitation
      loadMembers();
      setAddDialogOpen(false);
    } catch (error: any) {
      console.error("Error adding member:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    } finally {
      setAddingMember(false);
    }
  };

  const resendInvitation = async (memberId: string) => {
    try {
      // Update the join_date to "resend" the invitation
      const { error } = await supabase
        .from("organization_members")
        .update({ 
          join_date: new Date().toISOString() 
        })
        .eq("id", memberId)
        .eq("status", "pending");

      if (error) throw error;

      toast({
        title: "Success",
        description: "Invitation has been resent",
      });

      loadMembers();
    } catch (error) {
      console.error("Error resending invitation:", error);
      toast({
        title: "Error",
        description: "Failed to resend invitation",
        variant: "destructive",
      });
    }
  };

  const cancelInvitation = async (memberId: string) => {
    if (!confirm("Are you sure you want to cancel this invitation?")) return;

    try {
      const { error } = await supabase
        .from("organization_members")
        .delete()
        .eq("id", memberId)
        .eq("status", "pending");

      if (error) throw error;

      toast({
        title: "Success",
        description: "Invitation has been cancelled",
      });

      loadMembers();
    } catch (error) {
      console.error("Error cancelling invitation:", error);
      toast({
        title: "Error",
        description: "Failed to cancel invitation",
        variant: "destructive",
      });
    }
  };

  const removeMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      const { error } = await supabase
        .from("organization_members")
        .delete()
        .eq("id", memberId)
        .eq("status", "active");

      if (error) throw error;

      toast({
        title: "Success",
        description: "Member removed from organization",
      });

      loadMembers();
    } catch (error) {
      console.error("Error removing member:", error);
      toast({
        title: "Error",
        description: "Failed to remove member from organization",
        variant: "destructive",
      });
    }
  };

  // Get fallback farmer data to ensure email and phone are displayed
  const loadMemberFallbackData = async () => {
    for (const member of members) {
      try {
        // Get email and phone directly from the farmer profile
        const response = await supabase
          .from("farmer_profiles")
          .select("id, email, phone, user_id")
          .eq("id", member.farmer_id)
          .single();
        
        const data = response.data;
        const error = response.error;
        
        if (!error && data) {
          let email = data.email || "";
          let phone = data.phone || "";
          
          // If we have the user_id and no email, try to get it directly from users table
          if (data.user_id && !email) {
            try {
              const userResponse = await supabase
                .from("users")
                .select("email")
                .eq("id", data.user_id)
                .single();
                
              if (!userResponse.error && userResponse.data) {
                if (userResponse.data.email) email = userResponse.data.email;
              }
            } catch (userErr) {
              console.log("Error getting user email:", userErr);
            }
          }
          
          // Only update if we have email or phone
          if (email || phone) {
            // Update this member with the fallback data
            const updatedMembers = [...members];
            const index = updatedMembers.findIndex(m => m.id === member.id);
            
            if (index !== -1) {
              updatedMembers[index] = {
                ...updatedMembers[index],
                farmer: {
                  ...updatedMembers[index].farmer,
                  email: email || updatedMembers[index].farmer.email || "",
                  phone: phone || updatedMembers[index].farmer.phone || ""
                }
              };
              
              setMembers(updatedMembers);
            }
          }
        }
      } catch (err) {
        console.error("Error loading fallback data for member:", err);
      }
    }
  };

  // Call the fallback data loader after initial members are loaded
  useEffect(() => {
    if (members.length > 0 && !loading) {
      // Prevent multiple simultaneous loadings
      if (fallbackTimerRef.current === null) {
        fallbackTimerRef.current = window.setTimeout(() => {
          loadMemberFallbackData();
          fallbackTimerRef.current = null;
        }, 500);
      }
    }
    
    return () => {
      // Clean up timer on unmount or dependency change
      if (fallbackTimerRef.current !== null) {
        window.clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };
  }, [members.length, loading]);

  // If no organization is selected and we have multiple admin organizations, show org selection
  if (!organizationId && adminOrganizations.length > 1) {
    return (
      <DashboardLayout userRole="organization">
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">Select an Organization</h1>
          <Card>
            <CardHeader>
              <CardTitle>Your Organizations</CardTitle>
              <CardDescription>
                Select an organization to manage its members
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
                        Click to manage members
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
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="organization">
      <div className="container mx-auto py-6 space-y-6">
        {/* Organization selection and members header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Organization Members</h1>
          <Button onClick={() => setAddDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
        </div>

        {/* Show loader while data is loading */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Organization selection if multiple */}
            {!organizationId && adminOrganizations.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Select Organization</CardTitle>
                  <CardDescription>
                    Choose which organization's members to manage
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {adminOrganizations.map((org) => (
                      <Card 
                        key={org.id} 
                        className="cursor-pointer hover:bg-muted/40 transition-colors"
                        onClick={() => {
                          const url = new URL(window.location.href);
                          url.searchParams.set("org", org.id);
                          window.location.href = url.toString();
                        }}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">{org.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            {org.member_count || 0} Members
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Members List */}
            {organization && (
              <Card>
                <CardHeader>
                  <CardTitle>Members List</CardTitle>
                  <CardDescription>
                    All members currently registered with this organization
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Tabs for different member types */}
                  <Tabs defaultValue="active" className="w-full">
                    <TabsList className="mb-4">
                      <TabsTrigger value="active">Active Members</TabsTrigger>
                      <TabsTrigger value="pending">Pending Invitations</TabsTrigger>
                    </TabsList>
                    
                    {/* Active Members Tab */}
                    <TabsContent value="active">
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[250px]">Name</TableHead>
                              <TableHead className="w-[200px]">Email</TableHead>
                              <TableHead className="w-[150px]">Phone</TableHead>
                              <TableHead className="w-[100px]">Role</TableHead>
                              <TableHead className="w-[120px]">Status</TableHead>
                              <TableHead className="w-[120px]">Joined/Invited</TableHead>
                              <TableHead className="w-[100px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {members.filter(member => member.status === 'active').length > 0 ? (
                              members
                                .filter(member => member.status === 'active')
                                .map((member) => (
                                  <TableRow key={member.id}>
                                    <TableCell className="font-medium">
                                      <div className="flex items-center gap-2">
                                        <Avatar>
                                          <AvatarFallback>
                                            {member.farmer.full_name
                                              ? member.farmer.full_name.substring(0, 2).toUpperCase()
                                              : "FM"}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <p>{member.farmer.full_name || "Unknown"}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {member.farmer.farm_name || "No farm name"}
                                          </p>
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell>{member.farmer.email || "Not provided"}</TableCell>
                                    <TableCell>{member.farmer.phone || "Not provided"}</TableCell>
                                    <TableCell>
                                      <Badge 
                                        variant={member.role === 'admin' ? "default" : "outline"}
                                      >
                                        {member.role || "member"}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <Badge 
                                        variant={member.status === 'active' ? "success" : "outline"}
                                      >
                                        {member.status}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      {new Date(member.join_date).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => removeMember(member.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                                  No active members found
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>
                    
                    {/* Pending Invitations Tab */}
                    <TabsContent value="pending">
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[250px]">Name</TableHead>
                              <TableHead className="w-[200px]">Email</TableHead>
                              <TableHead className="w-[150px]">Phone</TableHead>
                              <TableHead className="w-[120px]">Invited On</TableHead>
                              <TableHead className="w-[150px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {members.filter(member => member.status === 'pending').length > 0 ? (
                              members
                                .filter(member => member.status === 'pending')
                                .map((member) => (
                                  <TableRow key={member.id}>
                                    <TableCell className="font-medium">
                                      <div className="flex items-center gap-2">
                                        <Avatar>
                                          <AvatarFallback>
                                            {member.farmer.full_name
                                              ? member.farmer.full_name.substring(0, 2).toUpperCase()
                                              : "FM"}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <p>{member.farmer.full_name || "Unknown"}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {member.farmer.farm_name || "No farm name"}
                                          </p>
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell>{member.farmer.email || "Not provided"}</TableCell>
                                    <TableCell>{member.farmer.phone || "Not provided"}</TableCell>
                                    <TableCell>
                                      {new Date(member.join_date).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex space-x-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => resendInvitation(member.id)}
                                        >
                                          <RefreshCw className="h-3 w-3 mr-1" />
                                          Resend
                                        </Button>
                                        <Button
                                          variant="destructive"
                                          size="sm"
                                          onClick={() => cancelInvitation(member.id)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                                  No pending invitations
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Add Member Dialog */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Member to Organization</DialogTitle>
              <DialogDescription>
                Select a farmer to add to this organization. Each farmer must have completed their profile setup.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <Label htmlFor="search-farmers">Filter by name, email, phone, or farm name</Label>
              <Input
                id="search-farmers"
                className="mt-1"
                placeholder="Type to filter farmers"
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
            
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Farmer Name</TableHead>
                    <TableHead>Farm Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingFarmers ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : filteredFarmers.length > 0 ? (
                    filteredFarmers.map((farmer) => (
                      <TableRow key={farmer.id}>
                        <TableCell>{farmer.full_name || "No name"}</TableCell>
                        <TableCell>{farmer.farm_name || "Not specified"}</TableCell>
                        <TableCell>{farmer.email || "No email"}</TableCell>
                        <TableCell>{farmer.phone || "No phone"}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            disabled={addingMember}
                            onClick={() => addMember(farmer.id)}
                          >
                            {addingMember ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Adding...
                              </>
                            ) : (
                              <>
                                <Plus className="mr-2 h-4 w-4" />
                                Add
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                        No farmers found matching the search criteria
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
} 