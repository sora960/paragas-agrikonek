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
import { Loader2, MapPin, Building2, Users } from "lucide-react";
import { Input } from "@/components/ui/input";

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
    setOrganizations([]);
    
    // Filter regions based on island group (now using memo)
    setRegions(filteredRegions);
    
    // Get island group name
    const islandGroup = islandGroups.find(ig => ig.id === islandGroupId);
    
    // Set zero counts since no data exists yet
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
    setLoadingOrganizations(true);
    setOrganizations([]);
    
    try {
      // Get region name
      const region = regions.find(r => r.id === regionId);
      
      // Set region info in stats
      setStats({
        totalFarmers: 0,
        totalOrganizations: 0,
        scopeLabel: region ? `${region.name} Region` : "Selected Region"
      });
      
      // Start both data loading processes in parallel for better performance
      const provincesPromise = regionService.getProvinces(regionId);
      const orgsPromise = loadOrganizationsForRegion(regionId);
      
      // Wait for provinces to load
      const provincesData = await provincesPromise;
      setProvinces(provincesData);
      
      // Organizations will be loaded by the loadOrganizationsForRegion function
      // No need to await it here as it sets its own state
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
      // Get province name
      const province = provinces.find(p => p.id === provinceId);
      
      // Set zero counts since no data exists yet
      setStats({
        totalFarmers: 0,
        totalOrganizations: 0,
        scopeLabel: province ? `${province.name} Province` : "Selected Province"
      });
      
      // Load organizations for this province
      await loadOrganizationsForProvince(provinceId);
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
  
  const loadOrganizationsForRegion = async (regionId: string) => {
    setLoadingOrganizations(true);
    try {
      console.log("Loading organizations for region:", regionId);
      
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          id,
          name,
          status,
          verification_status,
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
          province_id
        `)
        .eq('region_id', regionId);
      
      if (error) {
        throw error;
      }
      
      console.log("Retrieved organizations:", data);
      
      // Transform the data to match our Organization interface
      const transformedData = (data || []).map(org => {
        // Cast to any to handle the properties safely
        const orgData = org as any;
        
        return {
          id: orgData.id,
          name: orgData.name,
          type: orgData.verification_status === 'verified' ? 'Verified' : 'Pending',
          member_count: orgData.member_count || 0,
          status: orgData.status,
          created_at: orgData.created_at,
          contact_person: orgData.contact_person || 'N/A',
          contact_email: orgData.contact_email || 'N/A',
          region_id: orgData.region_id,
          province_id: orgData.province_id,
          island_group_id: orgData.island_group_id,
          region_name: 'Unknown Region', // We'll get this from context
          province_name: 'Unknown Province'
        };
      });
      
      setOrganizations(transformedData);
      
      // Update stats with the actual count
      setStats(prev => ({
        ...prev,
        totalOrganizations: transformedData.length
      }));
      
    } catch (error) {
      console.error("Error loading organizations for region:", error);
      toast({
        title: "Error",
        description: "Failed to load organizations for this region",
        variant: "destructive"
      });
      setOrganizations([]);
    } finally {
      setLoadingOrganizations(false);
    }
  };
  
  const loadOrganizationsForProvince = async (provinceId: string) => {
    setLoadingOrganizations(true);
    try {
      console.log("Loading organizations for province:", provinceId);
      
      // Query for organizations in this province
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          id,
          name,
          status,
          verification_status,
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
          province_id
        `)
        .eq('province_id', provinceId);
      
      if (error) {
        throw error;
      }
      
      console.log("Retrieved organizations for province:", data);
      
      // Transform the data to match our Organization interface
      const transformedData = (data || []).map(org => {
        // Cast to any to handle the properties safely
        const orgData = org as any;
        
        return {
          id: orgData.id,
          name: orgData.name,
          type: orgData.verification_status === 'verified' ? 'Verified' : 'Pending',
          member_count: orgData.member_count || 0,
          status: orgData.status,
          created_at: orgData.created_at,
          contact_person: orgData.contact_person || 'N/A',
          contact_email: orgData.contact_email || 'N/A',
          region_id: orgData.region_id,
          province_id: orgData.province_id,
          island_group_id: orgData.island_group_id
        };
      });
      
      setOrganizations(transformedData);
      
      // Update stats with actual organization count
      setStats(prev => ({
        ...prev,
        totalOrganizations: transformedData.length
      }));
    } catch (error) {
      console.error("Error loading organizations for province:", error);
      toast({
        title: "Error",
        description: "Failed to load organizations for this province",
        variant: "destructive"
      });
      setOrganizations([]);
    } finally {
      setLoadingOrganizations(false);
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

  // Add a memoized filtered organizations list
  const filteredOrganizations = useMemo(() => {
    console.log("Filtering organizations with selections:", { 
      selectedIslandGroup, 
      selectedRegion, 
      selectedProvince, 
      totalOrgs: organizations.length 
    });
    
    if (selectedProvince) {
      console.log(`Filtering by province_id: ${selectedProvince}`);
      const filtered = organizations.filter(org => {
        const matches = org.province_id === selectedProvince;
        if (matches) console.log(`Found match for province ${selectedProvince}:`, org);
        return matches;
      });
      console.log(`Found ${filtered.length} organizations in province ${selectedProvince}`);
      return filtered;
    } else if (selectedRegion) {
      console.log(`Filtering by region_id: ${selectedRegion}`);
      const filtered = organizations.filter(org => {
        const matches = org.region_id === selectedRegion;
        if (matches) console.log(`Found match for region ${selectedRegion}:`, org);
        return matches;
      });
      console.log(`Found ${filtered.length} organizations in region ${selectedRegion}`);
      return filtered;
    } else if (selectedIslandGroup) {
      console.log(`Filtering by island_group_id: ${selectedIslandGroup}`);
      const filtered = organizations.filter(org => {
        const matches = org.island_group_id === selectedIslandGroup;
        if (matches) console.log(`Found match for island group ${selectedIslandGroup}:`, org);
        return matches;
      });
      console.log(`Found ${filtered.length} organizations in island group ${selectedIslandGroup}`);
      return filtered;
    }
    
    // If no selection, return all organizations
    return organizations;
  }, [organizations, selectedIslandGroup, selectedRegion, selectedProvince]);

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

  return (
    <DashboardLayout userRole="superadmin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Philippine Regions Management</h1>
          
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={refreshData}
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Refresh Data
            </Button>
            <Button 
              variant="default"
              onClick={handlePopulatePhilippineProvinces}
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
              Update Provinces Data
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
              <div className="text-2xl font-bold">{stats.totalFarmers.toLocaleString()}</div>
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
              <div className="text-2xl font-bold">{stats.totalOrganizations.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Active organizations in {stats.scopeLabel.toLowerCase()}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="search">Quick Search</TabsTrigger>
            <TabsTrigger value="regions">Regions & Provinces</TabsTrigger>
            <TabsTrigger value="budget">Budget Management</TabsTrigger>
          </TabsList>
          
          <TabsContent value="search" className="space-y-6">
            {/* Quick Organization Search */}
            <Card>
              <CardHeader>
                <CardTitle>Organization Quick Search</CardTitle>
                <CardDescription>Search organizations by name across all regions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Type organization name to search (minimum 2 characters)..."
                      value={orgSearchQuery}
                      onChange={(e) => setOrgSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                
                {isSearching && (
                  <div className="flex justify-center my-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                )}
                
                {!isSearching && searchResults.length > 0 && (
                  <div className="mt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Organization</TableHead>
                          <TableHead>Region</TableHead>
                          <TableHead>Province</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {searchResults.map(org => (
                          <TableRow key={org.id}>
                            <TableCell className="font-medium">{org.name}</TableCell>
                            <TableCell>{org.region_name}</TableCell>
                            <TableCell>{org.province_name}</TableCell>
                            <TableCell>
                              <div>
                                <div>{org.contact_person}</div>
                                <div className="text-xs text-muted-foreground">{org.contact_email}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={org.status === "active" ? "default" : "secondary"}>
                                {org.status || "pending"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button size="sm" variant="outline" asChild>
                                <a href={`/organizations/${org.id}`}>View</a>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                
                {!isSearching && orgSearchQuery && searchResults.length === 0 && (
                  <div className="text-center my-4 text-muted-foreground">
                    No organizations found matching "{orgSearchQuery}"
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
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
                
                {/* Show list of provinces when a region is selected */}
                {selectedRegion && !selectedProvince && provinces.length > 0 && (
                  <CardContent>
                    <h3 className="text-lg font-semibold mb-4">Provinces in {selectedRegionData?.name}</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Province</TableHead>
                          <TableHead className="text-right">Farmers</TableHead>
                          <TableHead className="text-right">Organizations</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {provinces.map(province => (
                          <TableRow 
                            key={province.id} 
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleProvinceChange(province.id)}
                          >
                            <TableCell className="font-medium">{province.name}</TableCell>
                            <TableCell className="text-right">0</TableCell>
                            <TableCell className="text-right">0</TableCell>
                            <TableCell>
                              <Badge variant={province.status === "active" ? "default" : "secondary"}>
                                {province.status === "active" ? "Active" : "Pending"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                )}
                
                {/* Show province details when a province is selected */}
                {selectedProvince && selectedProvinceData && (
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Province Details</h3>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-muted/40 p-3 rounded-md">
                              <p className="text-xs text-muted-foreground">Total Farmers</p>
                              <p className="text-2xl font-bold">{stats.totalFarmers.toLocaleString()}</p>
                            </div>
                            <div className="bg-muted/40 p-3 rounded-md">
                              <p className="text-xs text-muted-foreground">Organizations</p>
                              <p className="text-2xl font-bold">{stats.totalOrganizations.toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="flex justify-between border-b py-2">
                            <span className="text-muted-foreground">Status</span>
                            <Badge variant={selectedProvinceData.status === "active" ? "default" : "secondary"}>
                              {selectedProvinceData.status === "active" ? "Active" : "Pending"}
                            </Badge>
                          </div>
                          <div className="flex justify-between border-b py-2">
                            <span className="text-muted-foreground">Created</span>
                            <span>{new Date(selectedProvinceData.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="flex justify-between border-b py-2">
                            <span className="text-muted-foreground">Last Updated</span>
                            <span>{new Date(selectedProvinceData.updated_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Region Info */}
                      {selectedRegionData && (
                        <div>
                          <h3 className="text-lg font-semibold mb-4">Regional Information</h3>
                          <div className="space-y-4">
                            <div className="flex justify-between border-b py-2">
                              <span className="text-muted-foreground">Region Code</span>
                              <span className="font-medium">{selectedRegionData.code}</span>
                            </div>
                            <div className="flex justify-between border-b py-2">
                              <span className="text-muted-foreground">Priority Level</span>
                              <Badge variant={
                                selectedRegionData.priority === "high" ? "destructive" :
                                selectedRegionData.priority === "medium" ? "default" : "secondary"
                              }>
                                {selectedRegionData.priority || "medium"}
                              </Badge>
                            </div>
                            <div className="flex justify-between border-b py-2">
                              <span className="text-muted-foreground">Island Group</span>
                              <span>{islandGroups.find(i => i.id === selectedRegionData.island_group_id)?.name}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
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
                          <TableCell>
                            <Button size="sm" variant="outline" asChild>
                              <a href={`/organizations/${org.id}`}>View</a>
                            </Button>
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