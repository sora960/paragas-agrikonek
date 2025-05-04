import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, Trash2, UserPlus } from "lucide-react";
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

  const loadMembers = async (orgId = organizationId) => {
    if (!orgId) return;
    
    try {
      setLoading(true);
      // First get all members
      const { data, error } = await supabase
        .from("organization_members")
        .select(`id, farmer_id, role, status, join_date`)
        .eq("organization_id", orgId)
        .order("join_date", { ascending: false });

      if (error) throw error;
      
      if (data && data.length > 0) {
        // Get all farmer details in a separate query
        const farmerIds = data.map(member => member.farmer_id);
        const { data: farmerData, error: farmerError } = await supabase
          .from("farmer_profiles")
          .select(`id, user_id, full_name, phone, email`)
          .in('id', farmerIds);
          
        if (farmerError) throw farmerError;
        
        // Create a map for easy lookup
        const farmerMap = (farmerData || []).reduce((acc, farmer) => {
          acc[farmer.id] = farmer;
          return acc;
        }, {} as Record<string, any>);
        
        // Combine the data
        const membersWithFarmerInfo = data.map(member => ({
          ...member,
          farmer: farmerMap[member.farmer_id] || {
            user_id: "",
            full_name: "Unknown Farmer",
            phone: "",
            email: ""
          }
        }));
        
        setMembers(membersWithFarmerInfo as Member[]);
      } else {
        setMembers([]);
      }
    } catch (error) {
      console.error("Error loading members:", error);
      toast({
        title: "Error",
        description: "Failed to load organization members",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAllFarmerProfiles = async () => {
    try {
      setLoadingFarmers(true);
      
      const { data, error } = await supabase
        .from("farmer_profiles")
        .select("id, user_id, full_name, email, phone, farm_name");
      
      if (error) throw error;
      
      // Get existing member farmer IDs to filter them out
      const existingFarmerIds = members.map(m => m.farmer_id);
      
      // Filter out farmers who are already members
      const availableFarmers = data.filter(farmer => !existingFarmerIds.includes(farmer.id));
      
      setAllFarmerProfiles(availableFarmers);
      setFilteredFarmers(availableFarmers);
    } catch (error) {
      console.error("Error loading farmer profiles:", error);
      toast({
        title: "Error",
        description: "Failed to load farmer profiles",
        variant: "destructive",
      });
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
      
      const { data, error } = await supabase
        .from("organization_members")
        .insert({
          organization_id: currentOrgId,
          farmer_id: farmerId,
          role: "member",
          status: "active",
        })
        .select();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Member added to organization",
      });

      // Remove the added farmer from the list
      setAllFarmerProfiles(prev => prev.filter(f => f.id !== farmerId));
      setFilteredFarmers(prev => prev.filter(f => f.id !== farmerId));
      
      // Reload members
      loadMembers(currentOrgId);
    } catch (error) {
      console.error("Error adding member:", error);
      toast({
        title: "Error",
        description: "Failed to add member to organization",
        variant: "destructive",
      });
    } finally {
      setAddingMember(false);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      const { error } = await supabase
        .from("organization_members")
        .delete()
        .eq("id", memberId);

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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">
            Organization Members
            {organization && ` - ${organization.name}`}
          </h1>
          <Button onClick={() => setAddDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Members List</CardTitle>
            <CardDescription>
              All members currently registered with this organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No members found for this organization
              </div>
            ) : (
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="py-3 px-4 text-left font-medium">Name</th>
                      <th className="py-3 px-4 text-left font-medium">Email</th>
                      <th className="py-3 px-4 text-left font-medium">Phone</th>
                      <th className="py-3 px-4 text-left font-medium">Role</th>
                      <th className="py-3 px-4 text-left font-medium">Status</th>
                      <th className="py-3 px-4 text-left font-medium">Joined</th>
                      <th className="py-3 px-4 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member.id} className="border-b">
                        <td className="py-3 px-4">{member.farmer?.full_name || "N/A"}</td>
                        <td className="py-3 px-4">{member.farmer?.email || "N/A"}</td>
                        <td className="py-3 px-4">{member.farmer?.phone || "N/A"}</td>
                        <td className="py-3 px-4 capitalize">{member.role}</td>
                        <td className="py-3 px-4 capitalize">{member.status}</td>
                        <td className="py-3 px-4">
                          {new Date(member.join_date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeMember(member.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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

      {/* Add Member Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add Member to Organization</DialogTitle>
            <DialogDescription>
              Select a farmer to add to this organization. Each farmer must have completed their profile setup.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="search-farmer">Filter by name, email, phone, or farm name</Label>
              <Input
                id="search-farmer"
                placeholder="Type to filter farmers"
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
            
            {loadingFarmers ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredFarmers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {allFarmerProfiles.length === 0 ? (
                  <p>No farmer profiles found. Farmers need to create their profiles first.</p>
                ) : (
                  <p>No farmers match your search criteria.</p>
                )}
              </div>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="py-2 px-4 text-left font-medium">Farmer Name</th>
                      <th className="py-2 px-4 text-left font-medium">Farm Name</th>
                      <th className="py-2 px-4 text-left font-medium">Email</th>
                      <th className="py-2 px-4 text-left font-medium">Phone</th>
                      <th className="py-2 px-4 text-center font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFarmers.map((farmer) => (
                      <tr key={farmer.id} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-4">{farmer.full_name || "Not set"}</td>
                        <td className="py-2 px-4">{farmer.farm_name || "Not set"}</td>
                        <td className="py-2 px-4">{farmer.email || "Not set"}</td>
                        <td className="py-2 px-4">{farmer.phone || "Not set"}</td>
                        <td className="py-2 px-4 text-center">
                          <Button
                            size="sm"
                            disabled={addingMember}
                            onClick={() => addMember(farmer.id)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
} 