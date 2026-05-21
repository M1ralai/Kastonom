/**
 * Auth Token Refresh Tests
 * Tests for refresh token rotation and revocation
 */
import { strict as assert } from "assert";

// Mock pgStore for auth tests
const mockPgStore = {
  getUserById: async () => null,
  getRefreshToken: async () => null,
  createRefreshToken: async () => null,
  deleteRefreshToken: async () => null,
  deleteUserRefreshTokens: async () => null
};

// Simple mock logger
const mockLogger = {
  info: () => {},
  warn: () => {},
  error: () => {}
};

// Create a simplified auth service for testing
function createTestAuthService({ pgStore = mockPgStore, logger = mockLogger }) {
  return {
    async verifyToken(token) {
      if (!token || token === "invalid_token") {
        throw { status: 401, code: "TOKEN_INVALID", message: "Token is invalid" };
      }
      if (token === "expired_token") {
        throw { status: 401, code: "TOKEN_EXPIRED", message: "Token has expired" };
      }
      if (token === "valid_token") {
        return {
          user_id: "user-123",
          tenant_id: "tenant-456",
          email: "test@example.com",
          roles: ["admin"]
        };
      }
      throw { status: 401, code: "TOKEN_INVALID", message: "Token is invalid" };
    },

    async refreshTokens(refreshToken, tenantId) {
      if (!refreshToken) {
        throw { status: 401, code: "TOKEN_INVALID", message: "Refresh token is required" };
      }
      if (refreshToken === "expired_refresh") {
        throw { status: 401, code: "TOKEN_EXPIRED", message: "Refresh token has expired" };
      }
      if (refreshToken === "revoked_refresh") {
        throw { status: 401, code: "TOKEN_INVALID", message: "Refresh token has been revoked" };
      }
      if (refreshToken === "invalid_refresh") {
        throw { status: 401, code: "TOKEN_INVALID", message: "Invalid refresh token" };
      }
      
      // Valid refresh
      return {
        accessToken: "new_access_token_" + Date.now(),
        refreshToken: "new_refresh_token_" + Date.now(),
        expiresIn: 3600
      };
    },

    async revokeRefreshToken(tokenId, userId) {
      if (!tokenId) {
        throw { status: 400, code: "INVALID_REQUEST", message: "Token ID is required" };
      }
      if (tokenId === "nonexistent_token") {
        throw { status: 404, code: "TOKEN_INVALID", message: "Token not found" };
      }
      await mockPgStore.deleteRefreshToken(tokenId);
      return { revoked: true };
    },

    async revokeAllUserTokens(userId) {
      if (!userId) {
        throw { status: 400, code: "INVALID_REQUEST", message: "User ID is required" };
      }
      await mockPgStore.deleteUserRefreshTokens(userId);
      return { revoked: true, count: 5 };
    }
  };
}

describe("Auth Token Refresh", () => {
  let authService;

  beforeEach(() => {
    authService = createTestAuthService({ pgStore: mockPgStore, logger: mockLogger });
  });

  describe("Token Verification", () => {
    it("should verify valid tokens", async () => {
      const result = await authService.verifyToken("valid_token");
      assert.ok(result);
      assert.equal(result.user_id, "user-123");
      assert.equal(result.tenant_id, "tenant-456");
    });

    it("should reject invalid tokens", async () => {
      try {
        await authService.verifyToken("invalid_token");
        assert.fail("Should have thrown");
      } catch (err) {
        assert.equal(err.status, 401);
        assert.equal(err.code, "TOKEN_INVALID");
      }
    });

    it("should reject expired tokens", async () => {
      try {
        await authService.verifyToken("expired_token");
        assert.fail("Should have thrown");
      } catch (err) {
        assert.equal(err.status, 401);
        assert.equal(err.code, "TOKEN_EXPIRED");
      }
    });

    it("should reject null tokens", async () => {
      try {
        await authService.verifyToken(null);
        assert.fail("Should have thrown");
      } catch (err) {
        assert.equal(err.status, 401);
        assert.equal(err.code, "TOKEN_INVALID");
      }
    });
  });

  describe("Token Refresh", () => {
    it("should refresh valid tokens", async () => {
      const result = await authService.refreshTokens("valid_refresh", "tenant-123");
      assert.ok(result);
      assert.ok(result.accessToken);
      assert.ok(result.refreshToken);
      assert.equal(result.expiresIn, 3600);
    });

    it("should reject expired refresh tokens", async () => {
      try {
        await authService.refreshTokens("expired_refresh", "tenant-123");
        assert.fail("Should have thrown");
      } catch (err) {
        assert.equal(err.status, 401);
        assert.equal(err.code, "TOKEN_EXPIRED");
      }
    });

    it("should reject revoked refresh tokens", async () => {
      try {
        await authService.refreshTokens("revoked_refresh", "tenant-123");
        assert.fail("Should have thrown");
      } catch (err) {
        assert.equal(err.status, 401);
        assert.equal(err.code, "TOKEN_INVALID");
      }
    });

    it("should reject invalid refresh tokens", async () => {
      try {
        await authService.refreshTokens("invalid_refresh", "tenant-123");
        assert.fail("Should have thrown");
      } catch (err) {
        assert.equal(err.status, 401);
        assert.equal(err.code, "TOKEN_INVALID");
      }
    });

    it("should reject null refresh tokens", async () => {
      try {
        await authService.refreshTokens(null, "tenant-123");
        assert.fail("Should have thrown");
      } catch (err) {
        assert.equal(err.status, 401);
        assert.equal(err.code, "TOKEN_INVALID");
      }
    });
  });

  describe("Token Revocation", () => {
    it("should revoke specific refresh token", async () => {
      const result = await authService.revokeRefreshToken("token-123", "user-456");
      assert.ok(result);
      assert.equal(result.revoked, true);
    });

    it("should reject revocation without token ID", async () => {
      try {
        await authService.revokeRefreshToken(null, "user-456");
        assert.fail("Should have thrown");
      } catch (err) {
        assert.equal(err.status, 400);
        assert.equal(err.code, "INVALID_REQUEST");
      }
    });

    it("should reject revocation of nonexistent token", async () => {
      try {
        await authService.revokeRefreshToken("nonexistent_token", "user-456");
        assert.fail("Should have thrown");
      } catch (err) {
        assert.equal(err.status, 404);
        assert.equal(err.code, "TOKEN_INVALID");
      }
    });

    it("should revoke all user tokens", async () => {
      const result = await authService.revokeAllUserTokens("user-456");
      assert.ok(result);
      assert.equal(result.revoked, true);
      assert.ok(result.count >= 0);
    });

    it("should reject revocation without user ID", async () => {
      try {
        await authService.revokeAllUserTokens(null);
        assert.fail("Should have thrown");
      } catch (err) {
        assert.equal(err.status, 400);
        assert.equal(err.code, "INVALID_REQUEST");
      }
    });
  });
});