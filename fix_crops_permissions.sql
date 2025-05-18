-- Fix permission issues for crops table
-- This script adds necessary Row Level Security policies to allow farmers to access their crop data

-- Enable RLS on crops table if not already enabled
ALTER TABLE crops ENABLE ROW LEVEL SECURITY;

-- Create policy to allow farmers to view their own crops
CREATE POLICY "Farmers can view their own crops" 
ON crops 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM farm_plots
    JOIN farmer_profiles ON farm_plots.farmer_id = farmer_profiles.id
    WHERE 
      crops.plot_id = farm_plots.id AND
      farmer_profiles.user_id = auth.uid()
  )
);

-- Create policy to allow farmers to insert their own crops
CREATE POLICY "Farmers can add crops to their plots" 
ON crops 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM farm_plots
    JOIN farmer_profiles ON farm_plots.farmer_id = farmer_profiles.id
    WHERE 
      crops.plot_id = farm_plots.id AND
      farmer_profiles.user_id = auth.uid()
  )
);

-- Create policy to allow farmers to update their own crops
CREATE POLICY "Farmers can update their own crops" 
ON crops 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM farm_plots
    JOIN farmer_profiles ON farm_plots.farmer_id = farmer_profiles.id
    WHERE 
      crops.plot_id = farm_plots.id AND
      farmer_profiles.user_id = auth.uid()
  )
);

-- Create policy to allow farmers to delete their own crops
CREATE POLICY "Farmers can delete their own crops" 
ON crops 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM farm_plots
    JOIN farmer_profiles ON farm_plots.farmer_id = farmer_profiles.id
    WHERE 
      crops.plot_id = farm_plots.id AND
      farmer_profiles.user_id = auth.uid()
  )
);

-- Also add policy for crop_activities table if permissions are needed there too
ALTER TABLE crop_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farmers can view their own crop activities"
ON crop_activities
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM crops
    JOIN farm_plots ON crops.plot_id = farm_plots.id
    JOIN farmer_profiles ON farm_plots.farmer_id = farmer_profiles.id
    WHERE 
      crop_activities.crop_id = crops.id AND
      farmer_profiles.user_id = auth.uid()
  )
); 