import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { budgetService } from "@/services/budgetService";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Clock, RefreshCw, XCircle, ClipboardList } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { directProcessBudgetRequest } from "@/direct-admin-fix";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type BudgetRequest = {
  id: string;
  region_id: string;
  user_id: string;
  requested_amount: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  request_date: string;
  response?: string;
  regions?: { name: string };
  users?: { email: string };
};

type TabType = "all" | "pending" | "approved" | "rejected";

export default function SuperAdminBudgetRequests() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [requests, setRequests] = useState<BudgetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useDirect, setUseDirect] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("all");

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
      if (data) setRequests(data as BudgetRequest[]);
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

  const filteredRequests = requests.filter(req => {
    if (activeTab === "all") return true;
    return req.status === activeTab;
  });

  const pendingCount = requests.filter(req => req.status === "pending").length;
  const approvedCount = requests.filter(req => req.status === "approved").length;
  const rejectedCount = requests.filter(req => req.status === "rejected").length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout userRole="superadmin">
      <div className="container py-10">
        <div className="flex flex-col gap-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Budget Requests</h1>
            <p className="text-muted-foreground mt-1">Manage budget allocation requests from regions</p>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-yellow-50 border-yellow-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium text-yellow-700 flex items-center">
                  <Clock className="mr-2 h-5 w-5" />
                  Pending Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-800">{pendingCount}</div>
                <p className="text-sm text-yellow-600 mt-1">Awaiting your approval</p>
              </CardContent>
            </Card>
            
            <Card className="bg-green-50 border-green-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium text-green-700 flex items-center">
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Approved Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-800">{approvedCount}</div>
                <p className="text-sm text-green-600 mt-1">Successfully processed</p>
              </CardContent>
            </Card>
            
            <Card className="bg-red-50 border-red-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium text-red-700 flex items-center">
                  <XCircle className="mr-2 h-5 w-5" />
                  Rejected Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-800">{rejectedCount}</div>
                <p className="text-sm text-red-600 mt-1">Denied funding requests</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle>Budget Requests Inbox</CardTitle>
                <CardDescription>Review and manage budget allocation requests</CardDescription>
              </div>
              <div className="flex gap-2">
                {useDirect && (
                  <Alert className="p-2 h-9">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    <span className="text-xs">Using direct SQL bypass</span>
                  </Alert>
                )}
                <Button variant="outline" size="sm" onClick={loadRequests} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
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

              <Tabs defaultValue="all" value={activeTab} onValueChange={(value) => setActiveTab(value as TabType)} className="w-full">
                <TabsList className="mb-4 grid grid-cols-4 w-full max-w-md">
                  <TabsTrigger value="all" className="flex items-center">
                    <ClipboardList className="h-4 w-4 mr-2" />
                    All <span className="ml-2 text-xs bg-gray-100 rounded-full px-2 py-0.5">{requests.length}</span>
                  </TabsTrigger>
                  <TabsTrigger value="pending" className="flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    Pending <span className="ml-2 text-xs bg-yellow-100 rounded-full px-2 py-0.5">{pendingCount}</span>
                  </TabsTrigger>
                  <TabsTrigger value="approved" className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approved <span className="ml-2 text-xs bg-green-100 rounded-full px-2 py-0.5">{approvedCount}</span>
                  </TabsTrigger>
                  <TabsTrigger value="rejected" className="flex items-center">
                    <XCircle className="h-4 w-4 mr-2" />
                    Rejected <span className="ml-2 text-xs bg-red-100 rounded-full px-2 py-0.5">{rejectedCount}</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-0">
                  {renderRequestsTable(filteredRequests)}
                </TabsContent>
                <TabsContent value="pending" className="mt-0">
                  {renderRequestsTable(filteredRequests)}
                </TabsContent>
                <TabsContent value="approved" className="mt-0">
                  {renderRequestsTable(filteredRequests)}
                </TabsContent>
                <TabsContent value="rejected" className="mt-0">
                  {renderRequestsTable(filteredRequests)}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );

  function renderRequestsTable(requests: BudgetRequest[]) {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 mr-2 animate-spin" />
          <span>Loading requests...</span>
        </div>
      );
    }

    if (requests.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-gray-100 p-3 mb-4">
            <ClipboardList className="h-6 w-6 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium">No requests found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {activeTab === "all" 
              ? "There are no budget requests at this time."
              : `There are no ${activeTab} budget requests at this time.`}
          </p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="py-3 px-4 text-left font-medium">Region</th>
              <th className="py-3 px-4 text-left font-medium">Requested By</th>
              <th className="py-3 px-4 text-left font-medium">Amount</th>
              <th className="py-3 px-4 text-left font-medium">Reason</th>
              <th className="py-3 px-4 text-left font-medium">Date</th>
              <th className="py-3 px-4 text-left font-medium">Status</th>
              <th className="py-3 px-4 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req, index) => (
              <tr 
                key={req.id} 
                className={`border-t hover:bg-muted/30 ${index % 2 === 0 ? 'bg-white' : 'bg-muted/10'}`}
              >
                <td className="py-3 px-4">{req.regions?.name || req.region_id || "-"}</td>
                <td className="py-3 px-4">{req.users?.email || req.user_id || "-"}</td>
                <td className="py-3 px-4 font-medium">₱{req.requested_amount?.toLocaleString() || 0}</td>
                <td className="py-3 px-4">{req.reason || "-"}</td>
                <td className="py-3 px-4">
                  {req.request_date ? new Date(req.request_date).toLocaleDateString() : "-"}
                </td>
                <td className="py-3 px-4">
                  {getStatusBadge(req.status)}
                </td>
                <td className="py-3 px-4">
                  {req.status === "pending" && (
                    <div className="flex gap-2">
                      <Button 
                        size="sm"
                        variant="default"
                        className="bg-green-600 hover:bg-green-700"
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
                  {(req.status === "approved" || req.status === "rejected") && (
                    <span className="text-xs text-muted-foreground">
                      {req.status === "approved" ? "Approved" : "Rejected"} on {
                        new Date(req.request_date).toLocaleDateString()
                      }
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
} 