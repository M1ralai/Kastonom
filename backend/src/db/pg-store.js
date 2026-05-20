/**
 * PostgreSQL Store
 * Veritabanı işlemleri için repository katmanı
 * Audit trail otomatik olarak kaydedilir
 */

import { query, transaction } from "./index.js";
import { createLogger } from "../logger/index.js";

const log = createLogger("pg-store");

// ===========================================
// Audit Trail
// ===========================================

export async function createAuditLog({
  userId,
  tenantId,
  action,
  entity,
  entityId,
  ipAddress,
  userAgent,
  requestId,
  beforeData,
  afterData,
}) {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, tenant_id, action, entity, entity_id, ip_address, user_agent, request_id, before_data, after_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [userId, tenantId, action, entity, entityId, ipAddress, userAgent, requestId, beforeData ? JSON.stringify(beforeData) : null, afterData ? JSON.stringify(afterData) : null],
      { audit: true, action, entity }
    );
  } catch (err) {
    log.error("Failed to create audit log", { error: err.message, action, entity });
  }
}

// ===========================================
// Tenants
// ===========================================

export async function getTenant(id) {
  const result = await query(
    "SELECT * FROM tenants WHERE id = $1",
    [id],
    { table: "tenants", operation: "select" }
  );
  return result.rows[0];
}

export async function getTenantByMode(mode) {
  const result = await query(
    "SELECT * FROM tenants WHERE mode = $1 LIMIT 1",
    [mode],
    { table: "tenants", operation: "select" }
  );
  return result.rows[0];
}

export async function createTenant(data) {
  const result = await query(
    `INSERT INTO tenants (id, name, mode, status) VALUES ($1, $2, $3, $4) RETURNING *`,
    [data.id, data.name, data.mode || "mock", data.status || "active"],
    { table: "tenants", operation: "insert" }
  );
  return result.rows[0];
}

// ===========================================
// Users
// ===========================================

export async function getUserById(id) {
  const result = await query(
    "SELECT id, tenant_id, email, name, status, created_at, updated_at FROM users WHERE id = $1",
    [id],
    { table: "users", operation: "select" }
  );
  return result.rows[0];
}

export async function getUserByEmail(email) {
  const result = await query(
    "SELECT * FROM users WHERE email = $1",
    [email.toLowerCase()],
    { table: "users", operation: "select" }
  );
  return result.rows[0];
}

export async function createUser(data) {
  const result = await query(
    `INSERT INTO users (id, tenant_id, email, password_hash, name, status)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, tenant_id, email, name, status, created_at`,
    [data.id, data.tenant_id, data.email, data.password_hash, data.name, data.status || "active"],
    { table: "users", operation: "insert" }
  );
  return result.rows[0];
}

export async function updateUser(id, data) {
  const fields = [];
  const values = [];
  let idx = 1;

  if (data.name !== undefined) {
    fields.push(`name = $${idx++}`);
    values.push(data.name);
  }
  if (data.password_hash !== undefined) {
    fields.push(`password_hash = $${idx++}`);
    values.push(data.password_hash);
  }
  if (data.status !== undefined) {
    fields.push(`status = $${idx++}`);
    values.push(data.status);
  }

  values.push(id);

  const result = await query(
    `UPDATE users SET ${fields.join(", ")} WHERE id = $${idx} RETURNING id, tenant_id, email, name, status, created_at, updated_at`,
    values,
    { table: "users", operation: "update" }
  );
  return result.rows[0];
}

// ===========================================
// Creative Projects
// ===========================================

export async function getProjectById(id, tenantId) {
  const result = await query(
    "SELECT * FROM creative_projects WHERE id = $1 AND tenant_id = $2",
    [id, tenantId],
    { table: "creative_projects", operation: "select" }
  );
  return result.rows[0];
}

export async function listProjects(tenantId, predicate = {}) {
  let sql = "SELECT * FROM creative_projects WHERE tenant_id = $1";
  const params = [tenantId];

  if (predicate.status) {
    sql += " AND status = $2";
    params.push(predicate.status);
  }

  sql += " ORDER BY created_at DESC";

  const result = await query(sql, params, { table: "creative_projects", operation: "select" });
  return result.rows;
}

export async function createProject(data) {
  const result = await query(
    `INSERT INTO creative_projects (id, tenant_id, name, status)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [data.id, data.tenant_id, data.name, data.status || "draft"],
    { table: "creative_projects", operation: "insert" }
  );
  return result.rows[0];
}

export async function updateProject(id, tenantId, data) {
  const fields = [];
  const values = [];
  let idx = 1;

  if (data.name !== undefined) {
    fields.push(`name = $${idx++}`);
    values.push(data.name);
  }
  if (data.status !== undefined) {
    fields.push(`status = $${idx++}`);
    values.push(data.status);
  }
  if (data.selected_generated_video_id !== undefined) {
    fields.push(`selected_generated_video_id = $${idx++}`);
    values.push(data.selected_generated_video_id);
  }
  if (data.latest_generation_request_id !== undefined) {
    fields.push(`latest_generation_request_id = $${idx++}`);
    values.push(data.latest_generation_request_id);
  }

  values.push(id, tenantId);

  const result = await query(
    `UPDATE creative_projects SET ${fields.join(", ")} WHERE id = $${idx++} AND tenant_id = $${idx} RETURNING *`,
    values,
    { table: "creative_projects", operation: "update" }
  );
  return result.rows[0];
}

// ===========================================
// Creative Subjects
// ===========================================

export async function getSubjectById(id, tenantId) {
  const result = await query(
    "SELECT * FROM creative_subjects WHERE id = $1 AND tenant_id = $2",
    [id, tenantId],
    { table: "creative_subjects", operation: "select" }
  );
  return result.rows[0];
}

export async function listSubjects(tenantId, projectId = null) {
  let sql = "SELECT * FROM creative_subjects WHERE tenant_id = $1";
  const params = [tenantId];

  if (projectId) {
    sql += " AND project_id = $2";
    params.push(projectId);
  }

  sql += " ORDER BY created_at DESC";

  const result = await query(sql, params, { table: "creative_subjects", operation: "select" });
  return result.rows;
}

export async function createSubject(data) {
  const result = await query(
    `INSERT INTO creative_subjects (id, tenant_id, project_id, subject_type, name, description, landing_url, price, currency, allowed_claims, forbidden_claims, unknown_fields, source)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
    [
      data.id, data.tenant_id, data.project_id, data.subject_type, data.name,
      data.description || null, data.landing_url || null, data.price || null,
      data.currency || null, data.allowed_claims || [], data.forbidden_claims || [],
      data.unknown_fields || [], data.source || "unknown"
    ],
    { table: "creative_subjects", operation: "insert" }
  );
  return result.rows[0];
}

// ===========================================
// Source Assets
// ===========================================

export async function getAssetById(id, tenantId) {
  const result = await query(
    "SELECT * FROM source_assets WHERE id = $1 AND tenant_id = $2",
    [id, tenantId],
    { table: "source_assets", operation: "select" }
  );
  return result.rows[0];
}

export async function listAssets(tenantId, projectId = null) {
  let sql = "SELECT * FROM source_assets WHERE tenant_id = $1";
  const params = [tenantId];

  if (projectId) {
    sql += " AND project_id = $2";
    params.push(projectId);
  }

  sql += " ORDER BY created_at DESC";

  const result = await query(sql, params, { table: "source_assets", operation: "select" });
  return result.rows;
}

export async function createAsset(data) {
  const result = await query(
    `INSERT INTO source_assets (id, tenant_id, project_id, asset_type, source, url, storage_key, mime_type, width, height, duration_seconds, checksum, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
    [
      data.id, data.tenant_id, data.project_id, data.asset_type, data.source,
      data.url, data.storage_key || null, data.mime_type || null,
      data.width || null, data.height || null, data.duration_seconds || null,
      data.checksum || null, data.metadata ? JSON.stringify(data.metadata) : null
    ],
    { table: "source_assets", operation: "insert" }
  );
  return result.rows[0];
}

// ===========================================
// Generation Requests
// ===========================================

export async function getGenerationRequestById(id, tenantId) {
  const result = await query(
    "SELECT * FROM generation_requests WHERE id = $1 AND tenant_id = $2",
    [id, tenantId],
    { table: "generation_requests", operation: "select" }
  );
  return result.rows[0];
}

export async function listGenerationRequests(tenantId, projectId = null) {
  let sql = "SELECT * FROM generation_requests WHERE tenant_id = $1";
  const params = [tenantId];

  if (projectId) {
    sql += " AND project_id = $2";
    params.push(projectId);
  }

  sql += " ORDER BY created_at DESC";

  const result = await query(sql, params, { table: "generation_requests", operation: "select" });
  return result.rows;
}

export async function createGenerationRequest(data) {
  const result = await query(
    `INSERT INTO generation_requests (id, tenant_id, project_id, creative_subject_id, status, objective, target_audience, platform, language, tone, style, call_to_action, duration_seconds, aspect_ratio, user_notes, fallback_notes, source_asset_ids)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING *`,
    [
      data.id, data.tenant_id, data.project_id, data.creative_subject_id, data.status || "draft",
      data.objective || "awareness", data.target_audience || null, data.platform || "generic_vertical",
      data.language || "Turkish", data.tone || null, data.style || null, data.call_to_action || null,
      data.duration_seconds || 15, data.aspect_ratio || "9:16", data.user_notes || null,
      data.fallback_notes || [], data.source_asset_ids || []
    ],
    { table: "generation_requests", operation: "insert" }
  );
  return result.rows[0];
}

export async function updateGenerationRequest(id, tenantId, data) {
  const fields = [];
  const values = [];
  let idx = 1;

  const allowedFields = ["status", "objective", "target_audience", "platform", "language", "tone", "style", "call_to_action", "duration_seconds", "aspect_ratio", "user_notes", "fallback_notes"];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      fields.push(`${field} = $${idx++}`);
      values.push(data[field]);
    }
  }

  values.push(id, tenantId);

  const result = await query(
    `UPDATE generation_requests SET ${fields.join(", ")} WHERE id = $${idx++} AND tenant_id = $${idx} RETURNING *`,
    values,
    { table: "generation_requests", operation: "update" }
  );
  return result.rows[0];
}

// ===========================================
// Prompt Payloads
// ===========================================

export async function getPromptPayloadById(id, tenantId) {
  const result = await query(
    "SELECT * FROM prompt_payloads WHERE id = $1 AND tenant_id = $2",
    [id, tenantId],
    { table: "prompt_payloads", operation: "select" }
  );
  return result.rows[0];
}

export async function createPromptPayload(data) {
  const result = await query(
    `INSERT INTO prompt_payloads (id, tenant_id, project_id, generation_request_id, provider, prompt_text, negative_prompt, language, duration_seconds, aspect_ratio, source_asset_ids, provider_options, is_mock, fallback_notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
    [
      data.id, data.tenant_id, data.project_id, data.generation_request_id, data.provider || "mock",
      data.prompt_text, data.negative_prompt || "", data.language || "Turkish",
      data.duration_seconds || 15, data.aspect_ratio || "9:16", data.source_asset_ids || [],
      data.provider_options ? JSON.stringify(data.provider_options) : null,
      data.is_mock !== false, data.fallback_notes || []
    ],
    { table: "prompt_payloads", operation: "insert" }
  );
  return result.rows[0];
}

// ===========================================
// Video Jobs
// ===========================================

export async function getVideoJobById(id, tenantId) {
  const result = await query(
    "SELECT * FROM video_jobs WHERE id = $1 AND tenant_id = $2",
    [id, tenantId],
    { table: "video_jobs", operation: "select" }
  );
  return result.rows[0];
}

export async function listVideoJobs(tenantId, projectId = null) {
  let sql = "SELECT * FROM video_jobs WHERE tenant_id = $1";
  const params = [tenantId];

  if (projectId) {
    sql += " AND project_id = $2";
    params.push(projectId);
  }

  sql += " ORDER BY created_at DESC";

  const result = await query(sql, params, { table: "video_jobs", operation: "select" });
  return result.rows;
}

export async function createVideoJob(data) {
  const result = await query(
    `INSERT INTO video_jobs (id, tenant_id, project_id, generation_request_id, prompt_payload_id, provider, status, provider_job_id, is_mock, fallback_reason, attempt_count)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [
      data.id, data.tenant_id, data.project_id, data.generation_request_id, data.prompt_payload_id,
      data.provider || "mock", data.status || "queued", data.provider_job_id || null,
      data.is_mock !== false, data.fallback_reason || null, data.attempt_count || 0
    ],
    { table: "video_jobs", operation: "insert" }
  );
  return result.rows[0];
}

export async function updateVideoJob(id, tenantId, data) {
  const fields = [];
  const values = [];
  let idx = 1;

  const allowedFields = ["status", "provider_job_id", "fallback_reason", "error_code", "error_message", "attempt_count", "submitted_at", "completed_at"];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      fields.push(`${field} = $${idx++}`);
      values.push(data[field]);
    }
  }

  values.push(id, tenantId);

  const result = await query(
    `UPDATE video_jobs SET ${fields.join(", ")} WHERE id = $${idx++} AND tenant_id = $${idx} RETURNING *`,
    values,
    { table: "video_jobs", operation: "update" }
  );
  return result.rows[0];
}

// ===========================================
// Provider Results
// ===========================================

export async function createProviderResult(data) {
  const result = await query(
    `INSERT INTO provider_results (id, tenant_id, video_job_id, provider, provider_job_id, raw_status, normalized_status, result_urls, error_code, error_message, redacted_metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [
      data.id, data.tenant_id, data.video_job_id, data.provider, data.provider_job_id || null,
      data.raw_status || null, data.normalized_status, data.result_urls || [],
      data.error_code || null, data.error_message || null,
      data.redacted_metadata ? JSON.stringify(data.redacted_metadata) : null
    ],
    { table: "provider_results", operation: "insert" }
  );
  return result.rows[0];
}

// ===========================================
// Generated Videos
// ===========================================

export async function getGeneratedVideoById(id, tenantId) {
  const result = await query(
    "SELECT * FROM generated_videos WHERE id = $1 AND tenant_id = $2",
    [id, tenantId],
    { table: "generated_videos", operation: "select" }
  );
  return result.rows[0];
}

export async function listGeneratedVideos(tenantId, projectId = null) {
  let sql = "SELECT * FROM generated_videos WHERE tenant_id = $1";
  const params = [tenantId];

  if (projectId) {
    sql += " AND project_id = $2";
    params.push(projectId);
  }

  sql += " ORDER BY created_at DESC";

  const result = await query(sql, params, { table: "generated_videos", operation: "select" });
  return result.rows;
}

export async function createGeneratedVideo(data) {
  const result = await query(
    `INSERT INTO generated_videos (id, tenant_id, project_id, generation_request_id, video_job_id, provider_result_id, url, thumbnail_url, duration_seconds, aspect_ratio, status, is_selected, is_mock)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
    [
      data.id, data.tenant_id, data.project_id, data.generation_request_id, data.video_job_id,
      data.provider_result_id || null, data.url, data.thumbnail_url || null,
      data.duration_seconds || null, data.aspect_ratio || "9:16", data.status || "generated",
      data.is_selected || false, data.is_mock !== false
    ],
    { table: "generated_videos", operation: "insert" }
  );
  return result.rows[0];
}

export async function updateGeneratedVideo(id, tenantId, data) {
  const fields = [];
  const values = [];
  let idx = 1;

  if (data.status !== undefined) {
    fields.push(`status = $${idx++}`);
    values.push(data.status);
  }
  if (data.is_selected !== undefined) {
    fields.push(`is_selected = $${idx++}`);
    values.push(data.is_selected);
  }
  if (data.selected_at !== undefined) {
    fields.push(`selected_at = $${idx++}`);
    values.push(data.selected_at);
  }

  values.push(id, tenantId);

  const result = await query(
    `UPDATE generated_videos SET ${fields.join(", ")} WHERE id = $${idx++} AND tenant_id = $${idx} RETURNING *`,
    values,
    { table: "generated_videos", operation: "update" }
  );
  return result.rows[0];
}

export async function deselectAllVideos(projectId, tenantId) {
  await query(
    "UPDATE generated_videos SET is_selected = false WHERE project_id = $1 AND tenant_id = $2",
    [projectId, tenantId],
    { table: "generated_videos", operation: "update" }
  );
}

// ===========================================
// Ad Publications
// ===========================================

export async function getAdPublicationById(id, tenantId) {
  const result = await query(
    "SELECT * FROM ad_publications WHERE id = $1 AND tenant_id = $2",
    [id, tenantId],
    { table: "ad_publications", operation: "select" }
  );
  return result.rows[0];
}

export async function listAdPublications(tenantId, projectId = null) {
  let sql = "SELECT * FROM ad_publications WHERE tenant_id = $1";
  const params = [tenantId];

  if (projectId) {
    sql += " AND project_id = $2";
    params.push(projectId);
  }

  sql += " ORDER BY created_at DESC";

  const result = await query(sql, params, { table: "ad_publications", operation: "select" });
  return result.rows;
}

export async function createAdPublication(data) {
  const result = await query(
    `INSERT INTO ad_publications (id, tenant_id, project_id, generated_video_id, ad_platform_connection_id, platform, status, external_campaign_id, external_ad_group_id, external_ad_id, destination_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [
      data.id, data.tenant_id, data.project_id, data.generated_video_id,
      data.ad_platform_connection_id || null, data.platform, data.status || "draft",
      data.external_campaign_id || null, data.external_ad_group_id || null,
      data.external_ad_id || null, data.destination_url || null
    ],
    { table: "ad_publications", operation: "insert" }
  );
  return result.rows[0];
}

export async function updateAdPublication(id, tenantId, data) {
  const fields = [];
  const values = [];
  let idx = 1;

  const allowedFields = ["status", "external_campaign_id", "external_ad_group_id", "external_ad_id", "destination_url", "published_at", "paused_at", "error_code", "error_message"];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      fields.push(`${field} = $${idx++}`);
      values.push(data[field]);
    }
  }

  values.push(id, tenantId);

  const result = await query(
    `UPDATE ad_publications SET ${fields.join(", ")} WHERE id = $${idx++} AND tenant_id = $${idx} RETURNING *`,
    values,
    { table: "ad_publications", operation: "update" }
  );
  return result.rows[0];
}

// ===========================================
// Ad Metrics Snapshots
// ===========================================

export async function createMetricsSnapshot(data) {
  const result = await query(
    `INSERT INTO ad_metrics_snapshots (id, tenant_id, ad_publication_id, platform, date_start, date_end, impressions, clicks, spend, currency, ctr, cpc, conversions, conversion_value, roas, video_views, video_view_rate, cost_per_video_view, source, redacted_metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20) RETURNING *`,
    [
      data.id, data.tenant_id, data.ad_publication_id, data.platform, data.date_start, data.date_end,
      data.impressions || null, data.clicks || null, data.spend || null, data.currency || null,
      data.ctr || null, data.cpc || null, data.conversions || null, data.conversion_value || null,
      data.roas || null, data.video_views || null, data.video_view_rate || null,
      data.cost_per_video_view || null, data.source || "unknown",
      data.redacted_metadata ? JSON.stringify(data.redacted_metadata) : null
    ],
    { table: "ad_metrics_snapshots", operation: "insert" }
  );
  return result.rows[0];
}

// ===========================================
// Creative Iteration Suggestions
// ===========================================

export async function createIterationSuggestion(data) {
  const result = await query(
    `INSERT INTO creative_iteration_suggestions (id, tenant_id, project_id, ad_publication_id, suggestion_type, current_value, suggested_value, reason, priority, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [
      data.id, data.tenant_id, data.project_id, data.ad_publication_id || null,
      data.suggestion_type, data.current_value || null, data.suggested_value || null,
      data.reason || null, data.priority || "medium", data.status || "pending"
    ],
    { table: "creative_iteration_suggestions", operation: "insert" }
  );
  return result.rows[0];
}

export default {
  // Audit
  createAuditLog,

  // Tenants
  getTenant,
  getTenantByMode,
  createTenant,

  // Users
  getUserById,
  getUserByEmail,
  createUser,
  updateUser,

  // Projects
  getProjectById,
  listProjects,
  createProject,
  updateProject,

  // Subjects
  getSubjectById,
  listSubjects,
  createSubject,

  // Assets
  getAssetById,
  listAssets,
  createAsset,

  // Generation Requests
  getGenerationRequestById,
  listGenerationRequests,
  createGenerationRequest,
  updateGenerationRequest,

  // Prompt Payloads
  getPromptPayloadById,
  createPromptPayload,

  // Video Jobs
  getVideoJobById,
  listVideoJobs,
  createVideoJob,
  updateVideoJob,

  // Provider Results
  createProviderResult,

  // Generated Videos
  getGeneratedVideoById,
  listGeneratedVideos,
  createGeneratedVideo,
  updateGeneratedVideo,
  deselectAllVideos,

  // Ad Publications
  getAdPublicationById,
  listAdPublications,
  createAdPublication,
  updateAdPublication,

  // Metrics
  createMetricsSnapshot,

  // Iteration Suggestions
  createIterationSuggestion,
};
