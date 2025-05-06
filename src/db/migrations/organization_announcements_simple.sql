-- Create organization_announcements table only
CREATE TABLE IF NOT EXISTS organization_announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  is_pinned BOOLEAN DEFAULT FALSE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted'))
); 