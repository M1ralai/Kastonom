/**
 * MCP Core Types - Tenant Context and Enums
 * @module mcp/types/tenant
 * @file MCP-001: Core Types, Tenant Context, and Data Transfer Objects
 * @description Strict TypeScript types for tenant isolation and mode management.
 *            Every MCP operation reads tenant_id from context, never global state.
 */
import { isValidTenantMode, isValidTenantStatus } from "./enums.js";
/**
 * Create a new TenantContext with validation
 * @param options - Tenant creation options
 * @returns Validated TenantContext
 * @throws Error if validation fails
 */
export function createTenantContext(options) {
    const { tenantId, mode, status } = options;
    if (!tenantId || typeof tenantId !== "string" || tenantId.trim() === "") {
        throw new Error("tenant_id is required and must be a non-empty string");
    }
    if (!isValidTenantMode(mode)) {
        throw new Error(`Invalid tenant mode: ${mode}. Must be 'demo' or 'live'`);
    }
    if (!isValidTenantStatus(status)) {
        throw new Error(`Invalid tenant status: ${status}. Must be 'active' or 'disabled'`);
    }
    const now = new Date().toISOString();
    return {
        tenant_id: tenantId.trim(),
        mode,
        status,
        created_at: now,
        updated_at: now
    };
}
/**
 * Validate TenantContext shape
 * @param context - Potential TenantContext
 * @returns true if valid
 */
export function isTenantContext(context) {
    if (!context || typeof context !== "object") {
        return false;
    }
    const ctx = context;
    return (typeof ctx.tenant_id === "string" &&
        ctx.tenant_id.trim() !== "" &&
        isValidTenantMode(ctx.mode) &&
        isValidTenantStatus(ctx.status) &&
        typeof ctx.created_at === "string" &&
        typeof ctx.updated_at === "string");
}
/**
 * Check if tenant is in demo mode
 * @param context - TenantContext
 * @returns true if mode is 'demo'
 */
export function isDemoTenant(context) {
    return context.mode === "demo";
}
/**
 * Check if tenant is active
 * @param context - TenantContext
 * @returns true if status is 'active'
 */
export function isActiveTenant(context) {
    return context.status === "active";
}
/**
 * Check if live mode is enabled for tenant
 * @param context - TenantContext
 * @returns true if mode is 'live' and status is 'active'
 */
export function isLiveTenant(context) {
    return context.mode === "live" && context.status === "active";
}
/**
 * Clone TenantContext safely (immutable copy)
 * @param context - TenantContext to clone
 * @returns New TenantContext instance
 */
export function cloneTenantContext(context) {
    return {
        tenant_id: context.tenant_id,
        mode: context.mode,
        status: context.status,
        created_at: context.created_at,
        updated_at: new Date().toISOString()
    };
}
/**
 * Get demo tenant context for fallback scenarios
 * @returns Pre-configured demo TenantContext
 */
export function getDemoTenantContext() {
    const now = new Date().toISOString();
    return {
        tenant_id: "demo-tenant",
        mode: "demo",
        status: "active",
        created_at: now,
        updated_at: now
    };
}
//# sourceMappingURL=tenant.js.map