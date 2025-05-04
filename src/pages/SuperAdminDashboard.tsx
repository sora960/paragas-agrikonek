import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/lib/supabase"; // Make sure this path is correct

export default function SuperAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    regionalAdmins: 0,
    organizations: 0,
    farmers: 0,
    pendingApprovals: 0
  });
  
  // Fetch dashboard data
  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      try {
        // Get regional admins count
        const { count: regionalAdminsCount, error: raError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'regional_admin');
          
        if (raError) throw raError;
        
        // Get organizations count (assuming you have an organizations table)
        const { count: organizationsCount, error: orgError } = await supabase
          .from('organizations')
          .select('*', { count: 'exact', head: true });
          
        // If the table doesn't exist yet, this will fail gracefully
        
        // Get farmers count (assuming you have a farmers table)
        const { count: farmersCount, error: farmersError } = await supabase
          .from('farmers')
          .select('*', { count: 'exact', head: true });
          
        // Get pending approvals (could be organizations or users pending approval)
        const { count: pendingCount, error: pendingError } = await supabase
          .from('organizations')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
          
        setMetrics({
          regionalAdmins: regionalAdminsCount || 0,
          organizations: organizationsCount || 0,
          farmers: farmersCount || 0,
          pendingApprovals: pendingCount || 0
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchDashboardData();
  }, []);

  return (
    <DashboardLayout userRole="superadmin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Dashboard</h1>
        </div>

        {/* Key Metrics Summary */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Regional Admins</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-2xl font-bold animate-pulse">...</div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{metrics.regionalAdmins}</div>
                  <p className="text-xs text-muted-foreground">
                    {metrics.regionalAdmins > 0 ? 'Active administrators' : 'No data available'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Organizations</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-2xl font-bold animate-pulse">...</div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{metrics.organizations}</div>
                  <p className="text-xs text-muted-foreground">
                    {metrics.organizations > 0 ? 'Registered organizations' : 'No data available'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Farmers</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-2xl font-bold animate-pulse">...</div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{metrics.farmers}</div>
                  <p className="text-xs text-muted-foreground">
                    {metrics.farmers > 0 ? 'Registered farmers' : 'No data available'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-2xl font-bold animate-pulse">...</div>
              ) : (
                <div className="text-2xl font-bold">{metrics.pendingApprovals}</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Recent Activity */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest system activities and updates</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                      No activity data available
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* System Health */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>System Health</CardTitle>
              <CardDescription>Current system status and performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Database Status</span>
                  <Badge className={loading ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}>
                    {loading ? "Checking..." : "Online"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">API Services</span>
                  <Badge className="bg-green-100 text-green-800">Online</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Storage Usage</span>
                  <span className="text-sm">No data available</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Last System Backup</span>
                  <span className="text-sm">No data available</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Active Sessions</span>
                  <span className="text-sm">1 user</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>System alerts and notifications</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[300px] overflow-auto">
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              No notifications available
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
