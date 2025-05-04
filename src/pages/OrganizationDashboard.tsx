import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default function OrganizationDashboard() {
  return (
    <DashboardLayout userRole="organization">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Organization Dashboard</h1>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Farmers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">124</div>
              <p className="text-xs text-muted-foreground">+8 from last month</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Crop Yield</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,842 tons</div>
              <p className="text-xs text-muted-foreground">+76 from last season</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">42</div>
              <p className="text-xs text-muted-foreground">+5 from last month</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-muted-foreground">+1 from last month</p>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Organization Overview</CardTitle>
            <CardDescription>Manage your organization's agricultural operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-6 text-center text-muted-foreground border border-dashed rounded-lg">
              Organization data and project statistics will be displayed here.
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
} 