/**
 * Security Middleware Tests
 * Tests for security headers, body limits, and CORS
 */
import { describe, it } from "node:test";
import { strict as assert } from "assert";
import {
  createSecureHeadersMiddleware,
  createBodyLimitMiddleware,
  createCorsMiddleware,
  createSecurityMiddlewareStack
} from "../src/http/middleware/security.js";

describe("Security Middleware", () => {
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

  describe("Security Middleware Stack", () => {
    it("should allow repeated requests through the stack", async () => {
      const stack = createSecurityMiddlewareStack({});
      const request = { method: "GET", headers: {}, url: "/health" };

      for (let i = 0; i < 150; i++) {
        const context = {};
        const result = await stack.apply(context, request);

        assert.equal(result, null);
        assert.deepEqual(Object.keys(context).sort(), ["corsHeaders", "securityHeaders"]);
        assert.ok(context.securityHeaders);
      }
    });
  });
});
