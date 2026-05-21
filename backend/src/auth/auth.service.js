/**
 * Auth Service - User authentication and JWT token management
 * PostgreSQL tabanlı - tüm veri DB'de saklanır
 * Production-ready with bcrypt and token refresh
 * @module backend/auth
 */

import { createHmac, timingSafeEqual, randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { createLogger } from "../logger/index.js";
import * as pgStore from "../db/pg-store.js";

const log = createLogger("auth");

// Token expiry settings from env
const JWT_EXPIRY_SECONDS = parseInt(process.env.KASTONOM_JWT_EXPIRY_SECONDS || "900", 10); // 15 minutes default
const REFRESH_TOKEN_EXPIRY_DAYS = parseInt(process.env.KASTONOM_REFRESH_TOKEN_EXPIRY_DAYS || "7", 10);
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10);

// Fixed salt for legacy password hashing (for migration only)
const LEGACY_PASSWORD_SALT = process.env.PASSWORD_SALT || "kastonom-dev-salt-change-in-production";

/**
 * Hash password using bcrypt (production)
 */
async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Verify password against bcrypt hash
 */
async function verifyPassword(password, storedHash) {
  if (storedHash.startsWith("$2")) {
    return bcrypt.compare(password, storedHash);
  }

  // Legacy HMAC-SHA256 format
  const hmac = createHmac("sha256", LEGACY_PASSWORD_SALT);
  hmac.update(password);
  const inputHash = hmac.digest("hex");

  let storedHashValue = storedHash;
  if (storedHash.includes(":")) {
    storedHashValue = storedHash.split(":")[1];
  }

  try {
    const storedBuf = Buffer.from(storedHashValue, "hex");
    const inputBuf = Buffer.from(inputHash, "hex");

    if (storedBuf.length !== inputBuf.length || !timingSafeEqual(storedBuf, inputBuf)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Create refresh token and store in DB
 */
async function createRefreshToken(ids, jwtSecret, userId, ipAddress, userAgent) {
  const token = randomBytes(64).toString("hex");
  const tokenHash = createHmac("sha256", jwtSecret)
    .update(token)
    .digest("hex");
  const family = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  const tokenId = randomUUID();  // Generate UUID for refresh token

  await pgStore.createRefreshToken({
    id: tokenId,
    user_id: userId,
    token_hash: tokenHash,
    family,
    expires_at: expiresAt,
    ip_address: ipAddress,
    user_agent: userAgent
  });

  return {
    token,
    expires_at: expiresAt
  };
}

/**
 * Create auth service
 */
export function createAuthService({ ids, clock, config }) {
  const jwtSecret = config.jwtSecret || process.env.JWT_SECRET || "dev-secret-change-in-production";

  function createToken(user) {
    const payload = {
      sub: user.id,
      tenant_id: user.tenant_id,
      email: user.email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };

    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = createHmac("sha256", jwtSecret)
      .update(`${header}.${payloadBase64}`)
      .digest("base64url");

    return `${header}.${payloadBase64}.${signature}`;
  }

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

      if (payloadObj.exp && payloadObj.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return payloadObj;
    } catch {
      return null;
    }
  }

  return {
    async register({ email, password, name, company_name }, requestContext = {}) {
      if (!email || !password) {
        throw { status: 400, body: { error: "INVALID_REQUEST", message: "Email and password required" } };
      }

      log.info("Register attempt", { email, name });

      const existing = await pgStore.getUserByEmail(email);
      if (existing) {
        log.warn("Registration failed - email exists", { email });
        throw { status: 409, body: { error: "EMAIL_EXISTS", message: "Email already registered" } };
      }

      const tenantId = ids.uuid();
      const userId = ids.uuid();
      const passwordHash = await hashPassword(password);

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

    async login({ email, password }, requestContext = {}) {
      if (!email || !password) {
        throw { status: 400, body: { error: "INVALID_REQUEST", message: "Email and password required" } };
      }

      log.info("Login attempt", { email });

      const user = await pgStore.getUserByEmail(email);

      if (!user || user.status !== "active") {
        log.warn("Login failed - invalid credentials", { email });
        throw { status: 401, body: { error: "INVALID_CREDENTIALS", message: "Invalid email or password" } };
      }

      const isValid = await verifyPassword(password, user.password_hash);

      if (!isValid) {
        log.warn("Login failed - password mismatch", { email });
        throw { status: 401, body: { error: "INVALID_CREDENTIALS", message: "Invalid email or password" } };
      }

      const accessToken = createToken(user);
      const refreshToken = await createRefreshToken(
        ids,
        jwtSecret,
        user.id,
        requestContext.ipAddress,
        requestContext.userAgent
      );

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

      log.info("Login successful", { userId: user.id });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          tenant_id: user.tenant_id
        },
        access_token: accessToken,
        refresh_token: refreshToken.token,
        expires_in: JWT_EXPIRY_SECONDS
      };
    },

    async refreshToken({ refresh_token }, requestContext = {}) {
      if (!refresh_token) {
        throw { status: 400, body: { error: "INVALID_REQUEST", message: "Refresh token required" } };
      }

      const tokenRecord = await pgStore.getRefreshToken(refresh_token);
      
      if (!tokenRecord) {
        log.warn("Refresh token not found");
        throw { status: 401, body: { error: "TOKEN_INVALID", message: "Invalid refresh token" } };
      }

      if (tokenRecord.revoked_at) {
        log.warn("Revoked refresh token used, revoking family", { 
          family: tokenRecord.family 
        });
        await pgStore.revokeRefreshTokenFamily(tokenRecord.family);
        throw { status: 401, body: { error: "TOKEN_INVALID", message: "Token has been revoked" } };
      }

      if (new Date(tokenRecord.expires_at) < new Date()) {
        log.warn("Expired refresh token used");
        throw { status: 401, body: { error: "TOKEN_EXPIRED", message: "Refresh token has expired" } };
      }

      const user = await pgStore.getUserById(tokenRecord.user_id);
      if (!user || user.status !== "active") {
        throw { status: 401, body: { error: "UNAUTHORIZED", message: "User not found or inactive" } };
      }

      await pgStore.revokeRefreshToken(refresh_token);
      const newRefreshToken = await createRefreshToken(
        ids,
        jwtSecret,
        user.id,
        requestContext.ipAddress,
        requestContext.userAgent
      );

      await pgStore.createAuditLog({
        userId: user.id,
        tenantId: user.tenant_id,
        action: "user.token_refresh",
        entity: "users",
        entityId: user.id,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          tenant_id: user.tenant_id
        },
        access_token: createToken(user),
        refresh_token: newRefreshToken.token,
        expires_in: JWT_EXPIRY_SECONDS
      };
    },

    async logout({ user_id }, requestContext = {}) {
      if (!user_id) {
        throw { status: 400, body: { error: "INVALID_REQUEST", message: "User ID required" } };
      }

      await pgStore.revokeAllUserRefreshTokens(user_id);

      await pgStore.createAuditLog({
        userId: user_id,
        tenantId: null,
        action: "user.logout",
        entity: "users",
        entityId: user_id,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: requestContext.requestId,
      });

      return { success: true };
    },

    verifyToken,

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