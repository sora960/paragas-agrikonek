import { useState, useEffect } from "react";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { Calendar as CalendarIcon, Plus, MapPin } from "lucide-react";
import { format } from "date-fns";
import { getFarmingTasks, createFarmingTask, updateFarmingTask, getFarmPlots } from "../../services/supabase";
import { FarmingTaskCalendar, FarmPlot } from "../../types/database.types";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";

export default function Calendar() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<FarmingTaskCalendar[]>([]);
  const [plots, setPlots] = useState<FarmPlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    task_date: "",
    task_type: "other" as const,
    status: "pending" as const,
    plot_id: null as string | null,
    resources_used: {} as Record<string, any>
  });

  useEffect(() => {
    if (user?.id) {
      Promise.all([fetchTasks(), fetchPlots()]);
    }
  }, [user?.id]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const data = await getFarmingTasks(user!.id);
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlots = async () => {
    try {
      const data = await getFarmPlots(user!.id);
      setPlots(data);
    } catch (error) {
      console.error('Error fetching plots:', error);
      toast.error('Failed to fetch plots');
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!user?.id) {
        toast.error('User not authenticated');
        return;
      }

      const task = await createFarmingTask({
        ...newTask,
        farmer_id: user.id
      });
      
      await fetchTasks(); // Refetch to get the updated task with plot info
      setShowAddTaskDialog(false);
      setNewTask({
        title: "",
        description: "",
        task_date: "",
        task_type: "other",
        status: "pending",
        plot_id: null,
        resources_used: {}
      });
      toast.success('Task added successfully');
    } catch (error) {
      console.error('Error adding task:', error);
      toast.error('Failed to add task');
    }
  };

  const handleTaskStatusChange = async (taskId: string, currentStatus: "pending" | "completed" | "cancelled") => {
    try {
      const newStatus = currentStatus === "pending" ? "completed" : "pending";
      await updateFarmingTask(taskId, { status: newStatus });
      await fetchTasks(); // Refetch to get the updated task
      toast.success(`Task marked as ${newStatus}`);
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error('Failed to update task status');
    }
  };

  const getTaskTypeColor = (type: "planting" | "harvesting" | "maintenance" | "other") => {
    switch (type) {
      case "planting": return "bg-green-100 text-green-800";
      case "harvesting": return "bg-yellow-100 text-yellow-800";
      case "maintenance": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <DashboardLayout userRole="farmer">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading tasks...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="farmer">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Farming Calendar</h1>
          <Dialog open={showAddTaskDialog} onOpenChange={setShowAddTaskDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Task</DialogTitle>
                <DialogDescription>
                  Schedule a new farming task.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddTask} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Task Title</Label>
                  <Input
                    id="title"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newTask.description || ''}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newTask.task_date}
                    onChange={(e) => setNewTask({ ...newTask, task_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Task Type</Label>
                  <Select
                    value={newTask.task_type}
                    onValueChange={(value) => setNewTask({ ...newTask, task_type: value as typeof newTask.task_type })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select task type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planting">Planting</SelectItem>
                      <SelectItem value="harvesting">Harvesting</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plot">Farm Plot</Label>
                  <Select
                    value={newTask.plot_id || ""}
                    onValueChange={(value) => setNewTask({ ...newTask, plot_id: value || null })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a plot" />
                    </SelectTrigger>
                    <SelectContent>
                      {plots.map((plot) => (
                        <SelectItem key={plot.id} value={plot.id}>
                          {plot.plot_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="submit">Add Task</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => (
            <Card key={task.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{task.title}</CardTitle>
                  <span className={`px-2 py-1 rounded-full text-xs ${getTaskTypeColor(task.task_type)}`}>
                    {task.task_type}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{task.description}</p>
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarIcon className="h-4 w-4" />
                    <span>{format(new Date(task.task_date), "MMM dd, yyyy")}</span>
                  </div>
                  {task.plot_name && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{task.plot_name}</span>
                    </div>
                  )}
                  <div className="flex justify-end">
                    <Button
                      variant={task.status === "completed" ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleTaskStatusChange(task.id, task.status)}
                    >
                      {task.status === "completed" ? "Completed" : "Mark Complete"}
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