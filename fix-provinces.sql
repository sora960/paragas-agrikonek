-- Script to fix the provinces table if needed
-- Run this SQL in your Supabase SQL editor

-- First check if provinces table exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'provinces'
    ) THEN
        -- Create provinces table if it doesn't exist
        CREATE TABLE public.provinces (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            region_id UUID REFERENCES public.regions(id) ON DELETE CASCADE,
            farmers INTEGER DEFAULT 0,
            organizations INTEGER DEFAULT 0,
            status TEXT DEFAULT 'pending' CHECK (status IN ('active', 'pending')),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        
        -- Enable RLS
        ALTER TABLE public.provinces ENABLE ROW LEVEL SECURITY;
        
        -- Create policy
        CREATE POLICY "Enable all access for authenticated users" 
            ON public.provinces FOR ALL 
            USING (auth.role() = 'authenticated')
            WITH CHECK (auth.role() = 'authenticated');
        
        -- Grant permissions
        GRANT ALL ON public.provinces TO authenticated;
        
        RAISE NOTICE 'Created provinces table with region_id column';
    ELSE
        -- Table exists, check for region columns
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'provinces'
            AND column_name = 'region_id'
        ) AND NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'provinces'
            AND column_name = 'region_code'
        ) THEN
            -- Neither column exists, add region_id
            ALTER TABLE public.provinces 
            ADD COLUMN region_id UUID REFERENCES public.regions(id) ON DELETE CASCADE;
            
            RAISE NOTICE 'Added region_id column to existing provinces table';
        ELSIF EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'provinces'
            AND column_name = 'region_id'
        ) THEN
            RAISE NOTICE 'Provinces table already has region_id column';
        ELSIF EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'provinces'
            AND column_name = 'region_code'
        ) THEN
            RAISE NOTICE 'Provinces table has region_code column';
        END IF;
    END IF;
END
$$; 