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
import { CalendarIcon, DollarSign, Building2, SendIcon, History, Loader2, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

export default function RegionalBudgetManagement() {
  const [region, setRegion] = useState<any>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<any | null>(null);
  const [showAllocate, setShowAllocate] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [allocating, setAllocating] = useState(false);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [activeTab, setActiveTab] = useState("overview");
  const [totalBudget, setTotalBudget] = useState(0);
  const [totalAllocated, setTotalAllocated] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();
  const [orgRequests, setOrgRequests] = useState<any[]>([]);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  // Fetch region data for the current user
  useEffect(() => {
    const fetchUserRegion = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        
        // Get the user's assigned region
        const { data: userRegion, error: userRegionError } = await supabase
          .from("user_regions")
          .select("region_id")
          .eq("user_id", user.id)
          .single();
          
        if (userRegionError) throw userRegionError;
        
        if (!userRegion) {
          setError("You don't have any assigned region. Please contact an administrator.");
          return;
        }
        
        // Get region details
        const { data: regionData, error: regionError } = await supabase
          .from("regions")
          .select("*")
          .eq("id", userRegion.region_id)
          .single();
          
        if (regionError) throw regionError;
        
        setRegion(regionData);
        
        // Now fetch the budget data
        fetchData(regionData.id, selectedYear);
      } catch (err: any) {
        console.error("Error fetching region:", err);
        setError(err.message || "Failed to load region data");
        toast({
          title: "Error",
          description: "Failed to load region data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserRegion();
  }, [user]);

  // Fetch organizations and budget data
  const fetchData = async (regionId: string, year = CURRENT_YEAR) => {
    if (!regionId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch organizations in this region
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("id, name, status")
        .eq("region_id", regionId);
        
      if (orgError) throw orgError;
      
      // Fetch organization budgets for selected year
      const { data: budgetData, error: budgetError } = await supabase
        .from("organization_budgets")
        .select("id, organization_id, total_allocation")
        .eq("fiscal_year", year);
        
      if (budgetError) throw budgetError;
      
      // Calculate total allocated budget
      const totalAmount = budgetData.reduce((sum, budget) => sum + (budget.total_allocation || 0), 0);
      setTotalAllocated(totalAmount);
      
      // Merge data
      const merged = orgData.map(org => {
        const budget = budgetData.find(b => b.organization_id === org.id);
        return { 
          ...org, 
          currentAllocation: budget ? budget.total_allocation : 0, 
          budget_id: budget ? budget.id : null 
        };
      });
      
      setOrganizations(merged);
      
      // Fetch region budget for the year
      const { data: regionBudget, error: regionBudgetError } = await supabase
        .from("region_budgets")
        .select("amount")
        .eq("region_id", regionId)
        // Remove fiscal_year filter to prevent errors
        // .eq("fiscal_year", year)
        .single();
        
      if (!regionBudgetError && regionBudget) {
        setTotalBudget(regionBudget.amount);
      } else {
        // If no budget set for this region, default to 0
        setTotalBudget(0);
      }
    } catch (err: any) {
      console.error("Error loading data:", err);
      // Special handling for the fiscal_year column error
      if (err.message && err.message.includes("fiscal_year does not exist")) {
        // Try again without fiscal_year filter
        try {
          const { data: fallbackBudget } = await supabase
            .from("region_budgets")
            .select("amount")
            .eq("region_id", regionId)
            .single();
            
          if (fallbackBudget) {
            setTotalBudget(fallbackBudget.amount);
          } else {
            setTotalBudget(0);
          }
        } catch (fallbackErr) {
          console.error("Fallback query failed:", fallbackErr);
          setTotalBudget(0);
        }
      } else {
        setError(err.message || "Failed to load data");
        toast({
          title: "Error loading data",
          description: err.message || "Failed to load budget data",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch allocation history for an organization
  const openHistory = async (org: any) => {
    setSelectedOrg(org);
    setShowHistory(true);
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from("budget_allocations")
        .select("id, amount, note, created_at, allocated_by")
        .eq("organization_id", org.id)
        // Remove fiscal_year filter to prevent errors
        // .eq("fiscal_year", selectedYear)
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      setAllocations(data || []);
    } catch (err: any) {
      console.error("Error loading allocation history:", err);
      // Handle specific column error
      if (err.message && err.message.includes("fiscal_year does not exist")) {
        // Just show whatever allocations are available without the filter
        try {
          const { data: fallbackData } = await supabase
            .from("budget_allocations")
            .select("id, amount, note, created_at, allocated_by")
            .eq("organization_id", org.id)
            .order("created_at", { ascending: false });
            
          setAllocations(fallbackData || []);
        } catch (fallbackErr) {
          console.error("Fallback query failed:", fallbackErr);
          setAllocations([]);
          setError("Failed to load allocation history");
        }
      } else {
        setError(err.message || "Failed to load allocation history");
        toast({
          title: "Error",
          description: "Failed to load allocation history",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper to get or create organization budget
  const getOrCreateOrgBudget = async (orgId: string) => {
    try {
      // Try to fetch the budget for this organization and year
      const { data, error } = await supabase
        .from("organization_budgets")
        .select("id, total_allocation")
        .eq("organization_id", orgId)
        .eq("fiscal_year", selectedYear)
        .single();
        
      if (data) return data;
      
      // If not found, create it
      const { data: created, error: createError } = await supabase
        .from("organization_budgets")
        .insert([{ 
          organization_id: orgId, 
          fiscal_year: selectedYear, 
          total_allocation: 0,
          utilized_amount: 0,
          remaining_amount: 0
        }])
        .select("id, total_allocation")
        .single();
        
      if (createError) throw createError;
      return created;
    } catch (err: any) {
      // Handle fiscal_year column error
      if (err.message && err.message.includes("fiscal_year does not exist")) {
        // Try again without fiscal_year
        const { data: fallbackData } = await supabase
          .from("organization_budgets")
          .select("id, total_allocation")
          .eq("organization_id", orgId)
          .single();
          
        if (fallbackData) return fallbackData;
        
        // If not found, create without fiscal_year
        const { data: fallbackCreated } = await supabase
          .from("organization_budgets")
          .insert([{ 
            organization_id: orgId, 
            total_allocation: 0,
            utilized_amount: 0,
            remaining_amount: 0
          }])
          .select("id, total_allocation")
          .single();
          
        return fallbackCreated;
      }
      throw err;
    }
  };

  // Open allocate modal for organization
  const openAllocate = async (org: any) => {
    setSelectedOrg(org);
    setAmount("");
    setNote("");
    setShowAllocate(true);
    
    // Ensure budget exists for this organization
    if (!org.budget_id) {
      setLoading(true);
      try {
        const budget = await getOrCreateOrgBudget(org.id);
        
        // Update the organization in state with the new budget id
        setOrganizations(prev => prev.map(o => 
          o.id === org.id ? 
          { ...o, budget_id: budget.id, currentAllocation: budget.total_allocation } : 
          o
        ));
        
        setSelectedOrg(o => o ? 
          { ...o, budget_id: budget.id, currentAllocation: budget.total_allocation } : 
          o
        );
      } catch (err: any) {
        setError(err.message || "Failed to create organization budget");
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

  // Handle budget allocation to organization
  const handleAllocate = async () => {
    if (!selectedOrg || !amount || isNaN(Number(amount))) return;
    
    // Check if allocation would exceed total budget
    if (totalAllocated + Number(amount) > totalBudget) {
      toast({
        title: "Budget Exceeded",
        description: "This allocation would exceed the region's total budget",
        variant: "destructive"
      });
      return;
    }
    
    setAllocating(true);
    setError(null);
    
    try {
      // Insert allocation record
      const { data: alloc, error: allocError } = await supabase
        .from("budget_allocations")
        .insert([{
          organization_id: selectedOrg.id,
          budget_id: selectedOrg.budget_id,
          allocated_by: user?.id,
          fiscal_year: selectedYear,
          amount: Number(amount),
          note,
        }]);
        
      if (allocError) throw allocError;
      
      // Update organization budget
      const newTotal = Number(selectedOrg.currentAllocation) + Number(amount);
      
      const { error: updateError } = await supabase
        .from("organization_budgets")
        .update({ 
          total_allocation: newTotal,
          remaining_amount: newTotal 
        })
        .eq("id", selectedOrg.budget_id);
        
      if (updateError) throw updateError;
      
      // Add audit log
      await supabase.from("budget_audit_logs").insert([{
        action: "allocate",
        performed_by: user?.id,
        target_id: selectedOrg.budget_id,
        details: { 
          amount, 
          note,
          organization: selectedOrg.name,
          fiscal_year: selectedYear
        },
      }]);
      
      // Close modal and reset state
      setShowAllocate(false);
      setSelectedOrg(null);
      setAmount("");
      setNote("");
      
      // Show success message
      toast({
        title: "Budget Allocated",
        description: `Successfully allocated ₱${Number(amount).toLocaleString()} to ${selectedOrg.name}`,
      });
      
      // Refresh data
      if (region) {
        fetchData(region.id, selectedYear);
      }
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

  // Add function to load organization budget requests
  const loadOrgRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("organization_budget_requests")
        .select(`
          *,
          organizations (
            id,
            name,
            status
          )
        `)
        .eq("region_id", region?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrgRequests(data || []);
    } catch (err: any) {
      console.error("Error loading organization requests:", err);
      toast({
        title: "Error",
        description: "Failed to load organization budget requests",
        variant: "destructive"
      });
    }
  };

  // Add function to process organization budget request
  const handleOrgRequest = async (requestId: string, status: "approved" | "rejected", response: string = "") => {
    setProcessingRequestId(requestId);
    try {
      const { error } = await supabase
        .from("organization_budget_requests")
        .update({
          status,
          response,
          processed_at: new Date().toISOString(),
          processed_by: user?.id
        })
        .eq("id", requestId);

      if (error) throw error;

      // If approved, update organization budget
      if (status === "approved") {
        const request = orgRequests.find(r => r.id === requestId);
        if (request) {
          const { error: budgetError } = await supabase
            .from("organization_budgets")
            .upsert({
              organization_id: request.organization_id,
              fiscal_year: selectedYear,
              total_allocation: request.requested_amount,
              remaining_amount: request.requested_amount
            });

          if (budgetError) throw budgetError;
        }
      }

      toast({
        title: `Request ${status === "approved" ? "Approved" : "Rejected"}`,
        description: `The organization's budget request has been ${status}.`
      });

      loadOrgRequests();
      fetchData(region?.id, selectedYear); // Refresh budget data
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || `Failed to ${status} request`,
        variant: "destructive"
      });
    } finally {
      setProcessingRequestId(null);
    }
  };

  useEffect(() => {
    if (region?.id) {
      loadOrgRequests();
    }
  }, [region]);

  return (
    <DashboardLayout userRole="regional">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Organization Budget Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage budget allocations for organizations in your region
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(Number(value))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="organizations">Organizations</TabsTrigger>
            <TabsTrigger value="inbox">
              <Inbox className="h-4 w-4 mr-2" />
              Budget Requests
              {orgRequests.filter(r => r.status === "pending").length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {orgRequests.filter(r => r.status === "pending").length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Total Region Budget</CardTitle>
                  <CardDescription>Fiscal Year {selectedYear}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₱{totalBudget.toLocaleString()}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Allocated to Organizations</CardTitle>
                  <CardDescription>Current allocations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₱{totalAllocated.toLocaleString()}</div>
                  <Progress 
                    value={totalBudget > 0 ? (totalAllocated / totalBudget) * 100 : 0} 
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {totalBudget > 0 
                      ? `${((totalAllocated / totalBudget) * 100).toFixed(1)}% of total budget`
                      : "No budget set for this year"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Available for Allocation</CardTitle>
                  <CardDescription>Remaining budget</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₱{Math.max(0, totalBudget - totalAllocated).toLocaleString()}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Organization Overview</CardTitle>
                <CardDescription>Summary of budget allocation by organization</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Allocated Budget</TableHead>
                      <TableHead>% of Total</TableHead>
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
                        <TableCell>₱{org.currentAllocation.toLocaleString()}</TableCell>
                        <TableCell>
                          {totalBudget > 0 ? 
                            ((org.currentAllocation / totalBudget) * 100).toFixed(1) + '%' : 
                            '0%'
                          }
                          <Progress 
                            value={totalBudget > 0 ? (org.currentAllocation / totalBudget) * 100 : 0}
                            className="h-2 mt-1"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="organizations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Organization Budget Allocation</CardTitle>
                <CardDescription>Manage and allocate budgets to organizations in your region</CardDescription>
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
                        <TableHead>% of Total</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {organizations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No organizations found in this region.
                          </TableCell>
                        </TableRow>
                      ) : (
                        organizations.map(org => (
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
                            <TableCell>
                              ₱{org.currentAllocation.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              {totalBudget > 0 ? 
                                ((org.currentAllocation / totalBudget) * 100).toFixed(1) + '%' : 
                                '0%'
                              }
                              <Progress 
                                value={totalBudget > 0 ? (org.currentAllocation / totalBudget) * 100 : 0}
                                className="h-2 mt-1"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button 
                                  size="sm" 
                                  onClick={() => openAllocate(org)}
                                  disabled={totalBudget === 0 || org.status !== 'active'}
                                >
                                  <SendIcon className="h-4 w-4 mr-1" />
                                  Allocate
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => openHistory(org)}
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
                      <strong>Note:</strong> No budget has been allocated to your region for {selectedYear}. 
                      Please contact the super administrator.
                    </p>
                  </div>
                </CardFooter>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="inbox" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Organization Budget Requests</CardTitle>
                <CardDescription>Review and process budget requests from organizations</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Requested Amount</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Date Requested</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : orgRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No budget requests found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      orgRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-medium">
                            {request.organizations?.name}
                          </TableCell>
                          <TableCell>₱{request.requested_amount.toLocaleString()}</TableCell>
                          <TableCell>{request.reason}</TableCell>
                          <TableCell>{new Date(request.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                request.status === "approved" ? "success" : 
                                request.status === "rejected" ? "destructive" : 
                                "outline"
                              }
                            >
                              {request.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {request.status === "pending" && (
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleOrgRequest(request.id, "approved")}
                                  disabled={processingRequestId === request.id}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleOrgRequest(request.id, "rejected")}
                                  disabled={processingRequestId === request.id}
                                >
                                  Reject
                                </Button>
                              </div>
                            )}
                            {request.status !== "pending" && request.response && (
                              <p className="text-sm text-muted-foreground">
                                {request.response}
                              </p>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Allocation Modal */}
        <Dialog open={showAllocate} onOpenChange={setShowAllocate}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Allocate Budget to {selectedOrg?.name}</DialogTitle>
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
              
              {selectedOrg && (
                <div className="bg-muted/50 p-3 rounded-md text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Current allocation:</span>
                    <span>₱ {selectedOrg.currentAllocation.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>New total:</span>
                    <span>₱ {(selectedOrg.currentAllocation + (Number(amount) || 0)).toLocaleString()}</span>
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
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
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
              <DialogTitle>Allocation History for {selectedOrg?.name}</DialogTitle>
              <DialogDescription>
                Fiscal year {selectedYear} budget allocations
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {loading ? (
                <div className="flex justify-center items-center h-[200px]">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : allocations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No allocation history found for this organization.
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