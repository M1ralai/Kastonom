import { invalidRequest } from "../errors/api-error.js";
import { createHmac } from "node:crypto";
import * as pgStore from "../../db/pg-store.js";

export function headerValue(headers, name) {
  const wanted = name.toLowerCase();
  for (const [key, value] of Object.entries(headers ?? {})) {
    if (key.toLowerCase() === wanted) {
      return Array.isArray(value) ? value[0] : value;
    }
  }
  return undefined;
}

export function resolveRequestId(headers, requestId) {
  const value = headerValue(headers, "x-request-id");
  if (typeof value === "string" && value.trim() !== "") {
    return value.trim();
  }
  return requestId;
}

/**
 * Verify JWT-like token and extract payload
 * For MVP - production should use proper JWT library
 */
function verifyToken(token, secret) {
  try {
    const [header, payload, signature] = token.split(".");
    const expectedSignature = createHmac("sha256", secret)
      .update(`${header}.${payload}`)
      .digest("base64url");

    if (signature !== expectedSignature) {
      return null;
    }

    const payloadObj = JSON.parse(Buffer.from(payload, "base64url").toString());

    // Check expiration
    if (payloadObj.exp && payloadObj.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payloadObj;
  } catch {
    return null;
  }
}

export async function resolveRequestContext({ headers, config, requestId, tenantRequired }) {
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

  if (!tenantId && tenantRequired && config.mode === "mock") {
    tenantId = config.demoTenantId;
  }

  if (tenantRequired && !tenantId) {
    throw invalidRequest("Tenant id is required.", { error: "INVALID_TENANT" });
  }

  if (tenantId) {
    try {
      const tenant = await pgStore.getTenant(tenantId);
      if (!tenant || tenant.status !== "active") {
        throw invalidRequest("Tenant is invalid or disabled.", { error: "INVALID_TENANT" });
      }
    } catch (err) {
      // If PostgreSQL lookup fails (tenant not found), throw error
      throw invalidRequest("Tenant is invalid or disabled.", { error: "INVALID_TENANT" });
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
