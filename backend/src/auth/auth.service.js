/**
 * Auth Service - User authentication and JWT token management
 * @module backend/auth
 */

import { randomUUID } from "node:crypto";
import { createHmac, timingSafeEqual } from "node:crypto";

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
  const jwtExpiresIn = config.jwtExpiresIn || "24h";

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
    register({ email, password, name, company_name }) {
      if (!email || !password) {
        throw { status: 400, body: { error: "INVALID_REQUEST", message: "Email and password required" } };
      }

      // Check if email already exists
      const existing = store.query("users", (u) => u.email === email.toLowerCase());
      if (existing.length > 0) {
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

      const token = createToken(user);

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
    login({ email, password }) {
      if (!email || !password) {
        throw { status: 400, body: { error: "INVALID_REQUEST", message: "Email and password required" } };
      }

      const users = store.query("users", (u) => u.email === email.toLowerCase());
      const user = users[0];

      if (!user || user.status !== "active") {
        throw { status: 401, body: { error: "INVALID_CREDENTIALS", message: "Invalid email or password" } };
      }

      const [salt, storedHash] = user.password_hash.split(":");
      const inputHash = hashPassword(password, salt);

      // Timing-safe comparison
      const storedBuf = Buffer.from(storedHash, "hex");
      const inputBuf = Buffer.from(inputHash, "hex");

      if (storedBuf.length !== inputBuf.length || !timingSafeEqual(storedBuf, inputBuf)) {
        throw { status: 401, body: { error: "INVALID_CREDENTIALS", message: "Invalid email or password" } };
      }

      const token = createToken(user);

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
