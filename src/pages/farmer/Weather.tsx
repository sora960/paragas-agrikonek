import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { WeatherRecord } from "@/types/database.types";
import { getWeatherRecords } from "@/services/supabase";
import { supabase } from "@/services/supabase";
import { Progress } from "@/components/ui/progress";
import { Cloud, CloudRain, Droplets, Sun, Wind, CloudFog, ThermometerSun, AlertCircle } from "lucide-react";

interface Province {
  id: string;
  name: string;
  region_id: string;
}

export default function Weather() {
  const { user } = useAuth();
  const [weatherRecords, setWeatherRecords] = useState<WeatherRecord[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProvinces();
  }, []);

  useEffect(() => {
    if (selectedProvince) {
      fetchWeatherRecords();
    }
  }, [selectedProvince]);

  const fetchProvinces = async () => {
    try {
      setLoading(true);
      
      // First get the farmer's profile
      const { data: farmerProfile, error: profileError } = await supabase
        .from('farmer_profiles')
        .select('province_id')
        .eq('user_id', user?.id)
        .single();

      if (profileError) throw profileError;

      // Get all provinces
      const { data: provincesData, error: provincesError } = await supabase
        .from('provinces')
        .select('*');

      if (provincesError) throw provincesError;
      setProvinces(provincesData || []);

      // Set the farmer's province as default
      if (farmerProfile?.province_id) {
        setSelectedProvince(farmerProfile.province_id);
      }
    } catch (error) {
      console.error('Error fetching provinces:', error);
      toast.error('Failed to load provinces');
    } finally {
      setLoading(false);
    }
  };

  const fetchWeatherRecords = async () => {
    try {
      setLoading(true);
      const records = await getWeatherRecords(selectedProvince);
      setWeatherRecords(records);
    } catch (error) {
      console.error('Error fetching weather records:', error);
      toast.error('Failed to load weather data');
    } finally {
      setLoading(false);
    }
  };

  const getWeatherIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'sunny':
        return '☀️';
      case 'cloudy':
        return '☁️';
      case 'rainy':
        return '🌧️';
      case 'stormy':
        return '⛈️';
      case 'windy':
        return '💨';
      default:
        return '🌤️';
    }
  };

  const getWeatherImpact = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'sunny':
        return 'Good for drying crops and harvesting';
      case 'cloudy':
        return 'Moderate conditions for most crops';
      case 'rainy':
        return 'Good for irrigation, but watch for waterlogging';
      case 'stormy':
        return 'Take precautions to protect crops';
      case 'windy':
        return 'Monitor for potential crop damage';
      default:
        return 'Normal farming conditions';
    }
  };

  if (loading) {
    return (
      <DashboardLayout userRole="farmer">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Loading weather data...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="farmer">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Weather Forecast</h1>
          <p className="text-muted-foreground">
            Monitor weather conditions for your farm location
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Temperature</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <ThermometerSun className="h-5 w-5 text-amber-500 mr-2" />
                <div className="text-2xl font-bold">32°C</div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Feels like 34°C</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Humidity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Droplets className="h-5 w-5 text-blue-500 mr-2" />
                <div className="text-2xl font-bold">68%</div>
              </div>
              <Progress value={68} className="h-1.5 mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Wind Speed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Wind className="h-5 w-5 text-gray-500 mr-2" />
                <div className="text-2xl font-bold">12 km/h</div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Direction: NE</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Precipitation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <CloudRain className="h-5 w-5 text-blue-500 mr-2" />
                <div className="text-2xl font-bold">30%</div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Chance of rain today</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="forecast">
          <TabsList>
            <TabsTrigger value="forecast">7-Day Forecast</TabsTrigger>
            <TabsTrigger value="agricultural">Agricultural Impact</TabsTrigger>
          </TabsList>
          
          <TabsContent value="forecast" className="space-y-4 mt-6">
            <div className="grid grid-cols-7 gap-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                <Card key={day} className={`text-center ${index === 0 ? 'bg-primary/10' : ''}`}>
                  <CardHeader className="p-2 pb-0">
                    <CardTitle className="text-sm">{day}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="flex justify-center my-2">
                      {index === 0 && <Sun className="h-8 w-8 text-amber-500" />}
                      {index === 1 && <Sun className="h-8 w-8 text-amber-500" />}
                      {index === 2 && <Cloud className="h-8 w-8 text-gray-400" />}
                      {index === 3 && <CloudRain className="h-8 w-8 text-blue-500" />}
                      {index === 4 && <CloudRain className="h-8 w-8 text-blue-500" />}
                      {index === 5 && <CloudFog className="h-8 w-8 text-gray-400" />}
                      {index === 6 && <Sun className="h-8 w-8 text-amber-500" />}
                    </div>
                    <div className="text-sm font-medium">
                      {[32, 33, 29, 27, 26, 28, 31][index]}°C
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {[22, 23, 21, 20, 20, 21, 22][index]}°C
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="agricultural" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Agricultural Recommendations</CardTitle>
                <CardDescription>
                  Weather-based farming recommendations for your crops
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3 p-3 border rounded-md">
                  <Sun className="h-8 w-8 text-amber-500 shrink-0" />
                  <div>
                    <h3 className="font-medium">High Temperature Alert</h3>
                    <p className="text-sm text-muted-foreground">
                      Temperatures are expected to remain high. Consider increasing irrigation for heat-sensitive crops.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3 p-3 border rounded-md">
                  <CloudRain className="h-8 w-8 text-blue-500 shrink-0" />
                  <div>
                    <h3 className="font-medium">Rainfall Expected</h3>
                    <p className="text-sm text-muted-foreground">
                      Moderate rainfall expected on Wednesday and Thursday. Consider postponing any planned application of fertilizers or pesticides until after the rain.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3 p-3 border rounded-md">
                  <AlertCircle className="h-8 w-8 text-amber-500 shrink-0" />
                  <div>
                    <h3 className="font-medium">Pest Alert</h3>
                    <p className="text-sm text-muted-foreground">
                      Current warm and humid conditions are favorable for pest activity. Conduct regular monitoring of your crops.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3 p-3 border rounded-md">
                  <Droplets className="h-8 w-8 text-blue-500 shrink-0" />
                  <div>
                    <h3 className="font-medium">Irrigation Planning</h3>
                    <p className="text-sm text-muted-foreground">
                      Given the upcoming rainfall, adjust your irrigation schedule to conserve water. Resume normal irrigation from Friday onwards.
                    </p>
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