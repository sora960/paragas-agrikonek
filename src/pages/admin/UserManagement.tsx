import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import UserManagementTable from "@/components/admin/UserManagementTable";
import OrganizationAdminsTable from "@/components/admin/OrganizationAdminsTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Pencil, Eye, Ban, CheckCircle, MoreHorizontal, MapPin } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

// Define types for regional admin
interface RegionalAdmin {
  id: string;
  user_id: string;
  region_id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  region_name: string;
  region_code?: string;
}

interface Region {
  id: string;
  name: string;
  code?: string;
}

export default function UserManagement() {
  const [activeTab, setActiveTab] = useState("all-users");
  const [showCreateRegionalAdminModal, setShowCreateRegionalAdminModal] = useState(false);
  const [showReassignRegionModal, setShowReassignRegionModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [regionalAdmins, setRegionalAdmins] = useState<RegionalAdmin[]>([]);
  const [availableRegions, setAvailableRegions] = useState<Region[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<RegionalAdmin | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Form state
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    region_id: ""
  });

  // Reassign region form state
  const [reassignData, setReassignData] = useState({
    region_id: ""
  });

  // Add new state for region filtering/grouping
  const [regionSearchTerm, setRegionSearchTerm] = useState("");

  // Add new state for admin filtering
  const [adminSearchTerm, setAdminSearchTerm] = useState("");

  // Add new state for region filtering
  const [regionFilter, setRegionFilter] = useState("all");

  // Add new state for status filtering
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch regional admins on component mount
  useEffect(() => {
    if (activeTab === "regional-admins") {
      fetchRegionalAdmins();
      fetchAvailableRegions();
    }
  }, [activeTab]);
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle reassign data changes
  const handleReassignChange = (name: string, value: string) => {
    setReassignData(prev => ({ ...prev, [name]: value }));
  };

  // Fetch available regions
  const fetchAvailableRegions = async () => {
    try {
      const { data, error } = await supabase.from("regions").select("id, name, code");
      if (error) throw error;
      setAvailableRegions(data || []);
    } catch (err) {
      console.error("Error fetching regions:", err);
    }
  };

  // Fetch regional admins from the database
  const fetchRegionalAdmins = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_regions")
        .select(`
          id,
          user_id,
          region_id,
          created_at,
          users:user_id (id, first_name, last_name, email, status),
          regions:region_id (id, name, code)
        `);
        
      if (error) throw error;
      
      const formattedAdmins = data.map((admin: any) => ({
        id: admin.id,
        user_id: admin.user_id,
        region_id: admin.region_id,
        first_name: admin.users.first_name,
        last_name: admin.users.last_name,
        email: admin.users.email,
        status: admin.users.status,
        region_name: admin.regions.name,
        region_code: admin.regions.code
      }));
      
      setRegionalAdmins(formattedAdmins);
    } catch (err) {
      console.error("Error fetching regional admins:", err);
      toast({
        title: "Error",
        description: "Failed to load regional administrators",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Create a new regional admin
  const handleCreateRegionalAdmin = async () => {
    if (!formData.first_name || !formData.last_name || !formData.email || !formData.password || !formData.region_id) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    setCreating(true);
    
    try {
      // 1. Create the user account
      const { data: userData, error: userError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.first_name,
            last_name: formData.last_name,
            role: "regional_admin"
          }
        }
      });
      
      if (userError) throw userError;
      
      if (!userData.user) {
        throw new Error("Failed to create user account");
      }
      
      // 2. Insert into users table
      const { error: insertError } = await supabase.from("users").insert({
        id: userData.user.id,
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        role: "regional_admin",
        status: "active"
      });
      
      if (insertError) throw insertError;
      
      // 3. Associate user with region
      const { error: regionError } = await supabase.from("user_regions").insert({
        user_id: userData.user.id,
        region_id: formData.region_id
      });
      
      if (regionError) throw regionError;
      
      // Success
      toast({
        title: "Success",
        description: "Regional administrator created successfully"
      });
      
      // Reset form and close modal
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        region_id: ""
      });
      
      setShowCreateRegionalAdminModal(false);
      
      // Refresh the list
      fetchRegionalAdmins();
      
    } catch (err: any) {
      console.error("Error creating regional admin:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to create regional administrator",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  // Show the reassign modal for a specific admin
  const handleShowReassignModal = (admin: RegionalAdmin) => {
    setSelectedAdmin(admin);
    setReassignData({ region_id: admin.region_id });
    setShowReassignRegionModal(true);
  };
  
  // Reassign a regional admin to a different region
  const handleReassignRegion = async () => {
    if (!selectedAdmin || !reassignData.region_id) {
      toast({
        title: "Error",
        description: "Please select a region",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Check if the user already has an association with this region
      const { data: existingAssignment, error: checkError } = await supabase
        .from("user_regions")
        .select("id")
        .eq("user_id", selectedAdmin.user_id)
        .eq("region_id", reassignData.region_id)
        .maybeSingle();
        
      if (checkError) throw checkError;
      
      if (existingAssignment) {
        // User is already assigned to this region
        toast({
          title: "Info",
          description: "Administrator is already assigned to this region",
        });
        setShowReassignRegionModal(false);
        return;
      }
      
      // Update the user's region assignment
      const { error: updateError } = await supabase
        .from("user_regions")
        .update({ region_id: reassignData.region_id })
        .eq("id", selectedAdmin.id);
        
      if (updateError) throw updateError;
      
      // Success
      toast({
        title: "Success",
        description: "Administrator's region reassigned successfully"
      });
      
      // Close modal and refresh the list
      setShowReassignRegionModal(false);
      fetchRegionalAdmins();
      
    } catch (err: any) {
      console.error("Error reassigning region:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to reassign administrator's region",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handler for editing a regional admin
  const handleEditRegionalAdmin = (admin: RegionalAdmin) => {
    handleShowReassignModal(admin);
  };

  // Handler for viewing a region
  const handleViewRegion = (regionId: string) => {
    navigate(`/superadmin/regions/${regionId}`);
  };

  // Handler for toggling admin status
  const handleToggleStatus = async (admin: RegionalAdmin) => {
    try {
      const newStatus = admin.status === "active" ? "inactive" : "active";
      
      // Update the user's status
      const { error } = await supabase
        .from("users")
        .update({ status: newStatus })
        .eq("id", admin.user_id);
        
      if (error) throw error;
      
      // Refresh the list
      fetchRegionalAdmins();
      
      toast({
        title: "Status Updated",
        description: `Administrator ${newStatus === "active" ? "activated" : "deactivated"} successfully`,
      });
    } catch (err) {
      console.error("Error updating status:", err);
      toast({
        title: "Error",
        description: "Failed to update administrator status",
        variant: "destructive",
      });
    }
  };

  // Filter regions for easier selection
  const filteredRegions = useMemo(() => {
    if (!regionSearchTerm) return availableRegions;
    
    return availableRegions.filter(region => 
      region.name.toLowerCase().includes(regionSearchTerm.toLowerCase()) ||
      (region.code && region.code.toLowerCase().includes(regionSearchTerm.toLowerCase()))
    );
  }, [availableRegions, regionSearchTerm]);
  
  // Group regions by first letter for easier navigation in dropdown
  const groupedRegions = useMemo(() => {
    // Sort regions alphabetically by name
    const sorted = [...filteredRegions].sort((a, b) => a.name.localeCompare(b.name));
    
    // Group by first letter
    const grouped: Record<string, Region[]> = {};
    
    sorted.forEach(region => {
      const firstLetter = region.name.charAt(0).toUpperCase();
      if (!grouped[firstLetter]) {
        grouped[firstLetter] = [];
      }
      grouped[firstLetter].push(region);
    });
    
    return grouped;
  }, [filteredRegions]);

  // Helper for rendering region selection
  const renderRegionSelectContent = () => {
    if (filteredRegions.length === 0) {
      return (
        <div className="p-2 text-center text-muted-foreground">
          No regions match your search
        </div>
      );
    }
    
    // If we have a short list after filtering, just show them directly
    if (filteredRegions.length <= 10 || regionSearchTerm) {
      return filteredRegions.map(region => (
        <SelectItem key={region.id} value={region.id}>
          {region.code ? `${region.code} - ${region.name}` : region.name}
        </SelectItem>
      ));
    }
    
    // Otherwise, show them grouped by first letter
    return Object.entries(groupedRegions).map(([letter, regions]) => (
      <div key={letter} className="mb-2">
        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted/50">
          {letter}
        </div>
        {regions.map(region => (
          <SelectItem key={region.id} value={region.id}>
            {region.code ? `${region.code} - ${region.name}` : region.name}
          </SelectItem>
        ))}
      </div>
    ));
  };

  // Filter regional admins based on search and filters
  const filteredAdmins = useMemo(() => {
    let filtered = regionalAdmins;

    if (adminSearchTerm) {
      filtered = filtered.filter(admin => 
        admin.first_name.toLowerCase().includes(adminSearchTerm.toLowerCase()) ||
        admin.last_name.toLowerCase().includes(adminSearchTerm.toLowerCase()) ||
        admin.email.toLowerCase().includes(adminSearchTerm.toLowerCase())
      );
    }

    if (regionFilter !== "all") {
      filtered = filtered.filter(admin => admin.region_id === regionFilter);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(admin => admin.status === statusFilter);
    }

    return filtered;
  }, [regionalAdmins, adminSearchTerm, regionFilter, statusFilter]);

  return (
    <DashboardLayout userRole="superadmin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage user accounts and permissions across the platform
          </p>
        </div>

        <Tabs defaultValue="all-users" onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="all-users">All Users</TabsTrigger>
            <TabsTrigger value="regional-admins">Regional Admins</TabsTrigger>
            <TabsTrigger value="org-admins">Organization Admins</TabsTrigger>
            <TabsTrigger value="farmers">Farmers</TabsTrigger>
            <TabsTrigger value="audit-logs">Audit Logs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all-users">
            <UserManagementTable />
          </TabsContent>
          
          <TabsContent value="regional-admins">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Regional Administrators</CardTitle>
                  <CardDescription>Manage administrators for specific regions</CardDescription>
                </div>
                <Button onClick={() => setShowCreateRegionalAdminModal(true)}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Regional Admin
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {loading ? (
                  <div className="flex justify-center p-6">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-4 mb-6">
                      <div className="flex-1 min-w-[240px]">
                        <Input
                          placeholder="Search by name or email..."
                          value={adminSearchTerm}
                          onChange={(e) => setAdminSearchTerm(e.target.value)}
                          className="w-full"
                        />
                      </div>
                      
                      <div className="flex-1 min-w-[240px]">
                        <Select
                          value={regionFilter}
                          onValueChange={setRegionFilter}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Filter by region" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Regions</SelectItem>
                            <div className="py-2 px-2 border-b">
                              <Input
                                placeholder="Search regions..."
                                value={regionSearchTerm}
                                onChange={(e) => setRegionSearchTerm(e.target.value)}
                                className="mb-1"
                              />
                            </div>
                            {renderRegionSelectContent()}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Select 
                          value={statusFilter} 
                          onValueChange={setStatusFilter}
                        >
                          <SelectTrigger className="w-[160px]">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Assigned Region</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAdmins.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                              {adminSearchTerm || regionFilter !== 'all' || statusFilter !== 'all' 
                                ? "No administrators match your search criteria" 
                                : "No regional admins found. Create one to get started."}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredAdmins.map(admin => (
                            <TableRow key={admin.id}>
                              <TableCell className="font-medium">
                                {admin.first_name} {admin.last_name}
                              </TableCell>
                              <TableCell>{admin.email}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {admin.region_id ? (
                                    <>
                                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                                        <MapPin className="h-4 w-4 text-primary" />
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium">{admin.region_name}</p>
                                        {admin.region_code && (
                                          <p className="text-xs text-muted-foreground">Code: {admin.region_code}</p>
                                        )}
                                      </div>
                                    </>
                                  ) : (
                                    <Badge variant="outline" className="text-amber-500 border-amber-200 bg-amber-50">
                                      Not Assigned
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={admin.status === 'active' ? 'default' : 'secondary'}
                                  className={admin.status === 'active' ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}
                                >
                                  {admin.status === 'active' ? 'Active' : 'Inactive'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="h-8 px-2"
                                    onClick={() => handleEditRegionalAdmin(admin)}
                                  >
                                    {admin.region_id ? 'Reassign' : 'Assign'}
                                  </Button>
                                  
                                  {admin.region_id && (
                                    <Button 
                                      variant="outline" 
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => handleViewRegion(admin.region_id)}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  )}
                                  
                                  <Button 
                                    variant={admin.status === 'active' ? 'destructive' : 'default'}
                                    size="sm"
                                    className="h-8 px-2"
                                    onClick={() => handleToggleStatus(admin)}
                                  >
                                    {admin.status === 'active' ? 'Deactivate' : 'Activate'}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="org-admins">
            <OrganizationAdminsTable />
          </TabsContent>
          
          <TabsContent value="farmers">
            <Card>
              <CardHeader>
                <CardTitle>Farmer Accounts</CardTitle>
                <CardDescription>
                  Manage all farmer accounts in the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  This section shows farmer accounts and allows you to manage their profiles and access.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="audit-logs">
            <Card>
              <CardHeader>
                <CardTitle>System Access Audit</CardTitle>
                <CardDescription>
                  Review login and system access activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  View audit logs of system access and user activities.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Create Regional Admin Modal */}
          <Dialog open={showCreateRegionalAdminModal} onOpenChange={setShowCreateRegionalAdminModal}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create Regional Administrator</DialogTitle>
                <DialogDescription>
                  Create a new administrator account and assign them to a region. They will have access to manage that region's resources and organizations.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-5 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name</Label>
                    <Input 
                      id="first_name" 
                      name="first_name" 
                      value={formData.first_name}
                      onChange={handleInputChange}
                      placeholder="First name" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input 
                      id="last_name" 
                      name="last_name" 
                      value={formData.last_name}
                      onChange={handleInputChange}
                      placeholder="Last name" 
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    name="email" 
                    type="email" 
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="administrator@example.com" 
                  />
                  <p className="text-xs text-muted-foreground">
                    This email will be used for login access to the platform.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Temporary Password</Label>
                  <Input 
                    id="password" 
                    name="password" 
                    type="password" 
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Create a temporary password" 
                  />
                  <p className="text-xs text-muted-foreground">
                    The administrator will be prompted to change this password on first login.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="region">Assign Region</Label>
                    {availableRegions.length === 0 && (
                      <Badge variant="outline" className="text-amber-500">
                        No regions available
                      </Badge>
                    )}
                  </div>
                  
                  <Select 
                    value={formData.region_id} 
                    onValueChange={(value) => handleSelectChange("region_id", value)}
                    disabled={availableRegions.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a region" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <div className="py-2 px-2 border-b">
                        <Input
                          placeholder="Search regions..."
                          value={regionSearchTerm}
                          onChange={(e) => setRegionSearchTerm(e.target.value)}
                          className="mb-1"
                        />
                      </div>
                      {renderRegionSelectContent()}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    The administrator will have access to manage this region's resources, organizations, and budget allocations.
                  </p>
                </div>
              </div>
              
              <DialogFooter className="flex items-center justify-between sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  {creating && <span className="flex items-center"><Loader2 className="h-3 w-3 mr-2 animate-spin" /> Creating administrator...</span>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowCreateRegionalAdminModal(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateRegionalAdmin} 
                    disabled={creating || !formData.first_name || !formData.last_name || !formData.email || !formData.password || !formData.region_id}
                  >
                    Create Administrator
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Reassign Region Modal */}
          <Dialog open={showReassignRegionModal} onOpenChange={setShowReassignRegionModal}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Reassign Administrator's Region</DialogTitle>
                <DialogDescription>
                  Move <span className="font-medium">{selectedAdmin?.first_name} {selectedAdmin?.last_name}</span> to a different region. They will lose access to their current region and gain access to the newly selected one.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-5 py-4">
                <div className="space-y-2">
                  <Label>Current Region</Label>
                  {selectedAdmin?.region_id ? (
                    <div className="flex items-center p-3 border rounded-md bg-muted/20">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 mr-3">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{selectedAdmin?.region_name || "None"}</p>
                        {selectedAdmin?.region_code && (
                          <p className="text-sm text-muted-foreground">Code: {selectedAdmin?.region_code}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 border rounded-md bg-amber-50">
                      <p className="text-amber-600">No region currently assigned</p>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="new-region">New Region Assignment</Label>
                    {availableRegions.length === 0 && (
                      <Badge variant="outline" className="text-amber-500">
                        No regions available
                      </Badge>
                    )}
                  </div>
                  
                  <Select 
                    value={reassignData.region_id} 
                    onValueChange={(value) => handleReassignChange("region_id", value)}
                    disabled={availableRegions.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a region" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <div className="py-2 px-2 border-b">
                        <Input
                          placeholder="Search regions..."
                          value={regionSearchTerm}
                          onChange={(e) => setRegionSearchTerm(e.target.value)}
                          className="mb-1"
                        />
                      </div>
                      
                      {/* Special option at top if user is already assigned */}
                      {selectedAdmin?.region_id && (
                        <div className="px-2 py-1 mb-1">
                          <h4 className="text-xs text-muted-foreground font-semibold">CURRENT ASSIGNMENT</h4>
                          <div className="py-1 px-2 rounded-md bg-muted/30 my-1">
                            <p className="text-sm">{selectedAdmin.region_name}</p>
                          </div>
                        </div>
                      )}
                      
                      {renderRegionSelectContent()}
                    </SelectContent>
                  </Select>
                  
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="font-medium">Important:</span> This action will remove the administrator's access to their current region and grant access to the new region.
                  </p>
                  
                  {selectedAdmin?.region_id && reassignData.region_id === selectedAdmin.region_id && (
                    <div className="p-3 rounded-md bg-amber-50 border border-amber-200 mt-3">
                      <p className="text-amber-700 text-sm">
                        You've selected the same region that is currently assigned. No changes will be made.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <DialogFooter className="flex items-center justify-between sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  {loading && <span className="flex items-center"><Loader2 className="h-3 w-3 mr-2 animate-spin" /> Updating assignment...</span>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowReassignRegionModal(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleReassignRegion} 
                    disabled={
                      loading || 
                      !reassignData.region_id || 
                      (selectedAdmin?.region_id && reassignData.region_id === selectedAdmin.region_id)
                    }
                  >
                    Reassign Region
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Tabs>
      </div>
    </DashboardLayout>
  );
} 