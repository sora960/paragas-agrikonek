-- Fix the organization_announcements table with proper transaction handling
BEGIN;

-- First, drop any dependent objects that might block our operations
DROP VIEW IF EXISTS organization_announcements_with_creator CASCADE;
DROP FUNCTION IF EXISTS get_active_announcements(UUID) CASCADE;

-- Drop and recreate the table with all required columns
DROP TABLE IF EXISTS organization_announcements CASCADE;

-- Create table with all required columns
CREATE TABLE organization_announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  is_pinned BOOLEAN DEFAULT FALSE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  status TEXT DEFAULT 'active'
);

-- Add foreign key constraints
ALTER TABLE organization_announcements 
  ADD CONSTRAINT organization_announcements_organization_id_fkey 
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE organization_announcements 
  ADD CONSTRAINT organization_announcements_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add check constraint
ALTER TABLE organization_announcements 
  ADD CONSTRAINT organization_announcements_status_check 
  CHECK (status IN ('active', 'archived', 'deleted'));

-- Add indexes
CREATE INDEX idx_org_announcements_organization 
ON organization_announcements(organization_id);

CREATE INDEX idx_org_announcements_status 
ON organization_announcements(status);

CREATE INDEX idx_org_announcements_created_at 
ON organization_announcements(created_at DESC);

CREATE INDEX idx_org_announcements_is_pinned 
ON organization_announcements(is_pinned DESC);

-- Disable RLS
ALTER TABLE organization_announcements DISABLE ROW LEVEL SECURITY;

-- Create a view
CREATE OR REPLACE VIEW organization_announcements_with_creator AS
SELECT 
  a.*,
  u.first_name || ' ' || u.last_name AS creator_name
FROM 
  organization_announcements a
LEFT JOIN 
  users u ON a.created_by = u.id;

-- Create a function
CREATE OR REPLACE FUNCTION get_active_announcements(org_id UUID)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  title TEXT,
  content TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  is_pinned BOOLEAN,
  expires_at TIMESTAMP WITH TIME ZONE,
  status TEXT,
  creator_name TEXT
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    a.id,
    a.organization_id,
    a.title,
    a.content,
    a.created_by,
    a.created_at,
    a.updated_at,
    a.is_pinned,
    a.expires_at,
    a.status,
    u.first_name || ' ' || u.last_name AS creator_name
  FROM 
    organization_announcements a
  LEFT JOIN 
    users u ON a.created_by = u.id
  WHERE 
    a.organization_id = org_id
    AND a.status = 'active'
    AND (a.expires_at IS NULL OR a.expires_at > NOW())
  ORDER BY 
    a.is_pinned DESC, 
    a.created_at DESC;
$$;

COMMIT; 