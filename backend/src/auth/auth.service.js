/**
 * Auth Service - User authentication and JWT token management
 * PostgreSQL tabanlı - tüm veri DB'de saklanır
 * @module backend/auth
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { createLogger } from "../logger/index.js";
import * as pgStore from "../db/pg-store.js";

const log = createLogger("auth");

// Fixed salt for deterministic password hashing
// This salt is stored in environment variable, NOT generated randomly
// IMPORTANT: Change PASSWORD_SALT in production to a unique value
const PASSWORD_SALT = process.env.PASSWORD_SALT || "kastonom-dev-salt-change-in-production";

/**
 * Create SHA-256 hash of password using fixed salt
 * This ensures the same password always produces the same hash
 */
function hashPassword(password) {
  const hmac = createHmac("sha256", PASSWORD_SALT);
  hmac.update(password);
  return hmac.digest("hex");
}

/**
 * Create auth service
 */
export function createAuthService({ ids, clock, config }) {
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
    async register({ email, password, name, company_name }, requestContext = {}) {
      if (!email || !password) {
        throw { status: 400, body: { error: "INVALID_REQUEST", message: "Email and password required" } };
      }

      log.info("Register attempt", { email, name });

      // Check if email already exists
      const existing = await pgStore.getUserByEmail(email);
      if (existing) {
        log.warn("Registration failed - email exists", { email });
        throw { status: 409, body: { error: "EMAIL_EXISTS", message: "Email already registered" } };
      }

      // Create tenant for this user
      const tenantId = ids.uuid();
      const userId = ids.uuid();
      const passwordHash = hashPassword(password);

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
        id: userId,
        tenant_id: tenantId,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        name: name || email.split("@")[0],
        status: "active",
        created_at: now,
        updated_at: now
      };

      // Save to PostgreSQL
      await pgStore.createTenant({
        id: tenantId,
        name: tenant.name,
        mode: tenant.mode,
        status: tenant.status,
      });
      const createdUser = await pgStore.createUser({
        id: userId,
        tenant_id: tenantId,
        email: user.email,
        password_hash: user.password_hash,
        name: user.name,
        status: user.status,
      });

      // Audit log
      await pgStore.createAuditLog({
        userId: userId,
        tenantId: tenantId,
        action: "user.register",
        entity: "users",
        entityId: userId,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
        afterData: { email: user.email, name: user.name },
      });

      log.info("User registered in PostgreSQL", { userId, tenantId });

      const token = createToken(createdUser);

      return {
        user: {
          id: createdUser.id,
          email: createdUser.email,
          name: createdUser.name,
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
    async login({ email, password }, requestContext = {}) {
      if (!email || !password) {
        throw { status: 400, body: { error: "INVALID_REQUEST", message: "Email and password required" } };
      }

      log.info("Login attempt", { email });

      // Try PostgreSQL
      const user = await pgStore.getUserByEmail(email);

      if (!user || user.status !== "active") {
        log.warn("Login failed - invalid credentials", { email });
        throw { status: 401, body: { error: "INVALID_CREDENTIALS", message: "Invalid email or password" } };
      }

      // Support both old format (salt:hash) and new format (just hash)
      let storedHash = user.password_hash;
      if (storedHash.includes(":")) {
        // Old format: salt:hash
        storedHash = storedHash.split(":")[1];
      }

      const inputHash = hashPassword(password);

      // Timing-safe comparison
      const storedBuf = Buffer.from(storedHash, "hex");
      const inputBuf = Buffer.from(inputHash, "hex");

      if (storedBuf.length !== inputBuf.length || !timingSafeEqual(storedBuf, inputBuf)) {
        log.warn("Login failed - password mismatch", { email });
        throw { status: 401, body: { error: "INVALID_CREDENTIALS", message: "Invalid email or password" } };
      }

      // Audit log
      await pgStore.createAuditLog({
        userId: user.id,
        tenantId: user.tenant_id,
        action: "user.login",
        entity: "users",
        entityId: user.id,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
      });

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
    async getUserById(userId) {
      const user = await pgStore.getUserById(userId);
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
