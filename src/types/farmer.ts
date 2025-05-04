export interface FarmerProfile {
  id: string;
  user_id: string;
  organization_id: string | null;
  province_id: string | null;
  full_name: string;
  phone: string;
  email: string;
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
  farmer_id: string;
  name: string;
  variety: string;
  planting_date: Date;
  expected_harvest_date: Date;
  actual_harvest_date?: Date;
  status: 'planning' | 'planted' | 'growing' | 'harvested' | 'failed';
  plot_id: string;
  estimated_yield: number;
  actual_yield?: number;
  notes?: string;
}

export interface CropActivity {
  id: string;
  crop_id: string;
  activity_type: 'planting' | 'fertilizing' | 'watering' | 'pest_control' | 'harvesting' | 'other';
  date: Date;
  description: string;
  cost?: number;
  resources_used?: string[];
  weather_conditions?: string;
  notes?: string;
}

export interface WeatherRecord {
  id: string;
  date: Date;
  temperature: number;
  humidity: number;
  rainfall: number;
  wind_speed: number;
  notes?: string;
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

export interface Plot {
  id: string;
  farmer_id: string;
  name: string;
  size: number; // in hectares
  location: string;
  soil_type: string;
  is_irrigated: boolean;
  status: 'available' | 'in_use' | 'maintenance';
}

export interface Resource {
  id: string;
  farmer_id: string;
  name: string;
  category: 'seed' | 'fertilizer' | 'pesticide' | 'equipment' | 'other';
  quantity: number;
  unit: string;
  cost_per_unit: number;
  supplier?: string;
  purchase_date: Date;
  expiry_date?: Date;
}

export interface FieldReport {
  id: string;
  farmer_id: string;
  crop_id: string | null;
  report_type: 'issue' | 'status_update' | 'assistance_request';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_review' | 'resolved';
  images?: string[];
  created_at: string;
  updated_at: string;
}

export interface ReportComment {
  id: string;
  report_id: string;
  user_id: string;
  content: string;
  parent_comment_id: string | null;
  is_internal: boolean;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
} 