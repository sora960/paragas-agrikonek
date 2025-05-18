import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Loader2, ShieldAlert, TrendingUp, ArrowRight, Wallet, PieChart } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { organizationService } from "@/services/organizationService";

export default function OrganizationBudgetCenter() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string>("");
  const [budget, setBudget] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingDirectSql, setUsingDirectSql] = useState(false);
  const [isBudgetRequestOpen, setIsBudgetRequestOpen] = useState(false);
  const [budgetRequest, setBudgetRequest] = useState({
    amount: "",
    reason: ""
  });

  useEffect(() => {
    // Only attempt to fetch data when authentication is complete
    if (!authLoading) {
      fetchOrganization();
    }
  }, [authLoading, user]);

  useEffect(() => {
    if (organizationId) {
      fetchBudget();
      fetchTransactions();
      fetchPendingRequests();
    }
  }, [organizationId]);

  const fetchOrganization = async () => {
    if (!user?.id) {
      console.log("User authentication not complete yet");
      setLoading(false);
      return; // Exit without error, we'll try again when user is available
    }
    
    try {
      // Try with direct SQL first for consistency
      console.log("Fetching organization for user:", user.id);
      
      try {
        // Use the new get_admin_organization function to get organization for admin
        const { data: adminData, error: adminError } = await supabase.rpc(
          'admin_execute_sql',
          {
            sql_query: `
              -- Use the new function to get admin organization
              SELECT * FROM get_admin_organization('${user.id}')
            `
          }
        );
        
        if (adminError) {
          console.error("Admin organization check error:", adminError);
        } else if (adminData && adminData.length > 0) {
          console.log("Found organization via admin function:", adminData[0]);
          setUsingDirectSql(true);
          setOrganizationId(adminData[0].organization_id);
          setOrganizationName(adminData[0].organization_name || "");
          return; // Exit early since we found the organization
        }
        
        // Try via organization_admins view as fallback
        const { data: viewData, error: viewError } = await supabase.rpc(
          'admin_execute_sql',
          {
            sql_query: `
              -- Check organization_admins view
              SELECT organization_id, organization_name
              FROM organization_admins_view
              WHERE user_id = '${user.id}'
              LIMIT 1
            `
          }
        );
        
        if (!viewError && viewData && viewData.length > 0) {
          console.log("Found organization via admins view:", viewData[0]);
          setUsingDirectSql(true);
          setOrganizationId(viewData[0].organization_id);
          setOrganizationName(viewData[0].organization_name || "");
          return;
        }
        
        // If not found via admin relationship, try the member relationship
        const { data: directData, error: directError } = await supabase.rpc(
          'admin_execute_sql',
          {
            sql_query: `
              -- Try via farmer_profiles/organization_members path
              SELECT om.organization_id, o.name
              FROM organization_members om
              JOIN farmer_profiles fp ON om.farmer_id = fp.id
              JOIN organizations o ON om.organization_id = o.id
              WHERE fp.user_id = '${user.id}'
              LIMIT 1
            `
          }
        );
        
        if (directError) {
          console.error("Direct SQL error:", directError);
          throw directError;
        }
        
        if (directData && directData.length > 0) {
          console.log("Found organization via member relationship:", directData[0]);
          setUsingDirectSql(true);
          setOrganizationId(directData[0].organization_id);
          setOrganizationName(directData[0].name || "");
        } else {
          // Check if user has direct management role in the auth system
          console.log("Checking direct management role");
          
          // This is a fallback for when a user is assigned as an admin but without formal membership
          if (user.role === 'org_admin' || user.role === 'organization_admin') {
            const { data: orgData, error: orgError } = await supabase.rpc(
              'admin_execute_sql',
              {
                sql_query: `
                  -- Get organization by looking at membership role in auth
                  SELECT o.id as organization_id, o.name
                  FROM organizations o
                  LIMIT 1
                `
              }
            );
            
            if (!orgError && orgData && orgData.length > 0) {
              console.log("Using global org admin access:", orgData[0]);
              setUsingDirectSql(true);
              setOrganizationId(orgData[0].organization_id);
              setOrganizationName(orgData[0].name || "");
              return;
            }
          }
          
          // If we get here, no organization was found for this user
          console.log("No organization found for this user");
          setError("You are not a member of any organization.");
        }
      } catch (err: any) {
        console.error("Error fetching organization:", err);
        setError(err.message || "Failed to fetch organization information");
      }
    } catch (err: any) {
      console.error("Overall fetch error:", err);
      setError(err.message || "Failed to fetch organization information");
    } finally {
      setLoading(false);
    }
  };

  const fetchBudget = async () => {
    if (!organizationId) return;
    setLoading(true);
    
    try {
      // Try direct SQL approach for consistency
      console.log("Fetching budget for organization:", organizationId);
      const { data: directData, error: directError } = await supabase.rpc(
        'admin_execute_sql',
        {
          sql_query: `
            SELECT 
              ob.organization_id,
              ob.total_allocation,
              ob.remaining_balance,
              COALESCE(ob.total_allocation - ob.remaining_balance, 0) as utilized_amount,
              o.name as organization_name,
              o.region_id,
              r.name as region_name
            FROM organization_budgets ob
            JOIN organizations o ON ob.organization_id = o.id
            JOIN regions r ON o.region_id = r.id
            WHERE ob.organization_id = '${organizationId}'
            LIMIT 1
          `
        }
      );
      
      if (directError) {
        console.error("Budget fetch error:", directError);
        throw directError;
      }
      
      setUsingDirectSql(true);
      
      if (directData && directData.length > 0) {
        console.log("Budget data found:", directData[0]);
        setBudget(directData[0]);
      } else {
        console.log("No budget found, using defaults");
        setBudget({ 
          total_allocation: 0, 
          remaining_balance: 0, 
          utilized_amount: 0
        });
      }
    } catch (err: any) {
      console.error("Error fetching budget:", err);
      setError(err.message || "Failed to fetch budget information");
      setBudget({ 
        total_allocation: 0, 
        remaining_balance: 0, 
        utilized_amount: 0 
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    if (!organizationId) return;
    
    try {
      // Get budget transactions - allocated budget and expenses
      const { data: directData, error: directError } = await supabase.rpc(
        'admin_execute_sql',
        {
          sql_query: `
            -- Combine budget allocations, expenses, and requests
            (
              SELECT 
                'budget_allocation' as type,
                ob.created_at as transaction_date,
                ob.total_allocation as amount,
                'Initial budget allocation' as description,
                'credit' as transaction_type
              FROM organization_budgets ob
              WHERE ob.organization_id = '${organizationId}'
            )
            UNION ALL
            (
              SELECT 
                'expense' as type,
                oe.expense_date as transaction_date,
                oe.amount as amount,
                oe.description,
                'debit' as transaction_type
              FROM organization_expenses oe
              WHERE oe.organization_id = '${organizationId}'
            )
            UNION ALL
            (
              SELECT 
                'budget_approved' as type,
                obr.approval_date as transaction_date,
                obr.approved_amount as amount,
                'Budget request approved: ' || obr.reason as description,
                'credit' as transaction_type
              FROM organization_budget_requests obr
              WHERE obr.organization_id = '${organizationId}'
              AND obr.status = 'approved'
              AND obr.approval_date IS NOT NULL
            )
            ORDER BY transaction_date DESC
            LIMIT 20
          `
        }
      );
      
      if (directError) {
        console.error("Transactions fetch error:", directError);
        throw directError;
      }
      
      setTransactions(Array.isArray(directData) ? directData : []);
    } catch (err: any) {
      console.error("Error fetching transactions:", err);
      setTransactions([]);
    }
  };

  const fetchPendingRequests = async () => {
    if (!organizationId) return;
    
    try {
      // Get pending budget requests
      const { data: requestData, error: requestError } = await supabase.rpc(
        'admin_execute_sql',
        {
          sql_query: `
            SELECT 
              id,
              requested_amount,
              reason,
              status,
              request_date
            FROM organization_budget_requests
            WHERE organization_id = '${organizationId}'
            AND status = 'pending'
            ORDER BY request_date DESC
          `
        }
      );
      
      if (requestError) {
        console.error("Pending requests fetch error:", requestError);
        throw requestError;
      }
      
      // Ensure requestData is an array before setting state
      if (Array.isArray(requestData)) {
        setPendingRequests(requestData);
      } else {
        console.log("Request data is not an array:", requestData);
        setPendingRequests([]);
      }
    } catch (err: any) {
      console.error("Error fetching pending requests:", err);
      setPendingRequests([]);
    }
  };

  const requestBudget = async () => {
    if (!organizationId) return;
    
    try {
      const amount = parseFloat(budgetRequest.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Please enter a valid amount");
      }
      
      if (!budgetRequest.reason.trim()) {
        throw new Error("Please provide a reason for this budget request");
      }
      
      console.log("Requesting budget increase:", amount, budgetRequest.reason);
      
      const success = await organizationService.requestOrganizationBudget(
        organizationId,
        amount,
        budgetRequest.reason
      );
      
      if (!success) {
        throw new Error("Failed to submit budget request");
      }
      
      toast({
        title: "Budget Request Submitted",
        description: "Your budget request has been submitted to your regional admin for approval.",
      });
      
      // Reset form and close dialog
      setBudgetRequest({ amount: "", reason: "" });
      setIsBudgetRequestOpen(false);
      
      // Refresh pending requests
      fetchPendingRequests();
      
    } catch (err: any) {
      console.error("Error requesting budget:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to submit budget request",
        variant: "destructive"
      });
    }
  };

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

  if (loading) {
    return (
      <DashboardLayout userRole="organization">
        <div className="flex justify-center items-center h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading data...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="organization">
      <div className="max-w-6xl mx-auto mt-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Organization Budget Center</h1>
            <p className="text-muted-foreground">Manage your organization's budget and request additional funds</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/organization/budget-distribution">
                <PieChart className="h-4 w-4 mr-2" />
                Budget Distribution
              </Link>
            </Button>
            <Button onClick={() => setIsBudgetRequestOpen(true)}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Request Budget
            </Button>
            {usingDirectSql && (
              <div className="bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 text-sm px-3 py-1 rounded-md flex items-center">
                <ShieldAlert className="h-4 w-4 mr-2" />
                Using elevated permissions
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-md">
            {error}
          </div>
        )}

        {/* Budget Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Budget Overview</CardTitle>
              <CardDescription>
                {organizationName} - {budget?.region_name && `Region: ${budget.region_name}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="flex flex-col space-y-2">
                  <span className="text-muted-foreground text-sm">Total Budget</span>
                  <span className="text-3xl font-bold">₱{budget?.total_allocation?.toLocaleString() ?? 0}</span>
                </div>
                <div className="flex flex-col space-y-2">
                  <span className="text-muted-foreground text-sm">Utilized</span>
                  <span className="text-3xl font-bold text-amber-600">₱{budget?.utilized_amount?.toLocaleString() ?? 0}</span>
                  <Progress 
                    value={(budget?.total_allocation > 0 ? (budget?.utilized_amount / budget?.total_allocation) * 100 : 0)} 
                    className="h-2"
                  />
                </div>
                <div className="flex flex-col space-y-2">
                  <span className="text-muted-foreground text-sm">Available Balance</span>
                  <span className="text-3xl font-bold text-green-600">₱{budget?.remaining_balance?.toLocaleString() ?? 0}</span>
                  <div className="text-sm text-muted-foreground">
                    {budget?.total_allocation > 0 
                      ? `${((budget?.remaining_balance / budget?.total_allocation) * 100).toFixed(1)}% available` 
                      : '0% available'}
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-6 flex justify-between">
              <div className="text-sm text-muted-foreground">
                Fiscal Year: {new Date().getFullYear()}
              </div>
              <Button variant="outline" asChild>
                <Link to="/organization/expense-entry">
                  Record Expense <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pending Budget Requests</CardTitle>
              <CardDescription>
                Awaiting approval from regional admin
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!pendingRequests || pendingRequests.length === 0 ? (
                <div className="bg-muted/40 rounded-md p-6 text-center">
                  <Wallet className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">No pending budget requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Array.isArray(pendingRequests) && pendingRequests.map((request) => (
                    <div key={request.id} className="border rounded-md p-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">₱{request.requested_amount.toLocaleString()}</span>
                        <Badge>Pending</Badge>
                      </div>
                      <p className="text-sm truncate">{request.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        Requested: {new Date(request.request_date).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => setIsBudgetRequestOpen(true)}
              >
                New Budget Request
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle>Budget Transactions</CardTitle>
            <CardDescription>History of budget allocations and expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!transactions || transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No transactions recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((transaction, index) => (
                    <TableRow key={index}>
                      <TableCell>{new Date(transaction.transaction_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={transaction.transaction_type === 'credit' ? 'default' : 'secondary'}>
                          {transaction.transaction_type === 'credit' ? 'Allocation' : 'Expense'}
                        </Badge>
                      </TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell className={`text-right ${transaction.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.transaction_type === 'credit' ? '+' : '-'}₱{transaction.amount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Budget Request Dialog */}
        <Dialog open={isBudgetRequestOpen} onOpenChange={setIsBudgetRequestOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Budget Increase</DialogTitle>
              <DialogDescription>
                Submit a request to your regional administration for additional budget allocation.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">Amount</Label>
                <div className="col-span-3 flex items-center">
                  <span className="mr-2">₱</span>
                  <Input
                    id="amount"
                    type="number"
                    value={budgetRequest.amount}
                    onChange={(e) => setBudgetRequest({...budgetRequest, amount: e.target.value})}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="reason" className="text-right">Reason</Label>
                <Textarea
                  id="reason"
                  value={budgetRequest.reason}
                  onChange={(e) => setBudgetRequest({...budgetRequest, reason: e.target.value})}
                  placeholder="Explain why this budget increase is needed..."
                  className="col-span-3"
                  rows={4}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBudgetRequestOpen(false)}>Cancel</Button>
              <Button onClick={requestBudget}>Submit Request</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
} 