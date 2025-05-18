import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import MultiLineChart from "@/components/dashboard/MultiLineChart";
import RegionalComparisonChart from "@/components/dashboard/RegionalComparisonChart";
import DonutChart from "@/components/dashboard/DonutChart";
import ChartCard from "@/components/dashboard/ChartCard";
import { analyticsService } from "@/services/analyticsService";
import { EnrollmentTrend, RegionalMetric, CategoryDistribution } from "@/services/analyticsService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReloadIcon } from "@radix-ui/react-icons";

// Interface for MultiLineChart data
interface DataPoint {
  [key: string]: string | number;
}

// Interface for RegionalComparisonChart data
interface RegionalMetricData {
  region: string;
  [key: string]: string | number;
}

export default function SuperAdminReports() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [timePeriod, setTimePeriod] = useState("lastMonth");
  
  // State for analytics data
  const [enrollmentTrends, setEnrollmentTrends] = useState<EnrollmentTrend[]>([]);
  const [regionalMetrics, setRegionalMetrics] = useState<RegionalMetric[]>([]);
  const [cropDistribution, setCropDistribution] = useState<CategoryDistribution[]>([]);
  const [organizationGrowth, setOrganizationGrowth] = useState<CategoryDistribution[]>([]);
  const [approvalRates, setApprovalRates] = useState<CategoryDistribution[]>([]);
  const [budgetUtilization, setBudgetUtilization] = useState<{ month: string; amount: number }[]>([]);

  // Fetch data from analytics service
  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  // Handle refresh button click
  const handleRefresh = async () => {
    await fetchAnalyticsData();
  };
  
  // Function to conditionally render loading or content
  const renderLoadingOrContent = (content: React.ReactNode) => {
    if (loading) {
      return (
        <div className="h-[300px] flex items-center justify-center">
          <ReloadIcon className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    return content;
  };

  // Function to fetch analytics data
  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [
        enrollmentTrendsData,
        regionalMetricsData,
        cropDistributionData,
        organizationGrowthData,
        approvalRatesData,
        budgetUtilizationData
      ] = await Promise.all([
        analyticsService.getEnrollmentTrends(),
        analyticsService.getRegionalMetrics(),
        analyticsService.getCropDistribution(),
        analyticsService.getOrganizationGrowthByRegion(),
        analyticsService.getApprovalRates(),
        analyticsService.getBudgetUtilizationByMonth()
      ]);

      // Update state with fetched data
      setEnrollmentTrends(enrollmentTrendsData);
      setRegionalMetrics(regionalMetricsData);
      setCropDistribution(cropDistributionData);
      setOrganizationGrowth(organizationGrowthData);
      setApprovalRates(approvalRatesData);
      setBudgetUtilization(budgetUtilizationData);
    } catch (error) {
      console.error("Error fetching analytics data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Convert data to expected component formats
  const enrollmentTrendsForChart: DataPoint[] = enrollmentTrends.map(item => ({
    ...item
  }));

  const regionalMetricsForChart: RegionalMetricData[] = regionalMetrics.map(item => ({
    ...item
  }));

  return (
    <DashboardLayout userRole="superadmin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <div className="space-x-2">
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={loading}
            >
              {loading ? 
                <ReloadIcon className="mr-2 h-4 w-4 animate-spin" /> : 
                "Refresh Data"
              }
            </Button>
            <Button>Export Report</Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="regional">Regional Data</TabsTrigger>
            <TabsTrigger value="detailed">Detailed Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {renderLoadingOrContent(
                <MultiLineChart
                  title="Enrollment Trends"
                  description="Farmer and organization registrations over time"
                  data={enrollmentTrends as any}
                  xAxisDataKey="date"
                  series={[
                    { dataKey: "farmers", color: "#0088FE", name: "Farmers" },
                    { dataKey: "organizations", color: "#00C49F", name: "Organizations" }
                  ]}
                />
              )}

              {renderLoadingOrContent(
                <ChartCard
                  title="Budget Utilization"
                  description="Monthly budget utilization for current fiscal year"
                  type="area"
                  data={budgetUtilization.map(item => ({
                    name: item.month,
                    value: item.amount
                  }))}
                  color="#8884d8"
                />
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {renderLoadingOrContent(
                <DonutChart
                  title="Crop Distribution"
                  description="Distribution of crops across farmer profiles"
                  data={cropDistribution}
                />
              )}

              {renderLoadingOrContent(
                <DonutChart
                  title="Approval Rates"
                  description="Approval rates for different request types"
                  data={approvalRates}
                  colors={['#0088FE', '#00C49F', '#FFBB28', '#FF8042']}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="regional" className="space-y-6">
            {renderLoadingOrContent(
              <RegionalComparisonChart
                title="Regional Metrics Comparison"
                description="Comparing key metrics across regions"
                data={regionalMetrics as any}
                metrics={[
                  { dataKey: "farmers", color: "#0088FE", name: "Farmers" },
                  { dataKey: "organizations", color: "#00C49F", name: "Organizations" },
                  { dataKey: "budgetUtilization", color: "#FFBB28", name: "Budget Utilization %" }
                ]}
                layout="vertical"
                height={500}
              />
            )}

            {renderLoadingOrContent(
              <DonutChart
                title="Organization Growth by Region"
                description="Distribution of organization growth rate by region"
                data={organizationGrowth}
              />
            )}
          </TabsContent>

          <TabsContent value="detailed" className="space-y-6">
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
                      <Select defaultValue={timePeriod} onValueChange={setTimePeriod}>
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
                      <Select defaultValue={timePeriod} onValueChange={setTimePeriod}>
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
                      <Select defaultValue={timePeriod} onValueChange={setTimePeriod}>
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
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
} 