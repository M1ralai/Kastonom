-- ===========================================
-- KASTONOM - Migration 002
-- Fix: Make source_assets.project_id nullable
-- Reason: Assets can be uploaded before a project exists
-- ===========================================

-- Drop the FK constraint first (PostgreSQL needs this in two steps)
ALTER TABLE source_assets DROP CONSTRAINT IF EXISTS source_assets_project_id_fkey;

-- Make project_id nullable (remove NOT NULL constraint)
-- We need to recreate the column to remove NOT NULL
ALTER TABLE source_assets ALTER COLUMN project_id DROP NOT NULL;

-- Add back the FK constraint but without NOT NULL requirement
-- Assets can exist without a project initially, then get linked later
ALTER TABLE source_assets ADD CONSTRAINT source_assets_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES creative_projects(id) ON DELETE CASCADE;

-- Add index for querying unattached assets
CREATE INDEX IF NOT EXISTS idx_assets_unattached ON source_assets(tenant_id) WHERE project_id IS NULL;
