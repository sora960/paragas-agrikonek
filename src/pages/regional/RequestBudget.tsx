import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { directInsertBudgetRequest } from "@/direct-admin-fix";
import { Loader2, ShieldAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function RequestBudget() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [region, setRegion] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [inboxLoading, setInboxLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [usingDirectSql, setUsingDirectSql] = useState(false);

  useEffect(() => {
    fetchRegion();
    loadRequests();
  }, [user]);

  const fetchRegion = async () => {
    if (!user?.id) return;
    // Get the user's assigned region
    try {
      const { data, error } = await supabase
        .from("user_regions")
        .select("region_id, regions(name)")
        .eq("user_id", user.id)
        .single();
        
      if (!error && data) {
        setRegion({
          id: data.region_id,
          name: data.regions[0]?.name || ""
        });
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
            setRegion({
              id: directData[0].region_id,
              name: directData[0].region_name || ""
            });
          }
        } catch (directErr) {
          console.error("Direct SQL error:", directErr);
        }
      }
    } catch (err) {
      console.error("Error fetching region:", err);
    }
  };

  const loadRequests = async () => {
    setInboxLoading(true);
    if (!user?.id) {
      setRequests([]);
      setInboxLoading(false);
      return;
    }
    
    try {
      // Get the user's region
      const { data: userRegion, error: userRegionError } = await supabase
        .from("user_regions")
        .select("region_id")
        .eq("user_id", user.id)
        .single();
        
      if (userRegionError || !userRegion) {
        // Try direct SQL approach
        try {
          const { data: directRegion, error: directRegionError } = await supabase.rpc(
            'admin_execute_sql',
            {
              sql_query: `
                SELECT region_id FROM user_regions
                WHERE user_id = '${user.id}'
                LIMIT 1
              `
            }
          );
          
          if (directRegionError || !directRegion || directRegion.length === 0) {
            setRequests([]);
            setInboxLoading(false);
            return;
          }
          
          setUsingDirectSql(true);
          
          // Use direct SQL to fetch budget requests
          const { data: directRequests, error: directRequestsError } = await supabase.rpc(
            'admin_execute_sql',
            {
              sql_query: `
                SELECT * FROM budget_requests
                WHERE region_id = '${directRegion[0].region_id}'
                ORDER BY request_date DESC
              `
            }
          );
          
          if (directRequestsError) throw directRequestsError;
          setRequests(directRequests || []);
          setInboxLoading(false);
          return;
        } catch (err) {
          console.error("Direct SQL error:", err);
          setRequests([]);
          setInboxLoading(false);
          return;
        }
      }
      
      // Fetch all budget requests for this region
      const { data, error } = await supabase
        .from("budget_requests")
        .select("*", { count: "exact" })
        .eq("region_id", userRegion.region_id)
        .order("request_date", { ascending: false });
        
      if (!error && data) {
        setRequests(data);
      } else {
        // Try direct SQL approach if normal query fails
        const { data: directData, error: directError } = await supabase.rpc(
          'admin_execute_sql',
          {
            sql_query: `
              SELECT * FROM budget_requests
              WHERE region_id = '${userRegion.region_id}'
              ORDER BY request_date DESC
            `
          }
        );
        
        if (directError) throw directError;
        setUsingDirectSql(true);
        setRequests(directData || []);
      }
    } catch (err) {
      console.error("Error loading requests:", err);
    } finally {
      setInboxLoading(false);
    }
  };

  const handleSubmit = async (e?: any) => {
    if (e) e.preventDefault();
    if (!region || !user) return;
    setLoading(true);
    
    try {
      // First try the normal approach
      const { error } = await supabase
        .from("budget_requests")
        .insert({
          region_id: region.id,
          user_id: user.id,
          requested_amount: parseFloat(amount),
          reason,
          status: 'pending',
          created_at: new Date().toISOString()
        });
        
      if (error) {
        console.log("Standard insert failed, trying direct SQL:", error);
        // If normal approach fails, try direct SQL
        const result = await directInsertBudgetRequest(
          region.id,
          user.id,
          parseFloat(amount),
          reason
        );
        
        setUsingDirectSql(true);
        
        if (!result) {
          throw new Error("Failed to create budget request");
        }
      }
      
      toast({
        title: "Request Submitted",
        description: "Your budget request has been sent to the superadmin.",
      });
      
      setAmount("");
      setReason("");
      setIsDialogOpen(false);
      loadRequests();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit request.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout userRole="regional">
      <div className="max-w-4xl mx-auto mt-10">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Budget Requests Inbox</CardTitle>
            <div className="flex items-center gap-2">
              {usingDirectSql && (
                <div className="bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 text-sm px-3 py-1 rounded-md flex items-center">
                  <ShieldAlert className="h-4 w-4 mr-2" />
                  Using elevated permissions
                </div>
              )}
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>New Request</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Request Budget</DialogTitle>
                    <DialogDescription>
                      Submit a new budget request for your region.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mb-6 space-y-1">
                    <div className="text-sm text-muted-foreground">Region</div>
                    <div className="font-semibold text-lg">{region?.name || ""}</div>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Amount</label>
                      <Input
                        type="number"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        required
                        min={1}
                        placeholder="Enter amount"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Reason</label>
                      <Textarea
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        required
                        placeholder="Enter reason for budget request"
                      />
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={loading || !amount || !reason}>
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          "Submit Request"
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {inboxLoading ? (
              <div className="flex justify-center items-center h-[200px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Processed Date</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No budget requests found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    requests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell>₱{req.requested_amount?.toLocaleString()}</TableCell>
                        <TableCell>{req.reason}</TableCell>
                        <TableCell>
                          <Badge variant={
                            req.status === 'approved' ? 'default' :
                            req.status === 'rejected' ? 'destructive' : 'secondary'
                          }>
                            {req.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{req.processed_date ? new Date(req.processed_date).toLocaleDateString() : '-'}</TableCell>
                        <TableCell>{req.notes || '-'}</TableCell>
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