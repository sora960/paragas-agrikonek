import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FarmerService } from '@/services/FarmerService';
import { Crop, Plot, CropActivity } from '@/types/farmer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function CropManagement() {
  const { user } = useAuth();
  const [crops, setCrops] = useState<Crop[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);
  const [activities, setActivities] = useState<CropActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showActivityDialog, setShowActivityDialog] = useState(false);

  const [newCrop, setNewCrop] = useState({
    name: '',
    variety: '',
    planting_date: '',
    expected_harvest_date: '',
    plot_id: '',
    estimated_yield: 0,
  });

  const [newActivity, setNewActivity] = useState({
    activity_type: 'planting',
    date: '',
    description: '',
    resources_used: [],
    cost: 0,
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cropsData, plotsData] = await Promise.all([
        FarmerService.getCrops(user!.id),
        FarmerService.getPlots(user!.id),
      ]);
      setCrops(cropsData);
      setPlots(plotsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load crop data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCrop = async () => {
    try {
      const crop = await FarmerService.createCrop({
        ...newCrop,
        farmer_id: user!.id,
        status: 'planning',
        planting_date: new Date(newCrop.planting_date),
        expected_harvest_date: new Date(newCrop.expected_harvest_date),
      } as Omit<Crop, 'id'>);
      
      setCrops([...crops, crop]);
      setShowAddDialog(false);
      toast.success('Crop added successfully');
    } catch (error) {
      console.error('Error adding crop:', error);
      toast.error('Failed to add crop');
    }
  };

  const handleAddActivity = async () => {
    if (!selectedCrop) return;

    try {
      const activity = await FarmerService.createCropActivity({
        ...newActivity,
        crop_id: selectedCrop.id,
        date: new Date(newActivity.date),
      } as Omit<CropActivity, 'id'>);
      
      setActivities([activity, ...activities]);
      setShowActivityDialog(false);
      toast.success('Activity recorded successfully');
    } catch (error) {
      console.error('Error adding activity:', error);
      toast.error('Failed to record activity');
    }
  };

  const handleCropSelect = async (crop: Crop) => {
    setSelectedCrop(crop);
    try {
      const cropActivities = await FarmerService.getCropActivities(crop.id);
      setActivities(cropActivities);
    } catch (error) {
      console.error('Error loading activities:', error);
      toast.error('Failed to load crop activities');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Crop Management</h2>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>Add New Crop</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Crop</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Crop Name</Label>
                <Input
                  id="name"
                  value={newCrop.name}
                  onChange={(e) => setNewCrop({ ...newCrop, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="variety">Variety</Label>
                <Input
                  id="variety"
                  value={newCrop.variety}
                  onChange={(e) => setNewCrop({ ...newCrop, variety: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="plot">Plot</Label>
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
                        {plot.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="planting_date">Planting Date</Label>
                <Input
                  id="planting_date"
                  type="date"
                  value={newCrop.planting_date}
                  onChange={(e) => setNewCrop({ ...newCrop, planting_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="expected_harvest_date">Expected Harvest Date</Label>
                <Input
                  id="expected_harvest_date"
                  type="date"
                  value={newCrop.expected_harvest_date}
                  onChange={(e) => setNewCrop({ ...newCrop, expected_harvest_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="estimated_yield">Estimated Yield</Label>
                <Input
                  id="estimated_yield"
                  type="number"
                  value={newCrop.estimated_yield}
                  onChange={(e) => setNewCrop({ ...newCrop, estimated_yield: Number(e.target.value) })}
                />
              </div>
              <Button onClick={handleAddCrop}>Add Crop</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Crops List</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Planting Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {crops.map((crop) => (
                  <TableRow key={crop.id}>
                    <TableCell>{crop.name}</TableCell>
                    <TableCell>{crop.status}</TableCell>
                    <TableCell>{new Date(crop.planting_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCropSelect(crop)}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {selectedCrop && (
          <Card>
            <CardHeader>
              <CardTitle>Crop Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">{selectedCrop.name}</h3>
                <Dialog open={showActivityDialog} onOpenChange={setShowActivityDialog}>
                  <DialogTrigger asChild>
                    <Button>Record Activity</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Record Activity</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="activity_type">Activity Type</Label>
                        <Select
                          value={newActivity.activity_type}
                          onValueChange={(value) => setNewActivity({ ...newActivity, activity_type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
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
                      <div>
                        <Label htmlFor="date">Date</Label>
                        <Input
                          id="date"
                          type="date"
                          value={newActivity.date}
                          onChange={(e) => setNewActivity({ ...newActivity, date: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Input
                          id="description"
                          value={newActivity.description}
                          onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="cost">Cost</Label>
                        <Input
                          id="cost"
                          type="number"
                          value={newActivity.cost}
                          onChange={(e) => setNewActivity({ ...newActivity, cost: Number(e.target.value) })}
                        />
                      </div>
                      <Button onClick={handleAddActivity}>Record Activity</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
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
                  {activities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell>{new Date(activity.date).toLocaleDateString()}</TableCell>
                      <TableCell>{activity.activity_type}</TableCell>
                      <TableCell>{activity.description}</TableCell>
                      <TableCell>${activity.cost?.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 