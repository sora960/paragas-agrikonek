-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations Table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    registration_number VARCHAR(50) UNIQUE NOT NULL,
    region_id UUID REFERENCES public.regions(id),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'inactive')),
    verification_status VARCHAR(50) DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'in_review', 'verified', 'rejected')),
    address TEXT NOT NULL,
    contact_person VARCHAR(100) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    description TEXT,
    member_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organization Members Table
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    farmer_id UUID REFERENCES public.farmer_profiles(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('member', 'admin', 'manager')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    join_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, farmer_id)
);

-- Organization Budgets Table
CREATE TABLE IF NOT EXISTS public.organization_budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    fiscal_year INTEGER NOT NULL,
    total_allocation DECIMAL(15,2) DEFAULT 0,
    utilized_amount DECIMAL(15,2) DEFAULT 0,
    remaining_amount DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, fiscal_year)
);

-- Budget Allocations Table
CREATE TABLE IF NOT EXISTS public.budget_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_id UUID REFERENCES public.organization_budgets(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    allocated_amount DECIMAL(15,2) DEFAULT 0,
    utilized_amount DECIMAL(15,2) DEFAULT 0,
    remaining_amount DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'depleted', 'pending')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expenses Table
CREATE TABLE IF NOT EXISTS public.organization_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    budget_allocation_id UUID REFERENCES public.budget_allocations(id),
    date DATE NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by UUID REFERENCES public.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Budget Requests Table
CREATE TABLE IF NOT EXISTS public.budget_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    region_id UUID REFERENCES public.regions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    requested_amount DECIMAL(15,2) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    request_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_date TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    notes TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS budget_requests_region_id_idx ON public.budget_requests(region_id);
CREATE INDEX IF NOT EXISTS budget_requests_user_id_idx ON public.budget_requests(user_id);
CREATE INDEX IF NOT EXISTS budget_requests_status_idx ON public.budget_requests(status);

-- Disable RLS for budget_requests
ALTER TABLE public.budget_requests DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON public.budget_requests TO authenticated;
GRANT SELECT, INSERT ON public.budget_requests TO anon;

-- Create views for easier querying
CREATE OR REPLACE VIEW public.organization_budget_summary AS
SELECT 
    o.id AS organization_id,
    o.name AS organization_name,
    ob.fiscal_year,
    ob.total_allocation,
    ob.utilized_amount,
    ob.remaining_amount,
    COUNT(DISTINCT ba.id) AS allocation_categories,
    COUNT(DISTINCT e.id) AS total_expenses,
    SUM(CASE WHEN e.status = 'approved' THEN e.amount ELSE 0 END) AS approved_expenses
FROM 
    public.organizations o
    LEFT JOIN public.organization_budgets ob ON ob.organization_id = o.id
    LEFT JOIN public.budget_allocations ba ON ba.budget_id = ob.id
    LEFT JOIN public.organization_expenses e ON e.organization_id = o.id
GROUP BY 
    o.id, o.name, ob.fiscal_year, ob.total_allocation, ob.utilized_amount, ob.remaining_amount;

-- Create view for member statistics
CREATE OR REPLACE VIEW public.organization_member_stats AS
SELECT 
    o.id AS organization_id,
    o.name AS organization_name,
    COUNT(DISTINCT om.farmer_id) AS total_members,
    COUNT(DISTINCT CASE WHEN om.status = 'active' THEN om.farmer_id END) AS active_members,
    COUNT(DISTINCT CASE WHEN om.role = 'admin' THEN om.farmer_id END) AS admin_count,
    COUNT(DISTINCT CASE WHEN om.role = 'manager' THEN om.farmer_id END) AS manager_count
FROM 
    public.organizations o
    LEFT JOIN public.organization_members om ON om.organization_id = o.id
GROUP BY 
    o.id, o.name;

-- Add triggers to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_members_updated_at
    BEFORE UPDATE ON public.organization_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_budgets_updated_at
    BEFORE UPDATE ON public.organization_budgets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_allocations_updated_at
    BEFORE UPDATE ON public.budget_allocations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_expenses_updated_at
    BEFORE UPDATE ON public.organization_expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE public.organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_budgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_allocations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_expenses DISABLE ROW LEVEL SECURITY;

-- Create policies (customize these based on your authentication setup)
CREATE POLICY "Organizations are viewable by authenticated users"
    ON public.organizations FOR SELECT
    USING (auth.role() IN ('authenticated'));

CREATE POLICY "Organizations are editable by organization admins"
    ON public.organizations FOR UPDATE
    USING (auth.uid() IN (
        SELECT user_id FROM public.users 
        WHERE role = 'organization_admin' AND organization_id = id
    ));

-- Similar policies should be created for other tables based on your requirements 