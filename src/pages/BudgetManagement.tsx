import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { CalendarIcon, DollarSign, History, PlusCircle, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

export default function BudgetManagement() {
  const [regions, setRegions] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<any | null>(null);
  const [showAllocate, setShowAllocate] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [allocating, setAllocating] = useState(false);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [activeTab, setActiveTab] = useState("regions");
  const [totalBudget, setTotalBudget] = useState(0);
  const [totalAllocated, setTotalAllocated] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch regions and their current year allocation
  const fetchData = async (year = CURRENT_YEAR) => {
    setLoading(true);
    setError(null);
    try {
      // Fetch regions
      const { data: regionData, error: regionError } = await supabase.from("regions").select("id, name");
      if (regionError) throw regionError;
      
      // Fetch annual budgets for selected year
      const { data: budgetData, error: budgetError } = await supabase
        .from("annual_budgets")
        .select("id, region_id, amount")
        .eq("year", year);
      if (budgetError) throw budgetError;
      
      // Calculate total allocated budget
      const totalAmount = budgetData.reduce((sum, budget) => sum + (budget.amount || 0), 0);
      setTotalAllocated(totalAmount);
      
      // Merge data
      const merged = regionData.map(region => {
        const budget = budgetData.find(b => b.region_id === region.id);
        return { 
          ...region, 
          currentAllocation: budget ? budget.amount : 0, 
          annual_budget_id: budget ? budget.id : null 
        };
      });
      
      setRegions(merged);
      
      // Fetch total budget for the year
      const { data: yearBudget, error: yearError } = await supabase
        .from("fiscal_year_budgets")
        .select("total_amount")
        .eq("year", year)
        .single();
        
      if (!yearError && yearBudget) {
        setTotalBudget(yearBudget.total_amount);
      } else {
        // If no budget set for this year, default to 0
        setTotalBudget(0);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load data");
      toast({
        title: "Error loading data",
        description: err.message || "Failed to load budget data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedYear);
  }, [selectedYear]);

  // Fetch allocation history for a region
  const openHistory = async (region: any) => {
    setSelectedRegion(region);
    setShowHistory(true);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("budget_allocations")
        .select("id, amount, note, created_at, allocated_by")
        .eq("annual_budget_id", region.annual_budget_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setAllocations(data);
    } catch (err: any) {
      setError(err.message || "Failed to load allocation history");
      toast({
        title: "Error",
        description: "Failed to load allocation history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper to get or create annual budget for a region
  const getOrCreateAnnualBudget = async (regionId: string) => {
    // Try to fetch the annual budget for this region and year
    const { data, error } = await supabase
      .from("annual_budgets")
      .select("id, amount")
      .eq("region_id", regionId)
      .eq("year", selectedYear)
      .single();
    if (data) return data;
    // If not found, create it
    const { data: created, error: createError } = await supabase
      .from("annual_budgets")
      .insert([{ region_id: regionId, year: selectedYear, amount: 0 }])
      .select("id, amount")
      .single();
    if (createError) throw createError;
    return created;
  };

  // Modified openAllocate to ensure annual budget exists
  const openAllocate = async (region: any) => {
    setSelectedRegion(region);
    setAmount("");
    setNote("");
    setShowAllocate(true);
    // Ensure annual budget exists for this region
    if (!region.annual_budget_id) {
      setLoading(true);
      try {
        const budget = await getOrCreateAnnualBudget(region.id);
        // Update the region in state with the new budget id
        setRegions(prev => prev.map(r => r.id === region.id ? { ...r, annual_budget_id: budget.id, currentAllocation: budget.amount } : r));
        setSelectedRegion(r => r ? { ...r, annual_budget_id: budget.id, currentAllocation: budget.amount } : r);
      } catch (err: any) {
        setError(err.message || "Failed to create annual budget");
        toast({
          title: "Error",
          description: "Failed to create budget record",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAllocate = async () => {
    if (!selectedRegion || !amount || isNaN(Number(amount))) return;
    
    // Check if allocation would exceed total budget
    if (totalAllocated + Number(amount) > totalBudget) {
      toast({
        title: "Budget Exceeded",
        description: "This allocation would exceed the total budget for the year",
        variant: "destructive"
      });
      return;
    }
    
    setAllocating(true);
    setError(null);
    try {
      // Insert allocation
      const { data: alloc, error: allocError } = await supabase.from("budget_allocations").insert([
        {
          annual_budget_id: selectedRegion.annual_budget_id,
          allocated_by: user?.id,
          allocated_to: selectedRegion.id,
          allocation_type: "region",
          amount: Number(amount),
          note,
        },
      ]);
      if (allocError) throw allocError;
      
      // Update annual budget
      const { error: updateError } = await supabase
        .from("annual_budgets")
        .update({ amount: Number(selectedRegion.currentAllocation) + Number(amount) })
        .eq("id", selectedRegion.annual_budget_id);
      if (updateError) throw updateError;
      
      // Add audit log
      await supabase.from("budget_audit_logs").insert([
        {
          action: "allocate",
          performed_by: user?.id,
          target_id: selectedRegion.annual_budget_id,
          details: { amount, note },
        },
      ]);
      
      // Close modal and reset state
      setShowAllocate(false);
      setSelectedRegion(null);
      setAmount("");
      setNote("");
      
      // Show success message
      toast({
        title: "Budget Allocated",
        description: `Successfully allocated ₱${Number(amount).toLocaleString()} to ${selectedRegion.name}`,
      });
      
      // Refresh data
      fetchData(selectedYear);
    } catch (err: any) {
      setError(err.message || "Failed to allocate budget");
      toast({
        title: "Error",
        description: err.message || "Failed to allocate budget",
        variant: "destructive"
      });
    } finally {
      setAllocating(false);
    }
  };

  return (
    <DashboardLayout userRole="superadmin">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Budget Management</h1>
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
            <Button size="sm" variant="outline" onClick={() => fetchData(selectedYear)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₱ {totalBudget.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Fiscal year {selectedYear}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Allocated Budget</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₱ {totalAllocated.toLocaleString()}</div>
              <Progress 
                value={totalBudget > 0 ? (totalAllocated / totalBudget) * 100 : 0} 
                className="h-2 mt-2" 
              />
              <p className="text-xs text-muted-foreground mt-1">
                {totalBudget > 0 
                  ? `${((totalAllocated / totalBudget) * 100).toFixed(1)}% of total budget`
                  : "No budget set for this year"}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Remaining Budget</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₱ {Math.max(0, totalBudget - totalAllocated).toLocaleString()}</div>
              <Progress 
                value={totalBudget > 0 ? Math.max(0, (totalBudget - totalAllocated) / totalBudget) * 100 : 0} 
                className="h-2 mt-2" 
              />
              <p className="text-xs text-muted-foreground mt-1">
                Available for allocation
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Regions</CardTitle>
              <Badge variant="outline">{regions.length}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{regions.length}</div>
              <p className="text-xs text-muted-foreground">
                {regions.filter(r => r.currentAllocation > 0).length} regions with budget
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="regions">Regional Allocation</TabsTrigger>
            <TabsTrigger value="history">Allocation History</TabsTrigger>
            <TabsTrigger value="settings">Budget Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="regions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Regional Budget Allocation</CardTitle>
                <CardDescription>Manage and allocate budgets to different regions</CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="bg-destructive/10 text-destructive p-3 rounded-md mb-4">
                    {error}
                  </div>
                )}
                {loading ? (
                  <div className="flex justify-center items-center h-[200px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Region Name</TableHead>
                        <TableHead>Current Allocation</TableHead>
                        <TableHead>% of Total</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {regions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No regions found. Please create regions first.
                          </TableCell>
                        </TableRow>
                      ) : (
                        regions.map(region => (
                          <TableRow key={region.id}>
                            <TableCell className="font-medium">{region.name}</TableCell>
                            <TableCell>
                              ₱ {region.currentAllocation ? region.currentAllocation.toLocaleString() : '0'}
                            </TableCell>
                            <TableCell>
                              {totalBudget > 0 ? 
                                ((region.currentAllocation / totalBudget) * 100).toFixed(1) + '%' : 
                                '0%'
                              }
                              <Progress 
                                value={totalBudget > 0 ? (region.currentAllocation / totalBudget) * 100 : 0}
                                className="h-2 mt-1"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button 
                                  size="sm" 
                                  onClick={() => openAllocate(region)}
                                  disabled={totalBudget === 0}
                                >
                                  <PlusCircle className="h-4 w-4 mr-1" />
                                  Allocate
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => openHistory(region)}
                                  disabled={!region.annual_budget_id}
                                >
                                  <History className="h-4 w-4 mr-1" />
                                  History
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
              {totalBudget === 0 && (
                <CardFooter>
                  <div className="w-full bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 p-3 rounded-md">
                    <p className="text-sm">
                      <strong>Note:</strong> No budget has been set for {selectedYear}. Please add a budget in Settings.
                    </p>
                  </div>
                </CardFooter>
              )}
            </Card>
          </TabsContent>
          
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Allocation History</CardTitle>
                <CardDescription>View all budget allocations for {selectedYear}</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center items-center h-[200px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Select a region and click "History" to view allocation history.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Budget Settings</CardTitle>
                <CardDescription>Configure annual budget and allocation rules</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-medium mb-2">Fiscal Year Budget</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="totalBudget">Total Budget for {selectedYear}</Label>
                      <div className="flex gap-2">
                        <Input 
                          id="totalBudget" 
                          type="number" 
                          placeholder="Enter amount" 
                          value={totalBudget}
                          onChange={(e) => setTotalBudget(Number(e.target.value))}
                        />
                        <Button>Save</Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Budget Status</Label>
                      <div className="p-4 border rounded-md">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Allocated: ₱{totalAllocated.toLocaleString()}</span>
                          <span>Total: ₱{totalBudget.toLocaleString()}</span>
                        </div>
                        <Progress value={totalBudget > 0 ? (totalAllocated / totalBudget) * 100 : 0} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-2">
                          Remaining: ₱{Math.max(0, totalBudget - totalAllocated).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="font-medium mb-2">Budget Allocation Rules</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="allowOverBudget" />
                      <Label htmlFor="allowOverBudget">Allow over-budget allocations</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      When enabled, allows allocating more than the total budget
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Allocation Modal */}
        <Dialog open={showAllocate} onOpenChange={setShowAllocate}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Allocate Budget to {selectedRegion?.name}</DialogTitle>
              <DialogDescription>
                Enter the amount to allocate for fiscal year {selectedYear}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="amount"
                    type="number"
                    className="pl-9"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min={1}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="note">Note</Label>
                <Input
                  id="note"
                  placeholder="Purpose of allocation (optional)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              
              {selectedRegion && (
                <div className="bg-muted/50 p-3 rounded-md text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Current allocation:</span>
                    <span>₱ {selectedRegion.currentAllocation.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>New total:</span>
                    <span>₱ {(selectedRegion.currentAllocation + (Number(amount) || 0)).toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAllocate(false)}>Cancel</Button>
              <Button 
                onClick={handleAllocate} 
                disabled={allocating || !amount || isNaN(Number(amount)) || Number(amount) <= 0}
              >
                {allocating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    Allocating...
                  </>
                ) : "Confirm Allocation"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* History Modal */}
        <Dialog open={showHistory} onOpenChange={setShowHistory}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Allocation History for {selectedRegion?.name}</DialogTitle>
              <DialogDescription>
                Fiscal year {selectedYear} budget allocations
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {loading ? (
                <div className="flex justify-center items-center h-[200px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : allocations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No allocation history found for this region.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allocations.map(alloc => (
                      <TableRow key={alloc.id}>
                        <TableCell>
                          {new Date(alloc.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>₱ {alloc.amount.toLocaleString()}</TableCell>
                        <TableCell>{alloc.note || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowHistory(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
} 