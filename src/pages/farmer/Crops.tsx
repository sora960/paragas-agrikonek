import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { updateCropEvents, generateCropActivities } from "@/services/eventService";
import { CalendarIcon, Calendar, Clock, MoreHorizontal, AlertCircle, Check, X, ArrowUpDown, MapPin, Sprout, Trash, Eye, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, differenceInDays, isPast, isToday } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
  const [showViewCropDialog, setShowViewCropDialog] = useState(false);
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
  const [upcomingActivities, setUpcomingActivities] = useState<any[]>([]);
  const [activitiesGenerating, setActivitiesGenerating] = useState(false);
  const [selectedCropForSchedule, setSelectedCropForSchedule] = useState<string | null>(null);
  const [activityFilter, setActivityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showReplantDialog, setShowReplantDialog] = useState(false);
  const [replantCrop, setReplantCrop] = useState<any>(null);
  const [replantData, setReplantData] = useState({
    plot_id: "",
    crop_name: "",
    crop_type: "",
    variety: "",
    planting_date: "",
    expected_harvest_date: "",
    notes: ""
  });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [cropToDelete, setCropToDelete] = useState<Crop | null>(null);

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

  const calculateGrowthProgress = (crop: Crop) => {
    if (crop.status === 'harvested') return 100;
    if (!crop.planting_date || !crop.expected_harvest_date) return 0;
    const startDate = new Date(crop.planting_date);
    const endDate = new Date(crop.expected_harvest_date);
    const today = new Date();
    if (today < startDate) return 0;
    if (today > endDate) return 100;
    const totalDays = differenceInDays(endDate, startDate);
    const daysElapsed = differenceInDays(today, startDate);
    return Math.round((daysElapsed / totalDays) * 100);
  };

  const calculateDaysRemaining = (crop: Crop) => {
    if (!crop.expected_harvest_date) return null;
    
    const harvestDate = new Date(crop.expected_harvest_date);
    const today = new Date();
    
    if (isPast(harvestDate) && !isToday(harvestDate)) {
      return 'Past due';
    }
    
    return differenceInDays(harvestDate, today);
  };

  const handleGenerateActivities = async (cropId: string) => {
    setActivitiesGenerating(true);
    setSelectedCropForSchedule(cropId);
    
    try {
      const crop = crops.find(c => c.id === cropId);
      if (!crop) throw new Error("Crop not found");
      
      const result = await generateCropActivities(cropId);
      
      if (result && result.activitiesAdded > 0) {
        toast.success(`Generated ${result.activitiesAdded} activities for this crop`);
        // Refresh activities
        fetchCropsAndPlots();
      } else {
        toast.info("No new activities were generated");
      }
    } catch (error) {
      console.error("Error generating activities:", error);
      toast.error("Failed to generate activities");
    } finally {
      setActivitiesGenerating(false);
      setSelectedCropForSchedule(null);
    }
  };

  const handleCompleteActivity = async (activityId: string) => {
    try {
      const { data, error } = await supabase
        .from('crop_activities')
        .update({ status: 'completed' })
        .eq('id', activityId)
        .select('*')
        .single();
      
      if (error) throw error;
      
      // Update activities state
      setActivities(activities.map(activity => 
        activity.id === activityId ? { ...activity, status: 'completed' } : activity
      ));
      
      toast.success("Activity marked as completed");
    } catch (error) {
      console.error("Error completing activity:", error);
      toast.error("Failed to update activity");
    }
  };
  
  const handleDeleteActivity = async (activityId: string) => {
    try {
      const { error } = await supabase
        .from('crop_activities')
        .delete()
        .eq('id', activityId);
      
      if (error) throw error;
      
      // Update activities state
      setActivities(activities.filter(activity => activity.id !== activityId));
      
      toast.success("Activity deleted successfully");
    } catch (error) {
      console.error("Error deleting activity:", error);
      toast.error("Failed to delete activity");
    }
  };

  const handleDeleteCrop = async (cropId: string) => {
    try {
      // First delete all activities related to this crop
      const { error: activitiesError } = await supabase
        .from('crop_activities')
        .delete()
        .eq('crop_id', cropId);
      
      if (activitiesError) throw activitiesError;
      
      // Then delete the crop
      const { error } = await supabase
        .from('crops')
        .delete()
        .eq('id', cropId);
      
      if (error) throw error;
      
      // Update crops state
      setCrops(crops.filter(crop => crop.id !== cropId));
      // Update activities state (remove activities for this crop)
      setActivities(activities.filter(activity => activity.crop_id !== cropId));
      
      toast.success("Crop deleted successfully");
    } catch (error) {
      console.error("Error deleting crop:", error);
      toast.error("Failed to delete crop");
    }
  };

  const getCropTypeClasses = (type: string) => {
    const typeMap: Record<string, { color: string, bgColor: string }> = {
      'vegetable': { color: 'text-green-700', bgColor: 'bg-green-100' },
      'fruit': { color: 'text-orange-700', bgColor: 'bg-orange-100' },
      'grain': { color: 'text-amber-700', bgColor: 'bg-amber-100' },
      'cereal': { color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
      'rice': { color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
      'wheat': { color: 'text-amber-700', bgColor: 'bg-amber-100' },
      'corn': { color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
      'default': { color: 'text-slate-700', bgColor: 'bg-slate-100' }
    };
    
    return typeMap[type.toLowerCase()] || typeMap.default;
  };

  // Filter activities based on search term and status filter
  const filteredActivities = activities.filter(activity => {
    const matchesFilter = activityFilter === "" || 
      activity.activity_type.toLowerCase().includes(activityFilter.toLowerCase()) ||
      activity.description.toLowerCase().includes(activityFilter.toLowerCase());
    
    const matchesStatus = statusFilter === "" || activity.status === statusFilter;
    
    return matchesFilter && matchesStatus;
  });

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
        
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Your Crops</h2>
              <p className="text-muted-foreground">Manage your crops and track their growth progress</p>
            </div>
          </div>
              
              {crops.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="bg-muted rounded-full p-6 mb-4">
                <Sprout className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No crops found</h3>
                    <p className="text-muted-foreground mb-4">You haven't added any crops yet.</p>
              <Button onClick={() => setShowAddCropDialog(true)}>Add First Crop</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {crops.map((crop) => {
                const plotName = getPlotName(crop.plot_id);
                const growthProgress = calculateGrowthProgress(crop);
                const daysRemaining = calculateDaysRemaining(crop);
                const typeClasses = getCropTypeClasses(crop.crop_type);
                const cropActivities = activities.filter(a => a.crop_id === crop.id);
                
                return (
                  <Card key={crop.id} className="relative overflow-hidden border-2 hover:border-primary/50 transition-colors">
                    {/* Status indicator strip at top */}
                    <div className={`h-2 w-full ${
                      crop.status === 'harvested' ? 'bg-blue-500' :
                      crop.status === 'planted' ? 'bg-green-500' : 'bg-amber-500'
                    }`} />
                    
                    <CardHeader className="pb-2">
                      <div className="flex justify-between">
                        <div>
                          <CardTitle>{crop.crop_name}</CardTitle>
                          <CardDescription className="flex items-center mt-1">
                            <MapPin className="h-3.5 w-3.5 mr-1" />
                            {plotName}
                          </CardDescription>
                        </div>
                        
                        <Badge variant="outline" className={`${typeClasses.bgColor} ${typeClasses.color}`}>
                          {crop.crop_type}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Growth Progress</span>
                          <span>{growthProgress}%</span>
                        </div>
                        <Progress value={growthProgress} className="h-2" />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-muted-foreground">Planted</div>
                          <div className="font-medium flex items-center">
                            <Calendar className="h-3.5 w-3.5 mr-1.5 text-green-600" />
                            {crop.planting_date ? format(new Date(crop.planting_date), 'MMM d, yyyy') : 'Not set'}
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-muted-foreground">Harvest</div>
                          <div className="font-medium flex items-center">
                            <Calendar className="h-3.5 w-3.5 mr-1.5 text-amber-600" />
                            {crop.expected_harvest_date ? format(new Date(crop.expected_harvest_date), 'MMM d, yyyy') : 'Not set'}
                          </div>
                        </div>
                        
                        {crop.status !== 'harvested' && crop.expected_harvest_date && (
                          <div className="col-span-2 mt-1">
                            <div className="text-muted-foreground">Time to Harvest</div>
                            <div className="font-medium flex items-center">
                              <Clock className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
                              {typeof daysRemaining === 'number' ? 
                                `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining` : 
                                daysRemaining}
                            </div>
                          </div>
                        )}
                        
                        {crop.status === 'harvested' && (
                          <div className="col-span-2 mt-1">
                            <div className="text-muted-foreground">Status</div>
                            <div className="font-medium flex items-center text-blue-600">
                              <Check className="h-3.5 w-3.5 mr-1.5" />
                              Harvested {crop.actual_harvest_date ? `on ${format(new Date(crop.actual_harvest_date), 'MMM d, yyyy')}` : ''}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    
                    <CardFooter className="flex justify-between items-center">
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                          onClick={() => {
                            setSelectedCrop(crop);
                            setShowViewCropDialog(true);
                          }}
                              >
                          View Details
                              </Button>
                        {crop.status === 'harvested' && (
                                <Button 
                            variant="default"
                                  size="sm"
                            onClick={() => {
                              setReplantCrop(crop);
                              setReplantData({
                                plot_id: "",
                                crop_name: crop.crop_name,
                                crop_type: crop.crop_type,
                                variety: crop.variety,
                                planting_date: "",
                                expected_harvest_date: "",
                                notes: crop.notes || ""
                              });
                              setShowReplantDialog(true);
                            }}
                          >
                            Replant
                                </Button>
                              )}
                            </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setCropToDelete(crop);
                          setShowDeleteDialog(true);
                        }}
                        aria-label="Delete Crop"
                      >
                        <Trash className="h-5 w-5 text-red-500" />
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
                </div>
              )}
            </div>

        {/* Add Activity Dialog */}
                    <Dialog open={showAddActivityDialog} onOpenChange={setShowAddActivityDialog}>
                      <DialogContent>
                        <DialogHeader>
              <DialogTitle>Add Activity for {selectedCrop?.crop_name || 'Crop'}</DialogTitle>
                          <DialogDescription>
                Record a new activity for this crop.
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAddActivity} className="space-y-4">
                          <div className="space-y-2">
                <Label htmlFor="activity-type">Activity Type</Label>
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
                <Label htmlFor="activity-date">Date</Label>
                            <Input
                  id="activity-date"
                              type="date"
                              value={newActivity.activity_date}
                              onChange={(e) => setNewActivity({ ...newActivity, activity_date: e.target.value })}
                              required
                            />
                          </div>
                          
                          <div className="space-y-2">
                <Label htmlFor="activity-description">Description</Label>
                            <Input
                  id="activity-description"
                              value={newActivity.description}
                              onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                  placeholder="Description of the activity"
                            />
                          </div>
                          
                          <div className="space-y-2">
                <Label htmlFor="activity-cost">Cost (optional)</Label>
                            <Input
                  id="activity-cost"
                              type="number"
                              value={newActivity.cost.toString()}
                  onChange={(e) => setNewActivity({ ...newActivity, cost: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                            />
                          </div>

                          <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowAddActivityDialog(false)}>
                  Cancel
                </Button>
                            <Button type="submit">Add Activity</Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>

        {/* View Crop Dialog */}
        <Dialog open={showViewCropDialog} onOpenChange={setShowViewCropDialog}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sprout className="h-5 w-5 text-green-600" />
                {selectedCrop?.crop_name || 'Crop Details'}
              </DialogTitle>
              <DialogDescription>
                View detailed information about this crop.
              </DialogDescription>
            </DialogHeader>
            {selectedCrop && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-md p-4 border">
                  <div>
                    <h4 className="font-medium text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Sprout className="h-3 w-3 text-green-600" /> Crop Type
                    </h4>
                    <span className="font-semibold">{selectedCrop.crop_type}</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-xs text-muted-foreground mb-1">Variety</h4>
                    <span>{selectedCrop.variety || 'Not specified'}</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-blue-600" /> Plot
                    </h4>
                    <span>{getPlotName(selectedCrop.plot_id)}</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-xs text-muted-foreground mb-1">Status</h4>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${selectedCrop.status === 'harvested' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{selectedCrop.status.charAt(0).toUpperCase() + selectedCrop.status.slice(1)}</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-green-600" /> Planting Date
                    </h4>
                    <span>{selectedCrop.planting_date ? format(new Date(selectedCrop.planting_date), 'MMMM d, yyyy') : 'Not set'}</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-amber-600" /> Expected Harvest
                    </h4>
                    <span>{selectedCrop.expected_harvest_date ? format(new Date(selectedCrop.expected_harvest_date), 'MMMM d, yyyy') : 'Not set'}</span>
                  </div>
                  {selectedCrop.status === 'harvested' && (
                    <div>
                      <h4 className="font-medium text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <Check className="h-3 w-3 text-blue-600" /> Harvest Date
                      </h4>
                      <span>{selectedCrop.actual_harvest_date ? format(new Date(selectedCrop.actual_harvest_date), 'MMMM d, yyyy') : 'Not recorded'}</span>
                    </div>
                  )}
                  {selectedCrop.notes && (
                    <div className="col-span-2">
                      <h4 className="font-medium text-xs text-muted-foreground mb-1">Notes</h4>
                      <span>{selectedCrop.notes}</span>
                </div>
                  )}
                </div>
                <div className="pt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-cyan-600" />
                    <h4 className="font-medium">Crop Activities</h4>
                  </div>
                  <div className="text-xs text-muted-foreground mb-2 ml-6">These are activities you have created for this crop using Add Activity.</div>
                  <div className="border rounded bg-slate-50 max-h-[200px] overflow-y-auto divide-y">
                    {(() => {
                      const cropActivities = activities.filter(a => a.crop_id === selectedCrop.id);
                      return cropActivities.length > 0 ? (
                        cropActivities
                          .sort((a, b) => new Date(b.activity_date).getTime() - new Date(a.activity_date).getTime())
                          .map(activity => (
                            <div key={activity.id} className="flex items-center justify-between px-3 py-2">
                              <div>
                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold mr-2 ${activity.activity_type === 'harvesting' ? 'bg-blue-100 text-blue-700' : activity.activity_type === 'fertilizing' ? 'bg-green-100 text-green-700' : activity.activity_type === 'maintenance' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-200 text-slate-700'}`}>{activity.activity_type.charAt(0).toUpperCase() + activity.activity_type.slice(1)}</span>
                                <span className="font-medium">{activity.description}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-xs text-muted-foreground min-w-[90px] text-right">{format(new Date(activity.activity_date), 'MMM d, yyyy')}</div>
                                <Button variant="ghost" size="icon" onClick={async () => {
                                  if (window.confirm('Are you sure you want to delete this activity?')) {
                                    await handleDeleteActivity(activity.id);
                                  }
                                }}>
                                  <Trash className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-muted-foreground">No activities recorded for this crop.</div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowViewCropDialog(false);
                }}
              >
                Close
              </Button>
              <Button
                variant="default"
                onClick={() => {
                  setShowViewCropDialog(false);
                  setShowAddActivityDialog(true);
                }}
              >
                Add Activity
              </Button>
              {selectedCrop && selectedCrop.status === 'harvested' && (
                <Button
                  variant="default"
                  onClick={() => {
                    setReplantCrop(selectedCrop);
                    setReplantData({
                      plot_id: "",
                      crop_name: selectedCrop.crop_name,
                      crop_type: selectedCrop.crop_type,
                      variety: selectedCrop.variety,
                      planting_date: "",
                      expected_harvest_date: "",
                      notes: selectedCrop.notes || ""
                    });
                    setShowViewCropDialog(false);
                    setShowReplantDialog(true);
                  }}
                >
                  Replant
                </Button>
              )}
              {selectedCrop && selectedCrop.status !== 'harvested' && (
                <Button onClick={() => {
                  handleHarvest(selectedCrop.id);
                  setShowViewCropDialog(false);
                }}>
                  Mark as Harvested
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Replant Dialog */}
        <Dialog open={showReplantDialog} onOpenChange={setShowReplantDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Replant Crop</DialogTitle>
              <DialogDescription>
                Choose plot and planting details for replanting <b>{replantCrop?.crop_name}</b>.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                // Insert new crop
                const { data, error } = await supabase
                  .from('crops')
                  .insert([
                    {
                      ...replantData,
                      status: 'planted'
                    }
                  ])
                  .select()
                  .single();
                if (!error) {
                  setCrops([...crops, data]);
                  toast.success('Crop replanted successfully');
                  setShowReplantDialog(false);
                } else {
                  toast.error('Failed to replant crop');
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="plot_id">Farm Plot</Label>
                <Select
                  value={replantData.plot_id}
                  onValueChange={(value) => setReplantData({ ...replantData, plot_id: value })}
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
                <Label htmlFor="planting_date">Planting Date</Label>
                <Input
                  id="planting_date"
                  type="date"
                  value={replantData.planting_date}
                  onChange={(e) => setReplantData({ ...replantData, planting_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expected_harvest_date">Expected Harvest Date</Label>
                <Input
                  id="expected_harvest_date"
                  type="date"
                  value={replantData.expected_harvest_date}
                  onChange={(e) => setReplantData({ ...replantData, expected_harvest_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={replantData.notes}
                  onChange={(e) => setReplantData({ ...replantData, notes: e.target.value })}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowReplantDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">Replant</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Crop</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the crop <b>{cropToDelete?.crop_name}</b>? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                No
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  if (cropToDelete) {
                    await handleDeleteCrop(cropToDelete.id);
                    setShowDeleteDialog(false);
                    setCropToDelete(null);
                  }
                }}
              >
                Yes, Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
} 