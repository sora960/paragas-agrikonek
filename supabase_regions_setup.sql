-- SQL commands for Supabase to set up regions and budget management tables

-- Disable RLS (Row Level Security)
ALTER TABLE IF EXISTS public.island_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.regions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.provinces DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.region_budgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_regions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reports DISABLE ROW LEVEL SECURITY;

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

-- *** RLS POLICIES ***

-- Island Groups policy
CREATE POLICY "Public can view island groups" ON public.island_groups
    FOR SELECT USING (true);
CREATE POLICY "Only super admins can insert island groups" ON public.island_groups
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'superadmin');
CREATE POLICY "Only super admins can update island groups" ON public.island_groups
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'superadmin');
CREATE POLICY "Only super admins can delete island groups" ON public.island_groups
    FOR DELETE USING (auth.jwt() ->> 'role' = 'superadmin');

-- Regions policy
CREATE POLICY "Public can view regions" ON public.regions
    FOR SELECT USING (true);
CREATE POLICY "Only super admins can insert regions" ON public.regions
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'superadmin');
CREATE POLICY "Only super admins can update regions" ON public.regions
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'superadmin');
CREATE POLICY "Only super admins can delete regions" ON public.regions
    FOR DELETE USING (auth.jwt() ->> 'role' = 'superadmin');

-- Provinces policy
CREATE POLICY "Public can view provinces" ON public.provinces
    FOR SELECT USING (true);
CREATE POLICY "Only super admins can insert provinces" ON public.provinces
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'superadmin');
CREATE POLICY "Only super admins can update provinces" ON public.provinces
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'superadmin');
CREATE POLICY "Only super admins can delete provinces" ON public.provinces
    FOR DELETE USING (auth.jwt() ->> 'role' = 'superadmin');

-- Region Budgets policy
CREATE POLICY "Public can view region budgets" ON public.region_budgets
    FOR SELECT USING (true);
CREATE POLICY "Only super admins can insert region budgets" ON public.region_budgets
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'superadmin');
CREATE POLICY "Only super admins can update region budgets" ON public.region_budgets
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'superadmin');
CREATE POLICY "Only super admins can delete region budgets" ON public.region_budgets
    FOR DELETE USING (auth.jwt() ->> 'role' = 'superadmin');

-- Annual Budget policy
CREATE POLICY "Public can view annual budgets" ON public.annual_budgets
    FOR SELECT USING (true);
CREATE POLICY "Only super admins can insert annual budgets" ON public.annual_budgets
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'superadmin');
CREATE POLICY "Only super admins can update annual budgets" ON public.annual_budgets
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'superadmin');

-- Users policy
CREATE POLICY "Users can view their own data" ON public.users
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Super admins can view all users" ON public.users
    FOR SELECT USING (auth.jwt() ->> 'role' = 'superadmin');
CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Regional admins can view users in their regions" ON public.users
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'regional_admin' AND
        EXISTS (
            SELECT 1 FROM public.user_regions ur
            WHERE ur.user_id = auth.uid() AND
                  ur.region_id IN (
                      SELECT ur2.region_id FROM public.user_regions ur2 WHERE ur2.user_id = public.users.id
                  )
        )
    );
CREATE POLICY "Only super admins can insert users" ON public.users
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'superadmin');
CREATE POLICY "Users can update their own data" ON public.users
    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Super admins can update any user" ON public.users
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'superadmin');
CREATE POLICY "Only super admins can delete users" ON public.users
    FOR DELETE USING (auth.jwt() ->> 'role' = 'superadmin');

-- User Regions policy
CREATE POLICY "Super admins can view all user regions" ON public.user_regions
    FOR SELECT USING (auth.jwt() ->> 'role' = 'superadmin');
CREATE POLICY "Regional admins can view their own assignments" ON public.user_regions
    FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Only super admins can assign users to regions" ON public.user_regions
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'superadmin');
CREATE POLICY "Only super admins can update user region assignments" ON public.user_regions
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'superadmin');
CREATE POLICY "Only super admins can remove user region assignments" ON public.user_regions
    FOR DELETE USING (auth.jwt() ->> 'role' = 'superadmin');

-- Reports policy
CREATE POLICY "Super admins can view all reports" ON public.reports
    FOR SELECT USING (auth.jwt() ->> 'role' = 'superadmin');
CREATE POLICY "Admins can view all reports" ON public.reports
    FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Regional admins can view reports for their regions" ON public.reports
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'regional_admin' AND
        EXISTS (
            SELECT 1 FROM public.user_regions ur
            WHERE ur.user_id = auth.uid() AND ur.region_id = public.reports.region_id
        )
    );
CREATE POLICY "Users can view reports they created" ON public.reports
    FOR SELECT USING (created_by = auth.uid());
CREATE POLICY "Super admins can create reports" ON public.reports
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'superadmin');
CREATE POLICY "Admins can create reports" ON public.reports
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Regional admins can create reports for their regions" ON public.reports
    FOR INSERT WITH CHECK (
        auth.jwt() ->> 'role' = 'regional_admin' AND
        EXISTS (
            SELECT 1 FROM public.user_regions ur
            WHERE ur.user_id = auth.uid() AND ur.region_id = public.reports.region_id
        )
    );
CREATE POLICY "Users can update reports they created" ON public.reports
    FOR UPDATE USING (created_by = auth.uid() AND status = 'draft');
CREATE POLICY "Super admins can update any report" ON public.reports
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'superadmin');
CREATE POLICY "Regional admins can update reports for their regions" ON public.reports
    FOR UPDATE USING (
        auth.jwt() ->> 'role' = 'regional_admin' AND
        EXISTS (
            SELECT 1 FROM public.user_regions ur
            WHERE ur.user_id = auth.uid() AND ur.region_id = public.reports.region_id
        )
    );
CREATE POLICY "Only super admins can delete reports" ON public.reports
    FOR DELETE USING (auth.jwt() ->> 'role' = 'superadmin');

-- *** INITIAL DATA INSERTION ***

-- Insert Island Groups
INSERT INTO public.island_groups (name) VALUES
('Luzon'),
('Visayas'),
('Mindanao')
ON CONFLICT (name) DO NOTHING;

-- Insert Regions (Select island_group_id from the inserted island_groups)
WITH island_data AS (
    SELECT id, name FROM public.island_groups
)
INSERT INTO public.regions (code, name, island_group_id, priority) VALUES
-- Luzon Regions
('R1', 'Region I – Ilocos Region', (SELECT id FROM island_data WHERE name = 'Luzon'), 'medium'),
('R2', 'Region II – Cagayan Valley', (SELECT id FROM island_data WHERE name = 'Luzon'), 'medium'),
('R3', 'Region III – Central Luzon', (SELECT id FROM island_data WHERE name = 'Luzon'), 'high'),
('R4A', 'Region IV-A – CALABARZON', (SELECT id FROM island_data WHERE name = 'Luzon'), 'high'),
('R4B', 'Region IV-B – MIMAROPA', (SELECT id FROM island_data WHERE name = 'Luzon'), 'medium'),
('R5', 'Region V – Bicol Region', (SELECT id FROM island_data WHERE name = 'Luzon'), 'medium'),
('NCR', 'National Capital Region (NCR)', (SELECT id FROM island_data WHERE name = 'Luzon'), 'high'),
('CAR', 'Cordillera Administrative Region (CAR)', (SELECT id FROM island_data WHERE name = 'Luzon'), 'medium'),
-- Visayas Regions
('R6', 'Region VI – Western Visayas', (SELECT id FROM island_data WHERE name = 'Visayas'), 'medium'),
('R7', 'Region VII – Central Visayas', (SELECT id FROM island_data WHERE name = 'Visayas'), 'high'),
('R8', 'Region VIII – Eastern Visayas', (SELECT id FROM island_data WHERE name = 'Visayas'), 'medium'),
-- Mindanao Regions
('R9', 'Region IX – Zamboanga Peninsula', (SELECT id FROM island_data WHERE name = 'Mindanao'), 'medium'),
('R10', 'Region X – Northern Mindanao', (SELECT id FROM island_data WHERE name = 'Mindanao'), 'medium'),
('R11', 'Region XI – Davao Region', (SELECT id FROM island_data WHERE name = 'Mindanao'), 'high'),
('R12', 'Region XII – SOCCSKSARGEN', (SELECT id FROM island_data WHERE name = 'Mindanao'), 'medium'),
('R13', 'Region XIII – Caraga', (SELECT id FROM island_data WHERE name = 'Mindanao'), 'medium'),
('BARMM', 'Bangsamoro Autonomous Region in Muslim Mindanao (BARMM)', (SELECT id FROM island_data WHERE name = 'Mindanao'), 'high')
ON CONFLICT (code) DO NOTHING;

-- Insert Initial Annual Budget
INSERT INTO public.annual_budgets (fiscal_year, total_amount) VALUES
(2024, 100000000)
ON CONFLICT (fiscal_year) DO NOTHING;

-- Insert Region Budgets for 2024
WITH region_data AS (
    SELECT id, code FROM public.regions
)
INSERT INTO public.region_budgets (region_id, fiscal_year, amount, allocated) VALUES
-- Initial budget for each region
((SELECT id FROM region_data WHERE code = 'R1'), 2024, 5000000, true),
((SELECT id FROM region_data WHERE code = 'R2'), 2024, 6000000, true),
((SELECT id FROM region_data WHERE code = 'R3'), 2024, 8000000, true),
((SELECT id FROM region_data WHERE code = 'R4A'), 2024, 9000000, true),
((SELECT id FROM region_data WHERE code = 'R4B'), 2024, 5000000, true),
((SELECT id FROM region_data WHERE code = 'R5'), 2024, 6000000, true),
((SELECT id FROM region_data WHERE code = 'NCR'), 2024, 10000000, true),
((SELECT id FROM region_data WHERE code = 'CAR'), 2024, 5000000, true),
((SELECT id FROM region_data WHERE code = 'R6'), 2024, 6000000, true),
((SELECT id FROM region_data WHERE code = 'R7'), 2024, 8000000, true),
((SELECT id FROM region_data WHERE code = 'R8'), 2024, 5000000, true),
((SELECT id FROM region_data WHERE code = 'R9'), 2024, 5000000, true),
((SELECT id FROM region_data WHERE code = 'R10'), 2024, 5000000, true),
((SELECT id FROM region_data WHERE code = 'R11'), 2024, 7000000, true),
((SELECT id FROM region_data WHERE code = 'R12'), 2024, 5000000, true),
((SELECT id FROM region_data WHERE code = 'R13'), 2024, 5000000, true),
((SELECT id FROM region_data WHERE code = 'BARMM'), 2024, 0, false)
ON CONFLICT (region_id, fiscal_year) DO NOTHING;

-- Insert provinces for each region
-- This is just a partial list for demonstration purposes
-- You would add all provinces for a complete implementation
WITH region_data AS (
    SELECT id, code FROM public.regions
)
INSERT INTO public.provinces (name, region_id, farmers, organizations, status) VALUES
-- Region 1 provinces
('Ilocos Norte', (SELECT id FROM region_data WHERE code = 'R1'), 345, 12, 'active'),
('Ilocos Sur', (SELECT id FROM region_data WHERE code = 'R1'), 432, 15, 'active'),
('La Union', (SELECT id FROM region_data WHERE code = 'R1'), 287, 8, 'active'),
('Pangasinan', (SELECT id FROM region_data WHERE code = 'R1'), 765, 24, 'active'),

-- Region 2 provinces
('Batanes', (SELECT id FROM region_data WHERE code = 'R2'), 87, 3, 'active'),
('Cagayan', (SELECT id FROM region_data WHERE code = 'R2'), 532, 18, 'active'),
('Isabela', (SELECT id FROM region_data WHERE code = 'R2'), 678, 22, 'active'),
('Nueva Vizcaya', (SELECT id FROM region_data WHERE code = 'R2'), 312, 9, 'active'),
('Quirino', (SELECT id FROM region_data WHERE code = 'R2'), 156, 5, 'active'),

-- Region 3 provinces (partial)
('Aurora', (SELECT id FROM region_data WHERE code = 'R3'), 178, 6, 'active'),
('Bataan', (SELECT id FROM region_data WHERE code = 'R3'), 245, 8, 'active'),
('Bulacan', (SELECT id FROM region_data WHERE code = 'R3'), 623, 20, 'active')
ON CONFLICT DO NOTHING;

-- Insert Sample Users (Super Admin, Regional Admins)
INSERT INTO public.users (id, email, first_name, last_name, role, status, phone)
VALUES 
('00000000-0000-0000-0000-000000000001', 'superadmin@example.com', 'Super', 'Admin', 'superadmin', 'active', '+6391234567890'),
('00000000-0000-0000-0000-000000000002', 'admin@example.com', 'System', 'Admin', 'admin', 'active', '+6391234567891'),
('00000000-0000-0000-0000-000000000003', 'region1@example.com', 'Region1', 'Admin', 'regional_admin', 'active', '+6391234567892'),
('00000000-0000-0000-0000-000000000004', 'region2@example.com', 'Region2', 'Admin', 'regional_admin', 'active', '+6391234567893'),
('00000000-0000-0000-0000-000000000005', 'region3@example.com', 'Region3', 'Admin', 'regional_admin', 'active', '+6391234567894')
ON CONFLICT (id) DO NOTHING;

-- Assign Regional Admins to Regions
WITH region_data AS (
    SELECT id, code FROM public.regions
),
user_data AS (
    SELECT id, email FROM public.users
)
INSERT INTO public.user_regions (user_id, region_id, assigned_by)
VALUES
((SELECT id FROM user_data WHERE email = 'region1@example.com'), 
 (SELECT id FROM region_data WHERE code = 'R1'), 
 (SELECT id FROM user_data WHERE email = 'superadmin@example.com')),

((SELECT id FROM user_data WHERE email = 'region2@example.com'), 
 (SELECT id FROM region_data WHERE code = 'R2'), 
 (SELECT id FROM user_data WHERE email = 'superadmin@example.com')),

((SELECT id FROM user_data WHERE email = 'region3@example.com'), 
 (SELECT id FROM region_data WHERE code = 'R3'), 
 (SELECT id FROM user_data WHERE email = 'superadmin@example.com'))
ON CONFLICT (user_id, region_id) DO NOTHING;

-- Insert sample reports
WITH region_data AS (
    SELECT id, code FROM public.regions
),
user_data AS (
    SELECT id, email FROM public.users
)
INSERT INTO public.reports (title, description, report_type, region_id, fiscal_year, created_by, report_date, report_data, status)
VALUES
('Annual Farmer Count for Region I', 
 'Comprehensive analysis of farmer population in Region I', 
 'farmers', 
 (SELECT id FROM region_data WHERE code = 'R1'), 
 2024, 
 (SELECT id FROM user_data WHERE email = 'region1@example.com'), 
 '2024-01-15', 
 '{"total_farmers": 1829, "growth_rate": 2.5, "male_farmers": 1021, "female_farmers": 808, "average_age": 47}', 
 'approved'),

('Budget Allocation Report - Region II', 
 'Detailed breakdown of budget usage in Region II for 2024', 
 'budget', 
 (SELECT id FROM region_data WHERE code = 'R2'), 
 2024, 
 (SELECT id FROM user_data WHERE email = 'region2@example.com'), 
 '2024-02-10', 
 '{"total_allocated": 6000000, "used": 1500000, "remaining": 4500000, "categories": {"training": 600000, "equipment": 750000, "operations": 150000}}', 
 'submitted'),

('Organization Activities in Region III', 
 'Summary of organizational activities and programs in Region III', 
 'organizations', 
 (SELECT id FROM region_data WHERE code = 'R3'), 
 2024, 
 (SELECT id FROM user_data WHERE email = 'region3@example.com'), 
 '2024-03-01', 
 '{"total_orgs": 63, "active_programs": 15, "beneficiaries": 2145, "successful_initiatives": 8}', 
 'draft')
ON CONFLICT DO NOTHING;

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
