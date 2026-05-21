import { invalidRequest, unauthorized, forbidden } from "../errors/api-error.js";
import { ErrorCodes } from "../errors/error-codes.js";
import { createHmac } from "node:crypto";
import * as pgStore from "../../db/pg-store.js";
import { createLogger } from "../../logger/index.js";

const log = createLogger("request-context");

// ─── Header Helpers ───────────────────────────────────────────────

/**
 * Get header value (case-insensitive)
 * @param {Object} headers - Headers object
 * @param {string} name - Header name
 * @returns {string|undefined}
 */
export function headerValue(headers, name) {
  const wanted = name.toLowerCase();
  for (const [key, value] of Object.entries(headers ?? {})) {
    if (key.toLowerCase() === wanted) {
      return Array.isArray(value) ? value[0] : value;
    }
  }
  return undefined;
}

/**
 * Resolve request ID from headers or generate new one
 * @param {Object} headers - Request headers
 * @param {string} requestId - Fallback request ID
 * @returns {string} Request ID
 */
export function resolveRequestId(headers, requestId) {
  const value = headerValue(headers, "x-request-id");
  if (typeof value === "string" && value.trim() !== "") {
    return value.trim();
  }
  return requestId;
}

// ─── Security Headers ─────────────────────────────────────────────

/**
 * Security headers for all responses
 */
export const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Content-Security-Policy": "default-src 'self'"
};

/**
 * Get security headers for response
 * @returns {Object} Security headers
 */
export function getSecurityHeaders() {
  return { ...SECURITY_HEADERS };
}

// ─── JWT Token Verification ─────────────────────────────────────────

/**
 * Verify JWT-like token and extract payload
 * Note: For MVP - production should use proper JWT library (jsonwebtoken)
 * @param {string} token - JWT token
 * @param {string} secret - Secret key
 * @returns {Object|null} Token payload or null if invalid
 */
export function verifyToken(token, secret) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const [header, payload, signature] = parts;
    const expectedSignature = createHmac("sha256", secret)
      .update(`${header}.${payload}`)
      .digest("base64url");

    if (signature !== expectedSignature) {
      log.warn("Invalid token signature", { reason: "signature_mismatch" });
      return null;
    }

    const payloadObj = JSON.parse(Buffer.from(payload, "base64url").toString());

    // Check expiration
    if (payloadObj.exp && payloadObj.exp < Math.floor(Date.now() / 1000)) {
      log.warn("Token expired", { exp: payloadObj.exp });
      return null;
    }

    return payloadObj;
  } catch (error) {
    log.warn("Token verification failed", { error: error.message });
    return null;
  }
}

// ─── Tenant Context Resolution ────────────────────────────────────

/**
 * Resolve tenant context from request headers
 * @param {Object} options - Options object
 * @param {Object} options.headers - Request headers
 * @param {Object} options.config - Application config
 * @param {string} options.requestId - Request ID for logging
 * @param {boolean} options.tenantRequired - Whether tenant is required
 * @returns {Promise<Object>} Request context
 */
export async function resolveRequestContext({
  headers,
  config,
  requestId,
  tenantRequired
}) {
  log.debug("resolveRequestContext", { 
    configMode: config.mode,
    configDemoTenantId: config.demoTenantId,
    tenantRequired 
  });

  let tenantId = headerValue(headers, "x-tenant-id");
  tenantId = typeof tenantId === "string" && tenantId.trim() !== "" ? tenantId.trim() : null;

  // If no x-tenant-id header, check Authorization header for Bearer token
  if (!tenantId) {
    const auth = headerValue(headers, "authorization") || headerValue(headers, "Authorization");
    if (auth && (auth.startsWith("Bearer ") || auth.startsWith("bearer "))) {
      const token = auth.slice(7);
      const secret = config.jwtSecret || process.env.JWT_SECRET || "dev-secret-change-in-production";
      const payload = verifyToken(token, secret);
      if (payload && payload.tenant_id) {
        tenantId = payload.tenant_id;
      }
    }
  }

  if (!tenantId && tenantRequired && config.mode === "mock" && config.demoTenantId) {
    tenantId = config.demoTenantId;
    log.debug("Using configured demo tenant for mock mode request", { tenantId });
  }

  // Validate tenant requirement - tenant_id must be provided via x-tenant-id header or Bearer token
  if (tenantRequired && !tenantId) {
    throw invalidRequest("Tenant id is required. Provide x-tenant-id header or Authorization Bearer token with tenant_id.", {
      error: ErrorCodes.INVALID_TENANT
    });
  }

  // Validate tenant status if tenant ID is present
  if (tenantId) {
    try {
      const tenant = await pgStore.getTenant(tenantId);
      if (!tenant) {
        throw forbidden("Tenant not found.", {
          error: ErrorCodes.INVALID_TENANT
        });
      }
      if (tenant.status !== "active") {
        throw forbidden("Tenant is disabled.", {
          error: ErrorCodes.INVALID_TENANT
        });
      }
    } catch (error) {
      // Re-throw known errors
      if (error.status) {
        throw error;
      }
      log.error("Tenant lookup failed", {
        tenantId,
        error: error.message
      });
      throw forbidden("Tenant validation failed.", {
        error: ErrorCodes.INVALID_TENANT
      });
    }
  }

  return {
    request_id: requestId,
    tenant_id: tenantId,
    mode: config.mode,
    fallback_enabled: config.fallbackEnabled,
    is_demo_tenant: tenantId === config.demoTenantId
  };
}

// ─── Request Context Helper ────────────────────────────────────────

/**
 * Create request context with logger
 * @param {Object} options - Options
 * @returns {Object} Context with logger
 */
export function createRequestContext(options) {
  const { headers, config, tenantRequired = true } = options;
  const requestId = resolveRequestId(headers, `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  return {
    requestId,
    headers,
    config,
    tenantRequired,
    resolveContext: () => resolveRequestContext({
      headers,
      config,
      requestId,
      tenantRequired
    })
  };
}
