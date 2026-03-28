-- Add settings JSONB column to workspaces
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- Index for faster settings queries
CREATE INDEX IF NOT EXISTS idx_workspaces_settings ON workspaces(settings);