import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useToast } from "@/components/ui/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Loader2, PlusCircle, History, Save, Search, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

interface Region {
  id: string;
  name: string;
  current_budget: number;
  allocation?: number;
}

export default function BudgetManagement() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [totalBudget, setTotalBudget] = useState<number>(1000000); // Default value
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Calculate total allocation and remaining budget
  const totalAllocated = Object.values(allocations).reduce((sum, val) => sum + (val || 0), 0);
  const remainingBudget = totalBudget - totalAllocated;

  useEffect(() => {
    fetchTotalBudget();
    fetchRegions();
  }, []);

  const fetchTotalBudget = async () => {
    try {
      // Try to get the total budget from a system_config table or similar
      const { data, error } = await supabase
        .from("system_config")
        .select("value")
        .eq("key", "total_budget")
        .single();
        
      if (!error && data) {
        setTotalBudget(parseFloat(data.value) || 1000000);
      }
    } catch (err) {
      console.error("Error fetching total budget:", err);
      // If there's an error, we'll use the default value
    }
  };

  const fetchRegions = async () => {
    setLoading(true);
    
    try {
      // Try using direct SQL to bypass RLS if needed
      const { data, error } = await supabase
        .from("regions")
        .select("*");
      
      if (error) throw error;
      
      if (data) {
        // Also get the current budgets for regions
        const { data: budgetData, error: budgetError } = await supabase
          .from("region_budgets")
          .select("region_id, amount");
          
        if (budgetError) throw budgetError;
        
        // Create a map of region ID to budget amount
        const budgetMap: Record<string, number> = {};
        if (budgetData) {
          budgetData.forEach((budget: any) => {
            budgetMap[budget.region_id] = budget.amount || 0;
          });
        }
        
        // Create a map of region ID to allocation amount (initialize with current values)
        const regionAllocations: Record<string, number> = {};
        data.forEach((region: any) => {
          regionAllocations[region.id] = budgetMap[region.id] || 0;
        });
        
        // Set the initial allocations state
        setAllocations(regionAllocations);
        
        // Format regions with current budget
        const formattedRegions = data.map((region: any) => ({
          id: region.id,
          name: region.name,
          current_budget: budgetMap[region.id] || 0
        }));
        
        setRegions(formattedRegions);
      } else {
        setRegions([]);
      }
    } catch (err: any) {
      console.error("Error fetching regions:", err);
      setError(err.message || "Failed to load regions");
      setRegions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAllocationChange = (regionId: string, value: string) => {
    const amount = value === "" ? 0 : parseFloat(value);
    if (isNaN(amount) || amount < 0) return;
    
    setAllocations(prev => ({
      ...prev,
      [regionId]: amount
    }));
  };

  const saveAllocations = async () => {
    // Check if total allocation exceeds budget
    if (totalAllocated > totalBudget) {
      toast({
        title: "Error",
        description: "Total allocation exceeds available budget. Please adjust allocations.",
        variant: "destructive"
      });
      return;
    }
    
    setSaving(true);
    
    try {
      // Create an array of upsert operations
      const upsertData = Object.entries(allocations).map(([regionId, amount]) => ({
        region_id: regionId,
        amount: amount
      }));
      
      // Use upsert to update or insert budget records
      const { error } = await supabase
        .from("region_budgets")
        .upsert(upsertData, {
          onConflict: 'region_id'
        });
        
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Budget allocations have been saved.",
      });
      
      // Refresh regions after saving
      fetchRegions();
      
    } catch (err: any) {
      console.error("Error saving allocations:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to save budget allocations.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // Filter regions based on search query
  const filteredRegions = regions.filter(region => 
    region.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout userRole="superadmin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Budget Management</h1>
          <Button 
            onClick={saveAllocations} 
            disabled={saving}
            className="gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            <Save className="h-4 w-4" />
            Save Allocations
          </Button>
        </div>

        {error && (
          <Card className="border-destructive">
            <CardContent className="p-4 flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              <p>{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Budget Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Budget Overview</CardTitle>
            <CardDescription>Total system budget and allocations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">Total Budget</div>
                <div className="text-2xl font-bold">${totalBudget.toLocaleString()}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Allocated</div>
                <div className="text-2xl font-bold">${totalAllocated.toLocaleString()}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Remaining</div>
                <div className="text-2xl font-bold">${remainingBudget.toLocaleString()}</div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Allocation Progress</span>
                <span>{Math.round((totalAllocated / totalBudget) * 100)}%</span>
              </div>
              <Progress value={(totalAllocated / totalBudget) * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Region Allocations */}
        <Card>
          <CardHeader>
            <CardTitle>Region Allocations</CardTitle>
            <CardDescription>Manage budget allocations for each region</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search regions..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Region Name</TableHead>
                    <TableHead>Current Budget</TableHead>
                    <TableHead>New Allocation</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : filteredRegions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        No regions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRegions.map((region) => (
                      <TableRow key={region.id}>
                        <TableCell className="font-medium">{region.name}</TableCell>
                        <TableCell>${region.current_budget.toLocaleString()}</TableCell>
                        <TableCell className="w-52">
                          <Input
                            type="number"
                            value={allocations[region.id] || 0}
                            onChange={(e) => handleAllocationChange(region.id, e.target.value)}
                            min={0}
                          />
                        </TableCell>
                        <TableCell>
                          {allocations[region.id] > region.current_budget ? (
                            <Badge className="bg-green-100 text-green-800">Increase</Badge>
                          ) : allocations[region.id] < region.current_budget ? (
                            <Badge className="bg-red-100 text-red-800">Decrease</Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800">Unchanged</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
} 