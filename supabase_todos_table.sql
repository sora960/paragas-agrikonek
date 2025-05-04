-- This script creates the todos table for the Supabase example
-- Run this in your Supabase SQL editor

-- Drop the table if it already exists (optional)
-- DROP TABLE IF EXISTS public.todos;

-- Create the todos table
CREATE TABLE public.todos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add a comment to the table
COMMENT ON TABLE public.todos IS 'Table for storing todo items for the AgriConnect example';

-- Enable Row Level Security (RLS)
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows anonymous access to all operations
-- In production, you would want to restrict this appropriately
CREATE POLICY "Allow anonymous access" ON public.todos
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Optional: Insert sample data
INSERT INTO public.todos (task, completed)
VALUES 
  ('Get Supabase connection working', true),
  ('Add more todos', false),
  ('Complete the AgriConnect app', false);

-- Verify the table was created
SELECT * FROM public.todos; 