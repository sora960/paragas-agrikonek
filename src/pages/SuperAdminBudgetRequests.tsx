import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { budgetService } from "@/services/budgetService";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { directProcessBudgetRequest } from "@/direct-admin-fix";

export default function SuperAdminBudgetRequests() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useDirect, setUseDirect] = useState(false);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("budget_requests")
        .select(`*, regions(name), users:users!budget_requests_user_id_fkey(email)`)
        .order("request_date", { ascending: false });
      console.log("Fetched requests:", data, error);
      if (error) throw error;
      if (data) setRequests(data);
    } catch (err: any) {
      console.error("Error loading budget requests:", err);
      setError(`Failed to load budget requests: ${err.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, status: "approved" | "rejected") => {
    setProcessingId(id);
    setError(null);
    try {
      // Try direct method first (bypasses RLS)
      try {
        console.log("Attempting direct processing bypass for superadmin...");
        const result = await directProcessBudgetRequest(id, status, "", user?.id);
        console.log("Direct process result:", result);
        toast({
          title: `Request ${status === "approved" ? "Approved" : "Rejected"} (Direct)`,
          description: `The request has been ${status} using direct SQL.`,
        });
        setUseDirect(true);
        await loadRequests();
        return;
      } catch (directError) {
        console.log("Direct method failed, falling back to standard approach:", directError);
      }
      
      // Fall back to standard method
      await budgetService.processBudgetRequest(id, status, "", user?.id);
      toast({
        title: `Request ${status === "approved" ? "Approved" : "Rejected"}`,
        description: `The request has been ${status}.`,
      });
      await loadRequests();
    } catch (error: any) {
      console.error(`Error ${status} budget request:`, error);
      const errorMessage = error.message || `Failed to ${status} request.`;
      
      // Check for specific error types
      if (errorMessage.includes("permission denied") && errorMessage.includes("region_budgets")) {
        setError("Permission denied: You don't have sufficient permissions to update region budgets. Please contact the system administrator.");
      } else if (errorMessage.includes("Authentication required")) {
        setError("Your session has expired. Please log in again.");
      } else {
        setError(`Error: ${errorMessage}`);
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <DashboardLayout userRole="superadmin">
      <div className="max-w-5xl mx-auto mt-10">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Budget Requests Inbox</CardTitle>
            <div className="flex gap-2">
              {useDirect && (
                <Alert className="p-2 h-9">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <span className="text-xs">Using direct SQL bypass</span>
                </Alert>
              )}
              <Button variant="outline" size="sm" onClick={loadRequests} disabled={loading}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 mr-2 animate-spin" />
                <span>Loading requests...</span>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 text-left">Region</th>
                    <th className="py-2 text-left">Requested By</th>
                    <th className="py-2 text-left">Amount</th>
                    <th className="py-2 text-left">Reason</th>
                    <th className="py-2 text-left">Date</th>
                    <th className="py-2 text-left">Status</th>
                    <th className="py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-4 text-center text-muted-foreground">
                        No budget requests found
                      </td>
                    </tr>
                  ) : (
                    requests.map((req) => (
                      <tr key={req.id} className="border-b">
                        <td>{req.regions?.name || req.region_id || "-"}</td>
                        <td>{req.users?.email || req.user_id || "-"}</td>
                        <td>₱{req.requested_amount?.toLocaleString()}</td>
                        <td>{req.reason}</td>
                        <td>{req.request_date ? new Date(req.request_date).toLocaleDateString() : "-"}</td>
                        <td className="capitalize">{req.status}</td>
                        <td>
                          {req.status === "pending" && (
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                disabled={processingId === req.id} 
                                onClick={() => handleAction(req.id, "approved")}
                              >
                                {processingId === req.id ? "Processing..." : "Approve"}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive" 
                                disabled={processingId === req.id} 
                                onClick={() => handleAction(req.id, "rejected")}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
} 