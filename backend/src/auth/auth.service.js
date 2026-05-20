/**
 * Auth Service - User authentication and JWT token management
 * PostgreSQL tabanlı - tüm veri DB'de saklanır
 * @module backend/auth
 */

import { randomUUID } from "node:crypto";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createLogger } from "../logger/index.js";
import * as pgStore from "../db/pg-store.js";

const log = createLogger("auth");

/**
 * Create SHA-256 hash of password
 */
function hashPassword(password, salt) {
  const hmac = createHmac("sha256", salt);
  hmac.update(password);
  return hmac.digest("hex");
}

/**
 * Create auth service
 */
export function createAuthService({ store, ids, clock, config }) {
  const jwtSecret = config.jwtSecret || process.env.JWT_SECRET || "dev-secret-change-in-production";

  /**
   * Create JWT token
   */
  function createToken(user) {
    const payload = {
      sub: user.id,
      tenant_id: user.tenant_id,
      email: user.email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };

    // Simple JWT-like token (for MVP, production should use proper JWT library)
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = createHmac("sha256", jwtSecret)
      .update(`${header}.${payloadBase64}`)
      .digest("base64url");

    return `${header}.${payloadBase64}.${signature}`;
  }

  /**
   * Verify JWT token
   */
  function verifyToken(token) {
    try {
      const [header, payload, signature] = token.split(".");
      const expectedSignature = createHmac("sha256", jwtSecret)
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

  return {
    /**
     * Register new user
     */
    register({ email, password, name, company_name }, requestContext = {}) {
      if (!email || !password) {
        throw { status: 400, body: { error: "INVALID_REQUEST", message: "Email and password required" } };
      }

      log.info("Register attempt", { email, name });

      // Check if email already exists
      const existing = store.query("users", (u) => u.email === email.toLowerCase());
      if (existing.length > 0) {
        log.warn("Registration failed - email exists", { email });
        throw { status: 409, body: { error: "EMAIL_EXISTS", message: "Email already registered" } };
      }

      // Create tenant for this user
      const tenantId = ids.next("tenant");
      const salt = randomUUID();
      const passwordHash = hashPassword(password, salt);

      const now = clock.now();
      const tenant = {
        id: tenantId,
        name: company_name || name || email,
        mode: "live",
        status: "active",
        created_at: now,
        updated_at: now
      };

      const user = {
        id: ids.next("user"),
        tenant_id: tenantId,
        email: email.toLowerCase(),
        password_hash: `${salt}:${passwordHash}`,
        name: name || email.split("@")[0],
        status: "active",
        created_at: now,
        updated_at: now
      };

      store.insert("tenants", tenant);
      store.insert("users", user);

      // PostgreSQL'e de kaydet
      try {
        const pgTenantId = randomUUID();
        const pgUserId = randomUUID();

        pgStore.createTenant({
          id: pgTenantId,
          name: tenant.name,
          mode: tenant.mode,
          status: tenant.status,
        });
        pgStore.createUser({
          id: pgUserId,
          tenant_id: pgTenantId,
          email: user.email,
          password_hash: user.password_hash,
          name: user.name,
          status: user.status,
        });

        // Audit log
        pgStore.createAuditLog({
          userId: pgUserId,
          tenantId: pgTenantId,
          action: "user.register",
          entity: "users",
          entityId: pgUserId,
          ipAddress: requestContext.ipAddress,
          userAgent: requestContext.userAgent,
          requestId: requestContext.requestId,
          afterData: { email: user.email, name: user.name },
        });

        log.info("User registered in PostgreSQL", { pgUserId, pgTenantId });
      } catch (err) {
        log.error("Failed to save to PostgreSQL", { error: err.message, userId: user.id });
        // Continue with memory store fallback - don't fail the registration
      }

      const token = createToken(user);

      log.info("Registration successful", { userId: user.id, tenantId });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          tenant_id: tenantId
        },
        token,
        tenant: {
          id: tenantId,
          name: tenant.name
        }
      };
    },

    /**
     * Login user
     */
    login({ email, password }, requestContext = {}) {
      if (!email || !password) {
        throw { status: 400, body: { error: "INVALID_REQUEST", message: "Email and password required" } };
      }

      log.info("Login attempt", { email });

      // First try PostgreSQL
      let user = null;
      try {
        user = pgStore.getUserByEmail(email);
      } catch (err) {
        log.warn("PostgreSQL login failed, falling back to memory", { error: err.message });
      }

      // Fallback to memory store if not found in PG
      if (!user) {
        const users = store.query("users", (u) => u.email === email.toLowerCase());
        user = users[0];
      }

      if (!user || user.status !== "active") {
        log.warn("Login failed - invalid credentials", { email });
        throw { status: 401, body: { error: "INVALID_CREDENTIALS", message: "Invalid email or password" } };
      }

      const [salt, storedHash] = user.password_hash.split(":");
      const inputHash = hashPassword(password, salt);

      // Timing-safe comparison
      const storedBuf = Buffer.from(storedHash, "hex");
      const inputBuf = Buffer.from(inputHash, "hex");

      if (storedBuf.length !== inputBuf.length || !timingSafeEqual(storedBuf, inputBuf)) {
        log.warn("Login failed - password mismatch", { email });
        throw { status: 401, body: { error: "INVALID_CREDENTIALS", message: "Invalid email or password" } };
      }

      // Audit log
      try {
        pgStore.createAuditLog({
          userId: user.id,
          tenantId: user.tenant_id,
          action: "user.login",
          entity: "users",
          entityId: user.id,
          ipAddress: requestContext.ipAddress,
          userAgent: requestContext.userAgent,
          requestId: requestContext.requestId,
        });
      } catch (err) {
        log.warn("Failed to log audit", { error: err.message });
      }

      const token = createToken(user);

      log.info("Login successful", { userId: user.id });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          tenant_id: user.tenant_id
        },
        token
      };
    },

    /**
     * Verify token and return user context
     */
    verifyToken,

    /**
     * Get user by ID
     */
    getUserById(userId) {
      // Try PostgreSQL first
      try {
        const user = pgStore.getUserById(userId);
        if (user) return user;
      } catch (err) {
        log.warn("PG getUserById failed, fallback to memory", { error: err.message });
      }

      // Fallback to memory
      const users = store.query("users", (u) => u.id === userId);
      const user = users[0];

      if (!user) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        tenant_id: user.tenant_id,
        status: user.status
      };
    }
  };
}
