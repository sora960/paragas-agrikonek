import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Plus, Loader2, X, Check, Trash2, RefreshCw } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { FarmEvent, FarmEventInput, createFarmEvent, deleteFarmEvent, getFarmEvents, updateFarmEvent, markEventAsCompleted, getFarmPlots, syncCropsToCalendar } from "@/services/eventService";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

interface FarmPlot {
  id: string;
  plot_name: string;
}

// Helper functions to replace date-fns functions that are causing linter issues
const isSameMonth = (date1: Date, date2: Date): boolean => {
  return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth();
};

const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.getFullYear() === date2.getFullYear() && 
         date1.getMonth() === date2.getMonth() && 
         date1.getDate() === date2.getDate();
};

const isAfter = (date1: Date, date2: Date): boolean => {
  return date1.getTime() > date2.getTime();
};

const isBefore = (date1: Date, date2: Date): boolean => {
  return date1.getTime() < date2.getTime();
};

const parseISO = (dateString: string): Date => {
  return new Date(dateString);
};

export default function FarmerCalendar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<FarmEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<FarmEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [farmerId, setFarmerId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<FarmEvent | null>(null);
  const [availablePlots, setAvailablePlots] = useState<FarmPlot[]>([]);
  const [newEvent, setNewEvent] = useState<FarmEventInput>({
    title: "",
    description: "",
    event_date: format(new Date(), "yyyy-MM-dd"),
    event_type: "other",
  });
  const [activeTab, setActiveTab] = useState<string>("all");
  const [linkedToCrop, setLinkedToCrop] = useState<boolean>(false);
  
  useEffect(() => {
    if (user?.id) {
      fetchFarmerProfile();
    }
  }, [user?.id]);
  
  useEffect(() => {
    if (farmerId) {
      loadEvents();
      loadPlots();
    }
  }, [farmerId]);
  
  useEffect(() => {
    if (date && events.length > 0) {
      filterUpcomingEvents();
    }
  }, [date, events, activeTab]);
  
  const filterUpcomingEvents = () => {
    const now = new Date();
    
    // Filter events based on the active tab and date
    let filtered = events;
    
    if (activeTab !== "all") {
      filtered = events.filter(event => event.event_type === activeTab);
    }
    
    // Filter for upcoming events only
    const upcoming = filtered
      .filter(event => {
        const eventDate = new Date(event.event_date);
        return isAfter(eventDate, now) || isSameDay(eventDate, now);
      })
      .sort((a, b) => {
        return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
      })
      .slice(0, 5);
    
    setUpcomingEvents(upcoming);
  };

  const fetchFarmerProfile = async () => {
    try {
      // Get the farmer profile for the current user
      const { data: farmerProfile, error } = await supabase
        .from("farmer_profiles")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (error) {
        console.error("Error loading farmer profile:", error);
        toast({
          title: "Error",
          description: "Couldn't load your farmer profile. Please make sure your profile is complete.",
          variant: "destructive",
        });
        return;
      }

      setFarmerId(farmerProfile.id);
    } catch (error: any) {
      console.error("Error in fetchFarmerProfile:", error);
      toast({
        title: "Error",
        description: "Failed to load your profile.",
        variant: "destructive",
      });
    }
  };

  const loadEvents = async () => {
    if (!farmerId) return;
    
    try {
      setLoading(true);
      const eventsData = await getFarmEvents(farmerId);
      setEvents(eventsData);
    } catch (error) {
      console.error("Error loading events:", error);
      toast({
        title: "Error",
        description: "Failed to load calendar events.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const loadPlots = async () => {
    if (!farmerId) return;
    
    try {
      const plotsData = await getFarmPlots(farmerId);
      setAvailablePlots(plotsData);
    } catch (error) {
      console.error("Error loading plots:", error);
    }
  };
  
  const handleSyncCrops = async () => {
    if (!farmerId) return;
    
    try {
      setSyncing(true);
      await syncCropsToCalendar(farmerId);
      await loadEvents(); // Reload events after sync
      
      toast({
        title: "Success",
        description: "Crop events have been synced with your calendar.",
      });
    } catch (error) {
      console.error("Error syncing crops:", error);
      toast({
        title: "Error",
        description: "Failed to sync crop events. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleCreateEvent = async () => {
    if (!farmerId) return;
    
    try {
      // Validate inputs
      if (!newEvent.title.trim()) {
        toast({
          title: "Error",
          description: "Please enter an event title.",
          variant: "destructive",
        });
        return;
      }

      const createdEvent = await createFarmEvent(farmerId, newEvent);
      setEvents([...events, createdEvent]);
      setDialogOpen(false);
      resetEventForm();
      
      toast({
        title: "Success",
        description: "Event created successfully.",
      });
    } catch (error) {
      console.error("Error creating event:", error);
      toast({
        title: "Error",
        description: "Failed to create event. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleUpdateEvent = async () => {
    if (!selectedEvent) return;
    
    try {
      const { title, description, event_date, end_date, event_type, plot_id } = newEvent;
      
      // Validate inputs
      if (!title.trim()) {
        toast({
          title: "Error",
          description: "Please enter an event title.",
          variant: "destructive",
        });
        return;
      }

      const updatedEvent = await updateFarmEvent(selectedEvent.id, {
        title,
        description,
        event_date,
        end_date,
        event_type,
        plot_id
      });
      
      // Update the events state with the updated event
      setEvents(events.map(event => event.id === updatedEvent.id ? updatedEvent : event));
      setEventDialogOpen(false);
      resetEventForm();
      
      toast({
        title: "Success",
        description: "Event updated successfully.",
      });
    } catch (error) {
      console.error("Error updating event:", error);
      toast({
        title: "Error",
        description: "Failed to update event. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    
    try {
      await deleteFarmEvent(selectedEvent.id);
      
      // Remove the event from the events state
      setEvents(events.filter(event => event.id !== selectedEvent.id));
      setEventDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Event deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting event:", error);
      toast({
        title: "Error",
        description: "Failed to delete event. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleMarkCompleted = async () => {
    if (!selectedEvent) return;
    
    try {
      const updatedEvent = await markEventAsCompleted(selectedEvent.id);
      
      // Update the events state with the updated event
      setEvents(events.map(event => event.id === updatedEvent.id ? updatedEvent : event));
      setEventDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Event marked as completed.",
      });
    } catch (error) {
      console.error("Error marking event as completed:", error);
      toast({
        title: "Error",
        description: "Failed to update event status. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const resetEventForm = () => {
    setNewEvent({
      title: "",
      description: "",
      event_date: format(new Date(), "yyyy-MM-dd"),
      event_type: "other",
    });
    setSelectedEvent(null);
  };
  
  const openAddDialog = () => {
    resetEventForm();
    if (date) {
      setNewEvent({
        ...newEvent,
        event_date: format(date, "yyyy-MM-dd")
      });
    }
    setDialogOpen(true);
  };
  
  const openEventDialog = (event: FarmEvent) => {
    setSelectedEvent(event);
    setNewEvent({
      title: event.title,
      description: event.description || "",
      event_date: event.event_date,
      end_date: event.end_date,
      event_type: event.event_type,
      status: event.status,
      plot_id: event.plot_id
    });
    setEventDialogOpen(true);
  };
  
  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'planting': return 'bg-green-500';
      case 'harvesting': return 'bg-yellow-500';
      case 'maintenance': return 'bg-blue-500';
      case 'fertilizing': return 'bg-purple-500';
      case 'irrigation': return 'bg-cyan-500';
      case 'pest_control': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getEventStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-yellow-500'; // upcoming
    }
  };
  
  const renderCalendarCell = (day: Date) => {
    const eventsOnDay = events.filter(event => {
      const eventDate = new Date(event.event_date);
      return isSameDay(eventDate, day);
    });
    
    if (eventsOnDay.length > 0) {
      return (
        <div className="relative p-0">
          <div className="absolute bottom-0 left-0 right-0 flex justify-center mb-1">
            {eventsOnDay.slice(0, 3).map((event, i) => (
              <div
                key={i}
                className={`h-1.5 w-1.5 rounded-full mx-0.5 ${getEventTypeColor(event.event_type)}`}
              />
            ))}
            {eventsOnDay.length > 3 && (
              <div className="h-1.5 w-1.5 rounded-full mx-0.5 bg-gray-400" />
            )}
          </div>
        </div>
      );
    }
    
    return null;
  };

  return (
    <DashboardLayout userRole="farmer">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Farm Calendar</h1>
            <p className="text-muted-foreground">
              Track and manage all your farming activities
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleSyncCrops} 
              disabled={syncing}
              variant="outline"
              className="flex items-center gap-1"
            >
              {syncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Sync Crop Events
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-1">
                  <Plus className="h-4 w-4" />
                  Add Event
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Calendar Event</DialogTitle>
                  <DialogDescription>
                    Create a new event on your farm calendar.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div>
                    <Label htmlFor="event-title">Title</Label>
                    <Input
                      id="event-title"
                      placeholder="Event title"
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="event-date">Date</Label>
                    <Input
                      id="event-date"
                      type="date"
                      value={newEvent.event_date}
                      onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="event-type">Event Type</Label>
                    <Select
                      value={newEvent.event_type}
                      onValueChange={(value: any) => setNewEvent({ ...newEvent, event_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select event type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planting">Planting</SelectItem>
                        <SelectItem value="harvesting">Harvesting</SelectItem>
                        <SelectItem value="fertilizing">Fertilizing</SelectItem>
                        <SelectItem value="pesticide">Pesticide Application</SelectItem>
                        <SelectItem value="irrigation">Irrigation</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="link-to-plot" 
                        checked={linkedToCrop}
                        onCheckedChange={(checked) => setLinkedToCrop(!!checked)}
                      />
                      <Label htmlFor="link-to-plot">Link to a plot</Label>
                    </div>
                  </div>
                  
                  {linkedToCrop && (
                    <div>
                      <Label htmlFor="plot-id">Farm Plot</Label>
                      <Select
                        value={newEvent.plot_id || ""}
                        onValueChange={(value) => setNewEvent({ ...newEvent, plot_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a plot" />
                        </SelectTrigger>
                        <SelectContent>
                          {availablePlots.map((plot) => (
                            <SelectItem key={plot.id} value={plot.id}>
                              {plot.plot_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div>
                    <Label htmlFor="event-description">Description</Label>
                    <Textarea
                      id="event-description"
                      placeholder="Event details..."
                      value={newEvent.description || ""}
                      onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateEvent}>
                    Create Event
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Calendar</CardTitle>
                <CardDescription>
                  Select a date to view or add farming activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  className="rounded-md border"
                  components={{
                    DayContent: (props) => (
                      <>
                        {props.date.getDate()}
                        {renderCalendarCell(props.date)}
                      </>
                    )
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upcoming Events</CardTitle>
                <CardDescription>
                  Your scheduled farming activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingEvents.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No upcoming events. Click "Add Event" to schedule activities.
                    </p>
                  ) : (
                    upcomingEvents.map((event) => (
                      <div 
                        key={event.id} 
                        className="rounded-lg border p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => openEventDialog(event)}
                      >
                        <div className="flex items-center gap-3">
                          <CalendarIcon className={`h-5 w-5 ${event.status === 'completed' ? 'text-green-500' : 'text-primary'}`} />
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <p className="font-medium">{event.title}</p>
                              <Badge className={getEventStatusColor(event.status)}>
                                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(event.event_date), "MMM dd, yyyy")}
                                {event.end_date && ` - ${format(new Date(event.end_date), "MMM dd, yyyy")}`}
                              </p>
                              <Badge variant="outline" className="text-xs">
                                {event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* View/Edit Event Dialog */}
      <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
            <DialogDescription>
              View or modify your farming event
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="edit-title" className="col-span-4">
                  Event Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-title"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="col-span-4"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="edit-event-type" className="col-span-4">
                  Event Type
                </Label>
                <Select 
                  value={newEvent.event_type}
                  onValueChange={(value) => setNewEvent({ ...newEvent, event_type: value as any })}
                >
                  <SelectTrigger className="col-span-4">
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planting">Planting</SelectItem>
                    <SelectItem value="harvesting">Harvesting</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="fertilizing">Fertilizing</SelectItem>
                    <SelectItem value="irrigation">Irrigation</SelectItem>
                    <SelectItem value="pest_control">Pest Control</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-event-date" className="col-span-4">
                  Event Date
                </Label>
                <div className="col-span-2">
                  <Input
                    id="edit-event-date"
                    type="date"
                    value={newEvent.event_date}
                    onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
                  />
                </div>
                <Label htmlFor="edit-end-date" className="text-right">
                  End Date
                </Label>
                <div className="col-span-1">
                  <Input
                    id="edit-end-date"
                    type="date"
                    value={newEvent.end_date || ""}
                    onChange={(e) => setNewEvent({ ...newEvent, end_date: e.target.value || undefined })}
                  />
                </div>
              </div>
              {availablePlots.length > 0 && (
                <div className="grid grid-cols-4 items-center gap-2">
                  <Label htmlFor="edit-plot" className="col-span-4">
                    Farm Plot
                  </Label>
                  <Select 
                    value={newEvent.plot_id}
                    onValueChange={(value) => setNewEvent({ ...newEvent, plot_id: value })}
                  >
                    <SelectTrigger className="col-span-4">
                      <SelectValue placeholder="Select a plot (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {availablePlots.map((plot) => (
                        <SelectItem key={plot.id} value={plot.id}>
                          {plot.plot_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="edit-description" className="col-span-4">
                  Description
                </Label>
                <Textarea
                  id="edit-description"
                  value={newEvent.description || ""}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="col-span-4"
                  rows={3}
                />
              </div>

              <div className="flex justify-between items-center border-t pt-4">
                <div className="flex items-center gap-2">
                  <Badge className={getEventStatusColor(selectedEvent.status)}>
                    {selectedEvent.status.charAt(0).toUpperCase() + selectedEvent.status.slice(1)}
                  </Badge>
                  {selectedEvent.status !== 'completed' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleMarkCompleted}
                      className="text-green-600 hover:text-green-700"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Mark Completed
                    </Button>
                  )}
                </div>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={handleDeleteEvent}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEventDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateEvent}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
} 