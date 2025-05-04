import { useState, useEffect } from "react";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { Plus, Wrench, Sprout, Droplets, Package } from "lucide-react";
import { getFarmResources, createFarmResource, updateFarmResource, getFarmResourcesSummary } from "../../services/supabase";
import { FarmResource, FarmerResourcesSummary } from "../../types/database.types";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";

export default function Resources() {
  const { user } = useAuth();
  const [resources, setResources] = useState<FarmResource[]>([]);
  const [summary, setSummary] = useState<FarmerResourcesSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddResourceDialog, setShowAddResourceDialog] = useState(false);
  const [newResource, setNewResource] = useState({
    name: "",
    type: "other" as const,
    quantity: 0,
    unit: "",
    notes: "",
    status: "available" as const
  });

  useEffect(() => {
    if (user?.id) {
      Promise.all([fetchResources(), fetchSummary()]);
    }
  }, [user?.id]);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const data = await getFarmResources(user!.id);
      setResources(data);
    } catch (error) {
      console.error('Error fetching resources:', error);
      toast.error('Failed to fetch resources');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const data = await getFarmResourcesSummary(user!.id);
      setSummary(data);
    } catch (error) {
      console.error('Error fetching resource summary:', error);
    }
  };

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!user?.id) {
        toast.error('User not authenticated');
        return;
      }

      await createFarmResource({
        ...newResource,
        farmer_id: user.id
      });
      
      await Promise.all([fetchResources(), fetchSummary()]);
      setShowAddResourceDialog(false);
      setNewResource({
        name: "",
        type: "other",
        quantity: 0,
        unit: "",
        notes: "",
        status: "available"
      });
      toast.success('Resource added successfully');
    } catch (error) {
      console.error('Error adding resource:', error);
      toast.error('Failed to add resource');
    }
  };

  const handleUpdateResourceStatus = async (id: string, currentStatus: "available" | "in_use" | "maintenance" | "disposed") => {
    try {
      const newStatus = currentStatus === "available" ? "in_use" : "available";
      await updateFarmResource(id, { status: newStatus });
      await Promise.all([fetchResources(), fetchSummary()]);
      toast.success(`Resource marked as ${newStatus.replace('_', ' ')}`);
    } catch (error) {
      console.error('Error updating resource status:', error);
      toast.error('Failed to update resource status');
    }
  };

  const getResourceIcon = (type: "equipment" | "seeds" | "fertilizer" | "other") => {
    switch (type) {
      case "equipment":
        return <Wrench className="h-6 w-6 text-blue-500" />;
      case "seeds":
        return <Sprout className="h-6 w-6 text-green-500" />;
      case "fertilizer":
        return <Droplets className="h-6 w-6 text-yellow-500" />;
      default:
        return <Package className="h-6 w-6 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <DashboardLayout userRole="farmer">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading resources...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="farmer">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Farm Resources</h1>
          <Dialog open={showAddResourceDialog} onOpenChange={setShowAddResourceDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Resource
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Resource</DialogTitle>
                <DialogDescription>
                  Add a new farm resource to your inventory.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddResource} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Resource Name</Label>
                  <Input
                    id="name"
                    value={newResource.name}
                    onChange={(e) => setNewResource({ ...newResource, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Resource Type</Label>
                  <Select
                    value={newResource.type}
                    onValueChange={(value) => setNewResource({ ...newResource, type: value as typeof newResource.type })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select resource type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equipment">Equipment</SelectItem>
                      <SelectItem value="seeds">Seeds</SelectItem>
                      <SelectItem value="fertilizer">Fertilizer</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={newResource.quantity}
                      onChange={(e) => setNewResource({ ...newResource, quantity: parseFloat(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit</Label>
                    <Input
                      id="unit"
                      value={newResource.unit}
                      onChange={(e) => setNewResource({ ...newResource, unit: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={newResource.notes || ''}
                    onChange={(e) => setNewResource({ ...newResource, notes: e.target.value })}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit">Add Resource</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {summary && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total Resources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.total_resources}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Equipment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.equipment_count}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Seeds</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.seeds_count}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Fertilizers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.fertilizer_count}</div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => (
            <Card key={resource.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{resource.name}</CardTitle>
                  {getResourceIcon(resource.type)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Type:</span>
                    <span className="text-sm font-medium capitalize">{resource.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Quantity:</span>
                    <span className="text-sm font-medium">
                      {resource.quantity} {resource.unit}
                    </span>
                  </div>
                  {resource.notes && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Notes:</span>
                      <span className="text-sm font-medium">{resource.notes}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <Button
                      variant={resource.status === "in_use" ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleUpdateResourceStatus(resource.id, resource.status)}
                    >
                      {resource.status === "in_use" ? "In Use" : "Available"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
} 