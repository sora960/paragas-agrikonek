import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { updateCropEvents } from "@/services/eventService";
import { CalendarIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Crop {
  id: string;
  plot_id: string;
  crop_name: string;
  crop_type: string;
  variety: string;
  planting_date: string;
  expected_harvest_date: string;
  actual_harvest_date: string | null;
  status: string;
  yield_amount: number | null;
  yield_quality: string | null;
  notes: string | null;
}

interface CropActivity {
  id: string;
  crop_id: string;
  activity_type: string;
  activity_date: string;
  description: string;
  resources_used: any;
  cost: number;
  status: string;
}

interface FarmPlot {
  id: string;
  plot_name: string;
  plot_size: number;
  plot_location: string;
  soil_type: string;
  irrigation_type: string;
  status: string;
}

// Define crop types for dropdown
const CROP_TYPES = [
  'Rice',
  'Corn',
  'Vegetables',
  'Fruits',
  'Beans',
  'Coffee',
  'Sugarcane',
  'Coconut',
  'Other'
];

// Define yield quality options
const YIELD_QUALITY = [
  'Excellent',
  'Good',
  'Average',
  'Poor',
  'Damaged'
];

// Define activity types
const ACTIVITY_TYPES = [
  'Planting',
  'Harvesting',
  'Fertilizing',
  'Pesticide',
  'Irrigation',
  'Maintenance',
  'Inspection',
  'Other'
];

export default function Crops() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [crops, setCrops] = useState<Crop[]>([]);
  const [activities, setActivities] = useState<CropActivity[]>([]);
  const [plots, setPlots] = useState<FarmPlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("crops");
  const [showAddCropDialog, setShowAddCropDialog] = useState(false);
  const [showAddActivityDialog, setShowAddActivityDialog] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);
  const [farmerId, setFarmerId] = useState<string | null>(null);
  const [newCrop, setNewCrop] = useState({
    plot_id: "",
    crop_name: "",
    crop_type: "",
    variety: "",
    planting_date: "",
    expected_harvest_date: "",
    notes: ""
  });
  const [newActivity, setNewActivity] = useState({
    activity_type: "",
    activity_date: "",
    description: "",
    resources_used: {},
    cost: 0
  });

  useEffect(() => {
    if (user?.id) {
      fetchFarmerProfile();
    }
  }, [user?.id]);

  useEffect(() => {
    if (farmerId) {
      fetchCropsAndPlots();
    }
  }, [farmerId]);

  const fetchFarmerProfile = async () => {
    try {
      const { data: farmerProfile, error } = await supabase
        .from('farmer_profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setFarmerId(farmerProfile.id);
    } catch (error) {
      console.error('Error fetching farmer profile:', error);
      toast.error('Failed to load your profile. Please ensure your profile is complete.');
    }
  };

  const fetchCropsAndPlots = async () => {
    try {
      setLoading(true);
      
      // Get all plots for this farmer
      const { data: plotsData, error: plotsError } = await supabase
        .from('farm_plots')
        .select('*')
        .eq('farmer_id', farmerId);

      if (plotsError) throw plotsError;
      setPlots(plotsData || []);

      // Get all crops for these plots
      const plotIds = plotsData?.map(plot => plot.id) || [];
      
      if (plotIds.length > 0) {
        const { data: cropsData, error: cropsError } = await supabase
          .from('crops')
          .select('*')
          .in('plot_id', plotIds);

        if (cropsError) throw cropsError;
        setCrops(cropsData || []);

        // Get all activities for these crops
        const cropIds = cropsData?.map(crop => crop.id) || [];
        if (cropIds.length > 0) {
          const { data: activitiesData, error: activitiesError } = await supabase
            .from('crop_activities')
            .select('*')
            .in('crop_id', cropIds)
            .order('activity_date', { ascending: false });

          if (activitiesError) throw activitiesError;
          setActivities(activitiesData || []);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load crops and plots');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCrop = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate inputs
      if (!newCrop.plot_id || !newCrop.crop_name || !newCrop.crop_type || !newCrop.planting_date) {
        toast.error('Please fill out all required fields');
        return;
      }

      // Insert new crop
      const { data, error } = await supabase
        .from('crops')
        .insert([{
          ...newCrop,
          status: 'planted'
        }])
        .select()
        .single();

      if (error) throw error;

      // Update crops state
      setCrops([...crops, data]);
      
      // Also create calendar events for this crop
      if (farmerId) {
        try {
          await updateCropEvents(data.id, {
            crop_name: data.crop_name,
            planting_date: data.planting_date,
            expected_harvest_date: data.expected_harvest_date,
            status: data.status
          });
        } catch (eventError) {
          console.error('Error creating calendar events:', eventError);
        }
      }

      toast.success('Crop added successfully');
      setShowAddCropDialog(false);
      resetCropForm();
    } catch (error) {
      console.error('Error adding crop:', error);
      toast.error('Failed to add crop');
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!selectedCrop) throw new Error('No crop selected');

      // Validate inputs
      if (!newActivity.activity_type || !newActivity.activity_date) {
        toast.error('Please fill out all required fields');
        return;
      }

      // Insert new activity
      const { data, error } = await supabase
        .from('crop_activities')
        .insert([{
          ...newActivity,
          crop_id: selectedCrop.id,
          status: 'completed'
        }])
        .select()
        .single();

      if (error) throw error;

      // Update activities state
      setActivities([data, ...activities]);

      toast.success('Activity added successfully');
      setShowAddActivityDialog(false);
      resetActivityForm();
    } catch (error) {
      console.error('Error adding activity:', error);
      toast.error('Failed to add activity');
    }
  };

  const handleHarvest = async (cropId: string) => {
    try {
      const harvestDate = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('crops')
        .update({
          status: 'harvested',
          actual_harvest_date: harvestDate
        })
        .eq('id', cropId)
        .select()
        .single();

      if (error) throw error;

      // Update crops state
      setCrops(crops.map(crop => crop.id === cropId ? data : crop));
      
      // Update calendar events for this crop
      try {
        await updateCropEvents(cropId, {
          status: 'harvested',
          actual_harvest_date: harvestDate
        });
      } catch (eventError) {
        console.error('Error updating calendar events:', eventError);
      }

      toast.success('Crop marked as harvested');
    } catch (error) {
      console.error('Error updating crop:', error);
      toast.error('Failed to update crop status');
    }
  };

  const handleRecordYield = async (cropId: string, yieldAmount: number, yieldQuality: string) => {
    try {
      const { data, error } = await supabase
        .from('crops')
        .update({
          yield_amount: yieldAmount,
          yield_quality: yieldQuality
        })
        .eq('id', cropId)
        .select()
        .single();

      if (error) throw error;

      // Update crops state
      setCrops(crops.map(crop => crop.id === cropId ? data : crop));

      toast.success('Yield recorded successfully');
    } catch (error) {
      console.error('Error recording yield:', error);
      toast.error('Failed to record yield');
    }
  };

  const getPlotName = (plotId: string): string => {
    const plot = plots.find(p => p.id === plotId);
    return plot ? plot.plot_name : 'Unknown Plot';
  };

  const resetCropForm = () => {
    setNewCrop({
      plot_id: "",
      crop_name: "",
      crop_type: "",
      variety: "",
      planting_date: "",
      expected_harvest_date: "",
      notes: ""
    });
  };

  const resetActivityForm = () => {
    setNewActivity({
      activity_type: "",
      activity_date: "",
      description: "",
      resources_used: {},
      cost: 0
    });
  };

  const viewInCalendar = () => {
    navigate('/farmer/calendar');
  };

  if (loading) {
    return (
      <DashboardLayout userRole="farmer">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Loading crops...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="farmer">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Crop Management</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={viewInCalendar} className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              View in Calendar
            </Button>
            <Dialog open={showAddCropDialog} onOpenChange={setShowAddCropDialog}>
              <DialogTrigger asChild>
                <Button>Add New Crop</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Crop</DialogTitle>
                  <DialogDescription>
                    Enter the details of your new crop below.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddCrop} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="plot_id">Farm Plot</Label>
                    <Select
                      value={newCrop.plot_id}
                      onValueChange={(value) => setNewCrop({ ...newCrop, plot_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select plot" />
                      </SelectTrigger>
                      <SelectContent>
                        {plots.map((plot) => (
                          <SelectItem key={plot.id} value={plot.id}>{plot.plot_name} ({plot.plot_size} ha)</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="crop_name">Crop Name</Label>
                    <Input
                      id="crop_name"
                      value={newCrop.crop_name}
                      onChange={(e) => setNewCrop({ ...newCrop, crop_name: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="crop_type">Crop Type</Label>
                    <Select
                      value={newCrop.crop_type}
                      onValueChange={(value) => setNewCrop({ ...newCrop, crop_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select crop type" />
                      </SelectTrigger>
                      <SelectContent>
                        {CROP_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="variety">Variety</Label>
                    <Input
                      id="variety"
                      value={newCrop.variety}
                      onChange={(e) => setNewCrop({ ...newCrop, variety: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="planting_date">Planting Date</Label>
                    <Input
                      id="planting_date"
                      type="date"
                      value={newCrop.planting_date}
                      onChange={(e) => setNewCrop({ ...newCrop, planting_date: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="expected_harvest_date">Expected Harvest Date</Label>
                    <Input
                      id="expected_harvest_date"
                      type="date"
                      value={newCrop.expected_harvest_date}
                      onChange={(e) => setNewCrop({ ...newCrop, expected_harvest_date: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Input
                      id="notes"
                      value={newCrop.notes}
                      onChange={(e) => setNewCrop({ ...newCrop, notes: e.target.value })}
                    />
                  </div>

                  <DialogFooter>
                    <Button type="submit">Add Crop</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="crops">Crops</TabsTrigger>
            <TabsTrigger value="activities">Activities</TabsTrigger>
          </TabsList>
          
          <TabsContent value="crops">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Your Crops</h2>
              <p className="text-muted-foreground">Manage your crops and track their growth progress</p>
              
              {crops.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-10">
                    <p className="text-muted-foreground mb-4">You haven't added any crops yet.</p>
                    <Button onClick={() => setShowAddCropDialog(true)}>Add Your First Crop</Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Crop Name</TableHead>
                        <TableHead>Plot</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Planting Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Yield</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {crops.map((crop) => (
                        <TableRow key={crop.id}>
                          <TableCell className="font-medium">{crop.crop_name}</TableCell>
                          <TableCell>{getPlotName(crop.plot_id)}</TableCell>
                          <TableCell>{crop.crop_type}</TableCell>
                          <TableCell>
                            {new Date(crop.planting_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              crop.status === 'planted' 
                                ? 'bg-green-100 text-green-800' 
                                : crop.status === 'harvested' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {crop.status.charAt(0).toUpperCase() + crop.status.slice(1)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {crop.yield_amount 
                              ? `${crop.yield_amount} kg (${crop.yield_quality})` 
                              : 'Not recorded'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setSelectedCrop(crop)}
                              >
                                Details
                              </Button>
                              {crop.status !== 'harvested' && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleHarvest(crop.id)}
                                >
                                  Mark as Harvested
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="activities">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Crop Activities</h2>
              <p className="text-muted-foreground">Record and track activities for your crops</p>
              
              {selectedCrop ? (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{selectedCrop.crop_name}</h3>
                      <p className="text-sm text-muted-foreground">{getPlotName(selectedCrop.plot_id)}</p>
                    </div>
                    <Dialog open={showAddActivityDialog} onOpenChange={setShowAddActivityDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm">Add Activity</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Record Activity for {selectedCrop.crop_name}</DialogTitle>
                          <DialogDescription>
                            Log a new activity for your crop.
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAddActivity} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="activity_type">Activity Type</Label>
                            <Select
                              value={newActivity.activity_type}
                              onValueChange={(value) => setNewActivity({ ...newActivity, activity_type: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select activity type" />
                              </SelectTrigger>
                              <SelectContent>
                                {ACTIVITY_TYPES.map((type) => (
                                  <SelectItem key={type} value={type.toLowerCase()}>{type}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="activity_date">Date</Label>
                            <Input
                              id="activity_date"
                              type="date"
                              value={newActivity.activity_date}
                              onChange={(e) => setNewActivity({ ...newActivity, activity_date: e.target.value })}
                              required
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Input
                              id="description"
                              value={newActivity.description}
                              onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                              placeholder="Describe the activity"
                              required
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="cost">Cost (PHP)</Label>
                            <Input
                              id="cost"
                              type="number"
                              step="0.01"
                              min="0"
                              value={newActivity.cost.toString()}
                              onChange={(e) => setNewActivity({ ...newActivity, cost: parseFloat(e.target.value) })}
                            />
                          </div>

                          <DialogFooter>
                            <Button type="submit">Add Activity</Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  {activities.filter(a => a.crop_id === selectedCrop.id).length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Cost</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activities
                          .filter(activity => activity.crop_id === selectedCrop.id)
                          .map((activity) => (
                            <TableRow key={activity.id}>
                              <TableCell>{new Date(activity.activity_date).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <span className="capitalize">{activity.activity_type}</span>
                              </TableCell>
                              <TableCell>{activity.description}</TableCell>
                              <TableCell>₱{activity.cost.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground">No activities recorded for this crop yet.</p>
                  )}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-10">
                    <p className="text-muted-foreground">Select a crop to view or add activities.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
} 