import { invalidRequest } from "../errors/api-error.js";

export function headerValue(headers, name) {
  const wanted = name.toLowerCase();
  for (const [key, value] of Object.entries(headers ?? {})) {
    if (key.toLowerCase() === wanted) {
      return Array.isArray(value) ? value[0] : value;
    }
  }
  return undefined;
}

export function resolveRequestId(headers, fallback) {
  const value = headerValue(headers, "x-request-id");
  if (typeof value === "string" && value.trim() !== "") {
    return value.trim();
  }
  return fallback;
}

export function resolveRequestContext({ headers, config, store, requestId, tenantRequired }) {
  let tenantId = headerValue(headers, "x-tenant-id");
  tenantId = typeof tenantId === "string" && tenantId.trim() !== "" ? tenantId.trim() : null;

  if (!tenantId && tenantRequired && config.mode === "mock") {
    tenantId = config.demoTenantId;
  }

  if (tenantRequired && !tenantId) {
    throw invalidRequest("Tenant id is required.", { error: "INVALID_TENANT" });
  }

  if (tenantId) {
    const tenant = store.getTenant(tenantId);
    if (!tenant || tenant.status !== "active") {
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
