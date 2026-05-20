/**
 * MCP Core Types - Tenant Context and Enums
 * @module mcp/types/tenant
 * @file MCP-001: Core Types, Tenant Context, and Data Transfer Objects
 * @description Strict TypeScript types for tenant isolation and mode management.
 *            Every MCP operation reads tenant_id from context, never global state.
 */
import { TenantMode, TenantStatus } from "./enums.js";
/**
 * TenantContext interface
 * @description Represents the isolated tenant scope for all MCP operations.
 *            All tenant-scoped entities must include tenant_id.
 */
export interface TenantContext {
    tenant_id: string;
    mode: TenantMode;
    status: TenantStatus;
    created_at: string;
    updated_at: string;
}
/**
 * CreateTenantContext options
 */
export interface CreateTenantContextOptions {
    tenantId: string;
    mode: TenantMode;
    status: TenantStatus;
}
/**
 * Create a new TenantContext with validation
 * @param options - Tenant creation options
 * @returns Validated TenantContext
 * @throws Error if validation fails
 */
export declare function createTenantContext(options: CreateTenantContextOptions): TenantContext;
/**
 * Validate TenantContext shape
 * @param context - Potential TenantContext
 * @returns true if valid
 */
export declare function isTenantContext(context: unknown): context is TenantContext;
/**
 * Check if tenant is in demo mode
 * @param context - TenantContext
 * @returns true if mode is 'demo'
 */
export declare function isDemoTenant(context: TenantContext): boolean;
/**
 * Check if tenant is active
 * @param context - TenantContext
 * @returns true if status is 'active'
 */
export declare function isActiveTenant(context: TenantContext): boolean;
/**
 * Check if live mode is enabled for tenant
 * @param context - TenantContext
 * @returns true if mode is 'live' and status is 'active'
 */
export declare function isLiveTenant(context: TenantContext): boolean;
/**
 * Clone TenantContext safely (immutable copy)
 * @param context - TenantContext to clone
 * @returns New TenantContext instance
 */
export declare function cloneTenantContext(context: TenantContext): TenantContext;
/**
 * Get demo tenant context for fallback scenarios
 * @returns Pre-configured demo TenantContext
 */
export declare function getDemoTenantContext(): TenantContext;
//# sourceMappingURL=tenant.d.ts.map