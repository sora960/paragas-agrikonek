-- This script creates the field_reports table needed for report_comments

-- Create field_reports table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.field_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID REFERENCES public.farmer_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    report_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on field_reports table
ALTER TABLE public.field_reports ENABLE ROW LEVEL SECURITY;

-- Create policy for field_reports table
CREATE POLICY "Enable all access for all users" 
  ON public.field_reports FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.field_reports TO anon, authenticated;

-- Create report_comments table
CREATE TABLE IF NOT EXISTS public.report_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES public.field_reports(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_comment_id UUID REFERENCES public.report_comments(id) ON DELETE CASCADE,
    is_internal BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on report_comments table
ALTER TABLE public.report_comments ENABLE ROW LEVEL SECURITY;

-- Create policy for report_comments table
CREATE POLICY "Enable all access for all users" 
  ON public.report_comments FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.report_comments TO anon, authenticated;

-- Verify tables were created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('field_reports', 'report_comments'); 