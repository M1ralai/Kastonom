/**
 * Security Middleware Tests
 * Tests for rate limiting, security headers, and CORS
 */
import { strict as assert } from "assert";
import {
  createRateLimitStore,
  createRateLimitMiddleware,
  createSecureHeadersMiddleware,
  createBodyLimitMiddleware,
  createCorsMiddleware
} from "../src/http/middleware/security.js";

describe("Security Middleware", () => {
  describe("Rate Limit Store", () => {
    it("should allow requests within limit", () => {
      const store = createRateLimitStore();
      const result = store.check("192.168.1.1", 5, 60000);
      
      assert.equal(result.allowed, true);
      assert.equal(result.remaining, 4);
    });

    it("should block requests exceeding rate limit", () => {
      const store = createRateLimitStore();
      
      // Make 5 requests (max is 5)
      for (let i = 0; i < 5; i++) {
        store.check("192.168.1.1", 5, 60000);
      }
      
      // 6th request should be blocked
      const result = store.check("192.168.1.1", 5, 60000);
      assert.equal(result.allowed, false);
      assert.equal(result.remaining, 0);
    });

    it("should track different IPs separately", () => {
      const store = createRateLimitStore();
      
      // Make 3 requests from IP 1
      for (let i = 0; i < 3; i++) {
        store.check("192.168.1.1", 5, 60000);
      }
      
      // Make 5 requests from IP 2
      for (let i = 0; i < 5; i++) {
        store.check("192.168.1.2", 5, 60000);
      }
      
      // IP 1 should still have room
      const result = store.check("192.168.1.1", 5, 60000);
      assert.equal(result.allowed, true);
      assert.equal(result.remaining > 0, true);
    });

    it("should cleanup expired entries", () => {
      const store = createRateLimitStore();
      
      store.check("192.168.1.1", 5, 60000);
      store.check("192.168.1.2", 5, 60000);
      
      assert.equal(store.size(), 2);
      
      // Cleanup with window that expires everything
      store.cleanup(0);
      
      assert.equal(store.size(), 0);
    });
  });

  describe("Rate Limit Middleware", () => {
    it("should return null for valid requests", async () => {
      const middleware = createRateLimitMiddleware({ maxRequests: 100, windowMs: 60000 });
      const context = {};
      const request = { 
        ip: () => "192.168.1.1", 
        headers: {},
        method: "GET"
      };
      
      const result = await middleware(context, request);
      assert.equal(result, null);
      assert.ok(context.rateLimit);
      assert.equal(context.rateLimit.remaining > 0, true);
    });

    it("should set rate limit headers in context", async () => {
      const middleware = createRateLimitMiddleware({ maxRequests: 100, windowMs: 60000 });
      const context = {};
      const request = { ip: () => "192.168.1.1", headers: {}, method: "GET" };
      
      await middleware(context, request);
      
      assert.equal(context.rateLimit.limit, 100);
      assert.ok(context.rateLimit.remaining >= 0);
      assert.ok(context.rateLimit.resetMs > 0);
    });
  });

  describe("Secure Headers Middleware", () => {
    it("should set security headers in context", async () => {
      const middleware = createSecureHeadersMiddleware();
      const context = {};
      const request = { headers: {} };
      
      await middleware(context, request);
      
      assert.ok(context.securityHeaders);
      assert.equal(context.securityHeaders["X-Content-Type-Options"], "nosniff");
      assert.equal(context.securityHeaders["X-Frame-Options"], "DENY");
      assert.ok(context.securityHeaders["Content-Security-Policy"]);
      assert.ok(context.securityHeaders["Strict-Transport-Security"]);
    });
  });

  describe("Body Limit Middleware", () => {
    it("should allow small bodies", async () => {
      const middleware = createBodyLimitMiddleware(1024 * 1024); // 1MB
      const context = {};
      const request = { 
        headers: { "content-length": "500" },
        method: "POST"
      };
      
      const result = await middleware(context, request);
      assert.equal(result, null);
    });

    it("should block oversized bodies", async () => {
      const middleware = createBodyLimitMiddleware(1024 * 1024); // 1MB
      const context = {};
      const request = { 
        headers: { "content-length": "2000000" },
        method: "POST"
      };
      
      const result = await middleware(context, request);
      
      assert.ok(result);
      assert.equal(result.status, 413);
      assert.equal(result.body.error, "PAYLOAD_TOO_LARGE");
    });

    it("should allow requests without content-length", async () => {
      const middleware = createBodyLimitMiddleware(1024 * 1024);
      const context = {};
      const request = { 
        headers: {},
        method: "GET"
      };
      
      const result = await middleware(context, request);
      assert.equal(result, null);
    });
  });

  describe("CORS Middleware", () => {
    it("should handle preflight OPTIONS request", async () => {
      const middleware = createCorsMiddleware({
        allowedOrigins: ["https://example.com"],
        allowedMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
      });
      const context = {};
      const request = { 
        method: "OPTIONS",
        headers: { origin: "https://example.com" }
      };
      
      const result = await middleware(context, request);
      
      assert.equal(result.status, 204);
      assert.equal(result.headers["Access-Control-Allow-Origin"], "https://example.com");
      assert.ok(result.headers["Access-Control-Max-Age"]);
    });

    it("should set CORS headers for valid origin", async () => {
      const middleware = createCorsMiddleware({
        allowedOrigins: ["https://example.com"]
      });
      const context = {};
      const request = { 
        method: "POST",
        headers: { origin: "https://example.com" }
      };
      
      await middleware(context, request);
      
      assert.ok(context.corsHeaders);
      assert.equal(context.corsHeaders["Access-Control-Allow-Origin"], "https://example.com");
    });

    it("should allow wildcard origin", async () => {
      const middleware = createCorsMiddleware({
        allowedOrigins: ["*"]
      });
      const context = {};
      const request = { 
        method: "POST",
        headers: { origin: "https://anywhere.com" }
      };
      
      await middleware(context, request);
      
      assert.ok(context.corsHeaders);
      assert.equal(context.corsHeaders["Access-Control-Allow-Origin"], "*");
    });

    it("should not set origin header for disallowed origins", async () => {
      const middleware = createCorsMiddleware({
        allowedOrigins: ["https://example.com"]
      });
      const context = {};
      const request = { 
        method: "POST",
        headers: { origin: "https://evil.com" }
      };
      
      await middleware(context, request);
      
      assert.ok(context.corsHeaders);
      assert.equal(context.corsHeaders["Access-Control-Allow-Origin"], undefined);
    });
  });
});