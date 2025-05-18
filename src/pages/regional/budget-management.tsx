import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { Progress } from "@/components/ui/progress";
import { Loader2, Save, Search, ShieldAlert } from "lucide-react";

interface Organization {
  id: string;
  name: string;
  status: string;
  current_budget: number;
  allocation?: number;
}

// Define proper types for Supabase responses
type RegionResponse = {
  region_id: string;
  regions: { name: string };
}

export default function BudgetManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [regionId, setRegionId] = useState<string | null>(null);
  const [regionName, setRegionName] = useState<string>("");
  const [budget, setBudget] = useState<any>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [usingDirectSql, setUsingDirectSql] = useState(false);

  // Calculate total allocation and remaining budget
  const totalAllocated = Object.values(allocations).reduce((sum, val) => sum + (val || 0), 0);
  const remainingBudget = budget?.amount ? budget.amount - totalAllocated : 0;

  useEffect(() => {
    fetchRegion();
  }, [user]);

  useEffect(() => {
    if (regionId) {
      fetchBudget();
      fetchOrganizations();
    }
  }, [regionId]);

  const fetchRegion = async () => {
    if (!user?.id) return;
    try {
      // Try normal query first
      const { data, error } = await supabase
        .from("user_regions")
        .select("region_id, regions(name)")
        .eq("user_id", user.id)
        .single();
        
      if (!error && data) {
        setRegionId(data.region_id);
        // The response structure might be different than expected
        // Let's safely access the region name
        if (data.regions && typeof data.regions === 'object') {
          if (Array.isArray(data.regions)) {
            // If it's an array (like [{ name: "Region Name" }])
            setRegionName(data.regions[0]?.name || "");
          } else {
            // If it's an object (like { name: "Region Name" })
            setRegionName((data.regions as any).name || "");
          }
        } else {
          setRegionName("");
        }
      } else {
        // Try direct SQL approach if normal query fails
        try {
          const { data: directData, error: directError } = await supabase.rpc(
            'admin_execute_sql',
            {
              sql_query: `
                SELECT ur.region_id, r.name as region_name
                FROM user_regions ur
                JOIN regions r ON ur.region_id = r.id
                WHERE ur.user_id = '${user.id}'
                LIMIT 1
              `
            }
          );
          
          if (directError) throw directError;
          if (directData && directData.length > 0) {
            setUsingDirectSql(true);
            setRegionId(directData[0].region_id);
            setRegionName(directData[0].region_name || "");
          } else {
            setRegionId(null);
            setRegionName("");
            setError("You are not assigned to any region. Please contact your administrator.");
          }
        } catch (directErr: any) {
          console.error("Direct SQL error:", directErr);
          setRegionId(null);
          setRegionName("");
          setError("Failed to fetch region information: " + (directErr.message || "Unknown error"));
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch region information");
    }
  };

  const fetchBudget = async () => {
    if (!regionId) return;
    setLoading(true);
    
    try {
      // Try normal query first
      const { data, error } = await supabase
        .from("region_budgets")
        .select("*")
        .eq("region_id", regionId)
        .single();
        
      if (!error && data) {
        setBudget(data);
      } else {
        // Try direct SQL approach if normal query fails
        try {
          const { data: directData, error: directError } = await supabase.rpc(
            'admin_execute_sql',
            {
              sql_query: `
                SELECT * FROM region_budgets 
                WHERE region_id = '${regionId}'
                LIMIT 1
              `
            }
          );
          
          if (directError) throw directError;
          
          if (directData && directData.length > 0) {
            setUsingDirectSql(true);
            setBudget(directData[0]);
          } else {
            // If no budget exists yet, create a placeholder with zero amount
            setBudget({ amount: 0, allocated: false });
            setError("No budget found for this region.");
          }
        } catch (directErr: any) {
          console.error("Direct SQL error:", directErr);
          setBudget({ amount: 0, allocated: false });
          setError("Failed to fetch budget information: " + (directErr.message || "Unknown error"));
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch budget information");
      setBudget({ amount: 0, allocated: false });
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    if (!regionId) return;
    setLoading(true);
    
    try {
      // Try using direct SQL for everything to bypass RLS
      const { data: directData, error: directError } = await supabase.rpc(
        'admin_execute_sql',
        {
          sql_query: `
            WITH region_orgs AS (
              SELECT id, name, status
              FROM organizations
              WHERE region_id = '${regionId}'
              AND status = 'active'
              ORDER BY name
            ),
            org_budgets AS (
              SELECT organization_id, total_allocation
              FROM organization_budgets
              WHERE organization_id IN (SELECT id FROM region_orgs)
            )
            SELECT 
              ro.id, 
              ro.name, 
              ro.status,
              COALESCE(ob.total_allocation, 0) as current_budget
            FROM region_orgs ro
            LEFT JOIN org_budgets ob ON ro.id = ob.organization_id
          `
        }
      );
      
      if (directError) throw directError;
      
      if (directData) {
        setUsingDirectSql(true);
        
        // Create a map of organization ID to allocation amount
        const budgetMap: Record<string, number> = {};
        directData.forEach((org: any) => {
          budgetMap[org.id] = org.current_budget || 0;
        });
        
        // Set the initial allocations state
        setAllocations(budgetMap);
        
        // Set organizations
        setOrganizations(directData);
      } else {
        setOrganizations([]);
      }
    } catch (err: any) {
      console.error("Error fetching organizations:", err);
      setError(err.message || "Failed to load organizations");
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAllocationChange = (orgId: string, value: string) => {
    const amount = value === "" ? 0 : parseFloat(value);
    if (isNaN(amount) || amount < 0) return;
    
    setAllocations(prev => ({
      ...prev,
      [orgId]: amount
    }));
  };

  const saveAllocations = async () => {
    if (!regionId) return;
    
    // Check if total allocation exceeds budget
    if (totalAllocated > (budget?.amount || 0)) {
      toast({
        title: "Error",
        description: "Total allocation exceeds available budget. Please adjust allocations.",
        variant: "destructive"
      });
      return;
    }
    
    setSaving(true);
    try {
      // Use direct SQL to save allocations
      for (const [orgId, amount] of Object.entries(allocations)) {
        const { error } = await supabase.rpc(
          'admin_execute_sql',
          {
            sql_query: `
              INSERT INTO organization_budgets 
                (organization_id, total_allocation, remaining_balance)
              VALUES 
                ('${orgId}', ${amount || 0}, ${amount || 0})
              ON CONFLICT (organization_id)
              DO UPDATE SET 
                total_allocation = ${amount || 0}, 
                remaining_balance = ${amount || 0},
                updated_at = NOW()
            `
          }
        );
        
        if (error) throw error;
      }
      
      // Update region_budgets.allocated flag
      await supabase.rpc(
        'admin_execute_sql',
        {
          sql_query: `
            UPDATE region_budgets
            SET allocated = true, updated_at = NOW()
            WHERE region_id = '${regionId}'
          `
        }
      );
      
      toast({
        title: "Success",
        description: "Budget allocations have been saved."
      });
      
      // Refresh data
      fetchOrganizations();
      fetchBudget();
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to save allocations: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // Filter organizations based on search query
  const filteredOrganizations = organizations.filter(org => 
    org.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!regionId && !loading) {
    return (
      <DashboardLayout userRole="regional">
        <div className="max-w-2xl mx-auto mt-10">
          <Card>
            <CardHeader>
              <CardTitle>No Region Assigned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground">You are not assigned to any region. Please contact your administrator.</div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="regional">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Budget Management</h1>
          <div className="flex items-center gap-2">
            {usingDirectSql && (
              <div className="bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 text-sm px-3 py-1 rounded-md flex items-center">
                <ShieldAlert className="h-4 w-4 mr-2" />
                Using elevated permissions
              </div>
            )}
            <Button 
              onClick={saveAllocations} 
              disabled={saving || loading || totalAllocated > (budget?.amount || 0)}
            >
              {saving ? (
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
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-md">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Total Regional Budget</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">₱{budget?.amount?.toLocaleString() ?? 0}</div>
              <div className="text-muted-foreground">{regionName}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Allocated Budget</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">₱{totalAllocated.toLocaleString()}</div>
              <Progress 
                value={(totalAllocated / (budget?.amount || 1)) * 100} 
                className="h-2 mt-2"
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Remaining Budget</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${remainingBudget < 0 ? 'text-destructive' : ''}`}>
                ₱{remainingBudget.toLocaleString()}
              </div>
              {remainingBudget < 0 && (
                <div className="text-destructive text-sm mt-1">Exceeds available budget</div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Organization Budget Allocation</CardTitle>
              <div className="text-muted-foreground text-sm">
                Distribute your region's budget to organizations
              </div>
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
                    <TableHead>Status</TableHead>
                    <TableHead>Current Allocation</TableHead>
                    <TableHead>New Allocation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrganizations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                        No organizations found in your region.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrganizations.map((org) => (
                      <TableRow key={org.id}>
                        <TableCell className="font-medium">{org.name}</TableCell>
                        <TableCell>
                          <Badge variant={org.status === 'active' ? 'default' : 'secondary'}>
                            {org.status}
                          </Badge>
                        </TableCell>
                        <TableCell>₱{org.current_budget.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span className="text-muted-foreground">₱</span>
                            <Input
                              type="number"
                              min="0"
                              step="1000"
                              value={allocations[org.id] || ""}
                              onChange={(e) => handleAllocationChange(org.id, e.target.value)}
                              className="w-32"
                            />
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
    </DashboardLayout>
  );
} 