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
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Weather Information</h1>
          <div className="w-64">
            <Select
              value={selectedProvince}
              onValueChange={setSelectedProvince}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select province" />
              </SelectTrigger>
              <SelectContent>
                {provinces.map((province) => (
                  <SelectItem key={province.id} value={province.id}>
                    {province.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedProvince && weatherRecords.length > 0 && (
          <Tabs defaultValue="current">
            <TabsList>
              <TabsTrigger value="current">Current Weather</TabsTrigger>
              <TabsTrigger value="forecast">7-Day Forecast</TabsTrigger>
              <TabsTrigger value="historical">Historical Data</TabsTrigger>
            </TabsList>

            <TabsContent value="current">
              <Card>
                <CardHeader>
                  <CardTitle>Current Weather Conditions</CardTitle>
                  <CardDescription>
                    Latest weather data for {provinces.find(p => p.id === selectedProvince)?.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {weatherRecords[0] && (
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <span className="text-6xl">
                            {getWeatherIcon(weatherRecords[0].weather_condition || '')}
                          </span>
                          <div>
                            <h3 className="text-2xl font-semibold">
                              {weatherRecords[0].weather_condition}
                            </h3>
                            <p className="text-muted-foreground">
                              {getWeatherImpact(weatherRecords[0].weather_condition || '')}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Temperature</p>
                            <p className="text-2xl font-semibold">
                              {weatherRecords[0].temperature}°C
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Humidity</p>
                            <p className="text-2xl font-semibold">
                              {weatherRecords[0].humidity}%
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Rainfall</p>
                            <p className="text-2xl font-semibold">
                              {weatherRecords[0].rainfall} mm
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Wind Speed</p>
                            <p className="text-2xl font-semibold">
                              {weatherRecords[0].wind_speed} km/h
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="font-semibold">Forecast</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Condition</TableHead>
                              <TableHead>Temperature</TableHead>
                              <TableHead>Rainfall</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {weatherRecords.slice(1).map((record) => (
                              <TableRow key={record.id}>
                                <TableCell>
                                  {new Date(record.record_date).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="flex items-center gap-2">
                                  <span>{getWeatherIcon(record.weather_condition || '')}</span>
                                  {record.weather_condition}
                                </TableCell>
                                <TableCell>{record.temperature}°C</TableCell>
                                <TableCell>{record.rainfall} mm</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="forecast">
              <Card>
                <CardHeader>
                  <CardTitle>7-Day Weather Forecast</CardTitle>
                  <CardDescription>
                    Extended weather forecast and agricultural recommendations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Weather</TableHead>
                        <TableHead>Temperature</TableHead>
                        <TableHead>Humidity</TableHead>
                        <TableHead>Rainfall</TableHead>
                        <TableHead>Wind Speed</TableHead>
                        <TableHead>Farming Impact</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {weatherRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            {new Date(record.record_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="flex items-center gap-2">
                            <span>{getWeatherIcon(record.weather_condition || '')}</span>
                            {record.weather_condition}
                          </TableCell>
                          <TableCell>{record.temperature}°C</TableCell>
                          <TableCell>{record.humidity}%</TableCell>
                          <TableCell>{record.rainfall} mm</TableCell>
                          <TableCell>{record.wind_speed} km/h</TableCell>
                          <TableCell>{getWeatherImpact(record.weather_condition || '')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="historical">
              <Card>
                <CardHeader>
                  <CardTitle>Historical Weather Data</CardTitle>
                  <CardDescription>
                    Past weather patterns and trends
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Weather</TableHead>
                        <TableHead>Temperature</TableHead>
                        <TableHead>Rainfall</TableHead>
                        <TableHead>Wind Speed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {weatherRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            {new Date(record.record_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="flex items-center gap-2">
                            <span>{getWeatherIcon(record.weather_condition || '')}</span>
                            {record.weather_condition}
                          </TableCell>
                          <TableCell>{record.temperature}°C</TableCell>
                          <TableCell>{record.rainfall} mm</TableCell>
                          <TableCell>{record.wind_speed} km/h</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
} 