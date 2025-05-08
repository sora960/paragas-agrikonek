import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Loader2, MapPin, ArrowUpDown, Search } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { LayoutDashboard, DollarSign, Users } from "lucide-react";

// Interface for region data
interface RegionData {
  id: string;
  name: string;
  code?: string;
  status?: string;
  priority?: string;
  island_group_id?: string;
  organization_count?: number;
  farmer_count?: number;
  budget_allocation?: number;
  admins?: RegionalAdmin[];
}

// Interface for regional admin data
interface RegionalAdmin {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
}

// Interface for island group data
interface IslandGroup {
  id: string;
  name: string;
}

export default function SuperAdminRegions() {
  const [regions, setRegions] = useState<RegionData[]>([]);
  const [filteredRegions, setFilteredRegions] = useState<RegionData[]>([]);
  const [islandGroups, setIslandGroups] = useState<IslandGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [selectedIslandGroup, setSelectedIslandGroup] = useState<string>("all");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [searchTerm, setSearchTerm] = useState("");
  const [regionsWithAdmins, setRegionsWithAdmins] = useState<Record<string, RegionalAdmin[]>>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchIslandGroups();
    fetchRegions();
  }, []);

  // Apply filters and sorting whenever regions, selectedIslandGroup, sortDirection, or searchTerm changes
  useEffect(() => {
    applyFiltersAndSort();
  }, [regions, selectedIslandGroup, sortDirection, searchTerm]);

  // Fetch regional admins when regions change
  useEffect(() => {
    fetchRegionalAdmins();
  }, [regions]);

  const fetchIslandGroups = async () => {
    try {
      const { data, error } = await supabase
        .from("island_groups")
        .select("*")
        .order("name");
      
      if (error) throw error;
      setIslandGroups(data || []);
    } catch (err: any) {
      console.error("Error fetching island groups:", err);
      toast({
        title: "Error",
        description: "Failed to load island groups data",
        variant: "destructive"
      });
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...regions];
    
    // Apply search filter
    if (searchTerm) {
      const lowercaseSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(region => 
        region.name.toLowerCase().includes(lowercaseSearch) || 
        (region.code && region.code.toLowerCase().includes(lowercaseSearch))
      );
    }
    
    // Apply island group filter
    if (selectedIslandGroup !== "all") {
      filtered = filtered.filter(region => region.island_group_id === selectedIslandGroup);
    }
    
    // Filter out island groups (Luzon, Visayas, Mindanao) by name
    const islandGroupNames = ["Luzon", "Visayas", "Mindanao"];
    filtered = filtered.filter(region => !islandGroupNames.includes(region.name));
    
    // Apply organization count sorting - explicitly use numeric sorting
    filtered = [...filtered].sort((a, b) => {
      const countA = Number(a.organization_count || 0);
      const countB = Number(b.organization_count || 0);
      
      if (sortDirection === "asc") {
        return countA - countB;
      } else {
        return countB - countA;
      }
    });
    
    // Add admin information to each region
    filtered = filtered.map(region => ({
      ...region,
      admins: regionsWithAdmins[region.id] || []
    }));
    
    setFilteredRegions(filtered);
  };

  const toggleSortDirection = () => {
    setSortDirection(prev => prev === "asc" ? "desc" : "asc");
  };

  const fetchRegionalAdmins = async () => {
    if (regions.length === 0) return;
    
    setLoadingAdmins(true);
    try {
      const { data, error } = await supabase
        .from('user_regions')
        .select(`
          id,
          region_id,
          users:user_id (
            id, 
            first_name, 
            last_name, 
            email,
            status
          )
        `)
        .in('region_id', regions.map(r => r.id));
        
      if (error) {
        console.error("Error fetching regional admins:", error);
        return;
      }
      
      // Group admins by region
      const adminsByRegion: Record<string, RegionalAdmin[]> = {};
      
      data?.forEach((item: any) => {
        const admin: RegionalAdmin = {
          id: item.id,
          user_id: item.users.id,
          first_name: item.users.first_name,
          last_name: item.users.last_name,
          email: item.users.email,
          status: item.users.status
        };
        
        if (!adminsByRegion[item.region_id]) {
          adminsByRegion[item.region_id] = [];
        }
        
        adminsByRegion[item.region_id].push(admin);
      });
      
      setRegionsWithAdmins(adminsByRegion);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoadingAdmins(false);
    }
  };

  const fetchRegions = async () => {
    setLoading(true);
    try {
      // Fetch all regions with island_group_id
      const { data: regionsData, error: regionsError } = await supabase
        .from("regions")
        .select("*")
        .order("name");
        
      if (regionsError) throw regionsError;
      
      // First, fetch all organizations
      const { data: orgsData, error: orgsError } = await supabase
        .from("organizations")
        .select("region_id");
        
      if (orgsError) throw orgsError;
      
      // Then manually count by region_id
      const orgCounts: Record<string, number> = {};
      orgsData?.forEach(org => {
        if (org.region_id) {
          orgCounts[org.region_id] = (orgCounts[org.region_id] || 0) + 1;
        }
      });
      
      // Fetch budget allocations for regions
      const { data: budgetData, error: budgetError } = await supabase
        .from("region_budgets")
        .select("region_id, amount")
        .eq("fiscal_year", new Date().getFullYear());
        
      if (budgetError) throw budgetError;
      
      // Combine data
      const enhancedRegions = regionsData.map((region: any) => {
        // Get organization count for this region
        const orgCount = orgCounts[region.id] || 0;
        
        // Find budget allocation for this region
        const budget = budgetData?.find((b: any) => b.region_id === region.id);
        
        return {
          ...region,
          organization_count: orgCount,
          budget_allocation: budget ? budget.amount : 0
        };
      });
      
      setRegions(enhancedRegions);
    } catch (err: any) {
      console.error("Error fetching regions:", err);
      toast({
        title: "Error",
        description: "Failed to load regions data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Get the initials from a name
  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return "??";
    return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase();
  };

  const handleCreateRegion = () => {
    // Will be implemented in a future version
    toast({
      title: "Coming Soon",
      description: "Region creation will be implemented in a future update."
    });
  };

  // Navigate to a specific region dashboard
  const handleViewRegion = (regionId: string) => {
    navigate(`/superadmin/regions/${regionId}`);
  };

  // Navigate to the budget management page for a specific region
  const handleManageBudget = (regionId: string) => {
    navigate(`/superadmin/regions/budget/${regionId}`);
  };

  return (
    <DashboardLayout userRole="superadmin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Philippine Regions</h1>
            <p className="text-muted-foreground mt-2">
              Manage regions and their budget allocations
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={fetchRegions} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Refresh
            </Button>
            <Button onClick={handleCreateRegion}>
              <MapPin className="mr-2 h-4 w-4" />
              Add Region
            </Button>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList>
            <TabsTrigger value="dashboard">Regional Dashboards</TabsTrigger>
            <TabsTrigger value="management">Region Management</TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col space-y-2 sm:flex-row sm:justify-between sm:space-y-0">
                  <div>
                    <CardTitle>Philippine Regions</CardTitle>
                    <CardDescription>All administrative regions with their current status</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-3 sm:flex-nowrap">
                    <div className="relative w-full sm:w-[200px]">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search regions..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    
                    <Select
                      value={selectedIslandGroup}
                      onValueChange={setSelectedIslandGroup}
                    >
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="All Island Groups" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Island Groups</SelectItem>
                        {islandGroups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleSortDirection}
                      className="flex items-center gap-1 whitespace-nowrap h-10"
                    >
                      <span>Orgs {sortDirection === "asc" ? "↑" : "↓"}</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center items-center h-[200px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Region Name</TableHead>
                        <TableHead>Administrators</TableHead>
                        <TableHead>Organizations</TableHead>
                        <TableHead>Budget Allocation</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRegions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            {searchTerm ? "No regions match your search criteria." : "No regions found. Please create regions first."}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredRegions.map((region) => (
                          <TableRow key={region.id}>
                            <TableCell className="font-medium">{region.code || "N/A"}</TableCell>
                            <TableCell>{region.name}</TableCell>
                            <TableCell>
                              {loadingAdmins ? (
                                <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                              ) : region.admins && region.admins.length > 0 ? (
                                <div className="flex -space-x-2">
                                  <TooltipProvider>
                                    {region.admins.slice(0, 3).map((admin, index) => (
                                      <Tooltip key={admin.id}>
                                        <TooltipTrigger asChild>
                                          <Avatar className={`h-8 w-8 border-2 border-background ${admin.status !== 'active' ? 'opacity-50' : ''}`}>
                                            <AvatarFallback className="bg-primary text-xs">
                                              {getInitials(admin.first_name, admin.last_name)}
                                            </AvatarFallback>
                                          </Avatar>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom">
                                          <p>{admin.first_name} {admin.last_name}</p>
                                          <p className="text-xs text-muted-foreground">{admin.email}</p>
                                          <p className="text-xs text-muted-foreground">
                                            Status: {admin.status === 'active' ? 'Active' : 'Inactive'}
                                          </p>
                                        </TooltipContent>
                                      </Tooltip>
                                    ))}
                                    
                                    {region.admins.length > 3 && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Avatar className="h-8 w-8 border-2 border-background">
                                            <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                                              +{region.admins.length - 3}
                                            </AvatarFallback>
                                          </Avatar>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom">
                                          <p>{region.admins.length - 3} more administrators</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                  </TooltipProvider>
                                </div>
                              ) : (
                                <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                                  No admins assigned
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>{region.organization_count || 0}</TableCell>
                            <TableCell>
                              {region.budget_allocation 
                                ? `₱ ${region.budget_allocation.toLocaleString()}`
                                : "Not allocated"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleViewRegion(region.id)}
                                >
                                  <LayoutDashboard className="h-4 w-4 mr-1" />
                                  Dashboard
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleManageBudget(region.id)}
                                >
                                  <DollarSign className="h-4 w-4 mr-1" />
                                  Budget
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate(`/superadmin/user-management?tab=regional-admins&region=${region.id}`)}
                                >
                                  <Users className="h-4 w-4 mr-1" />
                                  Admins
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
          </TabsContent>
          
          <TabsContent value="management" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Region Management</CardTitle>
                <CardDescription>
                  Create, update, and manage Philippine regions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  Region management features will be implemented in a future update.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
