import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
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
import { useToast } from "@/components/ui/use-toast";
import { regionService, IslandGroup, Region, Province } from "@/services/regionService";
import { populatePhilippineProvinces } from "@/lib/directSQLHelpers";
import { Loader2, RefreshCw, Database, MapPin, Users, Building2 } from "lucide-react";

export default function SuperAdminRegions() {
  const { toast } = useToast();
  
  // State for data
  const [islandGroups, setIslandGroups] = useState<IslandGroup[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  
  // UI state
  const [selectedIslandGroup, setSelectedIslandGroup] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState("regions");
  const [budgetYear, setBudgetYear] = useState(2024);
  
  // Statistics
  const [stats, setStats] = useState({
    totalFarmers: 0,
    totalOrganizations: 0
  });
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    setLoading(true);
    try {
      // Remove any dummy provinces first
      await regionService.cleanupDummyProvinces();
      
      // Ensure provinces are populated in the database
      await populatePhilippineProvinces();
      
      // Load island groups
      const islandGroupsData = await regionService.getIslandGroups();
      setIslandGroups(islandGroupsData);
      
      // Load regions
      const regionsData = await regionService.getRegions();
      setRegions(regionsData);
      
      // Get actual counts of farmers and organizations
      const realCounts = await regionService.getRealCounts();
      setStats({
        totalFarmers: realCounts.totalFarmers,
        totalOrganizations: realCounts.totalOrganizations
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

  const handleIslandGroupChange = async (islandGroupId: string) => {
    setSelectedIslandGroup(islandGroupId);
    setSelectedRegion(null);
    setSelectedProvince(null);
    setProvinces([]);
    
    try {
      const regionsData = await regionService.getRegionsByIslandGroup(islandGroupId);
      setRegions(regionsData);
    } catch (error) {
      console.error("Error loading regions:", error);
      toast({
        title: "Error",
        description: "Failed to load regions for this island group",
        variant: "destructive"
      });
    }
  };
  
  const handleRegionChange = async (regionId: string) => {
    setSelectedRegion(regionId);
    setSelectedProvince(null);
    setLoadingProvinces(true);
    
    try {
      console.log(`Fetching provinces for region: ${regionId}`);
      
      // Clean up any dummy provinces for this region first
      await regionService.cleanupDummyProvinces();
      
      // Fetch real provinces
      const provincesData = await regionService.getProvinces(regionId);
      
      if (provincesData.length === 0) {
        console.log("No provinces found, attempting to populate from Philippine data");
        await populatePhilippineProvinces();
        
        // Try fetching provinces again after populating
        const refreshedProvincesData = await regionService.getProvinces(regionId);
        setProvinces(refreshedProvincesData);
      } else {
      setProvinces(provincesData);
      }
    } catch (error) {
      console.error("Error loading provinces:", error);
      toast({
        title: "Error",
        description: "Failed to load provinces for this region",
        variant: "destructive"
      });
      setProvinces([]);
    } finally {
      setLoadingProvinces(false);
    }
  };
  
  const handleProvinceChange = (provinceId: string) => {
    setSelectedProvince(provinceId);
  };
  
  const handlePopulatePhilippineProvinces = async () => {
    setLoading(true);
    try {
      // First remove dummy provinces
      await regionService.cleanupDummyProvinces();
      
      // Then populate real data
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
  
  return (
    <DashboardLayout userRole="superadmin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Philippine Regions Management</h1>
          
          <Button 
            variant="default"
            onClick={handlePopulatePhilippineProvinces}
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
            Update Provinces Data
          </Button>
        </div>

        {/* Statistics Overview */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Farmers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFarmers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Registered farmer accounts in the system
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Organizations</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrganizations.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Registered organizations in the system
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="regions">Regions & Provinces</TabsTrigger>
            <TabsTrigger value="budget">Budget Management</TabsTrigger>
          </TabsList>
          
          <TabsContent value="regions" className="space-y-6">
            {/* Selection Form */}
            <Card>
              <CardHeader>
                <CardTitle>Region Selection</CardTitle>
                <CardDescription>Select island group, region, and province</CardDescription>
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
                      disabled={!selectedRegion || loadingProvinces}
                      value={selectedProvince || undefined}
                    >
                      <SelectTrigger>
                        <SelectValue 
                          placeholder={
                            loadingProvinces ? "Loading..." : 
                            !selectedRegion ? "Select Region first" : 
                            "Select Province"
                          } 
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {provinces.length === 0 ? (
                          <div className="px-2 py-4 text-center">
                            <p className="text-sm text-muted-foreground">No provinces found</p>
                          </div>
                        ) : (
                          provinces.map(province => (
                          <SelectItem key={province.id} value={province.id}>
                            {province.name}
                          </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Province List */}
            {selectedRegion && !selectedProvince && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>{selectedRegionData?.name} Provinces</CardTitle>
                    <CardDescription>All provinces in this region</CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-primary/10">
                    {provinces.length} Provinces
                  </Badge>
                </CardHeader>
                <CardContent>
                  {provinces.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground mb-4">No provinces found for this region</p>
                      <Button 
                        variant="outline" 
                        onClick={handlePopulatePhilippineProvinces}
                        disabled={loading}
                      >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
                        Update Provinces Data
                      </Button>
                    </div>
                  ) : (
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
                          <TableCell className="text-right">{province.farmers.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{province.organizations}</TableCell>
                          <TableCell>
                            <Badge variant={province.status === "active" ? "default" : "secondary"}>
                              {province.status === "active" ? "Active" : "Pending"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Province Details */}
            {selectedProvince && selectedProvinceData && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>{selectedProvinceData.name}</CardTitle>
                    <CardDescription>Province in {selectedRegionData?.name}</CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedProvince(null)}
                  >
                    Back to List
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Province Details</h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-muted/40 p-3 rounded-md">
                            <p className="text-xs text-muted-foreground">Total Farmers</p>
                            <p className="text-2xl font-bold">{selectedProvinceData.farmers.toLocaleString()}</p>
                          </div>
                          <div className="bg-muted/40 p-3 rounded-md">
                            <p className="text-xs text-muted-foreground">Organizations</p>
                            <p className="text-2xl font-bold">{selectedProvinceData.organizations}</p>
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
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="budget" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Budget Management</CardTitle>
                <CardDescription>Regional budget allocation for {budgetYear}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <Label htmlFor="budgetYear">Budget Year:</Label>
                    <Select value={budgetYear.toString()} onValueChange={(value) => setBudgetYear(parseInt(value))}>
                      <SelectTrigger className="w-[100px]">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2023">2023</SelectItem>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2025">2025</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Button variant="outline" onClick={() => setCurrentTab("regions")}>
                      Switch to Regions
                    </Button>
                  </div>
                </div>
                
                <div className="border rounded-md p-6 bg-muted/20 text-center">
                  <h3 className="text-lg font-medium">Budget Management Feature</h3>
                  <p className="text-muted-foreground mt-2 mb-4">
                    The full budget management interface is in the previous tab view.
                    Please switch to the "Regions" tab to manage regions and provinces first.
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
