import { supabase } from "@/lib/supabase";

export interface FarmPlot {
  id: string;
  farmer_id: string;
  plot_name: string;
  location?: string;
  area_size?: number;
  area_unit?: string;
  soil_type?: string;
  crop_type?: string;
  created_at: string;
  updated_at: string;
}

export interface FarmPlotInput {
  plot_name: string;
  location?: string;
  area_size?: number;
  area_unit?: string;
  soil_type?: string;
  crop_type?: string;
}

// Fetch all farm plots for a specific farmer
export const getFarmPlots = async (farmerId: string): Promise<FarmPlot[]> => {
  try {
    const { data, error } = await supabase
      .from('farm_plots')
      .select('*')
      .eq('farmer_id', farmerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching farm plots:', error);
    throw error;
  }
};

// Fetch a single farm plot by ID
export const getFarmPlotById = async (plotId: string): Promise<FarmPlot> => {
  try {
    const { data, error } = await supabase
      .from('farm_plots')
      .select('*')
      .eq('id', plotId)
      .single();

    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error fetching farm plot:', error);
    throw error;
  }
};

// Create a new farm plot
export const createFarmPlot = async (
  farmerId: string,
  plotData: FarmPlotInput
): Promise<FarmPlot> => {
  try {
    const { data, error } = await supabase
      .from('farm_plots')
      .insert({
        farmer_id: farmerId,
        ...plotData
      })
      .select()
      .single();

    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error creating farm plot:', error);
    throw error;
  }
};

// Update an existing farm plot
export const updateFarmPlot = async (
  plotId: string,
  plotData: Partial<FarmPlotInput>
): Promise<FarmPlot> => {
  try {
    const { data, error } = await supabase
      .from('farm_plots')
      .update(plotData)
      .eq('id', plotId)
      .select()
      .single();

    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error updating farm plot:', error);
    throw error;
  }
};

// Delete a farm plot
export const deleteFarmPlot = async (plotId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('farm_plots')
      .delete()
      .eq('id', plotId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting farm plot:', error);
    throw error;
  }
}; 