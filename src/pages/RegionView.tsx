import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { CalendarIcon, DollarSign, Building2, ArrowLeft, Loader2, Users, ChevronRight, Search, RefreshCw, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { assignRegionalAdmin } from "@/utils/directDatabaseAccess";

interface AdminUser {
  id: string;
  email: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  status?: string;
}

interface RegionalAdminAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  regionId: string;
  regionName: string;
  onAdminAssigned: () => void;
}

function RegionalAdminAssignDialog({ 
  open, 
  onOpenChange, 
  regionId, 
  regionName,
  onAdminAssigned 
}: RegionalAdminAssignDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [availableAdmins, setAvailableAdmins] = useState<AdminUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loadingAvailableAdmins, setLoadingAvailableAdmins] = useState(false);
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadAvailableAdmins();
    }
  }, [open]);

  const loadAvailableAdmins = async () => {
    setLoadingAvailableAdmins(true);
    setAvailableAdmins([]);
    
    try {
      // Get users that are regional admins and not already assigned
      const { data, error } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, role, status')
        .eq('status', 'active')
        .eq('role', 'regional_admin')
        .order('email');
        
      if (error) {
        throw error;
      }
      
      // Get all assigned regional admins
      const { data: assignedAdmins, error: assignedError } = await supabase
        .from('user_regions')
        .select('user_id');
      const assignedIds = new Set((assignedAdmins || []).map(a => a.user_id));
      
      // Only show regional_admins not already assigned
      const availableUsers = data.filter(user => !assignedIds.has(user.id));
      
      // Format user data
      const formattedUsers = availableUsers.map(user => ({
        id: user.id,
        email: user.email,
        full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        status: user.status
      }));
      
      setAvailableAdmins(formattedUsers);
    } catch (error) {
      console.error("Error loading available users:", error);
      toast({
        title: "Error",
        description: "Failed to load available users",
        variant: "destructive",
      });
    } finally {
      setLoadingAvailableAdmins(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const assignAdmin = async (userId: string) => {
    setAssigningUserId(userId);
    
    try {
      const result = await assignRegionalAdmin(userId, regionId);
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Regional administrator assigned successfully",
        });
        onAdminAssigned();
        onOpenChange(false);
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to assign regional administrator",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error assigning regional admin:", error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setAssigningUserId(null);
    }
  };

  // Filter admins based on search term
  const filteredAdmins = searchTerm.trim() === '' 
    ? availableAdmins 
    : availableAdmins.filter(admin => 
        admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (admin.full_name && admin.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign Regional Administrator</DialogTitle>
          <DialogDescription>
            Select a user to assign as administrator for {regionName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex justify-between items-center">
            <Label>Available Users</Label>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadAvailableAdmins}
              disabled={loadingAvailableAdmins}
            >
              <RefreshCw className={`h-4 w-4 ${loadingAvailableAdmins ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Search by name or email"
              value={searchTerm}
              onChange={handleSearch}
            />
            <Button variant="outline" size="icon">
              <Search className="h-4 w-4" />
            </Button>
          </div>
          
          {loadingAvailableAdmins ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredAdmins.length === 0 ? (
            <div className="text-center py-2 text-muted-foreground border rounded-md p-4">
              {searchTerm ? "No matching users found" : "No available users found"}
            </div>
          ) : (
            <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-md p-2">
              {filteredAdmins.map((admin) => (
                <div
                  key={admin.id}
                  className="flex items-center justify-between p-2 border rounded-md"
                >
                  <div>
                    <p className="font-medium">{admin.full_name || "Unnamed User"}</p>
                    <p className="text-sm text-muted-foreground">{admin.email}</p>
                    {admin.role && (
                      <Badge variant="outline" className="mt-1 text-xs">
                        {admin.role === 'org_admin' || admin.role === 'organization_admin' 
                          ? 'Organization Admin' 
                          : admin.role}
                      </Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => assignAdmin(admin.id)}
                    disabled={assigningUserId === admin.id}
                  >
                    {assigningUserId === admin.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

export default function RegionView() {
  const { regionId } = useParams();
  const navigate = useNavigate();
  const [region, setRegion] = useState<any>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [activeTab, setActiveTab] = useState("overview");
  const [totalBudget, setTotalBudget] = useState(0);
  const [allocatedBudget, setAllocatedBudget] = useState(0);
  const [activeOrgs, setActiveOrgs] = useState(0);
  const [totalFarmers, setTotalFarmers] = useState(0);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Function to fetch region data
  const fetchRegionData = useCallback(async () => {
    if (!regionId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch region details
      const { data: regionData, error: regionError } = await supabase
        .from("regions")
        .select("*")
        .eq("id", regionId)
        .single();
        
      if (regionError) throw regionError;
      
      // Fetch regional administrator if assigned
      const { data: adminData, error: adminError } = await supabase
        .from("user_regions")
        .select(`
          id,
          users:user_id (
            id, 
            first_name, 
            last_name, 
            email,
            status
          )
        `)
        .eq('region_id', regionId)
        .single();
        
      if (!adminError && adminData && adminData.users) {
        // Add admin information to region data
        const userData = adminData.users as any;
        regionData.admin = {
          id: userData.id,
          name: `${userData.first_name} ${userData.last_name}`,
          email: userData.email,
          status: userData.status
        };
      }
      
      setRegion(regionData);
      
      // Fetch provinces in this region
      const { data: provinceData, error: provinceError } = await supabase
        .from("provinces")
        .select("*")
        .eq("region_id", regionId);
        
      if (provinceError) throw provinceError;
      setProvinces(provinceData || []);
      
      // Fetch organizations in this region
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("region_id", regionId);
        
      if (orgError) throw orgError;
      setOrganizations(orgData || []);
      setActiveOrgs(orgData?.filter(org => org.status === 'active').length || 0);
      
      // Calculate total farmers
      const totalFarmers = orgData?.reduce((sum, org) => sum + (org.member_count || 0), 0) || 0;
      setTotalFarmers(totalFarmers);
      
      // Fetch region budget
      const { data: budgetData, error: budgetError } = await supabase
        .from("region_budgets")
        .select("amount")
        .eq("region_id", regionId)
        .single();
        
      if (!budgetError && budgetData) {
        setTotalBudget(budgetData.amount);
      }
      
      // Try to fetch organization budgets, but handle the case where the table doesn't exist yet
      try {
        const { data: orgBudgets, error: orgBudgetError } = await supabase
          .from("organization_budgets")
          .select("total_allocation")
          .in("organization_id", orgData?.map(org => org.id) || []);
          
        if (orgBudgetError) {
          // If the error is about the table not existing, just set allocated budget to 0
          if (orgBudgetError.message?.includes('relation "organization_budgets" does not exist') ||
              orgBudgetError.message?.includes('Could not find a relationship between')) {
            console.warn("organization_budgets table does not exist yet, setting allocated budget to 0");
            setAllocatedBudget(0);
          } else {
            // For other errors, log them but don't throw (non-critical feature)
            console.error("Error fetching organization budgets:", orgBudgetError);
            setAllocatedBudget(0);
          }
        } else if (orgBudgets) {
          // Successfully got the budget data
          const totalAllocated = orgBudgets.reduce((sum, budget) => sum + (budget.total_allocation || 0), 0);
          setAllocatedBudget(totalAllocated);
        }
      } catch (err) {
        // Catch any unexpected errors
        console.error("Unexpected error fetching organization budgets:", err);
        setAllocatedBudget(0);
      }
    } catch (err: any) {
      console.error("Error fetching region data:", err);
      setError(err.message || "Failed to load region data");
      toast({
        title: "Error",
        description: "Failed to load region data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [regionId, selectedYear, toast, setRegion, setProvinces, setOrganizations, setActiveOrgs, setTotalFarmers, setTotalBudget, setAllocatedBudget, setError, setLoading]);

  useEffect(() => {
    if (!regionId) {
      setError("No region ID provided");
      return;
    }

    fetchRegionData();
  }, [fetchRegionData]);

  // Navigate back to regions list
  const handleBack = () => {
    navigate("/superadmin/regions");
  };

  // Navigate to budget management for this region
  const handleManageBudget = () => {
    navigate(`/superadmin/regions/budget/${regionId}`);
  };

  // View an organization
  const handleViewOrganization = (orgId: string) => {
    navigate(`/superadmin/organizations/${orgId}`);
  };

  if (loading && !region) {
    return (
      <DashboardLayout userRole="superadmin">
        <div className="flex justify-center items-center h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (error && !region) {
    return (
      <DashboardLayout userRole="superadmin">
        <div className="p-8">
          <Button variant="outline" onClick={handleBack} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Regions
          </Button>
          <Card>
            <CardContent className="pt-6">
              <div className="bg-destructive/10 text-destructive p-4 rounded-md">
                {error}
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="superadmin">
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{region?.name}</h1>
              <div className="flex items-center text-sm text-muted-foreground">
                <span>Regions</span>
                <ChevronRight className="mx-1 h-4 w-4" />
                <span>{region?.name}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(Number(value))}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button onClick={handleManageBudget}>
              <DollarSign className="mr-2 h-4 w-4" />
              Manage Budget
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Regional Budget</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₱ {totalBudget.toLocaleString()}</div>
              <div className="mt-2 flex items-center text-xs text-muted-foreground">
                <span className="font-medium">
                  {totalBudget > 0 ? 
                    `${((allocatedBudget / totalBudget) * 100).toFixed(1)}% allocated` : 
                    "No budget set"}
                </span>
              </div>
              <Progress 
                value={totalBudget > 0 ? (allocatedBudget / totalBudget) * 100 : 0} 
                className="h-2 mt-1"
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Organizations</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{organizations.length}</div>
              <p className="text-xs text-muted-foreground">
                {activeOrgs} active organizations
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Farmers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalFarmers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Across all organizations
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="organizations">Organizations</TabsTrigger>
            <TabsTrigger value="budget">Budget</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Region Overview</CardTitle>
                <CardDescription>
                  Key information about {region?.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h3 className="font-medium mb-2">Region Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-muted-foreground">Region Code:</span>
                        <span className="font-medium">{region?.code}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-muted-foreground">Priority:</span>
                        <Badge variant={region?.priority === 'high' ? 'default' : 'secondary'}>
                          {region?.priority}
                        </Badge>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-muted-foreground">Created:</span>
                        <span>{new Date(region?.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">Budget Status ({selectedYear})</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-muted-foreground">Total Budget:</span>
                        <span className="font-medium">₱ {totalBudget.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-muted-foreground">Allocated to Orgs:</span>
                        <span>₱ {allocatedBudget.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-muted-foreground">Remaining:</span>
                        <span className={`font-medium ${totalBudget - allocatedBudget < 0 ? 'text-destructive' : ''}`}>
                          ₱ {Math.max(0, totalBudget - allocatedBudget).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="font-medium mb-2">Regional Administrator</h3>
                  {region?.admin ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{region.admin.name}</p>
                        <p className="text-sm text-muted-foreground">{region.admin.email}</p>
                        <Badge variant={region.admin.status === 'active' ? 'default' : 'secondary'} className="mt-1">
                          {region.admin.status}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            navigate(`/superadmin/user-profile/${region.admin.id}`);
                          }}
                        >
                          View Profile
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            toast({
                              title: "Changing Region Admin",
                              description: `Navigating to manage administrators for ${region?.name}`,
                              duration: 3000
                            });
                            navigate(`/superadmin/user-management?tab=regional-admins&region=${regionId}`);
                          }}
                        >
                          <Users className="h-4 w-4 mr-1" />
                          Change Admin
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-muted/50 p-4 rounded-md text-center">
                      <p className="text-muted-foreground mb-2">No regional administrator assigned</p>
                      <Button 
                        size="sm"
                        onClick={() => setIsAssignDialogOpen(true)}
                      >
                        <Users className="h-4 w-4 mr-1" />
                        Assign Administrator
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="organizations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Organizations</CardTitle>
                <CardDescription>
                  Organizations operating in {region?.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {organizations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No organizations found in this region
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Members</TableHead>
                        <TableHead>Budget Allocation</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {organizations.map(org => (
                        <TableRow key={org.id}>
                          <TableCell className="font-medium">{org.name}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={org.status === 'active' ? 'default' : 'secondary'}
                              className={org.status === 'active' ? 'bg-green-500' : ''}
                            >
                              {org.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{org.member_count || 0}</TableCell>
                          <TableCell>
                            {org.organization_budgets?.length > 0 
                              ? `₱ ${org.organization_budgets[0].total_allocation?.toLocaleString() || '0'}` 
                              : '₱ 0'
                            }
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewOrganization(org.id)}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {organizations.length} organizations
                </div>
                <Button size="sm">Add Organization</Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="budget" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Budget Management</CardTitle>
                <CardDescription>
                  Budget allocation for {region?.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-medium mb-1">Fiscal Year {selectedYear}</h3>
                    <p className="text-sm text-muted-foreground">Budget allocation and utilization</p>
                  </div>
                  <Button onClick={handleManageBudget}>Manage Budget</Button>
                </div>
                
                <div className="bg-muted/50 p-4 rounded-md">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Total Budget</p>
                      <p className="text-2xl font-bold">₱ {totalBudget.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Allocated</p>
                      <p className="text-2xl font-bold">₱ {allocatedBudget.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Remaining</p>
                      <p className="text-2xl font-bold">₱ {Math.max(0, totalBudget - allocatedBudget).toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Allocation Progress</span>
                      <span>{totalBudget > 0 ? ((allocatedBudget / totalBudget) * 100).toFixed(1) + '%' : '0%'}</span>
                    </div>
                    <Progress value={totalBudget > 0 ? (allocatedBudget / totalBudget) * 100 : 0} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Admin Assignment Dialog */}
      <RegionalAdminAssignDialog
        open={isAssignDialogOpen}
        onOpenChange={setIsAssignDialogOpen}
        regionId={regionId || ''}
        regionName={region?.name || ''}
        onAdminAssigned={() => {
          // Refresh the region data to show the newly assigned admin
          if (regionId) {
            fetchRegionData();
          }
        }}
      />
    </DashboardLayout>
  );
} 