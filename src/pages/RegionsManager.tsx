import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { useToast } from "@/components/ui/use-toast";
import { regionService, IslandGroup, Region, Province } from "@/services/regionService";
import { populatePhilippineProvinces } from "@/lib/directSQLHelpers";
import { supabase } from "@/lib/supabase";
import { Loader2, MapPin, Building2, Users, LayoutDashboard, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

// Interface for Organization
interface Organization {
  id: string;
  name: string;
  type: string;
  member_count: number;
  status: string;
  created_at: string;
  contact_person: string;
  contact_email: string;
  region_id?: string;
  province_id?: string;
  island_group_id?: string;
  region_name?: string;
  province_name?: string;
}

// Interface for Supabase raw organization data
interface SupabaseOrganization {
  id: string;
  name: string;
  status: string;
  verification_status: string;
  member_count: number | null;
  created_at: string;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  registration_number: string | null;
  address: string | null;
  allocated_budget: number | null;
  utilized_budget: number | null;
  island_group_id: string | null;
  region_id: string;
  province_id: string | null;
  regions: { name: string } | null;
  provinces: { name: string } | null;
}

export default function RegionsManager() {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // State for data
  const [islandGroups, setIslandGroups] = useState<IslandGroup[]>([]);
  const [allRegions, setAllRegions] = useState<Region[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingOrganizations, setLoadingOrganizations] = useState(false);
  
  // UI state
  const [selectedIslandGroup, setSelectedIslandGroup] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState("regions");
  
  // Scoped statistics - updated based on selection
  const [stats, setStats] = useState({
    totalFarmers: 0,
    totalOrganizations: 0,
    scopeLabel: "All Regions"
  });
  
  // New state for organization search
  const [orgSearchQuery, setOrgSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Organization[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Add a new state for the smart search keyword
  const [smartSearch, setSmartSearch] = useState("");
  
  useEffect(() => {
    loadData();
  }, []);
  
  // Use memoized filtered regions based on island group selection
  const filteredRegions = useMemo(() => {
    if (!selectedIslandGroup) return [];
    return allRegions.filter(region => region.island_group_id === selectedIslandGroup);
  }, [selectedIslandGroup, allRegions]);
  
  const loadData = async () => {
    setLoading(true);
    try {
      // Load island groups
      const islandGroupsData = await regionService.getIslandGroups();
      setIslandGroups(islandGroupsData);
      
      // Load all regions at once
      const regionsData = await regionService.getRegions();
      setAllRegions(regionsData);
      
      // Set zero counts since no farmers or organizations exist yet
      setStats({
        totalFarmers: 0,
        totalOrganizations: 0,
        scopeLabel: "All Regions"
      });
      
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load region data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleIslandGroupChange = (islandGroupId: string) => {
    setSelectedIslandGroup(islandGroupId);
    setSelectedRegion(null);
    setSelectedProvince(null);
    setProvinces([]);
    setRegions(filteredRegions);
    const islandGroup = islandGroups.find(ig => ig.id === islandGroupId);
    setStats({
      totalFarmers: 0,
      totalOrganizations: 0,
      scopeLabel: islandGroup ? `${islandGroup.name} Island Group` : "Selected Island Group"
    });
  };
  
  // Update useEffect to update regions when island group changes
  useEffect(() => {
    if (selectedIslandGroup) {
      setRegions(filteredRegions);
    }
  }, [selectedIslandGroup, filteredRegions]);
  
  const handleRegionChange = async (regionId: string) => {
    setSelectedRegion(regionId);
    setSelectedProvince(null);
    setLoadingProvinces(true);
    try {
      const region = regions.find(r => r.id === regionId);
      setStats({
        totalFarmers: 0,
        totalOrganizations: 0,
        scopeLabel: region ? `${region.name} Region` : "Selected Region"
      });
      const provincesData = await regionService.getProvinces(regionId);
      setProvinces(provincesData);
    } catch (error) {
      console.error("Error loading region data:", error);
      toast({
        title: "Error",
        description: "Failed to load data for this region",
        variant: "destructive"
      });
      setProvinces([]);
    } finally {
      setLoadingProvinces(false);
    }
  };
  
  const handleProvinceChange = async (provinceId: string) => {
    setSelectedProvince(provinceId);
    setLoading(true);
    try {
      const province = provinces.find(p => p.id === provinceId);
      setStats({
        totalFarmers: 0,
        totalOrganizations: 0,
        scopeLabel: province ? `${province.name} Province` : "Selected Province"
      });
    } catch (error) {
      console.error("Error loading province data:", error);
      toast({
        title: "Error",
        description: "Failed to load data for this province",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handlePopulatePhilippineProvinces = async () => {
    setLoading(true);
    try {
      const result = await populatePhilippineProvinces();
      if (result) {
        toast({
          title: "Success",
          description: "Philippine provinces populated successfully!",
        });
        // Refresh the data
        await loadData();
        if (selectedRegion) {
          handleRegionChange(selectedRegion);
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to populate Philippine provinces",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error populating Philippine provinces:', error);
      toast({
        title: "Error",
        description: "An error occurred while populating provinces",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Get current region and province data
  const selectedRegionData = regions.find(r => r.id === selectedRegion);
  const selectedProvinceData = provinces.find(p => p.id === selectedProvince);
  const selectedIslandGroupData = islandGroups.find(ig => ig.id === selectedIslandGroup);
  
  // Add this function to examine the database structure
  const inspectOrganizationsTable = async () => {
    try {
      console.log("Inspecting organizations table structure");
      
      // Get a single row to inspect structure
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .limit(1);
      
      if (error) {
        console.error("Error inspecting table:", error);
        return;
      }
      
      if (data && data.length > 0) {
        console.log("Organization table structure:", Object.keys(data[0]));
        console.log("Sample organization data:", data[0]);
      } else {
        console.log("No organization records found");
      }
    } catch (err) {
      console.error("Error during inspection:", err);
    }
  };

  // Modify loadAllOrganizations to call the inspection first
  const loadAllOrganizations = async () => {
    setLoadingOrganizations(true);
    try {
      console.log("Loading all organizations");
      
      // Update the query to include island_group_id field explicitly
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          id,
          name,
          status,
          member_count,
          created_at,
          contact_person,
          contact_email,
          contact_phone,
          registration_number,
          address,
          allocated_budget,
          utilized_budget,
          island_group_id,
          region_id,
          province_id,
          regions:region_id (name),
          provinces:province_id (name)
        `);
      
      if (error) {
        throw error;
      }
      
      // Log the raw data for debugging
      console.log("Raw organization data:", data);
      
      // Transform the data to match our Organization interface
      const transformedData = (data || []).map((org: any) => {
        return {
          id: org.id,
          name: org.name,
          type: org.status === 'active' ? 'Active' : 'Pending',
          member_count: org.member_count || 0,
          status: org.status,
          created_at: org.created_at,
          contact_person: org.contact_person || 'N/A',
          contact_email: org.contact_email || 'N/A',
          island_group_id: org.island_group_id,
          region_id: org.region_id,
          province_id: org.province_id,
          region_name: org.regions ? org.regions.name : 'Unknown Region',
          province_name: org.provinces ? org.provinces.name : 'Unknown Province'
        };
      });
      
      // Log the transformed data
      console.log("Transformed organizations:", transformedData);
      
      setOrganizations(transformedData);
    } catch (err) {
      console.error("Error loading all organizations:", err);
      toast({
        variant: "destructive",
        title: "Error loading organizations",
        description: "Failed to load organization data.",
      });
    } finally {
      setLoadingOrganizations(false);
    }
  };

  // Modify loadOrganizationsBasedOnSelection to filter from all organizations
  const loadOrganizationsBasedOnSelection = () => {
    // Load all organizations if we haven't done so already
    if (organizations.length === 0) {
      loadAllOrganizations();
      return;
    }
    
    // Filter the already loaded organizations based on selection
    if (selectedProvince) {
      const provinceOrgs = organizations.filter(org => org.province_id === selectedProvince);
      setStats(prev => ({
        ...prev,
        totalOrganizations: provinceOrgs.length
      }));
    } else if (selectedRegion) {
      const regionOrgs = organizations.filter(org => org.region_id === selectedRegion);
      setStats(prev => ({
        ...prev,
        totalOrganizations: regionOrgs.length
      }));
    }
  };

  // Modify the useEffect to load all organizations on component mount
  useEffect(() => {
    loadData();
    loadAllOrganizations(); // Load all organizations when component mounts
  }, []);

  // Modify refreshData to reload all organizations
  const refreshData = async () => {
    await loadData();
    await loadAllOrganizations();
  };

  // Update the filteredOrganizations logic to include smart search
  const filteredOrganizations = useMemo(() => {
    let orgs = organizations;
    // Apply geographic filters
    if (selectedProvince) {
      orgs = orgs.filter(org => org.province_id === selectedProvince);
    } else if (selectedRegion) {
      orgs = orgs.filter(org => org.region_id === selectedRegion);
    } else if (selectedIslandGroup) {
      orgs = orgs.filter(org => org.island_group_id === selectedIslandGroup);
    }
    // Apply smart search
    if (smartSearch.trim().length >= 2) {
      const keyword = smartSearch.trim().toLowerCase();
      orgs = orgs.filter(org =>
        (org.name && org.name.toLowerCase().includes(keyword)) ||
        (org.contact_person && org.contact_person.toLowerCase().includes(keyword)) ||
        (org.contact_email && org.contact_email.toLowerCase().includes(keyword)) ||
        (org.region_name && org.region_name.toLowerCase().includes(keyword)) ||
        (org.province_name && org.province_name.toLowerCase().includes(keyword))
      );
    }
    return orgs;
  }, [organizations, selectedIslandGroup, selectedRegion, selectedProvince, smartSearch]);

  // Add a memoized stats calculation based on filteredOrganizations
  const filteredStats = useMemo(() => {
    return {
      totalOrganizations: filteredOrganizations.length,
      totalFarmers: filteredOrganizations.reduce((sum, org) => sum + (org.member_count || 0), 0)
    };
  }, [filteredOrganizations]);

  // Add a new function to directly search organizations
  const searchOrganizations = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          id,
          name,
          status,
          member_count,
          created_at,
          contact_person,
          contact_email,
          region_id,
          province_id,
          regions(name),
          provinces(name)
        `)
        .ilike('name', `%${query}%`)
        .limit(10);
      
      if (error) throw error;
      
      // Transform the data to match our Organization interface with explicit type handling
      const transformedData = (data || []).map(org => {
        // Safely access nested properties
        const regionName = typeof org.regions === 'object' && org.regions ? 
          (org.regions as any).name : 'Unknown Region';
        
        const provinceName = typeof org.provinces === 'object' && org.provinces ? 
          (org.provinces as any).name : 'Unknown Province';
          
        return {
          id: org.id,
          name: org.name,
          type: "Unknown", // Since verification_status doesn't exist
          member_count: org.member_count || 0,
          status: org.status || "pending",
          created_at: org.created_at,
          contact_person: org.contact_person || 'N/A',
          contact_email: org.contact_email || 'N/A',
          region_name: regionName,
          province_name: provinceName
        };
      });
      
      setSearchResults(transformedData);
    } catch (error) {
      console.error("Error searching organizations:", error);
      toast({
        title: "Error",
        description: "Failed to search organizations",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Add useEffect to handle search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (orgSearchQuery) {
        searchOrganizations(orgSearchQuery);
      }
    }, 300); // Debounce search for 300ms
    
    return () => clearTimeout(timer);
  }, [orgSearchQuery]);

  // Navigate to regional dashboard
  const handleViewRegionDashboard = (regionId: string) => {
    navigate(`/superadmin/regions/${regionId}`);
  };
  
  // Navigate to regional budget management
  const handleManageRegionBudget = (regionId: string) => {
    navigate(`/superadmin/regions/budget/${regionId}`);
  };

  return (
    <DashboardLayout userRole="superadmin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Region & Organization Search</h1>
          
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={refreshData}
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Statistics Overview - Dynamic based on selection */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Farmers in {stats.scopeLabel}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredStats.totalFarmers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Registered farmers in {stats.scopeLabel.toLowerCase()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Organizations in {stats.scopeLabel}</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredStats.totalOrganizations.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Active organizations in {stats.scopeLabel.toLowerCase()}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Organization Smart Search</CardTitle>
            <CardDescription>Find and filter organizations by location, contact info, or keywords</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Type keyword to search (minimum 2 characters)..."
              value={smartSearch}
              onChange={e => setSmartSearch(e.target.value)}
            />
          </CardContent>
        </Card>

        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="regions">Search & Filter</TabsTrigger>
            <TabsTrigger value="budget">Budget Management</TabsTrigger>
          </TabsList>
          
          <TabsContent value="regions" className="space-y-6">
            {/* Selection Form */}
            <Card>
              <CardHeader>
                <CardTitle>Geographic Selection</CardTitle>
                <CardDescription>Filter by island group, region, and province</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4 sm:flex-row">
                  {/* Island Group Dropdown */}
                  <div className="w-full sm:w-1/3">
                    <Label className="mb-2 block">Island Group</Label>
                    <Select onValueChange={handleIslandGroupChange} value={selectedIslandGroup || undefined}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Island Group" />
                      </SelectTrigger>
                      <SelectContent>
                        {islandGroups.map(island => (
                          <SelectItem key={island.id} value={island.id}>
                            {island.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Region Dropdown */}
                  <div className="w-full sm:w-1/3">
                    <Label className="mb-2 block">Region</Label>
                    <Select 
                      onValueChange={handleRegionChange} 
                      disabled={!selectedIslandGroup || regions.length === 0}
                      value={selectedRegion || undefined}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={!selectedIslandGroup ? "Select Island Group first" : "Select Region"} />
                      </SelectTrigger>
                      <SelectContent>
                        {regions.map(region => (
                          <SelectItem key={region.id} value={region.id}>
                            {region.code ? `${region.code} - ${region.name}` : region.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Province Dropdown */}
                  <div className="w-full sm:w-1/3">
                    <Label className="mb-2 block">Province</Label>
                    <Select 
                      onValueChange={handleProvinceChange} 
                      disabled={!selectedRegion || loadingProvinces || provinces.length === 0}
                      value={selectedProvince || undefined}
                    >
                      <SelectTrigger>
                        <SelectValue 
                          placeholder={
                            loadingProvinces ? "Loading..." : 
                            !selectedRegion ? "Select Region first" : 
                            provinces.length === 0 ? "No provinces available" : 
                            "Select Province"
                          } 
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {provinces.map(province => (
                          <SelectItem key={province.id} value={province.id}>
                            {province.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Current Selection Info */}
            {selectedIslandGroup && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>
                      {selectedProvince ? selectedProvinceData?.name : 
                       selectedRegion ? selectedRegionData?.name : 
                       selectedIslandGroupData?.name}
                    </CardTitle>
                    <CardDescription>
                      {selectedProvince ? `Province in ${selectedRegionData?.name}` :
                       selectedRegion ? `Region in ${selectedIslandGroupData?.name}` :
                       "Island Group"}
                    </CardDescription>
                  </div>
                  {selectedProvince && (
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedProvince(null)}
                    >
                      Back to Region
                    </Button>
                  )}
                  {selectedRegion && !selectedProvince && (
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedRegion(null)}
                    >
                      Back to Island Group
                    </Button>
                  )}
                </CardHeader>
              </Card>
            )}

            {/* Organizations List - Use filteredOrganizations instead of organizations */}
            <Card>
              <CardHeader>
                <CardTitle>Organizations {selectedProvince || selectedRegion ? `in ${stats.scopeLabel}` : 'in All Regions'}</CardTitle>
                <CardDescription>All agricultural organizations {selectedProvince || selectedRegion ? 'in this area' : 'in the system'}</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingOrganizations ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : organizations.length === 0 ? (
                  <div className="text-center p-4 border rounded-md bg-muted/20">
                    <p className="text-muted-foreground">No organizations found</p>
                    <p className="text-xs mt-2">There are currently no registered organizations in the system.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Organization</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Contact Person</TableHead>
                        <TableHead>Region</TableHead>
                        <TableHead>Province</TableHead>
                        <TableHead className="text-right">Members</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrganizations.map(org => (
                        <TableRow key={org.id}>
                          <TableCell className="font-medium">{org.name}</TableCell>
                          <TableCell>{org.type}</TableCell>
                          <TableCell>
                            <div>
                              <div>{org.contact_person}</div>
                              <div className="text-xs text-muted-foreground">{org.contact_email}</div>
                            </div>
                          </TableCell>
                          <TableCell>{org.region_name}</TableCell>
                          <TableCell>{org.province_name}</TableCell>
                          <TableCell className="text-right">{org.member_count || 0}</TableCell>
                          <TableCell>
                            <Badge variant={org.status === "active" ? "default" : "secondary"}>
                              {org.status || "pending"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleViewRegionDashboard(org.id)}
                              >
                                <LayoutDashboard className="h-4 w-4 mr-1" />
                                Dashboard
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleManageRegionBudget(org.id)}
                              >
                                <DollarSign className="h-4 w-4 mr-1" />
                                Budget
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="budget" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Budget Management</CardTitle>
                <CardDescription>Regional budget allocation interface</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md p-6 bg-muted/20 text-center">
                  <h3 className="text-lg font-medium">Budget Management Feature</h3>
                  <p className="text-muted-foreground mt-2 mb-4">
                    This feature will allow allocation of budgets to regions and provinces.
                    Click below to switch back to Regions management.
                  </p>
                  <Button onClick={() => setCurrentTab("regions")}>Go to Regions Management</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
} 