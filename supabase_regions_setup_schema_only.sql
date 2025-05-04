-- SQL commands for Supabase to set up regions and budget management tables
-- SCHEMA ONLY VERSION - NO DUMMY DATA

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- *** ISLAND GROUPS TABLE ***
CREATE TABLE IF NOT EXISTS public.island_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- *** REGIONS TABLE ***
CREATE TABLE IF NOT EXISTS public.regions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    island_group_id UUID REFERENCES public.island_groups(id) ON DELETE CASCADE,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- *** PROVINCES TABLE ***
CREATE TABLE IF NOT EXISTS public.provinces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    region_id UUID REFERENCES public.regions(id) ON DELETE CASCADE,
    farmers INTEGER DEFAULT 0,
    organizations INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'pending')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- *** REGION BUDGETS TABLE ***
CREATE TABLE IF NOT EXISTS public.region_budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    region_id UUID REFERENCES public.regions(id) ON DELETE CASCADE,
    fiscal_year INTEGER NOT NULL,
    amount DECIMAL(20, 2) DEFAULT 0,
    allocated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(region_id, fiscal_year)
);

-- *** TOTAL BUDGET TABLE ***
CREATE TABLE IF NOT EXISTS public.annual_budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fiscal_year INTEGER NOT NULL UNIQUE,
    total_amount DECIMAL(20, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- *** USERS TABLE ***
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('superadmin', 'admin', 'regional_admin', 'user')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    phone VARCHAR(20),
    profile_photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- *** USER REGIONS TABLE - For regional admins assigned to regions ***
CREATE TABLE IF NOT EXISTS public.user_regions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    region_id UUID REFERENCES public.regions(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES public.users(id),
    UNIQUE(user_id, region_id)
);

-- *** REPORTS TABLE ***
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('budget', 'farmers', 'organizations', 'activity', 'other')),
    region_id UUID REFERENCES public.regions(id) ON DELETE CASCADE,
    province_id UUID REFERENCES public.provinces(id) ON DELETE SET NULL,
    fiscal_year INTEGER,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    report_date DATE NOT NULL,
    report_data JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create convenient views for easier querying
CREATE OR REPLACE VIEW public.region_with_province_count AS
SELECT 
    r.id,
    r.code,
    r.name,
    r.priority,
    ig.name AS island_group,
    COUNT(p.id) AS province_count,
    SUM(p.farmers) AS total_farmers,
    SUM(p.organizations) AS total_organizations,
    COALESCE(rb.amount, 0) AS budget_amount,
    COALESCE(rb.allocated, false) AS is_budget_allocated
FROM 
    public.regions r
    JOIN public.island_groups ig ON r.island_group_id = ig.id
    LEFT JOIN public.provinces p ON p.region_id = r.id
    LEFT JOIN public.region_budgets rb ON rb.region_id = r.id AND rb.fiscal_year = 2024
GROUP BY 
    r.id, r.code, r.name, r.priority, ig.name, rb.amount, rb.allocated;

-- View for budget allocation statistics
CREATE OR REPLACE VIEW public.budget_allocation_summary AS
SELECT 
    ab.fiscal_year,
    ab.total_amount,
    SUM(rb.amount) AS total_allocated,
    (SUM(rb.amount) / ab.total_amount) * 100 AS allocation_percentage,
    ab.total_amount - SUM(rb.amount) AS remaining_budget,
    COUNT(CASE WHEN rb.allocated THEN 1 END) AS regions_with_budget,
    COUNT(r.id) AS total_regions
FROM 
    public.annual_budgets ab
    LEFT JOIN public.region_budgets rb ON rb.fiscal_year = ab.fiscal_year
    LEFT JOIN public.regions r ON r.id = rb.region_id
GROUP BY 
    ab.fiscal_year, ab.total_amount;

-- View for region admins
CREATE OR REPLACE VIEW public.region_admins AS
SELECT 
    r.id AS region_id,
    r.code AS region_code,
    r.name AS region_name,
    u.id AS user_id,
    u.first_name,
    u.last_name,
    u.email,
    u.phone,
    u.status AS user_status,
    ur.assigned_at
FROM 
    public.regions r
    LEFT JOIN public.user_regions ur ON r.id = ur.region_id
    LEFT JOIN public.users u ON ur.user_id = u.id AND u.role = 'regional_admin'
ORDER BY 
    r.code;

-- Optional: Temporarily disable RLS to allow easier testing
-- Comment these out when deploying to production
ALTER TABLE IF EXISTS public.island_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.regions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.provinces DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.region_budgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.annual_budgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_regions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reports DISABLE ROW LEVEL SECURITY; 