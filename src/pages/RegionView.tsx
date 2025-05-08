import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { CalendarIcon, DollarSign, Building2, ArrowLeft, Loader2, Users, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { Separator } from "@/components/ui/separator";

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
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!regionId) {
      setError("No region ID provided");
      return;
    }

    const fetchRegionData = async () => {
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
          .eq("fiscal_year", selectedYear)
          .single();
          
        if (!budgetError && budgetData) {
          setTotalBudget(budgetData.amount);
        }
        
        // Try to fetch organization budgets, but handle the case where the table doesn't exist yet
        try {
          const { data: orgBudgets, error: orgBudgetError } = await supabase
            .from("organization_budgets")
            .select("total_allocation")
            .in("organization_id", orgData?.map(org => org.id) || [])
            .eq("fiscal_year", selectedYear);
            
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
    };
    
    fetchRegionData();
  }, [regionId, selectedYear]);

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
              <CardTitle className="text-sm font-medium">Provinces</CardTitle>
              <Badge variant="outline">{provinces.length}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{provinces.length}</div>
              <p className="text-xs text-muted-foreground">
                In this region
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
            <TabsTrigger value="provinces">Provinces</TabsTrigger>
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
                      </div>
                      <Button variant="outline" size="sm">View Profile</Button>
                    </div>
                  ) : (
                    <div className="bg-muted/50 p-4 rounded-md text-center">
                      <p className="text-muted-foreground mb-2">No regional administrator assigned</p>
                      <Button size="sm">Assign Administrator</Button>
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
          
          <TabsContent value="provinces" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Provinces</CardTitle>
                <CardDescription>
                  Provinces in {region?.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {provinces.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No provinces found in this region
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Organizations</TableHead>
                        <TableHead>Farmers</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {provinces.map(province => (
                        <TableRow key={province.id}>
                          <TableCell className="font-medium">{province.name}</TableCell>
                          <TableCell>{province.organizations || 0}</TableCell>
                          <TableCell>{province.farmers || 0}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={province.status === 'active' ? 'default' : 'secondary'}
                            >
                              {province.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
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
    </DashboardLayout>
  );
} 