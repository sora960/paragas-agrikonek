import { createClient } from '@supabase/supabase-js';
import {
  FarmingTask,
  FarmingTaskCalendar,
  WeatherRecord,
  FarmResource,
  FarmerResourcesSummary,
  FarmPlot
} from '../types/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Farming Tasks
export const getFarmingTasks = async (farmerId: string) => {
  const { data, error } = await supabase
    .from('farming_tasks_calendar')
    .select('*')
    .eq('farmer_id', farmerId)
    .order('task_date', { ascending: true });
  
  if (error) throw error;
  return data as FarmingTaskCalendar[];
};

export const createFarmingTask = async (task: Omit<FarmingTask, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase
    .from('farming_tasks')
    .insert(task)
    .select()
    .single();
  
  if (error) throw error;
  return data as FarmingTask;
};

export const updateFarmingTask = async (taskId: string, updates: Partial<FarmingTask>) => {
  const { data, error } = await supabase
    .from('farming_tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single();
  
  if (error) throw error;
  return data as FarmingTask;
};

export const deleteFarmingTask = async (taskId: string) => {
  const { error } = await supabase
    .from('farming_tasks')
    .delete()
    .eq('id', taskId);
  
  if (error) throw error;
};

// Weather Records
export const getWeatherRecords = async (provinceId: string) => {
  const { data, error } = await supabase
    .from('weather_records')
    .select('*')
    .eq('province_id', provinceId)
    .order('record_date', { ascending: false })
    .limit(7); // Last 7 days
  
  if (error) throw error;
  return data as WeatherRecord[];
};

// Farm Resources
export const getFarmResources = async (farmerId: string) => {
  const { data, error } = await supabase
    .from('farm_resources')
    .select('*')
    .eq('farmer_id', farmerId);
  
  if (error) throw error;
  return data as FarmResource[];
};

export const getFarmResourcesSummary = async (farmerId: string) => {
  const { data, error } = await supabase
    .from('farmer_resources_summary')
    .select('*')
    .eq('farmer_id', farmerId)
    .single();
  
  if (error) throw error;
  return data as FarmerResourcesSummary;
};

export const createFarmResource = async (resource: Omit<FarmResource, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase
    .from('farm_resources')
    .insert(resource)
    .select()
    .single();
  
  if (error) throw error;
  return data as FarmResource;
};

export const updateFarmResource = async (resourceId: string, updates: Partial<FarmResource>) => {
  const { data, error } = await supabase
    .from('farm_resources')
    .update(updates)
    .eq('id', resourceId)
    .select()
    .single();
  
  if (error) throw error;
  return data as FarmResource;
};

export const deleteFarmResource = async (resourceId: string) => {
  const { error } = await supabase
    .from('farm_resources')
    .delete()
    .eq('id', resourceId);
  
  if (error) throw error;
};

// Farm Plots
export const getFarmPlots = async (farmerId: string) => {
  const { data, error } = await supabase
    .from('farm_plots')
    .select('*')
    .eq('farmer_id', farmerId)
    .eq('status', 'active');
  
  if (error) throw error;
  return data as FarmPlot[];
}; 