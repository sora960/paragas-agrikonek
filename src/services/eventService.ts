import { supabase } from "@/lib/supabase";

export interface FarmEvent {
  id: string;
  farmer_id: string;
  title: string;
  description: string | null;
  event_date: string;
  end_date: string | null;
  event_type: "planting" | "harvesting" | "fertilizing" | "pesticide" | "irrigation" | "maintenance" | "other" | "crop";
  status: "pending" | "completed" | "cancelled";
  crop_id?: string | null;
  plot_id?: string | null;
  created_at: string;
}

export interface FarmEventInput {
  title: string;
  description: string | null;
  event_date: string;
  end_date?: string | null;
  event_type: "planting" | "harvesting" | "fertilizing" | "pesticide" | "irrigation" | "maintenance" | "other" | "crop";
  status?: "pending" | "completed" | "cancelled";
  crop_id?: string | null;
  plot_id?: string | null;
}

export interface FarmPlot {
  id: string;
  plot_name: string;
}

/**
 * Get all events for a farmer
 */
export async function getFarmEvents(farmerId: string): Promise<FarmEvent[]> {
  const { data, error } = await supabase
    .from('farm_events')
    .select('*')
    .eq('farmer_id', farmerId)
    .order('event_date', { ascending: true });
  
  if (error) {
    console.error('Error fetching events:', error);
    throw new Error('Failed to fetch events');
  }
  
  return data || [];
}

/**
 * Create a new farm event
 */
export async function createFarmEvent(farmerId: string, eventInput: FarmEventInput): Promise<FarmEvent> {
  const { data, error } = await supabase
    .from('farm_events')
    .insert([
      { 
        farmer_id: farmerId, 
        ...eventInput,
        status: eventInput.status || 'pending'
      }
    ])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating event:', error);
    throw new Error('Failed to create event');
  }
  
  return data;
}

/**
 * Update an existing farm event
 */
export async function updateFarmEvent(eventId: string, eventInput: Partial<FarmEventInput>): Promise<FarmEvent> {
  const { data, error } = await supabase
    .from('farm_events')
    .update(eventInput)
    .eq('id', eventId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating event:', error);
    throw new Error('Failed to update event');
  }
  
  return data;
}

/**
 * Delete a farm event
 */
export async function deleteFarmEvent(eventId: string): Promise<void> {
  const { error } = await supabase
    .from('farm_events')
    .delete()
    .eq('id', eventId);
  
  if (error) {
    console.error('Error deleting event:', error);
    throw new Error('Failed to delete event');
  }
}

/**
 * Mark an event as completed
 */
export async function markEventAsCompleted(eventId: string): Promise<FarmEvent> {
  const { data, error } = await supabase
    .from('farm_events')
    .update({ status: 'completed' })
    .eq('id', eventId)
    .select()
    .single();
  
  if (error) {
    console.error('Error marking event as completed:', error);
    throw new Error('Failed to update event status');
  }
  
  return data;
}

/**
 * Get available farm plots
 */
export async function getFarmPlots(farmerId: string): Promise<FarmPlot[]> {
  const { data, error } = await supabase
    .from('farm_plots')
    .select('id, plot_name')
    .eq('farmer_id', farmerId)
    .eq('status', 'active');
  
  if (error) {
    console.error('Error fetching farm plots:', error);
    throw new Error('Failed to fetch farm plots');
  }
  
  return data || [];
}

/**
 * Sync crop events with calendar
 * This creates calendar events based on crop planting and harvest dates
 */
export async function syncCropsToCalendar(farmerId: string): Promise<void> {
  try {
    // Step 1: Get all the farmer's plots
    const { data: plots, error: plotsError } = await supabase
      .from('farm_plots')
      .select('id')
      .eq('farmer_id', farmerId);
    
    if (plotsError) throw plotsError;
    
    if (!plots || plots.length === 0) {
      console.log('No plots found for farmer, skipping crop sync');
      return;
    }
    
    const plotIds = plots.map(plot => plot.id);
    
    // Step 2: Get all crops for these plots
    const { data: crops, error: cropsError } = await supabase
      .from('crops')
      .select('id, plot_id, crop_name, crop_type, planting_date, expected_harvest_date, status')
      .in('plot_id', plotIds);
    
    if (cropsError) throw cropsError;
    
    if (!crops || crops.length === 0) {
      console.log('No crops found, skipping sync');
      return;
    }
    
    // Step 3: Get existing calendar events for these crops to avoid duplicates
    const { data: existingEvents, error: eventsError } = await supabase
      .from('farm_events')
      .select('id, crop_id, event_type')
      .in('crop_id', crops.map(crop => crop.id));
    
    if (eventsError) throw eventsError;
    
    // Create a map of existing events by crop ID and type
    const existingEventMap: Record<string, {planting: boolean, harvesting: boolean}> = {};
    (existingEvents || []).forEach(event => {
      if (!existingEventMap[event.crop_id]) {
        existingEventMap[event.crop_id] = { planting: false, harvesting: false };
      }
      
      if (event.event_type === 'planting') {
        existingEventMap[event.crop_id].planting = true;
      } else if (event.event_type === 'harvesting') {
        existingEventMap[event.crop_id].harvesting = true;
      }
    });
    
    // Step 4: Create events for each crop that doesn't already have them
    const eventsToCreate: any[] = [];
    
    crops.forEach(crop => {
      const existingCropEvents = existingEventMap[crop.id] || { planting: false, harvesting: false };
      
      // Create planting event if it doesn't exist and has a planting date
      if (!existingCropEvents.planting && crop.planting_date) {
        eventsToCreate.push({
          farmer_id: farmerId,
          title: `Plant ${crop.crop_name}`,
          description: `Planting date for ${crop.crop_name} (${crop.crop_type})`,
          event_date: crop.planting_date,
          event_type: 'planting',
          status: crop.status === 'planted' ? 'completed' : 'pending',
          crop_id: crop.id,
          plot_id: crop.plot_id
        });
      }
      
      // Create harvest event if it doesn't exist and has an expected harvest date
      if (!existingCropEvents.harvesting && crop.expected_harvest_date) {
        eventsToCreate.push({
          farmer_id: farmerId,
          title: `Harvest ${crop.crop_name}`,
          description: `Expected harvest date for ${crop.crop_name} (${crop.crop_type})`,
          event_date: crop.expected_harvest_date,
          event_type: 'harvesting',
          status: crop.status === 'harvested' ? 'completed' : 'pending',
          crop_id: crop.id,
          plot_id: crop.plot_id
        });
      }
    });
    
    // Insert events in batches if there are any to create
    if (eventsToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from('farm_events')
        .insert(eventsToCreate);
      
      if (insertError) throw insertError;
      
      console.log(`Created ${eventsToCreate.length} events from crops`);
    } else {
      console.log('No new events to create');
    }
    
  } catch (error) {
    console.error('Error syncing crops to calendar:', error);
    throw new Error('Failed to sync crop events to calendar');
  }
}

/**
 * Update crop events when a crop is updated
 */
export async function updateCropEvents(cropId: string, cropData: any): Promise<void> {
  try {
    const { planting_date, expected_harvest_date, crop_name, status } = cropData;
    
    // Update planting event
    if (planting_date) {
      const { data: plantingEvents, error: fetchError } = await supabase
        .from('farm_events')
        .select('id')
        .eq('crop_id', cropId)
        .eq('event_type', 'planting');
        
      if (fetchError) throw fetchError;
      
      if (plantingEvents && plantingEvents.length > 0) {
        // Update existing planting event
        const { error: updateError } = await supabase
          .from('farm_events')
          .update({ 
            event_date: planting_date,
            title: `Plant ${crop_name}`,
            status: status === 'planted' ? 'completed' : 'pending'
          })
          .eq('id', plantingEvents[0].id);
          
        if (updateError) throw updateError;
      } else {
        // Get farmer_id from crop
        const { data: crop, error: cropError } = await supabase
          .from('crops')
          .select('farmer_id, plot_id')
          .eq('id', cropId)
          .single();
          
        if (cropError) throw cropError;
        
        // Create new planting event
        const { error: insertError } = await supabase
          .from('farm_events')
          .insert([{
            farmer_id: crop.farmer_id,
            title: `Plant ${crop_name}`,
            description: `Planting date for ${crop_name}`,
            event_date: planting_date,
            event_type: 'planting',
            status: status === 'planted' ? 'completed' : 'pending',
            crop_id: cropId,
            plot_id: crop.plot_id
          }]);
          
        if (insertError) throw insertError;
      }
    }
    
    // Update harvesting event
    if (expected_harvest_date) {
      const { data: harvestEvents, error: fetchError } = await supabase
        .from('farm_events')
        .select('id')
        .eq('crop_id', cropId)
        .eq('event_type', 'harvesting');
        
      if (fetchError) throw fetchError;
      
      if (harvestEvents && harvestEvents.length > 0) {
        // Update existing harvesting event
        const { error: updateError } = await supabase
          .from('farm_events')
          .update({ 
            event_date: expected_harvest_date,
            title: `Harvest ${crop_name}`,
            status: status === 'harvested' ? 'completed' : 'pending'
          })
          .eq('id', harvestEvents[0].id);
          
        if (updateError) throw updateError;
      } else {
        // Get farmer_id from crop
        const { data: crop, error: cropError } = await supabase
          .from('crops')
          .select('farmer_id, plot_id')
          .eq('id', cropId)
          .single();
          
        if (cropError) throw cropError;
        
        // Create new harvesting event
        const { error: insertError } = await supabase
          .from('farm_events')
          .insert([{
            farmer_id: crop.farmer_id,
            title: `Harvest ${crop_name}`,
            description: `Expected harvest date for ${crop_name}`,
            event_date: expected_harvest_date,
            event_type: 'harvesting',
            status: status === 'harvested' ? 'completed' : 'pending',
            crop_id: cropId,
            plot_id: crop.plot_id
          }]);
          
        if (insertError) throw insertError;
      }
    }
    
  } catch (error) {
    console.error('Error updating crop events:', error);
    throw new Error('Failed to update crop events');
  }
} 