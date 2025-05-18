import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

export default function RegionalBudgetRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, [user]);

  const loadRequests = async () => {
    setLoading(true);
    // Get the user's region
    const { data: userRegion, error: userRegionError } = await supabase
      .from("user_regions")
      .select("region_id")
      .eq("user_id", user?.id)
      .single();
    if (userRegionError || !userRegion) {
      setRequests([]);
      setLoading(false);
      return;
    }
    // Fetch all budget requests for this region
    const { data, error } = await supabase
      .from("budget_requests")
      .select("*", { count: "exact" })
      .eq("region_id", userRegion.region_id)
      .order("request_date", { ascending: false });
    if (!error && data) setRequests(data);
    setLoading(false);
  };

  return (
    <DashboardLayout userRole="regional">
      <div className="max-w-4xl mx-auto mt-10">
        <Card>
          <CardHeader>
            <CardTitle>My Budget Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div>Loading...</div>
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
                  {requests.map((req) => (
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
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
} 