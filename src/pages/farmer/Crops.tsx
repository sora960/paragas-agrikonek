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

export default function Crops() {
  const { user } = useAuth();
  const [crops, setCrops] = useState<Crop[]>([]);
  const [activities, setActivities] = useState<CropActivity[]>([]);
  const [plots, setPlots] = useState<FarmPlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCropDialog, setShowAddCropDialog] = useState(false);
  const [showAddActivityDialog, setShowAddActivityDialog] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);
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
    fetchCropsAndPlots();
  }, []);

  const fetchCropsAndPlots = async () => {
    try {
      setLoading(true);
      
      // First get the farmer's profile
      const { data: farmerProfile, error: profileError } = await supabase
        .from('farmer_profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (profileError) throw profileError;

      // Then get all plots for this farmer
      const { data: plotsData, error: plotsError } = await supabase
        .from('farm_plots')
        .select('*')
        .eq('farmer_id', farmerProfile.id);

      if (plotsError) throw plotsError;
      setPlots(plotsData || []);

      // Get all crops for these plots
      const plotIds = plotsData?.map(plot => plot.id) || [];
      const { data: cropsData, error: cropsError } = await supabase
        .from('crops')
        .select('*')
        .in('plot_id', plotIds);

      if (cropsError) throw cropsError;
      setCrops(cropsData || []);

      // Get all activities for these crops
      const cropIds = cropsData?.map(crop => crop.id) || [];
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('crop_activities')
        .select('*')
        .in('crop_id', cropIds);

      if (activitiesError) throw activitiesError;
      setActivities(activitiesData || []);
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
      const { error } = await supabase
        .from('crops')
        .insert([{
          ...newCrop,
          status: 'planted'
        }]);

      if (error) throw error;

      toast.success('Crop added successfully');
      setShowAddCropDialog(false);
      setNewCrop({
        plot_id: "",
        crop_name: "",
        crop_type: "",
        variety: "",
        planting_date: "",
        expected_harvest_date: "",
        notes: ""
      });
      fetchCropsAndPlots();
    } catch (error) {
      console.error('Error adding crop:', error);
      toast.error('Failed to add crop');
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!selectedCrop) throw new Error('No crop selected');

      const { error } = await supabase
        .from('crop_activities')
        .insert([{
          ...newActivity,
          crop_id: selectedCrop.id,
          status: 'completed'
        }]);

      if (error) throw error;

      toast.success('Activity added successfully');
      setShowAddActivityDialog(false);
      setNewActivity({
        activity_type: "",
        activity_date: "",
        description: "",
        resources_used: {},
        cost: 0
      });
      fetchCropsAndPlots();
    } catch (error) {
      console.error('Error adding activity:', error);
      toast.error('Failed to add activity');
    }
  };

  const handleHarvest = async (cropId: string) => {
    try {
      const { error } = await supabase
        .from('crops')
        .update({
          status: 'harvested',
          actual_harvest_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', cropId);

      if (error) throw error;

      toast.success('Crop marked as harvested');
      fetchCropsAndPlots();
    } catch (error) {
      console.error('Error updating crop:', error);
      toast.error('Failed to update crop status');
    }
  };

  const handleRecordYield = async (cropId: string, yieldAmount: number, yieldQuality: string) => {
    try {
      const { error } = await supabase
        .from('crops')
        .update({
          yield_amount: yieldAmount,
          yield_quality: yieldQuality
        })
        .eq('id', cropId);

      if (error) throw error;

      toast.success('Yield recorded successfully');
      fetchCropsAndPlots();
    } catch (error) {
      console.error('Error recording yield:', error);
      toast.error('Failed to record yield');
    }
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
                  <Label htmlFor="plot">Farm Plot</Label>
                  <Select
                    value={newCrop.plot_id}
                    onValueChange={(value) => setNewCrop({ ...newCrop, plot_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a plot" />
                    </SelectTrigger>
                    <SelectContent>
                      {plots.map((plot) => (
                        <SelectItem key={plot.id} value={plot.id}>
                          {plot.plot_name} ({plot.plot_size} ha)
                        </SelectItem>
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
                  <Input
                    id="crop_type"
                    value={newCrop.crop_type}
                    onChange={(e) => setNewCrop({ ...newCrop, crop_type: e.target.value })}
                    required
                  />
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
                    required
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

        <Tabs defaultValue="crops">
          <TabsList>
            <TabsTrigger value="crops">Crops</TabsTrigger>
            <TabsTrigger value="activities">Activities</TabsTrigger>
          </TabsList>
          
          <TabsContent value="crops">
            <Card>
              <CardHeader>
                <CardTitle>Your Crops</CardTitle>
                <CardDescription>Manage your crops and track their progress</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Crop Name</TableHead>
                      <TableHead>Plot</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Planting Date</TableHead>
                      <TableHead>Expected Harvest</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Yield</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {crops.map((crop) => (
                      <TableRow key={crop.id}>
                        <TableCell>{crop.crop_name}</TableCell>
                        <TableCell>
                          {plots.find(p => p.id === crop.plot_id)?.plot_name}
                        </TableCell>
                        <TableCell>{crop.crop_type}</TableCell>
                        <TableCell>{new Date(crop.planting_date).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(crop.expected_harvest_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            crop.status === 'planted' ? 'bg-green-100 text-green-800' :
                            crop.status === 'harvested' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {crop.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          {crop.yield_amount ? (
                            <span className="text-sm">
                              {crop.yield_amount} kg ({crop.yield_quality})
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {crop.status !== 'harvested' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedCrop(crop);
                                  setShowAddActivityDialog(true);
                                }}
                              >
                                Add Activity
                              </Button>
                            )}
                            {crop.status === 'planted' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleHarvest(crop.id)}
                              >
                                Harvest
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activities">
            <Card>
              <CardHeader>
                <CardTitle>Crop Activities</CardTitle>
                <CardDescription>Track all activities performed on your crops</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Crop</TableHead>
                      <TableHead>Activity Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activities.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell>
                          {crops.find(c => c.id === activity.crop_id)?.crop_name}
                        </TableCell>
                        <TableCell>{activity.activity_type}</TableCell>
                        <TableCell>{new Date(activity.activity_date).toLocaleDateString()}</TableCell>
                        <TableCell>{activity.description}</TableCell>
                        <TableCell>₱{activity.cost.toFixed(2)}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            activity.status === 'completed' ? 'bg-green-100 text-green-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {activity.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={showAddActivityDialog} onOpenChange={setShowAddActivityDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Crop Activity</DialogTitle>
              <DialogDescription>
                Record a new activity for {selectedCrop?.crop_name}
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
                    <SelectItem value="planting">Planting</SelectItem>
                    <SelectItem value="fertilizing">Fertilizing</SelectItem>
                    <SelectItem value="watering">Watering</SelectItem>
                    <SelectItem value="pest_control">Pest Control</SelectItem>
                    <SelectItem value="harvesting">Harvesting</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
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
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cost">Cost (₱)</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  value={newActivity.cost}
                  onChange={(e) => setNewActivity({ ...newActivity, cost: parseFloat(e.target.value) })}
                  required
                />
              </div>
              
              <DialogFooter>
                <Button type="submit">Add Activity</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
} 