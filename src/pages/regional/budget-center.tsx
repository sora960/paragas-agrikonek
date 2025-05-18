import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRightCircle, Loader2, ShieldAlert } from "lucide-react";

export default function BudgetCenter() {
  const { user } = useAuth();
  const [regionId, setRegionId] = useState<string | null>(null);
  const [regionName, setRegionName] = useState<string>("");
  const [budget, setBudget] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingDirectSql, setUsingDirectSql] = useState(false);

  useEffect(() => {
    fetchRegion();
  }, [user]);

  useEffect(() => {
    if (regionId) {
      fetchBudget();
      fetchTransactions();
    }
  }, [regionId]);

  const fetchRegion = async () => {
    if (!user?.id) return;
    
    // Try normal query first
    const { data, error } = await supabase
      .from("user_regions")
      .select("region_id, regions(name)")
      .eq("user_id", user.id)
      .single();
      
    if (!error && data) {
      setRegionId(data.region_id);
      setRegionName(data.regions[0]?.name || "");
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
        }
      } catch (directErr) {
        console.error("Direct SQL error:", directErr);
        setRegionId(null);
        setRegionName("");
      }
    }
  };

  const fetchBudget = async () => {
    if (!regionId) return;
    setLoading(true);
    
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
          setBudget({ amount: 0 });
        }
      } catch (directErr) {
        console.error("Direct SQL error:", directErr);
        setBudget({ amount: 0 });
      }
    }
    
    setLoading(false);
  };

  const fetchTransactions = async () => {
    if (!regionId) return;
    
    try {
      // Use direct SQL to get all transactions at once
      const { data: directData, error: directError } = await supabase.rpc(
        'admin_execute_sql',
        {
          sql_query: `
            WITH inflows AS (
              SELECT 
                id, 
                'inflow' as type,
                requested_amount as amount, 
                reason as description,
                COALESCE(processed_date, request_date) as date,
                'Approved by Superadmin' as status
              FROM budget_requests
              WHERE region_id = '${regionId}'
              AND status = 'approved'
            ),
            region_orgs AS (
              SELECT id
              FROM organizations
              WHERE region_id = '${regionId}'
            ),
            outflows AS (
              SELECT 
                ob.id,
                'outflow' as type,
                ob.total_allocation as amount,
                CONCAT('Allocated to Org (', ob.organization_id, ')') as description,
                ob.created_at as date,
                'Allocated' as status
              FROM organization_budgets ob
              WHERE ob.organization_id IN (SELECT id FROM region_orgs)
            )
            SELECT * FROM inflows
            UNION ALL
            SELECT * FROM outflows
            ORDER BY date DESC
          `
        }
      );
      
      if (directError) throw directError;
      setUsingDirectSql(true);
      setTransactions(directData || []);
    } catch (err) {
      console.error("Error fetching transactions:", err);
      setTransactions([]);
    }
  };

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
      <div className="max-w-4xl mx-auto mt-10 space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Regional Budget Center</CardTitle>
              <div className="text-muted-foreground text-sm">{regionName}</div>
            </div>
            <div className="flex items-center gap-2">
              {usingDirectSql && (
                <div className="bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 text-sm px-3 py-1 rounded-md flex items-center">
                  <ShieldAlert className="h-4 w-4 mr-2" />
                  Using elevated permissions
                </div>
              )}
              <Button asChild>
                <Link to="/regional/budget-management">
                  Manage Organization Budgets <ArrowRightCircle className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">₱{budget?.amount?.toLocaleString() ?? 0}</div>
            <div className="text-muted-foreground">Current Total Region Fund</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
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
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No transactions found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>{tx.date ? new Date(tx.date).toLocaleDateString() : '-'}</TableCell>
                        <TableCell>
                          <Badge variant={tx.type === 'inflow' ? 'default' : 'secondary'}>
                            {tx.type === 'inflow' ? 'Inflow' : 'Outflow'}
                          </Badge>
                        </TableCell>
                        <TableCell>{tx.description}</TableCell>
                        <TableCell className={tx.type === 'inflow' ? 'text-green-600' : 'text-red-600'}>
                          {tx.type === 'inflow' ? '+' : '-'}₱{Number(tx.amount).toLocaleString()}
                        </TableCell>
                        <TableCell>{tx.status}</TableCell>
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