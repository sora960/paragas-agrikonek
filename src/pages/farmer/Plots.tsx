import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Eye, Edit } from "lucide-react";
import { Tabs, TabsList, TabsContent, TabsTrigger } from "@/components/ui/tabs";

interface FarmPlot {
  id: string;
  plot_name: string;
  plot_size: number;
  plot_location: string;
  soil_type: string;
  irrigation_type: string;
  status: 'active' | 'inactive' | 'fallow';
}

interface PlotDetails {
  crops: Array<{
    id: string;
    crop_name: string;
    status: string;
    planting_date: string;
    expected_harvest_date: string;
  }>;
  activities: Array<{
    id: string;
    activity_type: string;
    activity_date: string;
    description: string;
  }>;
}

const SOIL_TYPES = [
  'Clay',
  'Sandy',
  'Loamy',
  'Silt',
  'Peat',
  'Chalk',
  'Other'
];

const IRRIGATION_TYPES = [
  'Drip',
  'Sprinkler',
  'Flood',
  'Furrow',
  'Manual',
  'None'
];

export default function Plots() {
  const { user } = useAuth();
  const [plots, setPlots] = useState<FarmPlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddPlotDialog, setShowAddPlotDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedPlot, setSelectedPlot] = useState<FarmPlot | null>(null);
  const [plotDetails, setPlotDetails] = useState<PlotDetails | null>(null);
  const [newPlot, setNewPlot] = useState({
    plot_name: "",
    plot_size: "",
    plot_location: "",
    soil_type: "",
    irrigation_type: "",
    status: "active" as const
  });

  useEffect(() => {
    fetchPlots();
  }, []);

  useEffect(() => {
    if (selectedPlot) {
      fetchPlotDetails(selectedPlot.id);
    }
  }, [selectedPlot]);

  const fetchPlots = async () => {
    try {
      setLoading(true);
      
      const { data: farmerProfile, error: profileError } = await supabase
        .from('farmer_profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (profileError) throw profileError;

      const { data: plotsData, error: plotsError } = await supabase
        .from('farm_plots')
        .select('*')
        .eq('farmer_id', farmerProfile.id);

      if (plotsError) throw plotsError;
      setPlots(plotsData || []);
    } catch (error) {
      console.error('Error fetching plots:', error);
      toast.error('Failed to load plots');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlotDetails = async (plotId: string) => {
    try {
      const [cropsResult, activitiesResult] = await Promise.all([
        supabase
          .from('crops')
          .select('id, crop_name, status, planting_date, expected_harvest_date')
          .eq('plot_id', plotId)
          .order('planting_date', { ascending: false }),
        supabase
          .from('crop_activities')
          .select('id, activity_type, activity_date, description')
          .eq('crop_id', plotId)
          .order('activity_date', { ascending: false })
      ]);

      if (cropsResult.error) throw cropsResult.error;
      if (activitiesResult.error) throw activitiesResult.error;

      setPlotDetails({
        crops: cropsResult.data || [],
        activities: activitiesResult.data || []
      });
    } catch (error) {
      console.error('Error fetching plot details:', error);
      toast.error('Failed to load plot details');
    }
  };

  const handleAddPlot = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: farmerProfile, error: profileError } = await supabase
        .from('farmer_profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (profileError) throw profileError;

      const { error } = await supabase
        .from('farm_plots')
        .insert([{
          ...newPlot,
          farmer_id: farmerProfile.id,
          plot_size: parseFloat(newPlot.plot_size)
        }]);

      if (error) throw error;

      toast.success('Plot added successfully');
      setShowAddPlotDialog(false);
      setNewPlot({
        plot_name: "",
        plot_size: "",
        plot_location: "",
        soil_type: "",
        irrigation_type: "",
        status: "active"
      });
      fetchPlots();
    } catch (error) {
      console.error('Error adding plot:', error);
      toast.error('Failed to add plot');
    }
  };

  const handleUpdatePlotStatus = async (plotId: string, currentStatus: string) => {
    try {
      let newStatus: 'active' | 'inactive' | 'fallow';
      switch (currentStatus) {
        case 'active':
          newStatus = 'fallow';
          break;
        case 'fallow':
          newStatus = 'inactive';
          break;
        default:
          newStatus = 'active';
      }

      const { error } = await supabase
        .from('farm_plots')
        .update({ status: newStatus })
        .eq('id', plotId);

      if (error) throw error;

      toast.success(`Plot marked as ${newStatus}`);
      fetchPlots();
    } catch (error) {
      console.error('Error updating plot status:', error);
      toast.error('Failed to update plot status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'fallow':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <DashboardLayout userRole="farmer">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Loading plots...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="farmer">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Farm Plot Management</h1>
          <Dialog open={showAddPlotDialog} onOpenChange={setShowAddPlotDialog}>
            <DialogTrigger asChild>
              <Button>Add New Plot</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Plot</DialogTitle>
                <DialogDescription>
                  Enter the details of your new farm plot below.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddPlot} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="plot_name">Plot Name</Label>
                  <Input
                    id="plot_name"
                    value={newPlot.plot_name}
                    onChange={(e) => setNewPlot({ ...newPlot, plot_name: e.target.value })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="plot_size">Plot Size (hectares)</Label>
                  <Input
                    id="plot_size"
                    type="number"
                    step="0.01"
                    value={newPlot.plot_size}
                    onChange={(e) => setNewPlot({ ...newPlot, plot_size: e.target.value })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="plot_location">Location</Label>
                  <Input
                    id="plot_location"
                    value={newPlot.plot_location}
                    onChange={(e) => setNewPlot({ ...newPlot, plot_location: e.target.value })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="soil_type">Soil Type</Label>
                  <Select
                    value={newPlot.soil_type}
                    onValueChange={(value) => setNewPlot({ ...newPlot, soil_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select soil type" />
                    </SelectTrigger>
                    <SelectContent>
                      {SOIL_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="irrigation_type">Irrigation Type</Label>
                  <Select
                    value={newPlot.irrigation_type}
                    onValueChange={(value) => setNewPlot({ ...newPlot, irrigation_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select irrigation type" />
                    </SelectTrigger>
                    <SelectContent>
                      {IRRIGATION_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <DialogFooter>
                  <Button type="submit">Add Plot</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {plots.map((plot) => (
            <Card key={plot.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{plot.plot_name}</CardTitle>
                    <CardDescription>
                      {plot.plot_size} hectares • {plot.plot_location}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedPlot(plot);
                        setShowDetailsDialog(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUpdatePlotStatus(plot.id, plot.status)}
                    >
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(plot.status)}`}>
                        {plot.status}
                      </span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium">Soil Type</span>
                    <p className="text-sm text-muted-foreground">{plot.soil_type || 'Not specified'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Irrigation Type</span>
                    <p className="text-sm text-muted-foreground">{plot.irrigation_type || 'Not specified'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{selectedPlot?.plot_name} Details</DialogTitle>
              <DialogDescription>
                View crops and activities for this plot
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="crops">
              <TabsList>
                <TabsTrigger value="crops">Crops</TabsTrigger>
                <TabsTrigger value="activities">Activities</TabsTrigger>
              </TabsList>

              <TabsContent value="crops">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Crop Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Planting Date</TableHead>
                      <TableHead>Expected Harvest</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plotDetails?.crops.map((crop) => (
                      <TableRow key={crop.id}>
                        <TableCell>{crop.crop_name}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            crop.status === 'planted' ? 'bg-green-100 text-green-800' :
                            crop.status === 'harvested' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {crop.status}
                          </span>
                        </TableCell>
                        <TableCell>{new Date(crop.planting_date).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(crop.expected_harvest_date).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="activities">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Activity Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plotDetails?.activities.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell>{activity.activity_type}</TableCell>
                        <TableCell>{new Date(activity.activity_date).toLocaleDateString()}</TableCell>
                        <TableCell>{activity.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
} 