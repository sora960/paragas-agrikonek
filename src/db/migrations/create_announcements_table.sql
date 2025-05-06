-- ONLY create the table without any indexes or constraints
CREATE TABLE IF NOT EXISTS organization_announcements (
  id UUID PRIMARY KEY,
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