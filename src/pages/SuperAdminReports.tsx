import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default function SuperAdminReports() {
  return (
    <DashboardLayout userRole="superadmin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <div className="space-x-2">
            <Button variant="outline">Export Data</Button>
            <Button>Generate New Report</Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Enrollment Trends</CardTitle>
              <CardDescription>Farmer registration growth over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] bg-primary/5 rounded-lg border border-dashed flex items-center justify-center">
                <p className="text-muted-foreground">Enrollment growth chart</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Regional Performance</CardTitle>
              <CardDescription>Comparison of regional metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] bg-primary/5 rounded-lg border border-dashed flex items-center justify-center">
                <p className="text-muted-foreground">Regional comparison chart</p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>System-wide Reports</CardTitle>
            <CardDescription>Generate and download comprehensive reports</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">Regional Admin Performance Report</h3>
                  <p className="text-sm text-muted-foreground">Activity metrics for all regional administrators</p>
                </div>
                <div className="flex items-center gap-2">
                  <Select defaultValue="lastMonth">
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Time period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lastMonth">Last Month</SelectItem>
                      <SelectItem value="lastQuarter">Last Quarter</SelectItem>
                      <SelectItem value="yearToDate">Year to Date</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline">Generate</Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">Organization Growth Report</h3>
                  <p className="text-sm text-muted-foreground">Registration and membership statistics by region</p>
                </div>
                <div className="flex items-center gap-2">
                  <Select defaultValue="lastMonth">
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Time period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lastMonth">Last Month</SelectItem>
                      <SelectItem value="lastQuarter">Last Quarter</SelectItem>
                      <SelectItem value="yearToDate">Year to Date</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline">Generate</Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">System Activity Audit</h3>
                  <p className="text-sm text-muted-foreground">Detailed log of all system activities</p>
                </div>
                <div className="flex items-center gap-2">
                  <Select defaultValue="lastMonth">
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Time period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lastMonth">Last Month</SelectItem>
                      <SelectItem value="lastQuarter">Last Quarter</SelectItem>
                      <SelectItem value="yearToDate">Year to Date</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline">Generate</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Visualization</CardTitle>
            <CardDescription>Key metrics visualized for quick insights</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-[200px] bg-primary/5 rounded-lg border border-dashed flex items-center justify-center">
                <p className="text-muted-foreground">Farmer distribution by crop type</p>
              </div>
              <div className="h-[200px] bg-primary/5 rounded-lg border border-dashed flex items-center justify-center">
                <p className="text-muted-foreground">Organization growth rate by region</p>
              </div>
              <div className="h-[200px] bg-primary/5 rounded-lg border border-dashed flex items-center justify-center">
                <p className="text-muted-foreground">User activity heatmap</p>
              </div>
              <div className="h-[200px] bg-primary/5 rounded-lg border border-dashed flex items-center justify-center">
                <p className="text-muted-foreground">Admin approval rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
} 