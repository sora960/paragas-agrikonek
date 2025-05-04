import { useState, useEffect } from "react";
import { Task } from "@/types/task";
import TaskInput from "@/components/TaskInput";
import TaskList from "@/components/TaskList";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTasks, createTask, updateTask, deleteTask as deleteSupabaseTask, migrateLocalStorageToSupabase } from "@/services/taskService";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingStorage, setSyncingStorage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Load tasks from Supabase on component mount
  useEffect(() => {
    async function fetchTasks() {
      try {
        setLoading(true);
        const fetchedTasks = await getTasks();
        setTasks(fetchedTasks);
        setError(null);
      } catch (err) {
        console.error("Error fetching tasks from Supabase:", err);
        setError("Failed to load tasks. Please try again.");
        
        // Fallback to localStorage if Supabase fails
        const savedTasks = localStorage.getItem("tasks");
        if (savedTasks) {
          try {
            const parsedTasks = JSON.parse(savedTasks);
            setTasks(parsedTasks.map((task: any) => ({
              ...task,
              createdAt: new Date(task.createdAt)
            })));
            toast({
              title: "Using offline data",
              description: "Could not connect to database. Using locally stored tasks instead.",
              variant: "destructive"
            });
          } catch (error) {
            console.error("Failed to parse tasks from localStorage", error);
          }
        }
      } finally {
        setLoading(false);
      }
    }

    fetchTasks();
  }, [toast]);

  // Function to migrate data from localStorage to Supabase
  const handleMigrateToSupabase = async () => {
    try {
      setSyncingStorage(true);
      const success = await migrateLocalStorageToSupabase();
      if (success) {
        // Refresh task list
        const fetchedTasks = await getTasks();
        setTasks(fetchedTasks);
        
        toast({
          title: "Data migrated successfully",
          description: "Your tasks have been moved to the cloud database."
        });
      } else {
        throw new Error("Migration failed");
      }
    } catch (error) {
      console.error("Error migrating data:", error);
      toast({
        title: "Migration failed",
        description: "Could not migrate your tasks to the cloud database.",
        variant: "destructive"
      });
    } finally {
      setSyncingStorage(false);
    }
  };

  const addTask = async (text: string) => {
    try {
      setLoading(true);
      const newTask = await createTask({ text, completed: false });
      
      if (newTask) {
        setTasks([newTask, ...tasks]);
        
        toast({
          title: "Task added",
          description: "Your new task has been added."
        });
      } else {
        throw new Error("Failed to add task");
      }
    } catch (error) {
      console.error("Error adding task:", error);
      toast({
        title: "Failed to add task",
        description: "There was an error adding your task. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const completeTask = async (id: string, completed: boolean) => {
    try {
      const success = await updateTask(id, { completed });
      
      if (success) {
        setTasks(tasks.map(task => 
          task.id === id ? { ...task, completed } : task
        ));
      } else {
        throw new Error("Failed to update task");
      }
    } catch (error) {
      console.error("Error updating task:", error);
      toast({
        title: "Failed to update task",
        description: "There was an error updating your task. Please try again.",
        variant: "destructive"
      });
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const success = await deleteSupabaseTask(id);
      
      if (success) {
        setTasks(tasks.filter(task => task.id !== id));
        
        toast({
          title: "Task deleted",
          description: "The task has been removed."
        });
      } else {
        throw new Error("Failed to delete task");
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      toast({
        title: "Failed to delete task",
        description: "There was an error deleting your task. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 py-8">
      <div className="container max-w-2xl px-4">
        <header className="mb-12 text-center animate-fade-in">
          <h1 className="text-4xl font-bold text-purple-900 mb-2">SimpleTask</h1>
          <p className="text-gray-600">A simple way to manage your daily tasks</p>
          {localStorage.getItem("tasks") && (
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4"
              onClick={handleMigrateToSupabase}
              disabled={syncingStorage}
            >
              {syncingStorage && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Migrate local tasks to cloud
            </Button>
          )}
        </header>

        <div className="mb-12 p-6 bg-card rounded-lg border border-border">
          <h2 className="text-2xl font-bold mb-4">Dashboard Access</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link 
              to="/superadmin"
              className="flex flex-col p-4 bg-background rounded-lg border border-border hover:bg-primary/5 transition-colors"
            >
              <h3 className="text-xl font-bold">Super Admin</h3>
              <p className="text-muted-foreground">Access the super admin dashboard</p>
            </Link>
            <Link 
              to="/regional"
              className="flex flex-col p-4 bg-background rounded-lg border border-border hover:bg-primary/5 transition-colors"
            >
              <h3 className="text-xl font-bold">Regional Admin</h3>
              <p className="text-muted-foreground">Access the regional dashboard</p>
            </Link>
            <Link 
              to="/organization"
              className="flex flex-col p-4 bg-background rounded-lg border border-border hover:bg-primary/5 transition-colors"
            >
              <h3 className="text-xl font-bold">Organization</h3>
              <p className="text-muted-foreground">Access the organization dashboard</p>
            </Link>
            <Link 
              to="/farmer"
              className="flex flex-col p-4 bg-background rounded-lg border border-border hover:bg-primary/5 transition-colors"
            >
              <h3 className="text-xl font-bold">Farmer</h3>
              <p className="text-muted-foreground">Access the farmer dashboard</p>
            </Link>
          </div>
        </div>

        <Card className="shadow-md animate-slide-in">
          <CardHeader className="border-b border-gray-100 bg-white rounded-t-lg">
            <CardTitle className="text-xl text-purple-800">My Tasks</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <TaskInput onAddTask={addTask} disabled={loading} />
            
            {error && (
              <div className="my-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}
            
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              </div>
            ) : (
              <TaskList 
                tasks={tasks}
                onCompleteTask={completeTask}
                onDeleteTask={deleteTask}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
