import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import UserManagementTable from "@/components/admin/UserManagementTable";
import OrganizationAdminsTable from "@/components/admin/OrganizationAdminsTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Pencil, Eye, Ban, CheckCircle, MoreHorizontal, MapPin, User, Users, Wrench, AlertTriangle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { assignRegionalAdmin } from "@/utils/directDatabaseAccess";
import { fixUserRegionsPermissions, checkUserRegionsRLS } from "@/utils/fixUserRegionsPermissions";

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
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
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

  // Add this new state
  const [loadingSelectedRegion, setLoadingSelectedRegion] = useState(false);

  // Add a new state to store available users
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Fetch data when tab changes
  useEffect(() => {
    if (activeTab === "regional-admins") {
      // First fetch available regions to ensure they're loaded for filtering
      fetchAvailableRegions().then(() => {
        // Then fetch the regional admins
        fetchRegionalAdmins();
        
        // Check URL params after tab change
        const searchParams = new URLSearchParams(location.search);
        const regionParam = searchParams.get('region');
        
        if (regionParam) {
          setRegionFilter(regionParam);
          findAndSetSelectedRegion(regionParam);
        }
      });
    }
  }, [activeTab]);

  // Watch for URL changes to handle region parameter
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    const regionParam = searchParams.get('region');
    
    // Set active tab from URL parameter if present
    if (tabParam === 'regional-admins') {
      setActiveTab('regional-admins');
      
      // If a region ID is specified, set it as the filter and in the form
      if (regionParam) {
        setRegionFilter(regionParam);
        setFormData(prev => ({ ...prev, region_id: regionParam }));
        
        // Directly open the dialog when we have URL params
        // This ensures it opens even on direct navigation
        setTimeout(() => {
          // Make sure regions are loaded before trying to find the selected one
          fetchAvailableRegions().then(() => {
            findAndSetSelectedRegion(regionParam);
          });
        }, 100);
      }
    }
  }, [location.search]);

  // Find and set the selected region details
  const findAndSetSelectedRegion = async (regionId: string) => {
    setLoadingSelectedRegion(true);
    try {
      // First fetch the region directly to ensure we have the data
      const { data, error } = await supabase
        .from('regions')
        .select('id, name, code')
        .eq('id', regionId)
        .single();
        
      if (error) throw error;
      
      if (data) {
        // Set the region and open modal immediately
        setSelectedRegion(data);
        setFormData(prev => ({ ...prev, region_id: regionId }));
        setShowCreateRegionalAdminModal(true);
      }
    } catch (err) {
      console.error("Error fetching region details:", err);
      toast({
        title: "Error",
        description: "Could not load region information",
        variant: "destructive"
      });
    } finally {
      setLoadingSelectedRegion(false);
    }
  };

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
      // In development mode, we'll handle user creation manually
      // 1. Check if a user with this email already exists
      const { data: existingUser, error: checkError } = await supabase
        .from("users")
        .select("id, email")
        .eq("email", formData.email)
        .maybeSingle();
        
      let userId;
      
      if (existingUser) {
        console.log("User already exists, using existing user");
        userId = existingUser.id;
      } else {
        // 2. Create the user directly in the users table
        const { data: newUser, error: insertError } = await supabase
          .from("users")
          .insert({
            email: formData.email,
            first_name: formData.first_name,
            last_name: formData.last_name,
            role: "regional_admin",
            status: "active"
          })
          .select("id")
          .single();
          
        if (insertError) throw insertError;
        userId = newUser.id;
      }
      
      // Skip auth.signUp in development mode, just associate with region
      const { error: regionError } = await supabase
        .from("user_regions")
        .insert({
          user_id: userId,
          region_id: formData.region_id
        });
        
      if (regionError) throw regionError;
      
      // Save the created region ID for the success message
      const createdRegionId = formData.region_id;
      const regionName = availableRegions.find(r => r.id === createdRegionId)?.name || "the region";
      
      // Success
      toast({
        title: "Success",
        description: `Regional administrator created successfully for ${regionName} (Development Mode)`
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
      
      // Show success notification with options
      if (regionFilter !== "all" && regionFilter === createdRegionId) {
        // Add a success notification with action
        toast({
          title: "Administrator Assigned",
          description: (
            <div className="flex flex-col gap-2">
              <p>Administrator successfully assigned to {regionName}</p>
              <div className="flex gap-2 mt-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8" 
                  onClick={() => navigate(`/superadmin/regions/${createdRegionId}`)}
                >
                  Go to Region Dashboard
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8" 
                  onClick={() => navigate("/superadmin/regions")}
                >
                  View All Regions
                </Button>
              </div>
            </div>
          ),
          duration: 10000, // Show for 10 seconds
        });
      }
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
      
      // Get the new region name for the success message
      const newRegion = availableRegions.find(r => r.id === reassignData.region_id);
      const newRegionName = newRegion?.name || "the new region";
      
      // Update the user's region assignment
      const { error: updateError } = await supabase
        .from("user_regions")
        .update({ region_id: reassignData.region_id })
        .eq("id", selectedAdmin.id);
        
      if (updateError) throw updateError;
      
      // Success
      toast({
        title: "Success",
        description: `Administrator ${selectedAdmin.first_name} ${selectedAdmin.last_name} reassigned to ${newRegionName} successfully`
      });
      
      // Close modal and refresh the list
      setShowReassignRegionModal(false);
      fetchRegionalAdmins();
      
      // Show success notification with options
      if (reassignData.region_id !== selectedAdmin.region_id) {
        toast({
          title: "Region Reassigned",
          description: (
            <div className="flex flex-col gap-2">
              <p>
                Administrator has been moved from <span className="font-medium">{selectedAdmin.region_name}</span> to <span className="font-medium">{newRegionName}</span>
              </p>
              <div className="flex gap-2 mt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => navigate(`/superadmin/regions/${reassignData.region_id}`)}
                >
                  Go to New Region
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={() => setRegionFilter(reassignData.region_id)}
                >
                  Filter by New Region
                </Button>
              </div>
            </div>
          ),
          duration: 8000, // Show for 8 seconds
        });
      }
      
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

  // Add a function to fetch available users that could be assigned as regional admins
  const fetchAvailableUsers = async () => {
    setLoadingUsers(true);
    try {
      // Get only users with regional_admin role who are not already assigned to any region
      const { data: users, error } = await supabase
        .from("users")
        .select("id, first_name, last_name, email, role, status")
        .eq("role", "regional_admin") // Only get regional_admin users
        .eq("status", "active")       // Only get active users
        .order("first_name");
        
      if (error) {
        console.error("Error fetching users:", error);
        throw error;
      }

      // Add a log to see what users we got
      console.log("Fetched regional admin users:", users?.length || 0);

      // Filter to users that are not already assigned to regions
      const { data: assignedUsers, error: assignedError } = await supabase
        .from("user_regions")
        .select("user_id");
        
      if (assignedError) {
        console.error("Error fetching assigned users:", assignedError);
        throw assignedError;
      }
      
      console.log("Fetched assigned users:", assignedUsers?.length || 0);
      
      // Filter out users who are already assigned
      const assignedUserIds = assignedUsers.map(au => au.user_id);
      const availableForAssignment = users.filter(user => 
        !assignedUserIds.includes(user.id)
      );
      
      console.log("Available for assignment:", availableForAssignment.length);
      setAvailableUsers(availableForAssignment);
    } catch (err) {
      console.error("Error fetching available users:", err);
      toast({
        title: "Error",
        description: "Failed to load available regional admin users",
        variant: "destructive"
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  // Add a function to assign an existing user as a regional admin
  const handleAssignExistingUser = async () => {
    if (!selectedUserId || !formData.region_id) {
      toast({
        title: "Error",
        description: "Please select both a user and a region",
        variant: "destructive",
      });
      return;
    }
    
    setCreating(true);
    
    try {
      console.log("Assigning user", selectedUserId, "to region", formData.region_id);
      
      // Use our utility function that handles all the edge cases
      const result = await assignRegionalAdmin(selectedUserId, formData.region_id);
      
      if (!result.success) {
        console.error("Error assigning regional admin:", result.message);
        toast({
          title: "Error",
          description: result.message || "Failed to assign Regional Admin",
          variant: "destructive",
        });
        setCreating(false);
        return;
      }
      
      // Find user details for the success message
      const user = availableUsers.find(u => u.id === selectedUserId);
      const regionName = availableRegions.find(r => r.id === formData.region_id)?.name || "the region";
      
      console.log("Assignment successful");
      
      // Success
      toast({
        title: "Success",
        description: `${user?.first_name} ${user?.last_name} assigned as Regional Admin for ${regionName}`
      });
      
      // Reset form and close modal
      setSelectedUserId("");
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
      
      // Show success notification with options
      toast({
        title: "Regional Admin Assigned",
        description: (
          <div className="flex flex-col gap-2">
            <p>Regional Admin successfully assigned to {regionName}</p>
            <div className="flex gap-2 mt-1">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8" 
                onClick={() => navigate(`/superadmin/regions/${formData.region_id}`)}
              >
                Go to Region Dashboard
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8" 
                onClick={() => navigate("/superadmin/regions")}
              >
                View All Regions
              </Button>
            </div>
          </div>
        ),
        duration: 10000,
      });
      
    } catch (err: any) {
      console.error("Error assigning regional admin:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to assign Regional Admin",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  // Update useEffect to fetch users when needed
  useEffect(() => {
    if (showCreateRegionalAdminModal) {
      fetchAvailableUsers();
    }
  }, [showCreateRegionalAdminModal]);

  // Add a filtered users state based on search term
  const filteredUsers = useMemo(() => {
    if (!userSearchTerm) return availableUsers;
    
    return availableUsers.filter(user => 
      user.first_name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.last_name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearchTerm.toLowerCase())
    );
  }, [availableUsers, userSearchTerm]);

  // Check authentication on component mount
  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        // Check if user is logged in via custom auth
        const userStr = localStorage.getItem('user');
        if (!userStr) {
          console.warn("No user found in localStorage");
        } else {
          console.log("User found in localStorage");
        }
      } catch (error) {
        console.error("Error checking authentication:", error);
      }
    };
    
    checkAuthentication();
  }, []);

  // Add a new state for RLS status
  const [rlsStatus, setRlsStatus] = useState<{ enabled: boolean, message: string } | null>(null);
  const [fixingPermissions, setFixingPermissions] = useState(false);

  // Check RLS status on component mount
  useEffect(() => {
    const checkRLS = async () => {
      const status = await checkUserRegionsRLS();
      setRlsStatus(status);
    };
    checkRLS();
  }, []);

  // Function to fix permissions
  const handleFixPermissions = async () => {
    setFixingPermissions(true);
    try {
      const success = await fixUserRegionsPermissions();
      if (success) {
        toast({
          title: "Success",
          description: "User regions permissions fixed successfully.",
        });
        // Re-check the status
        const status = await checkUserRegionsRLS();
        setRlsStatus(status);
      } else {
        toast({
          title: "Error",
          description: "Failed to fix permissions. Try running the SQL script manually.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fixing permissions:", error);
      toast({
        title: "Error",
        description: "An error occurred while fixing permissions.",
        variant: "destructive",
      });
    } finally {
      setFixingPermissions(false);
    }
  };

  return (
    <DashboardLayout userRole="superadmin">
      <div className="space-y-6">
        {/* RLS Status Banner */}
        {rlsStatus?.enabled && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-4 flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
              <div>
                <h3 className="font-medium text-amber-800">Permissions Issue Detected</h3>
                <p className="text-amber-700 text-sm">{rlsStatus.message}</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleFixPermissions}
              disabled={fixingPermissions}
              className="bg-amber-100 border-amber-300 hover:bg-amber-200"
            >
              {fixingPermissions ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Fixing...
                </>
              ) : (
                <>
                  <Wrench className="h-4 w-4 mr-2" />
                  Fix Permissions
                </>
              )}
            </Button>
          </div>
        )}

        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage user accounts and permissions across the platform
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
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
                  <CardDescription>
                    {regionFilter !== "all" ? 
                      `Manage administrators for ${availableRegions.find(r => r.id === regionFilter)?.name || "selected region"}` : 
                      "Assign and manage administrators for specific regions"}
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => setShowCreateRegionalAdminModal(true)}
                  className={regionFilter !== "all" ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  <Users className="h-4 w-4 mr-2" />
                  {regionFilter !== "all" ? 
                    `Assign Admin to ${availableRegions.find(r => r.id === regionFilter)?.name?.split(' ').pop() || "Region"}` : 
                    "Assign Regional Admin"}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="region-filter">Filter by region:</Label>
                    <Select value={regionFilter} onValueChange={setRegionFilter}>
                      <SelectTrigger className="w-[240px]">
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Regions</SelectItem>
                        {availableRegions.map((region) => (
                          <SelectItem key={region.id} value={region.id}>
                            {region.name} {region.code ? `(${region.code})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="admin-search">Search:</Label>
                    <Input
                      id="admin-search"
                      placeholder="Search by name or email"
                      value={adminSearchTerm}
                      onChange={(e) => setAdminSearchTerm(e.target.value)}
                      className="w-[240px]"
                    />
                  </div>
                </div>
                
                {loading ? (
                  <div className="flex justify-center items-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : regionalAdmins.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
                    <h3 className="text-lg font-medium mb-1">No Regional Administrators</h3>
                    <p className="text-muted-foreground mb-4">
                      Start by assigning administrators to regions.
                    </p>
                    <Button 
                      onClick={() => setShowCreateRegionalAdminModal(true)}
                      variant="outline"
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Assign Regional Admin
                    </Button>
                  </div>
                ) : (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Region</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {regionalAdmins
                          .filter(admin => 
                            // Region filter
                            (regionFilter === "all" || admin.region_id === regionFilter) &&
                            // Search filter
                            (adminSearchTerm === "" || 
                              admin.first_name.toLowerCase().includes(adminSearchTerm.toLowerCase()) ||
                              admin.last_name.toLowerCase().includes(adminSearchTerm.toLowerCase()) ||
                              admin.email.toLowerCase().includes(adminSearchTerm.toLowerCase()) ||
                              admin.region_name.toLowerCase().includes(adminSearchTerm.toLowerCase()))
                          )
                          .map((admin) => (
                            <TableRow key={admin.id}>
                              <TableCell>
                                <div className="font-medium">
                                  {admin.first_name} {admin.last_name}
                                </div>
                              </TableCell>
                              <TableCell>{admin.email}</TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
                                  <span>{admin.region_name}</span>
                                  {admin.region_code && (
                                    <Badge variant="outline" className="ml-2">
                                      {admin.region_code}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={admin.status === "active" ? "success" : "secondary"}
                                >
                                  {admin.status === "active" ? (
                                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                  ) : (
                                    <Ban className="h-3.5 w-3.5 mr-1" />
                                  )}
                                  {admin.status === "active" ? "Active" : "Inactive"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                      <span className="sr-only">Open menu</span>
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEditRegionalAdmin(admin)}>
                                      <Pencil className="h-4 w-4 mr-2" />
                                      Reassign Region
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleViewRegion(admin.region_id)}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      View Region
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleToggleStatus(admin)}>
                                      {admin.status === "active" ? (
                                        <>
                                          <Ban className="h-4 w-4 mr-2" />
                                          Deactivate
                                        </>
                                      ) : (
                                        <>
                                          <CheckCircle className="h-4 w-4 mr-2" />
                                          Activate
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="org-admins">
            <OrganizationAdminsTable />
          </TabsContent>
          
          <TabsContent value="farmers">
            <p>Farmers management interface</p>
          </TabsContent>
          
          <TabsContent value="audit-logs">
            <p>Audit logs interface</p>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}