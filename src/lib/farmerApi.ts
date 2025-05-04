import { supabase } from './supabase';
import type {
  FarmerProfile,
  FarmPlot,
  Crop,
  CropActivity,
  WeatherRecord,
  FarmResource,
  FarmingTask
} from '../types/farmer';

// Farmer Profile API
export async function getFarmerProfile(userId: string): Promise<FarmerProfile | null> {
  const { data, error } = await supabase
    .from('farmer_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateFarmerProfile(id: string, updates: Partial<FarmerProfile>): Promise<FarmerProfile> {
  const { data, error } = await supabase
    .from('farmer_profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Farm Plots API
export async function getFarmPlots(farmerId: string): Promise<FarmPlot[]> {
  const { data, error } = await supabase
    .from('farm_plots')
    .select('*')
    .eq('farmer_id', farmerId);

  if (error) throw error;
  return data;
}

export async function createFarmPlot(plot: Omit<FarmPlot, 'id' | 'created_at' | 'updated_at'>): Promise<FarmPlot> {
  const { data, error } = await supabase
    .from('farm_plots')
    .insert(plot)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Crops API
export async function getCrops(plotId: string): Promise<Crop[]> {
  const { data, error } = await supabase
    .from('crops')
    .select('*')
    .eq('plot_id', plotId);

  if (error) throw error;
  return data;
}

export async function createCrop(crop: Omit<Crop, 'id' | 'created_at' | 'updated_at'>): Promise<Crop> {
  const { data, error } = await supabase
    .from('crops')
    .insert(crop)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Crop Activities API
export async function getCropActivities(cropId: string): Promise<CropActivity[]> {
  const { data, error } = await supabase
    .from('crop_activities')
    .select('*')
    .eq('crop_id', cropId);

  if (error) throw error;
  return data;
}

export async function createCropActivity(activity: Omit<CropActivity, 'id' | 'created_at' | 'updated_at'>): Promise<CropActivity> {
  const { data, error } = await supabase
    .from('crop_activities')
    .insert(activity)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Weather API
export async function getWeatherRecords(provinceId: string, startDate: string, endDate: string): Promise<WeatherRecord[]> {
  const { data, error } = await supabase
    .from('weather_records')
    .select('*')
    .eq('province_id', provinceId)
    .gte('record_date', startDate)
    .lte('record_date', endDate);

  if (error) throw error;
  return data;
}

// Farm Resources API
export async function getFarmResources(farmerId: string): Promise<FarmResource[]> {
  const { data, error } = await supabase
    .from('farm_resources')
    .select('*')
    .eq('farmer_id', farmerId);

  if (error) throw error;
  return data;
}

export async function createFarmResource(resource: Omit<FarmResource, 'id' | 'created_at' | 'updated_at'>): Promise<FarmResource> {
  const { data, error } = await supabase
    .from('farm_resources')
    .insert(resource)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateFarmResource(id: string, updates: Partial<FarmResource>): Promise<FarmResource> {
  const { data, error } = await supabase
    .from('farm_resources')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Farming Tasks API
export async function getFarmingTasks(farmerId: string, startDate?: string, endDate?: string): Promise<FarmingTask[]> {
  let query = supabase
    .from('farming_tasks')
    .select('*')
    .eq('farmer_id', farmerId);

  if (startDate) {
    query = query.gte('task_date', startDate);
  }
  if (endDate) {
    query = query.lte('task_date', endDate);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createFarmingTask(task: Omit<FarmingTask, 'id' | 'created_at' | 'updated_at'>): Promise<FarmingTask> {
  const { data, error } = await supabase
    .from('farming_tasks')
    .insert(task)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateFarmingTask(id: string, updates: Partial<FarmingTask>): Promise<FarmingTask> {
  const { data, error } = await supabase
    .from('farming_tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
} 