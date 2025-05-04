-- This script adds sample data to the todos table

-- Clear existing data (optional)
-- TRUNCATE TABLE public.todos;

-- Insert sample data
INSERT INTO public.todos (task, completed)
VALUES 
  ('Get Supabase connection working', true),
  ('Add more todos', false),
  ('Complete the AgriConnect app', false),
  ('Test RLS policies', true),
  ('Deploy to production', false);

-- Verify the data was added
SELECT * FROM public.todos; 