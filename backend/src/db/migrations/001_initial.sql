-- ===========================================
-- KASTONOM - Initial Migration
-- Creates all core tables for the MVP
-- ===========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===========================================
-- TENANTS
-- ===========================================
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    mode VARCHAR(20) NOT NULL DEFAULT 'mock' CHECK (mode IN ('mock', 'live')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_mode ON tenants(mode);

-- ===========================================
-- USERS
-- ===========================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, email),
    UNIQUE(email)
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);

-- ===========================================
-- AUDIT LOGS
-- ===========================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id UUID,
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_id VARCHAR(100),
    before_data JSONB,
    after_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- ===========================================
-- CREATIVE PROJECTS
-- ===========================================
CREATE TABLE IF NOT EXISTS creative_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'ready', 'published', 'archived', 'failed')),
    selected_generated_video_id UUID,
    latest_generation_request_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_projects_tenant ON creative_projects(tenant_id);
CREATE INDEX idx_projects_status ON creative_projects(status);

-- ===========================================
-- CREATIVE SUBJECTS
-- ===========================================
CREATE TABLE IF NOT EXISTS creative_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES creative_projects(id) ON DELETE CASCADE,
    subject_type VARCHAR(30) NOT NULL CHECK (subject_type IN ('product', 'service', 'brand', 'offer', 'event', 'place', 'other', 'unknown')),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    landing_url VARCHAR(500),
    price DECIMAL(12, 2),
    currency VARCHAR(10),
    allowed_claims TEXT[] DEFAULT '{}',
    forbidden_claims TEXT[] DEFAULT '{}',
    unknown_fields TEXT[] DEFAULT '{}',
    source VARCHAR(30) NOT NULL DEFAULT 'unknown' CHECK (source IN ('user_input', 'import', 'mock', 'unknown')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subjects_tenant ON creative_subjects(tenant_id);
CREATE INDEX idx_subjects_project ON creative_subjects(project_id);
CREATE INDEX idx_subjects_type ON creative_subjects(subject_type);

-- ===========================================
-- SOURCE ASSETS
-- ===========================================
CREATE TABLE IF NOT EXISTS source_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID REFERENCES creative_projects(id) ON DELETE CASCADE,
    -- Note: project_id is nullable to allow uploads before project creation
    -- Use idx_assets_unattached index to query unattached assets
    asset_type VARCHAR(20) NOT NULL CHECK (asset_type IN ('image', 'video', 'url')),
    source VARCHAR(30) NOT NULL DEFAULT 'upload' CHECK (source IN ('upload', 'external_url', 'generated', 'mock')),
    url VARCHAR(500) NOT NULL,
    storage_key VARCHAR(500),
    mime_type VARCHAR(100),
    width INTEGER,
    height INTEGER,
    duration_seconds INTEGER,
    checksum VARCHAR(100),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_assets_tenant ON source_assets(tenant_id);
CREATE INDEX idx_assets_project ON source_assets(project_id);
CREATE INDEX idx_assets_unattached ON source_assets(tenant_id) WHERE project_id IS NULL;

-- ===========================================
-- GENERATION REQUESTS
-- ===========================================
CREATE TABLE IF NOT EXISTS generation_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES creative_projects(id) ON DELETE CASCADE,
    creative_subject_id UUID NOT NULL REFERENCES creative_subjects(id),
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'prompt_compiled', 'generating', 'completed', 'failed', 'canceled')),
    objective VARCHAR(30) NOT NULL DEFAULT 'awareness' CHECK (objective IN ('awareness', 'traffic', 'conversions', 'engagement', 'app_promotion', 'lead_generation', 'unknown')),
    target_audience TEXT,
    platform VARCHAR(30) NOT NULL DEFAULT 'generic_vertical' CHECK (platform IN ('meta_ads', 'google_ads', 'tiktok', 'reels', 'youtube_shorts', 'generic_vertical', 'unknown')),
    language VARCHAR(20) NOT NULL DEFAULT 'Turkish',
    tone VARCHAR(50),
    style VARCHAR(50),
    call_to_action VARCHAR(200),
    duration_seconds INTEGER NOT NULL DEFAULT 15,
    aspect_ratio VARCHAR(10) NOT NULL DEFAULT '9:16',
    user_notes TEXT,
    fallback_notes TEXT[] DEFAULT '{}',
    source_asset_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_genreq_tenant ON generation_requests(tenant_id);
CREATE INDEX idx_genreq_project ON generation_requests(project_id);
CREATE INDEX idx_genreq_status ON generation_requests(status);

-- ===========================================
-- PROMPT PAYLOADS
-- ===========================================
CREATE TABLE IF NOT EXISTS prompt_payloads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES creative_projects(id) ON DELETE CASCADE,
    generation_request_id UUID NOT NULL REFERENCES generation_requests(id) ON DELETE CASCADE,
    provider VARCHAR(30) NOT NULL DEFAULT 'mock' CHECK (provider IN ('pollo', 'kling', 'runway', 'mock')),
    prompt_text TEXT NOT NULL,
    negative_prompt TEXT DEFAULT '',
    language VARCHAR(20) NOT NULL DEFAULT 'Turkish',
    duration_seconds INTEGER NOT NULL DEFAULT 15,
    aspect_ratio VARCHAR(10) NOT NULL DEFAULT '9:16',
    source_asset_ids UUID[] DEFAULT '{}',
    provider_options JSONB,
    is_mock BOOLEAN DEFAULT true,
    fallback_notes TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_prompt_tenant ON prompt_payloads(tenant_id);
CREATE INDEX idx_prompt_genreq ON prompt_payloads(generation_request_id);

-- ===========================================
-- VIDEO JOBS
-- ===========================================
CREATE TABLE IF NOT EXISTS video_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES creative_projects(id) ON DELETE CASCADE,
    generation_request_id UUID NOT NULL REFERENCES generation_requests(id) ON DELETE CASCADE,
    prompt_payload_id UUID NOT NULL REFERENCES prompt_payloads(id) ON DELETE CASCADE,
    provider VARCHAR(30) NOT NULL DEFAULT 'mock',
    status VARCHAR(30) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'submitted', 'processing', 'completed', 'failed', 'canceled')),
    provider_job_id VARCHAR(255),
    is_mock BOOLEAN DEFAULT true,
    fallback_reason TEXT,
    error_code VARCHAR(50),
    error_message TEXT,
    attempt_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vidjob_tenant ON video_jobs(tenant_id);
CREATE INDEX idx_vidjob_project ON video_jobs(project_id);
CREATE INDEX idx_vidjob_status ON video_jobs(status);

-- ===========================================
-- PROVIDER RESULTS
-- ===========================================
CREATE TABLE IF NOT EXISTS provider_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    video_job_id UUID NOT NULL REFERENCES video_jobs(id) ON DELETE CASCADE,
    provider VARCHAR(30) NOT NULL DEFAULT 'mock',
    provider_job_id VARCHAR(255),
    raw_status VARCHAR(50),
    normalized_status VARCHAR(30) NOT NULL,
    result_urls TEXT[] DEFAULT '{}',
    error_code VARCHAR(50),
    error_message TEXT,
    redacted_metadata JSONB,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_presult_tenant ON provider_results(tenant_id);
CREATE INDEX idx_presult_job ON provider_results(video_job_id);

-- ===========================================
-- GENERATED VIDEOS
-- ===========================================
CREATE TABLE IF NOT EXISTS generated_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES creative_projects(id) ON DELETE CASCADE,
    generation_request_id UUID NOT NULL REFERENCES generation_requests(id) ON DELETE CASCADE,
    video_job_id UUID NOT NULL REFERENCES video_jobs(id) ON DELETE CASCADE,
    provider_result_id UUID REFERENCES provider_results(id),
    url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    duration_seconds INTEGER,
    aspect_ratio VARCHAR(10) NOT NULL DEFAULT '9:16',
    status VARCHAR(30) NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'selected', 'rejected', 'published', 'unavailable')),
    is_selected BOOLEAN DEFAULT false,
    is_mock BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    selected_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_genvid_tenant ON generated_videos(tenant_id);
CREATE INDEX idx_genvid_project ON generated_videos(project_id);
CREATE INDEX idx_genvid_job ON generated_videos(video_job_id);
CREATE INDEX idx_genvid_status ON generated_videos(status);

-- ===========================================
-- AD PLATFORM CONNECTIONS
-- ===========================================
CREATE TABLE IF NOT EXISTS ad_platform_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    platform VARCHAR(30) NOT NULL CHECK (platform IN ('meta_ads', 'google_ads')),
    external_account_id VARCHAR(255),
    external_account_name VARCHAR(255),
    status VARCHAR(30) NOT NULL DEFAULT 'not_connected' CHECK (status IN ('not_connected', 'connected', 'expired', 'disabled', 'error')),
    scopes TEXT[] DEFAULT '{}',
    last_checked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, platform)
);

CREATE INDEX idx_conn_tenant ON ad_platform_connections(tenant_id);
CREATE INDEX idx_conn_platform ON ad_platform_connections(platform);

-- ===========================================
-- AD PUBLICATIONS
-- ===========================================
CREATE TABLE IF NOT EXISTS ad_publications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES creative_projects(id) ON DELETE CASCADE,
    generated_video_id UUID NOT NULL REFERENCES generated_videos(id),
    ad_platform_connection_id UUID REFERENCES ad_platform_connections(id),
    platform VARCHAR(30) NOT NULL CHECK (platform IN ('meta_ads', 'google_ads')),
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'publishing', 'published', 'failed', 'paused', 'archived')),
    external_campaign_id VARCHAR(255),
    external_ad_group_id VARCHAR(255),
    external_ad_id VARCHAR(255),
    destination_url VARCHAR(500),
    published_at TIMESTAMP WITH TIME ZONE,
    paused_at TIMESTAMP WITH TIME ZONE,
    error_code VARCHAR(50),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pub_tenant ON ad_publications(tenant_id);
CREATE INDEX idx_pub_project ON ad_publications(project_id);
CREATE INDEX idx_pub_status ON ad_publications(status);

-- ===========================================
-- AD METRICS SNAPSHOTS
-- ===========================================
CREATE TABLE IF NOT EXISTS ad_metrics_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    ad_publication_id UUID NOT NULL REFERENCES ad_publications(id) ON DELETE CASCADE,
    platform VARCHAR(30) NOT NULL,
    date_start DATE NOT NULL,
    date_end DATE NOT NULL,
    impressions BIGINT,
    clicks BIGINT,
    spend DECIMAL(12, 2),
    currency VARCHAR(10),
    ctr DECIMAL(6, 3),
    cpc DECIMAL(10, 4),
    conversions BIGINT,
    conversion_value DECIMAL(14, 2),
    roas DECIMAL(6, 3),
    video_views BIGINT,
    video_view_rate DECIMAL(6, 2),
    cost_per_video_view DECIMAL(8, 4),
    source VARCHAR(30) NOT NULL DEFAULT 'unknown' CHECK (source IN ('meta_ads_api', 'google_ads_api', 'mock', 'manual', 'unknown')),
    redacted_metadata JSONB,
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_metrics_pub ON ad_metrics_snapshots(ad_publication_id);
CREATE INDEX idx_metrics_tenant ON ad_metrics_snapshots(tenant_id);
CREATE INDEX idx_metrics_date ON ad_metrics_snapshots(date_start, date_end);

-- ===========================================
-- CREATIVE ITERATION SUGGESTIONS
-- ===========================================
CREATE TABLE IF NOT EXISTS creative_iteration_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES creative_projects(id) ON DELETE CASCADE,
    ad_publication_id UUID REFERENCES ad_publications(id) ON DELETE SET NULL,
    suggestion_type VARCHAR(50) NOT NULL,
    current_value TEXT,
    suggested_value TEXT,
    reason TEXT,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'applied')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_suggest_tenant ON creative_iteration_suggestions(tenant_id);
CREATE INDEX idx_suggest_project ON creative_iteration_suggestions(project_id);
CREATE INDEX idx_suggest_status ON creative_iteration_suggestions(status);

-- ===========================================
-- UPDATE TIMESTAMP TRIGGER
-- ===========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON creative_projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON creative_subjects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_connections_updated_at BEFORE UPDATE ON ad_platform_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_publications_updated_at BEFORE UPDATE ON ad_publications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- SEED DEMO TENANT
-- ===========================================
INSERT INTO tenants (id, name, mode, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'Kastonom Demo Tenant', 'mock', 'active')
ON CONFLICT (id) DO NOTHING;
