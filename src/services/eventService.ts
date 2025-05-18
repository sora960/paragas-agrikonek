import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

export interface FarmEvent {
  id: string;
  title: string;
  date: string;
  event_type: string;
  status: 'pending' | 'completed' | 'cancelled';
  farmer_id: string;
  reference_id?: string;
  reference_type?: string;
  description?: string;
}

// Fetch events for a specific farmer
export const getFarmerEvents = async (farmerId: string) => {
  try {
    const { data, error } = await supabase
      .from('farmer_events')
      .select('*')
      .eq('farmer_id', farmerId);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching farmer events:", error);
    throw error;
  }
};

// Add a new event
export const addEvent = async (event: any) => {
  try {
    const { data, error } = await supabase
      .from('farmer_events')
      .insert([event])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error adding event:", error);
    throw error;
  }
};

// Update an event
export const updateEvent = async (eventId: string, updates: any) => {
  try {
    const { data, error } = await supabase
      .from('farmer_events')
      .update(updates)
      .eq('id', eventId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error updating event:", error);
    throw error;
  }
};

// Delete an event
export const deleteEvent = async (eventId: string) => {
  try {
    const { error } = await supabase
      .from('farmer_events')
      .delete()
      .eq('id', eventId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting event:", error);
    throw error;
  }
};

// Mark event as completed
export const markEventAsCompleted = async (eventId: string) => {
  try {
    const { data, error } = await supabase
      .from('farmer_events')
      .update({ status: 'completed' })
      .eq('id', eventId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error marking event as completed:", error);
    throw error;
  }
};

// Get all farm plots for a farmer
export const getFarmPlots = async (farmerId: string) => {
  try {
    const { data, error } = await supabase
      .from('farm_plots')
      .select('*')
      .eq('farmer_id', farmerId);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching farm plots:", error);
    throw error;
  }
};

// Sync all crops to calendar
export const syncCropsToCalendar = async (farmerId: string) => {
  try {
    // First get all crops for this farmer
    const { data: farmerProfile } = await supabase
      .from('farmer_profiles')
      .select('id')
      .eq('user_id', farmerId)
      .single();
    
    if (!farmerProfile) throw new Error("Farmer profile not found");
    
    const { data: plots } = await supabase
      .from('farm_plots')
      .select('id, plot_name')
      .eq('farmer_id', farmerProfile.id);
    
    if (!plots || plots.length === 0) return { added: 0 };
    
    const plotIds = plots.map(plot => plot.id);
    const plotNamesById = plots.reduce((acc: any, plot) => {
      acc[plot.id] = plot.plot_name;
      return acc;
    }, {});
    
    // Get all crops for these plots
    const { data: crops, error: cropsError } = await supabase
      .from('crops')
      .select('id, plot_id, crop_name, planting_date, expected_harvest_date, status')
      .in('plot_id', plotIds);
    
    if (cropsError) throw cropsError;
    if (!crops || crops.length === 0) return { added: 0 };
    
    // Get existing calendar events for these crops to avoid duplicates
    const { data: existingEvents } = await supabase
      .from('farmer_events')
      .select('reference_id, event_type')
      .eq('farmer_id', farmerId)
      .in('reference_type', ['crop_planting', 'crop_harvest']);
    
    const existingEventMap = (existingEvents || []).reduce((acc: any, event) => {
      acc[`${event.reference_id}_${event.event_type}`] = true;
      return acc;
    }, {});
    
    // Prepare events to add
    const events = [];
    
    // Add planting events
    for (const crop of crops) {
      const plotName = plotNamesById[crop.plot_id] || 'Unknown Plot';
      
      // Add planting event if it doesn't exist and the crop has a planting date
      if (crop.planting_date && !existingEventMap[`${crop.id}_planting`]) {
        events.push({
          farmer_id: farmerId,
          title: `Plant ${crop.crop_name}`,
          description: `Planting of ${crop.crop_name} in ${plotName}`,
          date: crop.planting_date,
          event_type: 'planting',
          reference_id: crop.id,
          reference_type: 'crop_planting',
          status: crop.status === 'planted' ? 'completed' : 'pending'
        });
      }
      
      // Add harvest event if it doesn't exist and the crop has an expected harvest date
      if (crop.expected_harvest_date && !existingEventMap[`${crop.id}_harvest`]) {
        events.push({
          farmer_id: farmerId,
          title: `Harvest ${crop.crop_name}`,
          description: `Harvesting of ${crop.crop_name} from ${plotName}`,
          date: crop.expected_harvest_date,
          event_type: 'harvesting',
          reference_id: crop.id,
          reference_type: 'crop_harvest',
          status: crop.status === 'harvested' ? 'completed' : 'pending'
        });
      }
    }
    
    // Add all events at once if there are any
    if (events.length > 0) {
      const { error: insertError } = await supabase
        .from('farmer_events')
        .insert(events);
      
      if (insertError) throw insertError;
    }
    
    return { added: events.length };
  } catch (error) {
    console.error("Error syncing crops to calendar:", error);
    throw error;
  }
};

// Generate suggested crop activities based on crop type and planting date
export const generateCropActivities = async (cropId: string) => {
  try {
    // Get crop details
    const { data: crop, error: cropError } = await supabase
      .from('crops')
      .select('id, crop_name, crop_type, planting_date, expected_harvest_date, plot_id')
      .eq('id', cropId)
      .single();
    
    if (cropError) throw cropError;
    if (!crop) throw new Error("Crop not found");
    
    const { data: plot, error: plotError } = await supabase
      .from('farm_plots')
      .select('farmer_id, plot_name')
      .eq('id', crop.plot_id)
      .single();
    
    if (plotError) throw plotError;
    if (!plot) throw new Error("Plot not found");
    
    // Define activity templates based on crop type
    // These are default activity schedules for different crop types
    const activityTemplates: Record<string, any[]> = {
      // For cereal crops like wheat, rice, corn
      'cereal': [
        { daysAfterPlanting: 7, type: 'fertilizing', title: 'Initial Fertilizing' },
        { daysAfterPlanting: 21, type: 'pesticide', title: 'Pest Control' },
        { daysAfterPlanting: 35, type: 'fertilizing', title: 'Second Fertilizing' },
        { daysAfterPlanting: 50, type: 'irrigation', title: 'Irrigation Check' }
      ],
      // For vegetable crops
      'vegetable': [
        { daysAfterPlanting: 5, type: 'irrigation', title: 'Initial Watering' },
        { daysAfterPlanting: 14, type: 'fertilizing', title: 'First Fertilizing' },
        { daysAfterPlanting: 21, type: 'pesticide', title: 'Pest Control' },
        { daysAfterPlanting: 30, type: 'weeding', title: 'Weeding' },
        { daysAfterPlanting: 45, type: 'fertilizing', title: 'Second Fertilizing' }
      ],
      // For fruit crops
      'fruit': [
        { daysAfterPlanting: 7, type: 'irrigation', title: 'Initial Watering' },
        { daysAfterPlanting: 14, type: 'fertilizing', title: 'Fertilizing' },
        { daysAfterPlanting: 30, type: 'pruning', title: 'Pruning' },
        { daysAfterPlanting: 60, type: 'pesticide', title: 'Pest Control' },
        { daysAfterPlanting: 90, type: 'fertilizing', title: 'Second Fertilizing' }
      ],
      // Default for any other crop type
      'default': [
        { daysAfterPlanting: 7, type: 'irrigation', title: 'Watering' },
        { daysAfterPlanting: 21, type: 'fertilizing', title: 'Fertilizing' },
        { daysAfterPlanting: 40, type: 'maintenance', title: 'Maintenance Check' }
      ]
    };
    
    // Get the appropriate template or use default
    const templateItems = activityTemplates[crop.crop_type.toLowerCase()] || activityTemplates.default;
    
    const plantingDate = new Date(crop.planting_date);
    const activities = [];
    const events = [];
    
    // Generate activities and corresponding calendar events
    for (const templateItem of templateItems) {
      const activityDate = new Date(plantingDate);
      activityDate.setDate(activityDate.getDate() + templateItem.daysAfterPlanting);
      
      // Create activity
      const activity = {
        crop_id: crop.id,
        activity_type: templateItem.type,
        activity_date: format(activityDate, 'yyyy-MM-dd'),
        description: `${templateItem.title} for ${crop.crop_name}`,
        status: 'pending'
      };
      
      activities.push(activity);
      
      // Create calendar event
      events.push({
        farmer_id: plot.farmer_id,
        title: `${templateItem.title} - ${crop.crop_name}`,
        description: `${templateItem.title} for ${crop.crop_name} in ${plot.plot_name}`,
        date: format(activityDate, 'yyyy-MM-dd'),
        event_type: templateItem.type,
        reference_id: crop.id,
        reference_type: 'crop_activity',
        status: 'pending'
      });
    }
    
    // Insert activities
    if (activities.length > 0) {
      const { error: activitiesError } = await supabase
        .from('crop_activities')
        .insert(activities);
      
      if (activitiesError) throw activitiesError;
    }
    
    // Insert events
    if (events.length > 0) {
      const { error: eventsError } = await supabase
        .from('farmer_events')
        .insert(events);
      
      if (eventsError) throw eventsError;
    }
    
    return { 
      success: true, 
      activitiesAdded: activities.length,
      eventsAdded: events.length
    };
  } catch (error) {
    console.error("Error generating crop activities:", error);
    throw error;
  }
};

// Update events when crop details change
export const updateCropEvents = async (cropId: string, updates: any) => {
  try {
    // Get existing events for this crop
    const { data: events, error: eventsError } = await supabase
      .from('farmer_events')
      .select('*')
      .or(`reference_id.eq.${cropId},crop_id.eq.${cropId}`)
      .in('reference_type', ['crop_planting', 'crop_harvest', 'crop_activity']);
    
    if (eventsError) throw eventsError;
    
    // No events to update
    if (!events || events.length === 0) return { updated: 0 };
    
    const updatePromises = [];
    
    for (const event of events) {
      let shouldUpdate = false;
      const eventUpdates: any = {};
      
      if (event.reference_type === 'crop_planting' && updates.planting_date) {
        eventUpdates.date = updates.planting_date;
        shouldUpdate = true;
      }
      
      if (event.reference_type === 'crop_harvest' && updates.expected_harvest_date) {
        eventUpdates.date = updates.expected_harvest_date;
        shouldUpdate = true;
      }
      
      if (updates.status) {
        eventUpdates.status = updates.status === 'harvested' ? 'completed' : 'pending';
        shouldUpdate = true;
      }
      
      if (updates.crop_name) {
        eventUpdates.title = event.title.replace(/- .*$/, `- ${updates.crop_name}`);
        eventUpdates.description = event.description.replace(/for .*? in/, `for ${updates.crop_name} in`);
        shouldUpdate = true;
      }
      
      if (shouldUpdate) {
        updatePromises.push(
          supabase
            .from('farmer_events')
            .update(eventUpdates)
            .eq('id', event.id)
        );
      }
    }
    
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }
    
    return { updated: updatePromises.length };
  } catch (error) {
    console.error("Error updating crop events:", error);
    throw error;
  }
}; 