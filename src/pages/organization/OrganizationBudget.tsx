import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Label } from "@/components/ui/label";
import { Loader2, Search, Save, Wallet } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Link } from "react-router-dom";

interface Farmer {
  id: string;
  name: string;
  farm_name?: string;
  current_allocation: number;
  allocation?: number;
}

interface Organization {
  id: string;
  name: string;
}

export default function OrganizationBudgetDistribution() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState("");
  const [totalBudget, setTotalBudget] = useState(0);
  const [availableBudget, setAvailableBudget] = useState(0);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [farmerAllocations, setFarmerAllocations] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [farmerLoading, setFarmerLoading] = useState(false);
  const [farmersLoaded, setFarmersLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tableError, setTableError] = useState<string | null>(null);

  useEffect(() => {
    // Only attempt to load budget data when authentication is complete
    if (!authLoading) {
      loadOrganizationInfo();
    }
  }, [authLoading, user]);

  // Add a function to check and create the farmer_budgets table if needed
  const ensureFarmerBudgetsTable = async () => {
    try {
      setTableError(null);
      console.log("Checking if farmer_budgets table exists...");
      
      // Check if the table exists by trying to query it
      const { data: tableCheck, error: tableError } = await supabase.rpc(
        'admin_execute_sql',
        {
          sql_query: `
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public'
              AND table_name = 'farmer_budgets'
            );
          `
        }
      );
      
      if (tableError) {
        console.error("Error checking for farmer_budgets table:", tableError);
        setTableError("Could not check if farmer_budgets table exists. You may not have sufficient database permissions.");
        return false;
      }
      
      const tableExists = tableCheck && tableCheck.length > 0 && tableCheck[0].exists;
      
      if (!tableExists) {
        console.log("farmer_budgets table doesn't exist, creating it now...");
        
        // Create the farmer_budgets table
        const { error: createError } = await supabase.rpc(
          'admin_execute_sql',
          {
            sql_query: `
              CREATE TABLE IF NOT EXISTS public.farmer_budgets (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                farmer_id UUID NOT NULL REFERENCES farmer_profiles(id) ON DELETE CASCADE,
                organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                total_allocation NUMERIC(15,2) DEFAULT 0,
                remaining_balance NUMERIC(15,2) DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                CONSTRAINT farmer_budgets_unique_farmer_org UNIQUE (farmer_id, organization_id)
              );
              
              CREATE INDEX IF NOT EXISTS idx_farmer_budgets_farmer_id ON public.farmer_budgets (farmer_id);
              CREATE INDEX IF NOT EXISTS idx_farmer_budgets_organization_id ON public.farmer_budgets (organization_id);
              
              -- Add a trigger to update the updated_at column
              CREATE OR REPLACE FUNCTION update_farmer_budgets_updated_at()
              RETURNS TRIGGER AS $$
              BEGIN
                NEW.updated_at = now();
                RETURN NEW;
              END;
              $$ LANGUAGE plpgsql;
              
              DROP TRIGGER IF EXISTS update_farmer_budgets_updated_at ON farmer_budgets;
              CREATE TRIGGER update_farmer_budgets_updated_at
              BEFORE UPDATE ON farmer_budgets
              FOR EACH ROW
              EXECUTE FUNCTION update_farmer_budgets_updated_at();
            `
          }
        );
        
        if (createError) {
          console.error("Error creating farmer_budgets table:", createError);
          setTableError("Could not create farmer_budgets table. You might not have permission to create tables in the database.");
          return false;
        }
        
        console.log("farmer_budgets table created successfully");
        return true;
      }
      
      console.log("farmer_budgets table already exists");
      return true;
    } catch (error: any) {
      console.error("Error in ensureFarmerBudgetsTable:", error);
      setTableError(`Database error: ${error.message || "Unknown error"}`);
      return false;
    }
  };

  const loadOrganizationInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get the organization for the current user
      const userId = user?.id;
      if (!userId) {
        console.log("User authentication not complete yet");
        setLoading(false);
        return;
      }
      
      console.log("Loading organization for user ID:", userId);
      
      // Check if the user is an organization admin by role
      if (user?.role === 'org_admin' || user?.role === 'organization_admin') {
        console.log("User is an organization admin, getting the first organization");
        
        // Get the first organization (for org admins)
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('id, name')
          .limit(1)
          .single();
        
        if (orgError) {
          console.error("Error finding organization for admin:", orgError);
          setError("Failed to find organization. Please contact support.");
          return;
        }
        
        console.log("Found organization for admin:", orgData);
        setOrganizationId(orgData.id);
        setOrganizationName(orgData.name);
        await loadBudgetData(orgData.id);
        return;
      }
      
      // If user is not an admin, try the old farmer profile approach
      // Try via farmer profile as fallback
      const { data: farmerProfile, error: farmerError } = await supabase
        .from('farmer_profiles')
        .select('id, user_id')
        .eq('user_id', userId)
        .single();
      
      if (farmerError) {
        console.error("Error finding farmer profile:", farmerError);
        setError('You must be an organization admin or have a farmer profile to access this page.');
        return;
      }

      // Try to get the organization directly from the organization_members table
      const { data: memberData, error: memberError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('farmer_id', farmerProfile.id)
        .single();
        
      if (memberError || !memberData?.organization_id) {
        console.error("Error finding organization membership:", memberError || "No organization found");
        setError('Failed to find your organization. You may not be a member of any organization yet.');
        return;
      }
      
      // Now get the organization details
      const { data: organization, error: orgError } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('id', memberData.organization_id)
        .single();
        
      if (orgError || !organization) {
        console.error("Error finding organization details:", orgError);
        setError('Failed to load organization details.');
        return;
      }
      
      console.log("Found organization via farmer profile:", organization);
      
      setOrganizationId(organization.id);
      setOrganizationName(organization.name);
      await loadBudgetData(organization.id);

    } catch (error: any) {
      console.error('Error loading organization data:', error);
      setError(error.message || "Failed to load organization information");
      toast({
        title: "Error",
        description: "Failed to load organization information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadBudgetData = async (orgId: string) => {
    try {
      // Get organization budget information
      const { data: budgetData, error: budgetError } = await supabase.rpc(
        'admin_execute_sql',
        {
          sql_query: `
            SELECT 
              total_allocation,
              remaining_balance
            FROM organization_budgets
            WHERE organization_id = '${orgId}'
            LIMIT 1
          `
        }
      );
      
      if (budgetError) {
        console.error("Budget fetch error:", budgetError);
        setError("Could not load budget information. The organization may not have a budget allocated yet.");
        return;
      }
      
      if (budgetData && budgetData.length > 0) {
        setTotalBudget(budgetData[0].total_allocation || 0);
        setAvailableBudget(budgetData[0].remaining_balance || 0);
      } else {
        setTotalBudget(0);
        setAvailableBudget(0);
        // If no budget data, try to create it
        const { error: createError } = await supabase.rpc(
          'admin_execute_sql',
          {
            sql_query: `
              INSERT INTO organization_budgets (organization_id, total_allocation, remaining_balance)
              VALUES ('${orgId}', 0, 0)
              ON CONFLICT (organization_id) DO NOTHING
            `
          }
        );
        
        if (createError) {
          console.error("Error creating budget record:", createError);
        }
      }
    } catch (error: any) {
      console.error('Error loading budget data:', error);
      setError(`Failed to load budget data: ${error.message}`);
    }
  };

  const loadFarmers = async () => {
    if (!organizationId) return;
    
    // If farmers already loaded, don't load again unless it's a refresh
    if (farmersLoaded && !farmerLoading) {
      setFarmersLoaded(false);
    }
    
    try {
      setFarmerLoading(true);
      console.log("Loading farmers for organization:", organizationId);
      
      // Ensure the farmer_budgets table exists
      const tableReady = await ensureFarmerBudgetsTable();
      if (!tableReady) {
        throw new Error("Unable to prepare farmer_budgets table");
      }
      
      // 1. Get organization members
      const { data: members, error: memberError } = await supabase
        .from('organization_members')
        .select('farmer_id')
        .eq('organization_id', organizationId)
        .eq('status', 'active');
      
      if (memberError) {
        console.error("Error loading members:", memberError);
        throw memberError;
      }
      
      if (!members || members.length === 0) {
        console.log("No members found in organization");
        setFarmers([]);
        setFarmerAllocations({});
        setFarmersLoaded(true);
        return;
      }
      
      // Get farmer IDs
      const farmerIds = members.map(m => m.farmer_id).filter(Boolean);
      console.log("Found farmer IDs:", farmerIds);
      
      // 2. Get farmer profiles for these members
      const { data: farmerProfiles, error: profileError } = await supabase
        .from('farmer_profiles')
        .select('id, farm_name, user_id')
        .in('id', farmerIds);
      
      if (profileError) {
        console.error("Error loading farmer profiles:", profileError);
        throw profileError;
      }
      
      // 3. Get user names
      const userIds = farmerProfiles.map(f => f.user_id).filter(Boolean);
      
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', userIds);
      
      if (userError) {
        console.error("Error loading users:", userError);
        throw userError;
      }
      
      // 4. Get budget allocations
      const { data: budgets, error: budgetError } = await supabase
        .from('farmer_budgets')
        .select('farmer_id, total_allocation')
        .eq('organization_id', organizationId);
      
      // Create lookup maps
      const userMap: Record<string, any> = {};
      users.forEach(user => {
        userMap[user.id] = user;
      });
      
      const budgetMap: Record<string, number> = {};
      if (budgets) {
        budgets.forEach(budget => {
          budgetMap[budget.farmer_id] = budget.total_allocation || 0;
        });
      }
      
      // Build farmers array
      const farmers: Farmer[] = farmerProfiles.map(profile => {
        const user = userMap[profile.user_id];
        return {
          id: profile.id,
          name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Unknown',
          farm_name: profile.farm_name,
          current_allocation: budgetMap[profile.id] || 0
        };
      });
      
      console.log("Processed farmers:", farmers);
      
      setFarmerAllocations(budgetMap);
      setFarmers(farmers);
      setFarmersLoaded(true);
      
    } catch (err) {
      console.error("Failed to load farmers:", err);
      toast({
        title: "Error",
        description: "Failed to load farmers",
        variant: "destructive"
      });
    } finally {
      setFarmerLoading(false);
    }
  };

  const handleFarmerAllocationChange = (farmerId: string, value: string) => {
    const amount = value === "" ? 0 : parseFloat(value);
    if (isNaN(amount) || amount < 0) return;
    
    setFarmerAllocations(prev => ({
      ...prev,
      [farmerId]: amount
    }));
  };

  const saveFarmerAllocations = async () => {
    if (!organizationId) return;
    
    // Calculate total allocation to ensure it doesn't exceed budget
    const totalAllocated = Object.values(farmerAllocations).reduce((sum, val) => sum + (val || 0), 0);
    if (totalAllocated > availableBudget) {
      toast({
        title: "Error",
        description: "Total allocation exceeds available budget. Please adjust allocations.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSaving(true);
    try {
      // Ensure the farmer_budgets table exists before saving allocations
      const tableReady = await ensureFarmerBudgetsTable();
      if (!tableReady) {
        throw new Error("Unable to prepare farmer_budgets table");
      }
      
      // Save farmer allocations to database
      for (const [farmerId, amount] of Object.entries(farmerAllocations)) {
        const { error } = await supabase.rpc(
          'admin_execute_sql',
          {
            sql_query: `
              INSERT INTO farmer_budgets 
                (farmer_id, organization_id, total_allocation, remaining_balance)
              VALUES 
                ('${farmerId}', '${organizationId}', ${amount || 0}, ${amount || 0})
              ON CONFLICT (farmer_id, organization_id)
              DO UPDATE SET 
                total_allocation = ${amount || 0}, 
                remaining_balance = ${amount || 0},
                updated_at = NOW()
            `
          }
        );
        
        if (error) throw error;
      }
      
      // Update organization budget remaining amount
      await supabase.rpc(
        'admin_execute_sql',
        {
          sql_query: `
            UPDATE organization_budgets
            SET remaining_balance = total_allocation - ${totalAllocated},
                updated_at = NOW()
            WHERE organization_id = '${organizationId}'
          `
        }
      );
      
      toast({
        title: "Success",
        description: "Farmer budget allocations have been saved."
      });
      
      // Refresh data
      await loadBudgetData(organizationId);
      loadFarmers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to save allocations: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Filter farmers based on search query
  const filteredFarmers = farmers.filter(farmer => 
    farmer.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (farmer.farm_name && farmer.farm_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Calculate total allocation and remaining budget for farmers
  const totalFarmerAllocation = Object.values(farmerAllocations).reduce((sum, val) => sum + (val || 0), 0);
  const remainingBudgetAfterAllocations = availableBudget - totalFarmerAllocation;

  if (authLoading) {
    return (
      <DashboardLayout userRole="organization">
        <div className="flex justify-center items-center h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Authenticating...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="organization">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Budget Distribution</h1>
            <p className="text-muted-foreground">Allocate your organization's budget to farmers</p>
          </div>
          <div className="space-x-4">
            <Button asChild variant="outline">
              <Link to="/organization/budget-center">
                <Wallet className="h-4 w-4 mr-2" />
                Budget Center
              </Link>
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
            <h3 className="font-medium mb-1">Error</h3>
            <p>{error}</p>
          </div>
        )}

        {tableError && (
          <div className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 p-4 rounded-lg">
            <h3 className="font-medium mb-1">Database Setup Error</h3>
            <p>{tableError}</p>
            <p className="mt-2 text-sm">This may require administrator assistance. The farmer_budgets table is required for budget allocation.</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-[300px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading budget data...</span>
          </div>
        ) : (
          <>
            {/* Budget Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₱{totalBudget.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Fiscal Year {new Date().getFullYear()}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Available Budget</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">₱{availableBudget.toLocaleString()}</div>
                  <Progress 
                    value={totalBudget > 0 ? (availableBudget / totalBudget) * 100 : 0} 
                    className="mt-2" 
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">After Current Allocations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${remainingBudgetAfterAllocations < 0 ? 'text-destructive' : ''}`}>
                    ₱{remainingBudgetAfterAllocations.toLocaleString()}
                  </div>
                  {remainingBudgetAfterAllocations < 0 && (
                    <p className="text-xs text-destructive">Budget exceeded</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Farmer Budget Allocation */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Farmer Budget Allocation</CardTitle>
                  <CardDescription>Distribute your organization's budget to farmers</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    onClick={loadFarmers}
                    disabled={farmerLoading}
                  >
                    {farmerLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading Farmers...
                      </>
                    ) : farmersLoaded ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4" />
                        Refresh Farmers
                      </>
                    ) : (
                      <>
                        <Loader2 className="mr-2 h-4 w-4" />
                        Load Farmers
                      </>
                    )}
                  </Button>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search farmers..."
                      className="pl-8 w-[250px]"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={saveFarmerAllocations} 
                    disabled={isSaving || remainingBudgetAfterAllocations < 0 || !farmersLoaded}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Allocations
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!farmersLoaded ? (
                  <div className="bg-muted/20 rounded-xl p-12 text-center">
                    <h3 className="text-xl font-medium mb-2">No Farmers Loaded</h3>
                    <p className="text-muted-foreground mb-6">
                      Click the "Load Farmers" button above to load farmers and allocate budget to them.
                    </p>
                    <Button onClick={loadFarmers} disabled={farmerLoading}>
                      {farmerLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        "Load Farmers"
                      )}
                    </Button>
                  </div>
                ) : farmerLoading ? (
                  <div className="flex justify-center items-center h-[200px]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <div className="mb-6 bg-accent/50 p-4 rounded-lg">
                      <Label className="text-lg">Quick Allocation</Label>
                      <div className="flex items-center gap-4 mt-2">
                        <div>
                          <Label htmlFor="equal-amount" className="text-sm">Equal amount per farmer</Label>
                          <div className="flex items-center mt-1">
                            <span className="text-muted-foreground mr-2">₱</span>
                            <Input 
                              id="equal-amount"
                              type="number" 
                              className="w-32"
                              placeholder="Amount" 
                              min="0"
                              onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                if (!isNaN(value) && farmers.length > 0) {
                                  const newAllocations = {...farmerAllocations};
                                  farmers.forEach(farmer => {
                                    newAllocations[farmer.id] = value;
                                  });
                                  setFarmerAllocations(newAllocations);
                                }
                              }}
                            />
                            <Button 
                              variant="outline" 
                              className="ml-2"
                              onClick={() => {
                                if (availableBudget > 0 && farmers.length > 0) {
                                  const equalAmount = Math.floor(availableBudget / farmers.length);
                                  const newAllocations = {...farmerAllocations};
                                  farmers.forEach(farmer => {
                                    newAllocations[farmer.id] = equalAmount;
                                  });
                                  setFarmerAllocations(newAllocations);
                                }
                              }}
                            >
                              Distribute Equally
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Farmer Name</TableHead>
                          <TableHead>Farm Name</TableHead>
                          <TableHead>Current Allocation</TableHead>
                          <TableHead>New Allocation</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredFarmers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                              No farmers found in your organization.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredFarmers.map((farmer) => (
                            <TableRow key={farmer.id}>
                              <TableCell className="font-medium">{farmer.name}</TableCell>
                              <TableCell>{farmer.farm_name || "—"}</TableCell>
                              <TableCell>₱{farmer.current_allocation.toLocaleString()}</TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <span className="text-muted-foreground">₱</span>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="1000"
                                    value={farmerAllocations[farmer.id] || ""}
                                    onChange={(e) => handleFarmerAllocationChange(farmer.id, e.target.value)}
                                    className="w-32"
                                  />
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
          </>
        )}
      </div>
    </DashboardLayout>
  );
} 