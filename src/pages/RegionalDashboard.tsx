import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { Loader2, MapPin, Building, Users, GanttChart, Leaf, ArrowUpRight } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface RegionData {
  id: string;
  name: string;
  code: string;
  organizations: number;
  farmers: number;
  total_hectares: number;
  crop_varieties: number;
  budget_allocation?: number;
  budget_utilized?: number;
}

export default function RegionalDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [regionData, setRegionData] = useState<RegionData | null>(null);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchRegionData = async () => {
      setLoading(true);
      
      try {
        if (!user?.id) {
          throw new Error("User not authenticated");
        }
        
        // First, get the region assigned to this admin
        const { data: userRegion, error: userRegionError } = await supabase
          .from("user_regions")
          .select("region_id")
          .eq("user_id", user.id)
          .single();
          
        if (userRegionError) {
          console.error("Error fetching user region:", userRegionError);
          throw new Error("Failed to fetch your assigned region");
        }
        
        if (!userRegion?.region_id) {
          throw new Error("No region assigned to this administrator");
        }
        
        // Then, get the region details
        const { data: region, error: regionError } = await supabase
          .from("regions")
          .select("id, name, code")
          .eq("id", userRegion.region_id)
          .single();
          
        if (regionError) {
          console.error("Error fetching region details:", regionError);
          throw new Error("Failed to fetch region details");
        }

        // Get organizations in this region
        const { data: orgsData, error: orgsError } = await supabase
          .from("organizations")
          .select("id, name, member_count, status")
          .eq("region_id", userRegion.region_id);
          
        if (orgsError) {
          console.error("Error fetching organizations:", orgsError);
        }
        
        const activeOrgs = orgsData?.filter(org => org.status === 'active') || [];
        const totalFarmers = orgsData?.reduce((sum, org) => sum + (org.member_count || 0), 0) || 0;

        // Get budget for this region
        const currentYear = new Date().getFullYear();
        const { data: budgetData, error: budgetError } = await supabase
          .from("region_budgets")
          .select("amount")
          .eq("region_id", userRegion.region_id)
          .eq("fiscal_year", currentYear)
          .single();
          
        if (budgetError && budgetError.code !== 'PGRST116') { // Not found is okay
          console.error("Error fetching budget:", budgetError);
        }
        
        // Get statistics for this region
        const regionStats = {
          ...region,
          organizations: activeOrgs.length,
          farmers: totalFarmers,
          total_hectares: Math.floor(totalFarmers * 2.5), // Estimate based on farmers
          crop_varieties: 16, // Placeholder
          budget_allocation: budgetData?.amount || 0,
          budget_utilized: 0
        };
        
        setRegionData(regionStats);
        
        // Generate mock recent activities (in a real app, you'd fetch from your database)
        setRecentActivities([
          { type: 'org_added', name: 'Farmers Association of San Jose', date: '2 days ago' },
          { type: 'budget_updated', amount: 250000, date: '1 week ago' },
          { type: 'report_submitted', name: 'Q2 Agricultural Production', date: '2 weeks ago' },
        ]);
        
      } catch (error: any) {
        console.error("Error fetching region data:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to load region data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchRegionData();
  }, [user, toast]);
  
  if (loading) {
    return (
      <DashboardLayout userRole="regional">
        <div className="flex flex-col items-center justify-center h-[500px] space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your regional dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }
  
  if (!regionData) {
    return (
      <DashboardLayout userRole="regional">
        <div className="p-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">Region Not Assigned</CardTitle>
              <CardDescription>Your account does not have a region assignment</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="bg-destructive/10 text-destructive p-4 rounded-md mb-4">
                <p>No region has been assigned to your account. This is required to access the regional dashboard.</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Please contact a superadmin to assign you to a region. Once assigned, you'll have access to manage organizations, budgets, and resources within your region.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="regional">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-3xl font-bold">{regionData.name}</h1>
              <Badge variant="outline" className="ml-2">
                {regionData.code || "N/A"}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              Regional Administration Dashboard
            </p>
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => navigate(`/regional/region/${regionData.id}/organizations`)}
            >
              Manage Organizations
            </Button>
            <Button
              onClick={() => navigate(`/regional/region/${regionData.id}/budget`)}
            >
              Budget Management
            </Button>
          </div>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Organizations</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{regionData.organizations}</div>
              <p className="text-xs text-muted-foreground mt-1">Active organizations in your region</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Registered Farmers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{regionData.farmers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Total farmer members in all organizations</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Managed Land</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{regionData.total_hectares.toLocaleString()} ha</div>
              <p className="text-xs text-muted-foreground mt-1">Total hectares under management</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Crop Varieties</CardTitle>
              <Leaf className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{regionData.crop_varieties}</div>
              <p className="text-xs text-muted-foreground mt-1">Distinct crops grown in your region</p>
            </CardContent>
          </Card>
        </div>
        
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Budget Utilization</CardTitle>
              <CardDescription>Current fiscal year allocation and usage</CardDescription>
            </CardHeader>
            <CardContent>
              {regionData.budget_allocation ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-sm font-medium">Total Allocation</p>
                      <p className="text-3xl font-bold">₱ {regionData.budget_allocation.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">Utilized</p>
                      <p className="text-2xl">₱ {(regionData.budget_utilized || 0).toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span className="font-medium">
                        {regionData.budget_allocation 
                          ? Math.round((regionData.budget_utilized || 0) / regionData.budget_allocation * 100) 
                          : 0}%
                      </span>
                    </div>
                    <Progress 
                      value={regionData.budget_allocation 
                        ? Math.round((regionData.budget_utilized || 0) / regionData.budget_allocation * 100)
                        : 0
                      } 
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 border border-dashed rounded-md">
                  <p className="text-muted-foreground">No budget allocation found for this year</p>
                  <Button variant="outline" size="sm" className="mt-2">
                    Request Budget Allocation
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Recent Activities</CardTitle>
              <CardDescription>Updates and changes in your region</CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivities.length > 0 ? (
                <div className="space-y-4">
                  {recentActivities.map((activity, index) => (
                    <div key={index} className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0">
                      <div className={`rounded-full p-2 ${
                        activity.type === 'org_added' ? 'bg-green-100' : 
                        activity.type === 'budget_updated' ? 'bg-blue-100' : 'bg-amber-100'
                      }`}>
                        {activity.type === 'org_added' ? <Building className="h-4 w-4" /> : 
                         activity.type === 'budget_updated' ? <GanttChart className="h-4 w-4" /> : 
                         <ArrowUpRight className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {activity.type === 'org_added' ? 'New Organization Added' : 
                           activity.type === 'budget_updated' ? 'Budget Updated' : 
                           'Report Submitted'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {activity.type === 'org_added' ? activity.name : 
                           activity.type === 'budget_updated' ? `₱ ${activity.amount.toLocaleString()}` : 
                           activity.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{activity.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 border border-dashed rounded-md">
                  <p className="text-muted-foreground">No recent activities</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
} 