import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default function RegionalDashboard() {
  return (
    <DashboardLayout userRole="regional">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Regional Dashboard</h1>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Organizations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">38</div>
              <p className="text-xs text-muted-foreground">+4 from last month</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Farmers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">842</div>
              <p className="text-xs text-muted-foreground">+56 from last month</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Hectares</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24,532</div>
              <p className="text-xs text-muted-foreground">+412 from last month</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Crop Varieties</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">16</div>
              <p className="text-xs text-muted-foreground">+2 from last month</p>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Regional Overview</CardTitle>
            <CardDescription>Monitor and manage agricultural data for your region</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-6 text-center text-muted-foreground border border-dashed rounded-lg">
              Regional data and analytics will be displayed here.
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
} 