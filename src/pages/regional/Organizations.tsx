import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Eye, Loader2, Plus, Trash2, Search } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Organization {
  id: string;
  name: string;
  status: string;
  created_at: string;
  member_count?: number;
  contact_person?: string;
  contact_email?: string;
  address?: string;
}

interface OrganizationDetails extends Organization {
  description?: string;
  registration_number?: string;
  contact_phone?: string;
  members?: any[];
}

export default function Organizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [availableOrganizations, setAvailableOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentRegionId, setCurrentRegionId] = useState<string | null>(null);
  const [selectedOrganization, setSelectedOrganization] = useState<OrganizationDetails | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [invitingOrg, setInvitingOrg] = useState<Organization | null>(null);
  const [removingOrg, setRemovingOrg] = useState<Organization | null>(null);
  const [processing, setProcessing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.id) {
      loadOrganizations();
    }
  }, [user]);

  const loadOrganizations = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      setError(null);
      
      // Get the user's assigned region
      const { data: userRegion, error: userRegionError } = await supabase
        .from("user_regions")
        .select("region_id")
        .eq("user_id", user.id)
        .single();
        
      if (userRegionError) throw userRegionError;
      if (!userRegion) {
        setError("You don't have any assigned region. Please contact an administrator.");
        return;
      }
      
      setCurrentRegionId(userRegion.region_id);
      
      // Fetch organizations in this region
      const { data, error: orgError } = await supabase
        .from("organizations")
        .select("id, name, status, created_at, member_count, contact_person, contact_email, address")
        .eq("region_id", userRegion.region_id)
        .order("name");
        
      if (orgError) throw orgError;
      setOrganizations(data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load organizations");
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableOrganizations = async () => {
    try {
      setLoadingAvailable(true);
      
      // Fetch organizations with no region assigned
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, status, created_at, member_count, contact_person, contact_email, address")
        .is("region_id", null)
        .order("name");
        
      if (error) throw error;
      setAvailableOrganizations(data || []);
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to load available organizations",
        variant: "destructive"
      });
    } finally {
      setLoadingAvailable(false);
    }
  };

  const handleShowDetails = async (org: Organization) => {
    try {
      setProcessing(true);
      
      // Fetch detailed organization info
      const { data, error } = await supabase
        .from("organizations")
        .select(`
          *,
          members:organization_members(
            id,
            role,
            status,
            join_date,
            farmer_profiles!inner(
              id,
              user_id,
              users!inner(
                first_name,
                last_name,
                email
              )
            )
          )
        `)
        .eq("id", org.id)
        .single();
        
      if (error) throw error;
      
      setSelectedOrganization(data);
      setDetailsDialogOpen(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load organization details",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRemoveOrganization = (org: Organization) => {
    setRemovingOrg(org);
    setRemoveDialogOpen(true);
  };

  const confirmRemoveOrganization = async () => {
    if (!removingOrg || !currentRegionId) return;
    
    try {
      setProcessing(true);
      
      // Update the organization to remove region assignment
      const { error } = await supabase
        .from("organizations")
        .update({ region_id: null })
        .eq("id", removingOrg.id);
        
      if (error) throw error;
      
      toast({
        title: "Organization Removed",
        description: `${removingOrg.name} has been removed from your region.`
      });
      
      // Reload organizations
      loadOrganizations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to remove organization from region",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
      setRemoveDialogOpen(false);
      setRemovingOrg(null);
    }
  };

  const openInviteDialog = () => {
    loadAvailableOrganizations();
    setInviteDialogOpen(true);
  };

  const handleInviteOrganization = (org: Organization) => {
    setInvitingOrg(org);
  };

  const confirmInviteOrganization = async () => {
    if (!invitingOrg || !currentRegionId) return;
    
    try {
      setProcessing(true);
      
      // Update the organization to assign it to this region
      const { error } = await supabase
        .from("organizations")
        .update({ region_id: currentRegionId })
        .eq("id", invitingOrg.id);
        
      if (error) throw error;
      
      toast({
        title: "Organization Added",
        description: `${invitingOrg.name} has been added to your region.`
      });
      
      // Update available organizations list
      setAvailableOrganizations(prev => prev.filter(org => org.id !== invitingOrg.id));
      
      // Reload organizations
      loadOrganizations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to add organization to region",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
      setInvitingOrg(null);
    }
  };

  const filteredOrganizations = organizations.filter(org => 
    org.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAvailableOrganizations = availableOrganizations.filter(org => 
    org.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout userRole="regional">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Organizations</h1>
          <Button onClick={openInviteDialog}>
            <Plus className="mr-2 h-4 w-4" /> Add Organization
          </Button>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-md mb-4">
            {error}
          </div>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Region Organizations</CardTitle>
              <CardDescription>Manage organizations in your region</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search organizations..."
                className="pl-8 w-[250px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-[200px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization Name</TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrganizations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No organizations found in your region.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrganizations.map((org) => (
                      <TableRow key={org.id}>
                        <TableCell className="font-medium">{org.name}</TableCell>
                        <TableCell>
                          {org.contact_person && (
                            <div>
                              <div>{org.contact_person}</div>
                              <div className="text-sm text-muted-foreground">{org.contact_email}</div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{org.member_count || 0}</TableCell>
                        <TableCell>
                          <Badge
                            variant={org.status === 'active' ? 'default' : 'secondary'}
                          >
                            {org.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleShowDetails(org)}
                              disabled={processing}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveOrganization(org)}
                              disabled={processing}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Organization Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Organization Details</DialogTitle>
            <DialogDescription>
              Detailed information about {selectedOrganization?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrganization && (
            <Tabs defaultValue="details">
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="members">Members</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                    <p className="mt-1">
                      <Badge variant={selectedOrganization.status === 'active' ? 'default' : 'secondary'}>
                        {selectedOrganization.status}
                      </Badge>
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Registration Number</h3>
                    <p className="mt-1">{selectedOrganization.registration_number || 'Not provided'}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Contact Person</h3>
                    <p className="mt-1">{selectedOrganization.contact_person || 'Not provided'}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Contact Email</h3>
                    <p className="mt-1">{selectedOrganization.contact_email || 'Not provided'}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Contact Phone</h3>
                    <p className="mt-1">{selectedOrganization.contact_phone || 'Not provided'}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Address</h3>
                    <p className="mt-1">{selectedOrganization.address || 'Not provided'}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
                  <p className="mt-1">{selectedOrganization.description || 'No description provided'}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Created On</h3>
                  <p className="mt-1">{new Date(selectedOrganization.created_at).toLocaleDateString()}</p>
                </div>
              </TabsContent>
              
              <TabsContent value="members">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Join Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrganization.members && selectedOrganization.members.length > 0 ? (
                      selectedOrganization.members.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell>
                            {member.farmer_profiles?.users?.first_name} {member.farmer_profiles?.users?.last_name}
                          </TableCell>
                          <TableCell>{member.farmer_profiles?.users?.email}</TableCell>
                          <TableCell>{member.role}</TableCell>
                          <TableCell>
                            <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                              {member.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {member.join_date ? new Date(member.join_date).toLocaleDateString() : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4">
                          No members found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Remove Organization Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Organization</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <span className="font-semibold">{removingOrg?.name}</span> from your region?
              This will not delete the organization, but it will no longer be associated with your region.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveOrganization}
              disabled={processing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invite Organization Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Organization to Region</DialogTitle>
            <DialogDescription>
              Select an organization to add to your region
            </DialogDescription>
          </DialogHeader>
          
          <div className="relative mt-2 mb-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search organizations..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {loadingAvailable ? (
            <div className="flex justify-center items-center h-[200px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization Name</TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAvailableOrganizations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                        No available organizations found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAvailableOrganizations.map((org) => (
                      <TableRow key={org.id} className={invitingOrg?.id === org.id ? "bg-muted/50" : undefined}>
                        <TableCell className="font-medium">{org.name}</TableCell>
                        <TableCell>
                          {org.contact_person ? (
                            <div>
                              <div>{org.contact_person}</div>
                              <div className="text-sm text-muted-foreground">{org.contact_email}</div>
                            </div>
                          ) : (
                            "Not provided"
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={org.status === 'active' ? 'default' : 'secondary'}
                          >
                            {org.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => handleInviteOrganization(org)}
                            disabled={processing || invitingOrg?.id === org.id}
                          >
                            {invitingOrg?.id === org.id ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Adding...
                              </>
                            ) : (
                              "Add to Region"
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {invitingOrg && (
            <DialogFooter>
              <Button 
                onClick={confirmInviteOrganization}
                disabled={processing}
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Confirm Add to Region"
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
} 