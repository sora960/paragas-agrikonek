import { useEffect, useState } from "react";
import { Table, TableRow, TableCell, TableHead, TableBody, TableHeader } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { organizationService } from "@/services/organizationService";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface BudgetRequest {
  id: string;
  farmer_id: string;
  organization_id: string;
  amount: number;
  purpose: string;
  details?: string;
  status: string;
  request_date: string;
  approval_date?: string;
  approved_by?: string;
  notes?: string;
  farmer_profile?: {
    full_name: string;
    farm_name: string;
  };
}

export default function OrganizationBudgetRequests() {
  const { user } = useAuth();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [requests, setRequests] = useState<BudgetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("pending");

  useEffect(() => {
    if (user?.id) {
      loadOrganizationId();
    }
    // eslint-disable-next-line
  }, [user]);

  useEffect(() => {
    if (organizationId) {
      fetchRequests();
    }
    // eslint-disable-next-line
  }, [organizationId, filter]);

  async function loadOrganizationId() {
    try {
      const orgs = await organizationService.getOrganizationByAdmin(user.id);
      if (orgs && orgs.length > 0) {
        setOrganizationId(orgs[0].id);
      } else {
        toast.error("No organization found for this admin.");
      }
    } catch (error) {
      toast.error("Failed to load organization.");
    }
  }

  async function fetchRequests() {
    setLoading(true);
    let query = supabase
      .from("farmer_budget_requests")
      .select(`*, farmer_profile:farmer_id(full_name, farm_name)`)
      .eq("organization_id", organizationId)
      .order("request_date", { ascending: false });
    if (filter !== "all") {
      query = query.eq("status", filter);
    }
    const { data, error } = await query;
    if (error) {
      toast.error("Failed to load budget requests");
      setRequests([]);
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  }

  async function handleAction(id: string, action: "approved" | "rejected") {
    try {
      setActionLoading(id + action);
      
      // Get the request details first
      const { data: requestData, error: requestError } = await supabase
        .from("farmer_budget_requests")
        .select("*")
        .eq("id", id)
        .single();
        
      if (requestError) {
        throw new Error(`Error retrieving request details: ${requestError.message}`);
      }
      
      // If approving, update both organization and farmer budgets
      if (action === "approved") {
        const amount = Number(requestData.amount);
        
        // Start a transaction to ensure all operations succeed or fail together
        const { error: updateError } = await supabase.rpc('process_farmer_budget_request', {
          request_id: id,
          approve: true,
          admin_id: user?.id
        });
        
        if (updateError) {
          // If RPC fails, try direct operations (fallback approach)
          console.log("RPC failed, trying direct updates:", updateError);
          
          // 1. Update organization budget first (reduce remaining balance)
          const { error: orgBudgetError } = await supabase
            .from("organization_budgets")
            .update({ 
              remaining_balance: supabase.rpc('decrement', { 
                x: amount 
              })
            })
            .eq("organization_id", requestData.organization_id);
            
          if (orgBudgetError) {
            throw new Error(`Error updating organization budget: ${orgBudgetError.message}`);
          }
          
          // 2. Check if farmer budget exists
          const { data: farmerBudget, error: checkError } = await supabase
            .from("farmer_budgets")
            .select("*")
            .eq("farmer_id", requestData.farmer_id)
            .eq("organization_id", requestData.organization_id)
            .maybeSingle();
            
          if (checkError) {
            throw new Error(`Error checking farmer budget: ${checkError.message}`);
          }
          
          // 3. Update or create farmer budget
          if (farmerBudget) {
            // Update existing farmer budget
            const { error: farmerBudgetError } = await supabase
              .from("farmer_budgets")
              .update({
                total_allocation: farmerBudget.total_allocation + amount,
                remaining_balance: farmerBudget.remaining_balance + amount,
                updated_at: new Date().toISOString()
              })
              .eq("id", farmerBudget.id);
              
            if (farmerBudgetError) {
              throw new Error(`Error updating farmer budget: ${farmerBudgetError.message}`);
            }
          } else {
            // Create new farmer budget
            const { error: createBudgetError } = await supabase
              .from("farmer_budgets")
              .insert({
                farmer_id: requestData.farmer_id,
                organization_id: requestData.organization_id,
                total_allocation: amount,
                remaining_balance: amount,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
              
            if (createBudgetError) {
              throw new Error(`Error creating farmer budget: ${createBudgetError.message}`);
            }
          }
        }
      }
      
      // Update the request status
      const { error: statusError } = await supabase
        .from("farmer_budget_requests")
        .update({ 
          status: action, 
          approval_date: action === "approved" ? new Date().toISOString() : null,
          approved_by: action === "approved" ? user?.id : null,
          notes: action === "rejected" ? "Request rejected by organization admin" : "Request approved and budget updated"
        })
        .eq("id", id);
        
      if (statusError) {
        throw new Error(`Error updating request status: ${statusError.message}`);
      }
      
      toast.success(`Request ${action}${action === "approved" ? " and budget updated" : ""}`);
      fetchRequests();
      
    } catch (error: any) {
      console.error("Error processing budget request:", error);
      toast.error(error.message || `Failed to ${action} request`);
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <DashboardLayout userRole="organization">
      <div className="container mx-auto max-w-6xl py-6">
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Budget Requests</h1>
            <p className="text-muted-foreground mt-1">
              Review, approve, or reject budget requests from your farmers.
            </p>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Filters</CardTitle>
              <CardDescription>Select a status to filter requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant={filter === "pending" ? "default" : "outline"} 
                  onClick={() => setFilter("pending")}
                  className="min-w-24"
                >
                  Pending
                </Button>
                <Button 
                  variant={filter === "approved" ? "default" : "outline"} 
                  onClick={() => setFilter("approved")}
                  className="min-w-24"
                >
                  Approved
                </Button>
                <Button 
                  variant={filter === "rejected" ? "default" : "outline"} 
                  onClick={() => setFilter("rejected")}
                  className="min-w-24"
                >
                  Rejected
                </Button>
                <Button 
                  variant={filter === "all" ? "default" : "outline"} 
                  onClick={() => setFilter("all")}
                  className="min-w-24"
                >
                  All
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Budget Request List</CardTitle>
              <CardDescription>
                {loading ? "Loading requests..." : 
                 requests.length === 0 ? "No requests found" : 
                 `Showing ${requests.length} ${filter !== "all" ? filter : ""} request${requests.length !== 1 ? "s" : ""}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableCell className="w-[180px] font-medium">Farmer</TableCell>
                      <TableCell className="w-[180px] font-medium">Farm</TableCell>
                      <TableCell className="w-[120px] font-medium">Amount</TableCell>
                      <TableCell className="w-[250px] font-medium">Purpose</TableCell>
                      <TableCell className="w-[120px] font-medium">Date</TableCell>
                      <TableCell className="w-[100px] font-medium">Status</TableCell>
                      <TableCell className="w-[180px] font-medium">Actions</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          <div className="flex justify-center items-center">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            <span className="ml-2">Loading requests...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : requests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                          No {filter !== "all" ? filter : ""} requests found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      requests.map((req) => (
                        <TableRow key={req.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">{req.farmer_profile?.full_name || req.farmer_id}</TableCell>
                          <TableCell>{req.farmer_profile?.farm_name || "-"}</TableCell>
                          <TableCell className="font-medium">₱{Number(req.amount).toLocaleString()}</TableCell>
                          <TableCell className="max-w-[250px] truncate" title={req.purpose}>
                            {req.purpose}
                          </TableCell>
                          <TableCell>{new Date(req.request_date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge variant={
                              req.status === "pending" ? "outline" : 
                              req.status === "approved" ? "success" : 
                              "destructive"
                            } className="whitespace-nowrap">
                              {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {req.status === "pending" ? (
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  className="h-8 px-3 bg-green-600 hover:bg-green-700"
                                  disabled={actionLoading === req.id + "approved"} 
                                  onClick={() => handleAction(req.id, "approved")}
                                >
                                  {actionLoading === req.id + "approved" ? (
                                    <>
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      Approving...
                                    </>
                                  ) : "Approve"}
                                </Button>
                                <Button 
                                  size="sm"
                                  className="h-8 px-3" 
                                  variant="destructive" 
                                  disabled={actionLoading === req.id + "rejected"} 
                                  onClick={() => handleAction(req.id, "rejected")}
                                >
                                  {actionLoading === req.id + "rejected" ? (
                                    <>
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      Rejecting...
                                    </>
                                  ) : "Reject"}
                                </Button>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                {req.status === "approved" ? "Approved" : "Rejected"}
                              </span>
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
      </div>
    </DashboardLayout>
  );
} 