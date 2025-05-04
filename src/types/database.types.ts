export interface FarmerProfile {
  id: string;
  user_id: string;
  organization_id: string | null;
  province_id: string | null;
  farm_name: string;
  farm_size: number;
  farm_address: string;
  years_of_experience: number;
  main_crops: string[];
  farm_type: 'small' | 'medium' | 'large' | 'commercial';
  certification_status: 'none' | 'pending' | 'certified' | 'expired';
  created_at: string;
  updated_at: string;
}

export interface FarmPlot {
  id: string;
  farmer_id: string;
  plot_name: string;
  plot_size: number;
  plot_location: string;
  soil_type: string | null;
  irrigation_type: string | null;
  status: 'active' | 'inactive' | 'fallow';
  created_at: string;
  updated_at: string;
}

export interface Crop {
  id: string;
  plot_id: string;
  crop_name: string;
  crop_type: string;
  variety: string | null;
  planting_date: string;
  expected_harvest_date: string | null;
  actual_harvest_date: string | null;
  status: 'planned' | 'planted' | 'growing' | 'harvested' | 'failed';
  yield_amount: number | null;
  yield_quality: 'poor' | 'fair' | 'good' | 'excellent' | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CropActivity {
  id: string;
  crop_id: string;
  activity_type: 'planting' | 'fertilizing' | 'watering' | 'pest_control' | 'harvesting' | 'other';
  activity_date: string;
  description: string | null;
  resources_used: Record<string, any>;
  cost: number;
  status: 'planned' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface WeatherRecord {
  id: string;
  province_id: string;
  record_date: string;
  temperature: number | null;
  humidity: number | null;
  rainfall: number | null;
  wind_speed: number | null;
  weather_condition: string | null;
  forecast: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface FarmResource {
  id: string;
  farmer_id: string;
  name: string;
  type: 'equipment' | 'seeds' | 'fertilizer' | 'other';
  quantity: number;
  unit: string;
  notes: string | null;
  status: 'available' | 'in_use' | 'maintenance' | 'disposed';
  created_at: string;
  updated_at: string;
}

export interface FarmingTask {
  id: string;
  farmer_id: string;
  title: string;
  description: string | null;
  task_date: string;
  task_type: 'planting' | 'harvesting' | 'maintenance' | 'other';
  status: 'pending' | 'completed' | 'cancelled';
  plot_id: string | null;
  resources_used: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// View Types
export interface FarmerCropSummary {
  farmer_id: string;
  farm_name: string;
  total_plots: number;
  total_crops: number;
  total_farm_size: number;
  active_crops: number;
  harvested_crops: number;
}

export interface FarmingTaskCalendar extends FarmingTask {
  plot_name: string | null;
  farm_name: string;
}

export interface FarmerResourcesSummary {
  farmer_id: string;
  farm_name: string;
  total_resources: number;
  equipment_count: number;
  seeds_count: number;
  fertilizer_count: number;
  total_seeds: number;
  total_fertilizer: number;
} 