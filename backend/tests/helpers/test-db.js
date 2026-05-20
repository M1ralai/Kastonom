import pg from "pg";
import { createHmac } from "node:crypto";

const { Pool } = pg;

const TEST_DB_URL = process.env.TEST_DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/kastonom_test";

const PASSWORD_SALT = process.env.PASSWORD_SALT || "kastonom-dev-salt-change-in-production";

function hashPassword(password) {
  const hmac = createHmac("sha256", PASSWORD_SALT);
  hmac.update(password);
  return hmac.digest("hex");
}

let testPool = null;
let initPromise = null;

export async function initTestDatabase() {
  if (testPool) return testPool;

  testPool = new Pool({ connectionString: TEST_DB_URL });

  // Run migrations
  try {
    await testPool.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      CREATE TABLE IF NOT EXISTS tenants (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        mode VARCHAR(20) NOT NULL DEFAULT 'mock' CHECK (mode IN ('mock', 'live')),
        status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

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

      CREATE TABLE IF NOT EXISTS source_assets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        project_id UUID NOT NULL REFERENCES creative_projects(id) ON DELETE CASCADE,
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
    `);
  } catch (err) {
    console.error("Failed to create test tables:", err.message);
  }

  return testPool;
}

export async function cleanupTestDatabase() {
  if (!testPool) return;

  const client = await testPool.connect();
  try {
    await client.query("BEGIN");
    // Delete all test data
    await client.query("DELETE FROM creative_iteration_suggestions");
    await client.query("DELETE FROM ad_metrics_snapshots");
    await client.query("DELETE FROM ad_publications");
    await client.query("DELETE FROM ad_platform_connections");
    await client.query("DELETE FROM generated_videos");
    await client.query("DELETE FROM provider_results");
    await client.query("DELETE FROM video_jobs");
    await client.query("DELETE FROM prompt_payloads");
    await client.query("DELETE FROM generation_requests");
    await client.query("DELETE FROM source_assets");
    await client.query("DELETE FROM creative_subjects");
    await client.query("DELETE FROM creative_projects");
    await client.query("DELETE FROM users");
    await client.query("DELETE FROM tenants");
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function seedDemoTenant(pool) {
  const result = await pool.query(
    `INSERT INTO tenants (id, name, mode, status)
     VALUES ('00000000-0000-0000-0000-000000000001', 'Kastonom Demo Tenant', 'mock', 'active')
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
     RETURNING *`
  );
  return result.rows[0];
}

export async function createTestUser(pool, overrides = {}) {
  const tenantId = overrides.tenantId || '00000000-0000-0000-0000-000000000001';
  const userId = overrides.userId || '00000000-0000-0000-0000-000000000002';
  const email = overrides.email || `test-${Date.now()}@example.com`;
  const password = overrides.password || "testpassword123";
  const name = overrides.name || "Test User";

  const passwordHash = hashPassword(password);

  const result = await pool.query(
    `INSERT INTO users (id, tenant_id, email, password_hash, name, status)
     VALUES ($1, $2, $3, $4, $5, 'active')
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
     RETURNING *`,
    [userId, tenantId, email, passwordHash, name]
  );

  return {
    user: result.rows[0],
    password,
    email
  };
}

export async function getTestPool() {
  if (!testPool) {
    await initTestDatabase();
  }
  return testPool;
}

export function hashPasswordForTest(password) {
  return hashPassword(password);
}
