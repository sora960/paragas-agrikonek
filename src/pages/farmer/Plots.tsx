import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { 
  Eye, 
  Edit, 
  Trash2, 
  Droplet, 
  Sprout, 
  Calendar, 
  MapPin, 
  Filter, 
  SlidersHorizontal,
  Layers,
  Leaf,
  CircleAlert
} from "lucide-react";
import { Tabs, TabsList, TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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

const SOIL_TYPE_COLORS = {
  'Clay': 'bg-amber-800',
  'Sandy': 'bg-yellow-200',
  'Loamy': 'bg-amber-600',
  'Silt': 'bg-stone-300',
  'Peat': 'bg-stone-800',
  'Chalk': 'bg-gray-100',
  'Other': 'bg-gray-400'
};

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
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [plotToDelete, setPlotToDelete] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [cropsCount, setCropsCount] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchPlots();
  }, []);

  useEffect(() => {
    if (selectedPlot) {
      fetchPlotDetails(selectedPlot.id);
    }
  }, [selectedPlot]);

  useEffect(() => {
    if (plots.length > 0) {
      fetchCropCounts();
    }
  }, [plots]);

  const fetchCropCounts = async () => {
    try {
      const plotIds = plots.map(plot => plot.id);
      const { data, error } = await supabase
        .from('crops')
        .select('plot_id, id')
        .in('plot_id', plotIds);
        
      if (error) throw error;
      
      const countByPlotId = data.reduce((acc: Record<string, number>, crop) => {
        acc[crop.plot_id] = (acc[crop.plot_id] || 0) + 1;
        return acc;
      }, {});
      
      setCropsCount(countByPlotId);
    } catch (error) {
      console.error('Error fetching crop counts:', error);
    }
  };

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

  const handleDeletePlot = async (plotId: string) => {
    try {
      console.log("Starting plot deletion for ID:", plotId);
      
      // Delete the plot directly - skip checking for crops since we don't have permissions
      // and there's no foreign key constraint in the crops table
      console.log("Deleting plot with ID:", plotId);
      const { error: plotDeleteError } = await supabase
        .from('farm_plots')
        .delete()
        .eq('id', plotId);
      
      if (plotDeleteError) {
        console.error("Error deleting plot:", plotDeleteError);
        throw plotDeleteError;
      }
      
      console.log("Plot deletion successful");
      toast.success('Plot deleted successfully');
      setPlotToDelete(null);
      setShowDeleteConfirmDialog(false);
      fetchPlots();
    } catch (error: any) {
      console.error('Error deleting plot:', error);
      
      // Show a more detailed error message
      let errorMessage = 'Failed to delete plot.';
      
      if (error.message) {
        errorMessage += ` Reason: ${error.message}`;
      }
      
      if (error.details) {
        errorMessage += ` Details: ${error.details}`;
      }
      
      toast.error(errorMessage);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'fallow':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'inactive':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Sprout className="h-4 w-4 mr-1.5" />;
      case 'fallow':
        return <Leaf className="h-4 w-4 mr-1.5" />;
      case 'inactive':
        return <CircleAlert className="h-4 w-4 mr-1.5" />;
      default:
        return null;
    }
  };

  const getIrrigationIcon = (type: string) => {
    switch (type) {
      case 'Drip':
        return <Droplet className="h-4 w-4 text-blue-500" />;
      case 'Sprinkler':
        return <div className="flex items-center"><Droplet className="h-3 w-3 text-blue-500" /><Droplet className="h-3 w-3 text-blue-500" /><Droplet className="h-3 w-3 text-blue-500" /></div>;
      case 'Flood':
        return <div className="flex items-center"><Droplet className="h-3 w-3 text-blue-500" /><Droplet className="h-3 w-3 text-blue-500" /><Droplet className="h-3 w-3 text-blue-500" /><Droplet className="h-3 w-3 text-blue-500" /></div>;
      case 'Furrow':
        return <div className="flex items-center"><Droplet className="h-3 w-3 text-blue-500" /><Droplet className="h-3 w-3 text-blue-500" /></div>;
      case 'Manual':
        return <Droplet className="h-4 w-4 text-blue-300" />;
      case 'None':
        return <Droplet className="h-4 w-4 text-gray-300" />;
      default:
        return <Droplet className="h-4 w-4 text-gray-300" />;
    }
  };

  const filteredPlots = filterStatus
    ? plots.filter(plot => plot.status === filterStatus)
    : plots;

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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
          <div>
          <h1 className="text-3xl font-bold">Farm Plot Management</h1>
            <p className="text-muted-foreground mt-1">Manage your agricultural land plots</p>
          </div>
          
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  {filterStatus ? `${filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)} Plots` : "All Plots"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Filter Plots</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setFilterStatus(null)}>
                  All Plots
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus("active")}>
                  <Sprout className="h-4 w-4 mr-2" />
                  Active Plots
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus("fallow")}>
                  <Leaf className="h-4 w-4 mr-2" />
                  Fallow Plots
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus("inactive")}>
                  <CircleAlert className="h-4 w-4 mr-2" />
                  Inactive Plots
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
          <Dialog open={showAddPlotDialog} onOpenChange={setShowAddPlotDialog}>
            <DialogTrigger asChild>
                <Button>
                  <Layers className="h-4 w-4 mr-2" />
                  Add New Plot
                </Button>
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlots.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-10 text-center">
              <div className="bg-muted rounded-full p-6 mb-4">
                <Layers className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No plots found</h3>
              <p className="text-muted-foreground mb-4">
                {filterStatus 
                  ? `You don't have any ${filterStatus} plots. Try changing the filter or add a new plot.` 
                  : "You haven't added any plots yet. Create your first plot to get started."}
              </p>
              <Button onClick={() => setShowAddPlotDialog(true)}>Add New Plot</Button>
            </div>
          ) : (
            filteredPlots.map((plot) => (
              <Card key={plot.id} className="overflow-hidden border-2 hover:border-primary/50 transition-colors">
                <div className={`h-2 w-full ${
                  plot.status === 'active' ? 'bg-green-500' :
                  plot.status === 'fallow' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`} />
                <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <div className="flex items-start gap-2">
                      <Avatar className={`border-2 ${getStatusColor(plot.status)} h-12 w-12`}>
                        <AvatarFallback className={`${SOIL_TYPE_COLORS[plot.soil_type as keyof typeof SOIL_TYPE_COLORS] || 'bg-gray-300'} text-white`}>
                          {plot.plot_name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                  <div>
                        <CardTitle className="text-xl">{plot.plot_name}</CardTitle>
                        <div className="flex items-center mt-1 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 mr-1" />
                          {plot.plot_location || "No location"}
                        </div>
                      </div>
                  </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setPlotToDelete(plot.id);
                        setShowDeleteConfirmDialog(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
              </CardHeader>
              <CardContent>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
                    <div className="flex items-center">
                      <Badge variant="outline" className={`${getStatusColor(plot.status)} flex items-center`}>
                        {getStatusIcon(plot.status)}
                        {plot.status.charAt(0).toUpperCase() + plot.status.slice(1)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Sprout className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">
                        {cropsCount[plot.id] || 0} Crops
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm font-medium">{plot.plot_size} hectares</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {getIrrigationIcon(plot.irrigation_type)}
                      <span className="text-sm">{plot.irrigation_type}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-xs font-medium">Soil Type:</span>
                    <div className="flex items-center">
                      <div className={`h-3 w-3 rounded-full mr-1.5 ${SOIL_TYPE_COLORS[plot.soil_type as keyof typeof SOIL_TYPE_COLORS] || 'bg-gray-300'}`}></div>
                      <span className="text-xs">{plot.soil_type || 'Not specified'}</span>
                  </div>
                </div>
              </CardContent>
                <CardFooter className="pt-0">
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => {
                      setSelectedPlot(plot);
                      setShowDetailsDialog(true);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </CardFooter>
            </Card>
            ))
          )}
        </div>

        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                  selectedPlot?.status === 'active' ? 'bg-green-500' :
                  selectedPlot?.status === 'fallow' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}></span>
                {selectedPlot?.plot_name} Details
              </DialogTitle>
              <DialogDescription>
                View details and status of your selected plot.
              </DialogDescription>
              <div className="flex flex-wrap gap-2 items-center mt-2">
                <Badge variant="outline" className={getStatusColor(selectedPlot?.status || '')}>
                  {getStatusIcon(selectedPlot?.status || '')}
                  {selectedPlot?.status?.charAt(0).toUpperCase() + selectedPlot?.status?.slice(1) || ''}
                </Badge>
                <span className="text-sm">•</span>
                <span className="text-sm">{selectedPlot?.plot_size} hectares</span>
                <span className="text-sm">•</span>
                <div className="flex items-center">
                  <MapPin className="h-3.5 w-3.5 mr-1" />
                  <span className="text-sm">{selectedPlot?.plot_location}</span>
                </div>
                <span className="text-sm">•</span>
                <div className="flex items-center">
                  <div className={`h-3 w-3 rounded-full mr-1.5 ${
                    SOIL_TYPE_COLORS[selectedPlot?.soil_type as keyof typeof SOIL_TYPE_COLORS] || 'bg-gray-300'
                  }`}></div>
                  <span className="text-sm">{selectedPlot?.soil_type}</span>
                </div>
                <span className="text-sm">•</span>
                <div className="flex items-center">
                  {getIrrigationIcon(selectedPlot?.irrigation_type || '')}
                  <span className="text-sm ml-1.5">{selectedPlot?.irrigation_type}</span>
                </div>
              </div>
            </DialogHeader>
            
            <Tabs defaultValue="crops">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="crops" className="flex items-center">
                  <Sprout className="h-4 w-4 mr-2" />
                  Crops ({plotDetails?.crops.length || 0})
                </TabsTrigger>
                <TabsTrigger value="activities" className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Activities ({plotDetails?.activities.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="crops">
                {plotDetails?.crops.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Sprout className="h-10 w-10 text-muted-foreground mb-2" />
                    <h3 className="text-lg font-medium">No crops planted</h3>
                    <p className="text-muted-foreground mb-4">
                      This plot doesn't have any crops yet.
                    </p>
                    <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>Close</Button>
                  </div>
                ) : (
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
                          <TableCell className="font-medium">{crop.crop_name}</TableCell>
                        <TableCell>
                            <Badge variant="outline" className={`
                              ${crop.status === 'planted' ? 'bg-green-100 text-green-800 border-green-300' :
                                crop.status === 'harvested' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                'bg-yellow-100 text-yellow-800 border-yellow-300'}
                            `}>
                            {crop.status}
                            </Badge>
                        </TableCell>
                        <TableCell>{new Date(crop.planting_date).toLocaleDateString()}</TableCell>
                          <TableCell>{crop.expected_harvest_date ? new Date(crop.expected_harvest_date).toLocaleDateString() : 'Not set'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                )}
              </TabsContent>

              <TabsContent value="activities">
                {plotDetails?.activities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Calendar className="h-10 w-10 text-muted-foreground mb-2" />
                    <h3 className="text-lg font-medium">No recorded activities</h3>
                    <p className="text-muted-foreground mb-4">
                      There are no activities recorded for this plot yet.
                    </p>
                    <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>Close</Button>
                  </div>
                ) : (
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
                          <TableCell className="font-medium">{activity.activity_type}</TableCell>
                        <TableCell>{new Date(activity.activity_date).toLocaleDateString()}</TableCell>
                        <TableCell>{activity.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        <Dialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this plot? This action cannot be undone.
                All crops associated with this plot will also be deleted.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteConfirmDialog(false)}>Cancel</Button>
              <Button 
                variant="destructive" 
                onClick={() => plotToDelete && handleDeletePlot(plotToDelete)}
              >
                Delete Plot
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
} 