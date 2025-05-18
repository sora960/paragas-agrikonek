import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, WalletIcon, FileText, CalendarIcon, PlusCircleIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

// Define the expected data structure
interface OrganizationData {
  name: string;
}

interface MembershipData {
  organization_id: string;
  organizations: OrganizationData;
}

// Define the transaction data structure
interface Transaction {
  id: string;
  transaction_date: string;
  transaction_type: 'allocation' | 'expense' | 'request' | 'refund';
  amount: number;
  description: string;
  status: 'pending' | 'completed' | 'cancelled' | 'rejected';
}

export default function FarmerWallet() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [farmerId, setFarmerId] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string>("");
  const [budget, setBudget] = useState<{
    total_allocation: number;
    remaining_balance: number;
    utilized_amount: number;
  }>({
    total_allocation: 0,
    remaining_balance: 0,
    utilized_amount: 0
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadFarmerProfile();
    }
  }, [user?.id]);

  useEffect(() => {
    if (farmerId && organizationId) {
      loadBudget();
      loadTransactions();
    }
  }, [farmerId, organizationId]);

  const loadFarmerProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // First get the farmer profile for the current user
      const { data: farmerProfile, error: farmerError } = await supabase
        .from("farmer_profiles")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (farmerError) {
        console.error("Error loading farmer profile:", farmerError);
        setError("Failed to load your farmer profile. Please make sure your profile is complete.");
        return;
      }

      setFarmerId(farmerProfile.id);

      // Get the farmer's organization
      const { data: membership, error: membershipError } = await supabase
        .from("organization_members")
        .select("organization_id, organizations:organization_id(name)")
        .eq("farmer_id", farmerProfile.id)
        .eq("status", "active")
        .single();

      if (membershipError) {
        console.error("Error loading organization:", membershipError);
        setError("Failed to load your organization details. You might not be a member of any organization.");
        return;
      }

      if (membership && membership.organization_id) {
        setOrganizationId(membership.organization_id);
        // Type assertion to handle the nested organizations object
        const orgData = membership as unknown as MembershipData;
        setOrganizationName(orgData.organizations?.name || "Your Organization");
      } else {
        setError("You are not a member of any organization.");
      }
    } catch (error: any) {
      console.error("Error in loadFarmerProfile:", error);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadBudget = async () => {
    try {
      if (!farmerId || !organizationId) return;

      const { data: budgetData, error: budgetError } = await supabase
        .from("farmer_budgets")
        .select("total_allocation, remaining_balance")
        .eq("farmer_id", farmerId)
        .eq("organization_id", organizationId)
        .single();

      if (budgetError) {
        console.error("Error loading budget:", budgetError);
        
        // If no budget exists, set zeros and don't show error
        if (budgetError.code === "PGRST116") { // "no rows returned"
          setBudget({
            total_allocation: 0,
            remaining_balance: 0,
            utilized_amount: 0
          });
          return;
        }
        
        throw budgetError;
      }

      if (budgetData) {
        const utilized = budgetData.total_allocation - budgetData.remaining_balance;
        setBudget({
          total_allocation: budgetData.total_allocation || 0,
          remaining_balance: budgetData.remaining_balance || 0,
          utilized_amount: utilized
        });
      }
    } catch (error: any) {
      console.error("Error loading budget data:", error);
      toast({
        title: "Error",
        description: "Failed to load budget information",
        variant: "destructive"
      });
    }
  };

  const loadTransactions = async () => {
    try {
      if (!farmerId || !organizationId) return;
      
      setTransactionsLoading(true);
      
      // Check if farmer_transactions table exists
      const { error: tableCheckError } = await supabase
        .from('farmer_transactions')
        .select('id', { count: 'exact', head: true });
        
      if (tableCheckError) {
        // Table doesn't exist yet, use mock data temporarily
        console.warn("farmer_transactions table doesn't exist yet, using mock data:", tableCheckError);
        
        const mockTransactions = [
          {
            id: "1",
            transaction_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            transaction_type: "allocation" as const,
            amount: 20000,
            description: "Monthly budget allocation",
            status: "completed" as const
          },
          {
            id: "2",
            transaction_date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
            transaction_type: "expense" as const,
            amount: 5000,
            description: "Purchase of seeds",
            status: "completed" as const
          },
          {
            id: "3",
            transaction_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            transaction_type: "expense" as const,
            amount: 3000,
            description: "Farm equipment rental",
            status: "completed" as const
          },
          {
            id: "4",
            transaction_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            transaction_type: "request" as const,
            amount: 10000,
            description: "Additional funds for fertilizer",
            status: "pending" as const
          }
        ];
        
        setTransactions(mockTransactions);
        return;
      }
      
      // Table exists, fetch real transactions
      const { data: realTransactions, error: txError } = await supabase
        .from('farmer_transactions')
        .select('id, transaction_date, transaction_type, amount, description, status')
        .eq('farmer_id', farmerId)
        .eq('organization_id', organizationId)
        .order('transaction_date', { ascending: false })
        .limit(20);
        
      if (txError) {
        console.error("Error fetching transactions:", txError);
        toast({
          title: "Error",
          description: "Failed to load transaction history",
          variant: "destructive"
        });
        return;
      }
      
      // Also fetch budget requests that are pending
      const { data: budgetRequests, error: requestsError } = await supabase
        .from('farmer_budget_requests')
        .select('id, request_date, amount, purpose, status')
        .eq('farmer_id', farmerId)
        .eq('organization_id', organizationId)
        .in('status', ['pending', 'approved'])
        .order('request_date', { ascending: false })
        .limit(10);
        
      if (requestsError && requestsError.code !== '42P01') { // Ignore error if table doesn't exist
        console.error("Error fetching budget requests:", requestsError);
      }
      
      // Merge and map budget requests to the transaction format
      const requestTransactions = budgetRequests ? budgetRequests.map(req => ({
        id: req.id,
        transaction_date: req.request_date,
        transaction_type: 'request' as const,
        amount: req.amount,
        description: req.purpose,
        status: req.status === 'approved' ? 'completed' as const : 'pending' as const
      })) : [];
      
      // Combine transactions from both sources and sort by date
      const combinedTransactions = [...(realTransactions || []), ...requestTransactions]
        .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
      
      setTransactions(combinedTransactions);
    } catch (error: any) {
      console.error("Error loading transactions:", error);
      toast({
        title: "Error",
        description: "Failed to load transaction history",
        variant: "destructive"
      });
    } finally {
      setTransactionsLoading(false);
    }
  };

  return (
    <DashboardLayout userRole="farmer">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Farmer Wallet</h1>
            <p className="text-muted-foreground">
              Manage your budget and view transaction history
            </p>
          </div>
          <div>
            <Button 
              onClick={() => navigate("/farmer/budget-request")}
              className="flex items-center gap-2"
            >
              <PlusCircleIcon className="h-4 w-4" />
              Request Budget
            </Button>
          </div>
        </div>

        {error ? (
          <Card className="bg-destructive/10">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        ) : loading ? (
          <div className="flex justify-center items-center h-[300px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Budget
                  </CardTitle>
                  <WalletIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₱{budget.total_allocation.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Allocated by {organizationName}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Remaining Budget
                  </CardTitle>
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">₱{budget.remaining_balance.toLocaleString()}</div>
                  <Progress 
                    value={budget.total_allocation > 0 ? (budget.remaining_balance / budget.total_allocation) * 100 : 0} 
                    className="h-2 mt-2" 
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Spent</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">₱{budget.utilized_amount.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    {budget.total_allocation > 0 
                      ? `${((budget.utilized_amount / budget.total_allocation) * 100).toFixed(1)}% of total` 
                      : '0% of total'}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>
                  Your recent budget allocations, expenses, and requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                {transactionsLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                            No transactions found
                          </TableCell>
                        </TableRow>
                      ) : (
                        transactions.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell>{new Date(tx.transaction_date).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  tx.transaction_type === 'allocation' ? 'default' : 
                                  tx.transaction_type === 'expense' ? 'secondary' : 
                                  tx.transaction_type === 'refund' ? 'success' :
                                  'outline'
                                }
                              >
                                {tx.transaction_type.charAt(0).toUpperCase() + tx.transaction_type.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>{tx.description}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  tx.status === 'completed' ? 'default' : 
                                  tx.status === 'pending' ? 'outline' : 
                                  tx.status === 'cancelled' ? 'secondary' :
                                  'destructive'
                                }
                              >
                                {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell className={`text-right ${tx.transaction_type === 'allocation' || tx.transaction_type === 'refund' ? 'text-green-600' : tx.transaction_type === 'expense' ? 'text-red-600' : 'text-amber-600'}`}>
                              {tx.transaction_type === 'allocation' || tx.transaction_type === 'refund' ? '+' : tx.transaction_type === 'expense' ? '-' : '?'}
                              ₱{tx.amount.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
              <CardFooter className="border-t px-6 py-4">
                <p className="text-sm text-muted-foreground">
                  Contact your organization administrator if you have questions about your budget.
                </p>
              </CardFooter>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
} 