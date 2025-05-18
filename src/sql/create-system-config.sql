-- Create system_config table for storing global settings
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for this table
ALTER TABLE system_config DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON system_config TO authenticated;
GRANT ALL ON system_config TO anon;

-- Insert default values
INSERT INTO system_config (key, value, description) VALUES
  ('system_name', 'AgriConnect', 'Name of the system'),
  ('admin_email', 'admin@agriconnect.com', 'Administrator email address'),
  ('support_email', 'support@agriconnect.com', 'Support email address'),
  ('timezone', 'utc', 'Default system timezone'),
  ('auto_approval', 'false', 'Enable auto-approval for verified organizations'),
  ('email_notifications', 'true', 'Send email alerts for important system events'),
  ('maintenance_mode', 'false', 'Temporarily disable access for non-admin users'),
  ('two_factor_auth', 'true', 'Require 2FA for all admin accounts'),
  ('password_expiry', '90', 'Number of days until passwords expire (0 for never)'),
  ('session_timeout', '30', 'Minutes until inactive users are logged out'),
  ('max_login_attempts', '5', 'Max failed login attempts before locking account'),
  ('account_lockout_duration', '15', 'Minutes an account remains locked after too many failed attempts'),
  ('automatic_backups', 'true', 'Enable automatic system backups'),
  ('backup_frequency', 'daily', 'Frequency of automatic backups (hourly, daily, weekly, monthly)')
ON CONFLICT (key) DO NOTHING; 