import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Plus, Loader2, X, Check, Trash2, RefreshCw, Scissors, Circle, Pencil, AlertCircle, Leaf, Droplet, Wrench } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { getFarmerEvents, addEvent, updateEvent, deleteEvent, markEventAsCompleted, getFarmPlots, syncCropsToCalendar } from "@/services/eventService";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format, isSameDay, isSameMonth, isAfter, isBefore, parseISO, addDays, startOfDay } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface FarmPlot {
  id: string;
  plot_name: string;
}

interface FarmEventInput {
  title: string;
  description?: string;
  event_date: string;
  end_date?: string;
  event_type: string;
  status?: string;
  plot_id?: string;
}

export default function FarmerCalendar() {
  const { user } = useAuth();
  const { toast: uiToast } = useToast(); // Rename to avoid conflict with sonner toast
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [farmerId, setFarmerId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [availablePlots, setAvailablePlots] = useState<FarmPlot[]>([]);
  const [newEvent, setNewEvent] = useState<FarmEventInput>({
    title: "",
    description: "",
    event_date: format(new Date(), "yyyy-MM-dd"),
    event_type: "other",
  });
  const [activeTab, setActiveTab] = useState<string>("all");
  const [linkedToCrop, setLinkedToCrop] = useState<boolean>(false);
  const [syncingCrops, setSyncingCrops] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedEvents, setSelectedEvents] = useState<any[]>([]);
  
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
  
  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user]);
  
  useEffect(() => {
    if (selectedDate) {
      const eventsOnSelectedDate = events.filter(event => 
        isSameDay(new Date(event.date), selectedDate)
      );
      setSelectedEvents(eventsOnSelectedDate);
    } else {
      setSelectedEvents([]);
    }
  }, [selectedDate, events]);
  
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
        const eventDate = new Date(event.date || event.event_date);
        return isAfter(eventDate, now) || isSameDay(eventDate, now);
      })
      .sort((a, b) => {
        return new Date(a.date || a.event_date).getTime() - new Date(b.date || b.event_date).getTime();
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
        uiToast({
          title: "Error",
          description: "Couldn't load your farmer profile. Please make sure your profile is complete.",
          variant: "destructive",
        });
        return;
      }

      setFarmerId(farmerProfile.id);
    } catch (error: any) {
      console.error("Error in fetchFarmerProfile:", error);
      uiToast({
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
      const eventsData = await getFarmerEvents(farmerId);
      setEvents(eventsData);
    } catch (error) {
      console.error("Error loading events:", error);
      uiToast({
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
    try {
      setSyncingCrops(true);
      setSyncError(null);
      
      if (!user?.id) {
        throw new Error("User not found");
      }
      
      const result = await syncCropsToCalendar(user.id);
      
      if (result.added > 0) {
        toast.success(`Added ${result.added} events from your crops`);
      } else {
        toast.info("No new events to add from your crops");
      }
      
      fetchEvents();
    } catch (error) {
      console.error("Error syncing crops:", error);
      setSyncError("Failed to sync crop events. Please try again.");
      toast.error("Failed to sync crop events");
    } finally {
      setSyncingCrops(false);
    }
  };

  const handleCreateEvent = async () => {
    if (!farmerId) return;
    
    try {
      // Validate inputs
      if (!newEvent.title.trim()) {
        uiToast({
          title: "Error",
          description: "Please enter an event title.",
          variant: "destructive",
        });
        return;
      }

      // Adapt the event to the right format
      const eventToCreate = {
        farmer_id: farmerId,
        title: newEvent.title,
        description: newEvent.description,
        date: newEvent.event_date,
        end_date: newEvent.end_date,
        event_type: newEvent.event_type,
        status: newEvent.status || 'pending',
        reference_id: null,
        reference_type: 'manual',
        plot_id: newEvent.plot_id
      };

      const createdEvent = await addEvent(eventToCreate);
      setEvents([...events, createdEvent]);
      setDialogOpen(false);
      resetEventForm();
      
      uiToast({
        title: "Success",
        description: "Event created successfully.",
      });
    } catch (error) {
      console.error("Error creating event:", error);
      uiToast({
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
        uiToast({
          title: "Error",
          description: "Please enter an event title.",
          variant: "destructive",
        });
        return;
      }

      // Adapt to the right format for our updated API
      const updates = {
        title,
        description,
        date: event_date,
        end_date,
        event_type,
        plot_id
      };
      
      const updatedEvent = await updateEvent(selectedEvent.id, updates);
      
      // Update the events state with the updated event
      setEvents(events.map(event => event.id === updatedEvent.id ? updatedEvent : event));
      setEventDialogOpen(false);
      resetEventForm();
      
      uiToast({
        title: "Success",
        description: "Event updated successfully.",
      });
    } catch (error) {
      console.error("Error updating event:", error);
      uiToast({
        title: "Error",
        description: "Failed to update event. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleDeleteEvent = async (eventId?: string) => {
    const idToDelete = eventId || (selectedEvent ? selectedEvent.id : null);
    if (!idToDelete) return;
    
    try {
      await deleteEvent(idToDelete);
      
      // Remove the event from the events state
      setEvents(events.filter(event => event.id !== idToDelete));
      setEventDialogOpen(false);
      
      uiToast({
        title: "Success",
        description: "Event deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting event:", error);
      uiToast({
        title: "Error",
        description: "Failed to delete event. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleMarkCompleted = async (event?: any) => {
    const eventId = event ? event.id : (selectedEvent ? selectedEvent.id : null);
    if (!eventId) return;
    
    try {
      const updatedEvent = await markEventAsCompleted(eventId);
      
      // Update the events state with the updated event
      setEvents(events.map(e => e.id === updatedEvent.id ? updatedEvent : e));
      if (!event) {
      setEventDialogOpen(false);
      }
      
      uiToast({
        title: "Success",
        description: "Event marked as completed.",
      });
    } catch (error) {
      console.error("Error marking event as completed:", error);
      uiToast({
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
  
  const openEventDialog = (event: any) => {
    setSelectedEvent(event);
    setNewEvent({
      title: event.title,
      description: event.description || "",
      event_date: event.date || event.event_date,
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
      const eventDate = new Date(event.date || event.event_date);
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

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setSyncError(null);
      
      const data = await getFarmerEvents(user?.id || '');
      setEvents(data);
    } catch (error) {
      console.error("Error fetching events:", error);
      setSyncError("Failed to load calendar events. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getEventTypeStyle = (eventType: string) => {
    const typeMappings: Record<string, { bg: string, text: string, icon: React.ReactNode }> = {
      'planting': { 
        bg: 'bg-green-100', 
        text: 'text-green-800',
        icon: <Leaf className="h-3 w-3 mr-1" />
      },
      'harvesting': { 
        bg: 'bg-amber-100', 
        text: 'text-amber-800',
        icon: <Leaf className="h-3 w-3 mr-1" />
      },
      'fertilizing': { 
        bg: 'bg-blue-100', 
        text: 'text-blue-800',
        icon: <Droplet className="h-3 w-3 mr-1" />
      },
      'pesticide': { 
        bg: 'bg-red-100', 
        text: 'text-red-800',
        icon: <Droplet className="h-3 w-3 mr-1" />
      },
      'irrigation': { 
        bg: 'bg-cyan-100', 
        text: 'text-cyan-800',
        icon: <Droplet className="h-3 w-3 mr-1" />
      },
      'maintenance': { 
        bg: 'bg-purple-100', 
        text: 'text-purple-800',
        icon: <Wrench className="h-3 w-3 mr-1" />
      },
      'weeding': { 
        bg: 'bg-lime-100', 
        text: 'text-lime-800',
        icon: <Scissors className="h-3 w-3 mr-1" />
      },
      'pruning': { 
        bg: 'bg-orange-100', 
        text: 'text-orange-800',
        icon: <Scissors className="h-3 w-3 mr-1" />
      },
      'default': { 
        bg: 'bg-gray-100', 
        text: 'text-gray-800',
        icon: <CalendarIcon className="h-3 w-3 mr-1" />
      }
    };
    
    return typeMappings[eventType.toLowerCase()] || typeMappings.default;
  };

  return (
    <DashboardLayout userRole="farmer">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
          <div>
            <h1 className="text-3xl font-bold">Farm Calendar</h1>
            <p className="text-muted-foreground mt-1">Track and manage all your farming activities</p>
          </div>
          
          <div className="flex gap-2 self-end sm:self-auto">
            <Button 
              variant="outline"
              onClick={handleSyncCrops}
              disabled={syncingCrops}
            >
              {syncingCrops ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
              Sync Crop Events
                </>
              )}
            </Button>
            
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
                  Add Event
                </Button>
          </div>
        </div>

        {syncError && (
          <div className="rounded-md bg-red-50 p-4 flex items-start gap-3 text-red-800">
            <AlertCircle className="h-5 w-5 mt-0.5" />
            <div className="flex-1">
              <p>{syncError}</p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-red-800 hover:text-red-900 hover:bg-red-100"
              onClick={() => setSyncError(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 border rounded-lg overflow-hidden">
            <div className="p-4 bg-muted/50">
              <h2 className="text-lg font-medium">Calendar</h2>
              <p className="text-sm text-muted-foreground">Select a date to view or add farming activities</p>
            </div>
            
            <div className="p-2 md:p-6">
              {loading ? (
                <div className="flex justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Calendar
                  mode="single"
                  selected={selectedDate || undefined}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                  modifiers={{
                    hasEvent: (date) => events.some(event => isSameDay(new Date(event.date), date)),
                  }}
                  modifiersStyles={{
                    hasEvent: { 
                      backgroundColor: 'var(--primary-50)',
                      fontWeight: 'bold',
                      color: 'var(--primary)' 
                    }
                  }}
                />
              )}
            </div>
          </div>
          
          <div className="border rounded-lg overflow-hidden">
            <div className="p-4 bg-muted/50 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-medium">Upcoming Events</h2>
                <p className="text-sm text-muted-foreground">Your scheduled farming activities</p>
              </div>
              
              {selectedDate && (
                <div className="bg-white border rounded-md px-2.5 py-1 text-sm font-medium">
                  {format(selectedDate, 'MMMM d, yyyy')}
                </div>
              )}
            </div>
            
            <div className="divide-y">
              {loading ? (
                <div className="flex justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : selectedEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-8">
                  <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No events on this date</h3>
                  <p className="text-muted-foreground mb-4">
                    {selectedDate ? `No activities scheduled for ${format(selectedDate, 'MMMM d, yyyy')}` : 'Select a date to view events'}
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSelectedDate(selectedDate);
                      setDialogOpen(true);
                    }}
                  >
                    Add Event
                  </Button>
                </div>
              ) : (
                <div className="max-h-[500px] overflow-y-auto">
                  {selectedEvents.map((event) => {
                    const eventStyle = getEventTypeStyle(event.event_type);
                    
                    return (
                      <div key={event.id} className="p-4 hover:bg-muted/30">
                        <div className="flex items-start justify-between">
                          <h3 className="font-medium">{event.title}</h3>
                          <Badge variant="outline" className={`${eventStyle.bg} ${eventStyle.text} flex items-center`}>
                            {eventStyle.icon}
                            {event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1)}
                          </Badge>
                        </div>
                        
                        {event.description && (
                          <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                        )}
                        
                        <div className="flex items-center justify-between mt-3">
                          <Badge variant={event.status === 'completed' ? 'success' : 'outline'}>
                            {event.status === 'completed' ? (
                              <Check className="h-3 w-3 mr-1" />
                            ) : (
                              <Circle className="h-3 w-3 mr-1" />
                            )}
                            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                          </Badge>
                          
                          <div className="flex gap-1">
                            {event.status !== 'completed' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleMarkCompleted(event)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEventDialog(event)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500"
                              onClick={() => handleDeleteEvent(event.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Dialogs for Add/Edit events */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
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
                      <SelectItem value="pesticide">Pesticide Application</SelectItem>
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
                        onClick={() => handleMarkCompleted()}
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
                    onClick={() => handleDeleteEvent()}
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
      </div>
    </DashboardLayout>
  );
} 