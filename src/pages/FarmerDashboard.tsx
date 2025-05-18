import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import OrganizationAccess from "@/components/farmer/OrganizationAccess";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { toast } from "sonner";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

interface FarmerStats {
  totalCrops: number;
  activePlots: number;
  availablePlots: number;
  upcomingHarvests: number;
  nextHarvestDays: number;
  cropsLastMonth: number;
}

interface CropDistribution {
  name: string;
  value: number;
}

interface MonthlyActivity {
  month: string;
  planting: number;
  harvesting: number;
  maintenance: number;
}

export default function FarmerDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<FarmerStats>({
    totalCrops: 0,
    activePlots: 0,
    availablePlots: 0,
    upcomingHarvests: 0,
    nextHarvestDays: 0,
    cropsLastMonth: 0
  });
  const [cropDistribution, setCropDistribution] = useState<CropDistribution[]>([]);
  const [monthlyActivities, setMonthlyActivities] = useState<MonthlyActivity[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get farmer profile ID
      const { data: farmerProfile, error: profileError } = await supabase
        .from('farmer_profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (profileError) throw profileError;
      
      if (!farmerProfile) {
        setError("Farmer profile not found");
        setLoading(false);
        return;
      }

      const farmerId = farmerProfile.id;

      // Fetch plots data
      const { data: plots, error: plotsError } = await supabase
        .from('farm_plots')
        .select('id, status')
        .eq('farmer_id', farmerId);

      if (plotsError) throw plotsError;

      // Count active and available plots
      const activePlots = plots?.filter(plot => plot.status === 'active').length || 0;
      const availablePlots = plots?.length ? plots.length - activePlots : 0;
      
      // Fetch plot IDs for crop queries
      const plotIds = plots?.map(plot => plot.id) || [];
      
      // Fetch crops data if there are plots
      let crops = [];
      let cropsByType: Record<string, number> = {};
      let upcomingHarvests = 0;
      let nextHarvestDays = 0;
      let cropsLastMonth = 0;
      let monthlyActivityData: Record<string, { planting: number, harvesting: number, maintenance: number }> = {};
      
      if (plotIds.length > 0) {
        const { data: cropsData, error: cropsError } = await supabase
          .from('crops')
          .select('id, crop_type, status, planting_date, expected_harvest_date')
          .in('plot_id', plotIds);

        if (cropsError) throw cropsError;
        crops = cropsData || [];
        
        // Count crops by type
        crops.forEach(crop => {
          const type = crop.crop_type || 'Other';
          cropsByType[type] = (cropsByType[type] || 0) + 1;
        });
        
        // Calculate upcoming harvests
        const now = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(now.getDate() + 30);
        
        const upcomingHarvestCrops = crops.filter(crop => {
          if (!crop.expected_harvest_date) return false;
          const harvestDate = new Date(crop.expected_harvest_date);
          return harvestDate >= now && harvestDate <= thirtyDaysFromNow && crop.status !== 'harvested';
        });
        
        upcomingHarvests = upcomingHarvestCrops.length;
        
        // Find next harvest date
        if (upcomingHarvestCrops.length > 0) {
          const sortedHarvests = upcomingHarvestCrops.sort((a, b) => {
            return new Date(a.expected_harvest_date).getTime() - new Date(b.expected_harvest_date).getTime();
          });
          
          const nextHarvestDate = new Date(sortedHarvests[0].expected_harvest_date);
          const diffTime = Math.abs(nextHarvestDate.getTime() - now.getTime());
          nextHarvestDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
        
        // Count crops planted in the last month
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(now.getMonth() - 1);
        
        cropsLastMonth = crops.filter(crop => {
          if (!crop.planting_date) return false;
          const plantingDate = new Date(crop.planting_date);
          return plantingDate >= oneMonthAgo && plantingDate <= now;
        }).length;
        
        // Fetch crop activities for monthly chart
        if (crops.length > 0) {
          const cropIds = crops.map(crop => crop.id);
          
          const { data: activities, error: activitiesError } = await supabase
            .from('crop_activities')
            .select('activity_type, activity_date')
            .in('crop_id', cropIds);
            
          if (activitiesError) throw activitiesError;
          
          // Group activities by month and type
          const activityMonths: Record<string, { month: string, planting: number, harvesting: number, maintenance: number }> = {
            'Jan': { month: 'Jan', planting: 0, harvesting: 0, maintenance: 0 },
            'Feb': { month: 'Feb', planting: 0, harvesting: 0, maintenance: 0 },
            'Mar': { month: 'Mar', planting: 0, harvesting: 0, maintenance: 0 },
            'Apr': { month: 'Apr', planting: 0, harvesting: 0, maintenance: 0 },
            'May': { month: 'May', planting: 0, harvesting: 0, maintenance: 0 },
            'Jun': { month: 'Jun', planting: 0, harvesting: 0, maintenance: 0 }
          };
          
          activities?.forEach(activity => {
            if (!activity.activity_date) return;
            
            const activityDate = new Date(activity.activity_date);
            const month = activityDate.toLocaleString('default', { month: 'short' });
            
            if (activityMonths[month]) {
              if (activity.activity_type === 'planting') {
                activityMonths[month].planting += 1;
              } else if (activity.activity_type === 'harvesting') {
                activityMonths[month].harvesting += 1;
              } else {
                activityMonths[month].maintenance += 1;
              }
            }
          });
          
          // Convert to array for chart
          setMonthlyActivities(Object.values(activityMonths));
        } else {
          // No crops, use empty monthly data
          setMonthlyActivities([
            { month: 'Jan', planting: 0, harvesting: 0, maintenance: 0 },
            { month: 'Feb', planting: 0, harvesting: 0, maintenance: 0 },
            { month: 'Mar', planting: 0, harvesting: 0, maintenance: 0 },
            { month: 'Apr', planting: 0, harvesting: 0, maintenance: 0 },
            { month: 'May', planting: 0, harvesting: 0, maintenance: 0 },
            { month: 'Jun', planting: 0, harvesting: 0, maintenance: 0 }
          ]);
        }
      } else {
        // No plots, use empty data
        setMonthlyActivities([
          { month: 'Jan', planting: 0, harvesting: 0, maintenance: 0 },
          { month: 'Feb', planting: 0, harvesting: 0, maintenance: 0 },
          { month: 'Mar', planting: 0, harvesting: 0, maintenance: 0 },
          { month: 'Apr', planting: 0, harvesting: 0, maintenance: 0 },
          { month: 'May', planting: 0, harvesting: 0, maintenance: 0 },
          { month: 'Jun', planting: 0, harvesting: 0, maintenance: 0 }
        ]);
      }
      
      // Convert crop types to chart data
      const cropDistData = Object.entries(cropsByType).map(([name, value]) => ({
        name,
        value
      }));
      
      if (cropDistData.length === 0) {
        // No crops, use empty distribution
        setCropDistribution([
          { name: 'No Crops', value: 1 }
        ]);
      } else {
        setCropDistribution(cropDistData);
      }
      
      // Update stats
      setStats({
        totalCrops: crops.length,
        activePlots,
        availablePlots,
        upcomingHarvests,
        nextHarvestDays,
        cropsLastMonth
      });
      
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again later.');
      toast.error('Error loading dashboard data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout userRole="farmer">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Welcome back, {user?.email}</h2>
        </div>

            {loading ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-muted-foreground">Loading dashboard data...</div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-red-500">{error}</div>
              </div>
            ) : (
              <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Crops</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalCrops}</div>
                      <p className="text-xs text-muted-foreground">
                        {stats.cropsLastMonth > 0 ? `+${stats.cropsLastMonth} from last month` : 'No new crops in the last month'}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Plots</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.activePlots}</div>
                      <p className="text-xs text-muted-foreground">
                        {stats.availablePlots} available plots
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Upcoming Harvests</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.upcomingHarvests}</div>
                      <p className="text-xs text-muted-foreground">
                        {stats.upcomingHarvests > 0 ? `Next: ${stats.nextHarvestDays} days` : 'No upcoming harvests'}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <OrganizationAccess />

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                  <Card className="col-span-4">
                    <CardHeader>
                      <CardTitle>Monthly Activities</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={monthlyActivities}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="planting" fill="#0088FE" />
                          <Bar dataKey="harvesting" fill="#00C49F" />
                          <Bar dataKey="maintenance" fill="#FFBB28" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card className="col-span-3">
                    <CardHeader>
                      <CardTitle>Crop Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={350}>
                        <PieChart>
                          <Pie
                            data={cropDistribution}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {cropDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
      </div>
    </DashboardLayout>
  );
} 