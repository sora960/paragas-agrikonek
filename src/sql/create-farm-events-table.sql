-- Create farm_events table for calendar integration

-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS farm_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    end_date DATE,
    event_type VARCHAR(50) NOT NULL CHECK (
        event_type IN ('planting', 'harvesting', 'fertilizing', 'pesticide', 'irrigation', 'maintenance', 'other', 'crop')
    ),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'completed', 'cancelled')
    ),
    crop_id UUID,
    plot_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS farm_events_farmer_id_idx ON farm_events(farmer_id);
CREATE INDEX IF NOT EXISTS farm_events_event_date_idx ON farm_events(event_date);
CREATE INDEX IF NOT EXISTS farm_events_crop_id_idx ON farm_events(crop_id);
CREATE INDEX IF NOT EXISTS farm_events_plot_id_idx ON farm_events(plot_id);

-- Create timestamp function if it doesn't exist
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for timestamp update
DROP TRIGGER IF EXISTS set_timestamp_farm_events ON farm_events;
CREATE TRIGGER set_timestamp_farm_events
BEFORE UPDATE ON farm_events
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Ensure table permissions are set correctly
ALTER TABLE IF EXISTS farm_events ENABLE ROW LEVEL SECURITY;

-- Create policies for farmers
DROP POLICY IF EXISTS farm_events_farmer_select ON farm_events;
CREATE POLICY farm_events_farmer_select 
ON farm_events
FOR SELECT 
USING (auth.uid() IN (
    SELECT user_id FROM farmer_profiles WHERE id = farmer_id
));

DROP POLICY IF EXISTS farm_events_farmer_insert ON farm_events;
CREATE POLICY farm_events_farmer_insert 
ON farm_events
FOR INSERT 
WITH CHECK (auth.uid() IN (
    SELECT user_id FROM farmer_profiles WHERE id = farmer_id
));

DROP POLICY IF EXISTS farm_events_farmer_update ON farm_events;
CREATE POLICY farm_events_farmer_update 
ON farm_events
FOR UPDATE 
USING (auth.uid() IN (
    SELECT user_id FROM farmer_profiles WHERE id = farmer_id
));

DROP POLICY IF EXISTS farm_events_farmer_delete ON farm_events;
CREATE POLICY farm_events_farmer_delete 
ON farm_events
FOR DELETE 
USING (auth.uid() IN (
    SELECT user_id FROM farmer_profiles WHERE id = farmer_id
)); 