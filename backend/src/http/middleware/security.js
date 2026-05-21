/**
 * Security Middleware
 * Production-ready security: rate limiting, secure headers, body limits, CORS
 * @module backend/http/middleware
 */

import { createLogger } from "../../logger/index.js";

const log = createLogger("security");

/**
 * In-memory rate limit store with sliding window
 * For production, consider Redis-based store
 */
export function createRateLimitStore() {
  const store = new Map(); // key: clientIp, value: { count, windowStart }

  return {
    /**
     * Check if request is within rate limit
     * @param {string} clientIp
     * @param {number} maxRequests - Maximum requests per window
     * @param {number} windowMs - Window size in milliseconds
     * @returns {{ allowed: boolean, remaining: number, resetMs: number }}
     */
    check(clientIp, maxRequests, windowMs) {
      const now = Date.now();
      const record = store.get(clientIp);

      // Initialize or reset if window expired
      if (!record || now - record.windowStart >= windowMs) {
        store.set(clientIp, { count: 1, windowStart: now });
        return { allowed: true, remaining: maxRequests - 1, resetMs: windowMs };
      }

      // Check if within limit
      if (record.count >= maxRequests) {
        const resetMs = windowMs - (now - record.windowStart);
        return { allowed: false, remaining: 0, resetMs };
      }

      // Increment count
      record.count++;
      return { allowed: true, remaining: maxRequests - record.count, resetMs: windowMs - (now - record.windowStart) };
    },

    /**
     * Clean up expired entries (call periodically)
     */
    cleanup(windowMs) {
      const now = Date.now();
      for (const [key, record] of store.entries()) {
        if (now - record.windowStart >= windowMs) {
          store.delete(key);
        }
      }
    },

    /**
     * Get current size (for monitoring)
     */
    size() {
      return store.size;
    }
  };
}

/**
 * Create rate limit middleware
 * @param {Object} options
 * @param {number} options.maxRequests - Maximum requests per window (default: 100)
 * @param {number} options.windowMs - Window size in ms (default: 15 minutes)
 * @param {Object} options.store - Optional rate limit store
 */
export function createRateLimitMiddleware({
  maxRequests = 100,
  windowMs = 15 * 60 * 1000, // 15 minutes
  store = null
}) {
  const rateLimitStore = store || createRateLimitStore();

  // Periodic cleanup every 5 minutes
  setInterval(() => {
    rateLimitStore.cleanup(windowMs);
  }, 5 * 60 * 1000).unref();

  return async function rateLimitMiddleware(context, request) {
    const clientIp = getClientIp(request);
    const result = rateLimitStore.check(clientIp, maxRequests, windowMs);

    // Add rate limit headers to context for response
    context.rateLimit = {
      limit: maxRequests,
      remaining: result.remaining,
      resetMs: result.resetMs
    };

    if (!result.allowed) {
      log.warn("Rate limit exceeded", { clientIp, maxRequests });
      return {
        status: 429,
        body: {
          error: "RATE_LIMIT_EXCEEDED",
          message: "Too many requests. Please try again later.",
          retryAfterMs: result.resetMs
        },
        headers: {
          "Retry-After": Math.ceil(result.resetMs / 1000).toString(),
          "X-RateLimit-Limit": maxRequests.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": Math.ceil((Date.now() + result.resetMs) / 1000).toString()
        }
      };
    }

    return null; // Continue to next handler
  };
}

/**
 * Create security headers middleware (Helmet-like)
 * Sets common security headers to prevent common attacks
 */
export function createSecureHeadersMiddleware() {
  return async function secureHeadersMiddleware(context, request, next) {
    // Add security headers that will be applied in response
    context.securityHeaders = {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      "Content-Security-Policy": [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'", // Allow inline for Vite HMR
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "connect-src 'self'",
        "frame-ancestors 'none'"
      ].join("; ")
    };

    if (next) {
      return next(context, request);
    }
    return null;
  };
}

/**
 * Create body size limit middleware
 * @param {number} maxBytes - Maximum body size in bytes (default: 1MB)
 */
export function createBodyLimitMiddleware(maxBytes = 1_048_576) {
  return async function bodyLimitMiddleware(context, request) {
    const contentLength = request.headers["content-length"];
    
    if (contentLength && parseInt(contentLength, 10) > maxBytes) {
      log.warn("Request body too large", { 
        contentLength, 
        maxBytes,
        path: request.url 
      });
      return {
        status: 413,
        body: {
          error: "PAYLOAD_TOO_LARGE",
          message: `Request body exceeds maximum size of ${Math.round(maxBytes / 1024)}KB`
        }
      };
    }
    return null;
  };
}

/**
 * Create CORS middleware
 * @param {Object} options
 * @param {string[]} options.allowedOrigins - List of allowed origins
 * @param {string[]} options.allowedMethods - List of allowed methods
 * @param {string[]} options.allowedHeaders - List of allowed headers
 */
export function createCorsMiddleware({
  allowedOrigins = ["*"],
  allowedMethods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders = ["content-type", "x-tenant-id", "x-request-id", "authorization", "x-api-key"]
}) {
  return async function corsMiddleware(context, request) {
    const origin = request.headers.origin || request.headers.Origin;
    
    // Handle preflight
    if (request.method === "OPTIONS") {
      const headers = {
        "Access-Control-Allow-Methods": allowedMethods.join(", "),
        "Access-Control-Allow-Headers": allowedHeaders.join(", "),
        "Access-Control-Max-Age": "86400" // 24 hours
      };

      // Check origin
      if (allowedOrigins.includes("*")) {
        headers["Access-Control-Allow-Origin"] = "*";
      } else if (origin && allowedOrigins.includes(origin)) {
        headers["Access-Control-Allow-Origin"] = origin;
        headers["Vary"] = "Origin";
      }

      return { status: 204, body: null, headers };
    }

    // Add CORS headers to context
    context.corsHeaders = {};
    if (allowedOrigins.includes("*")) {
      context.corsHeaders["Access-Control-Allow-Origin"] = "*";
    } else if (origin && allowedOrigins.includes(origin)) {
      context.corsHeaders["Access-Control-Allow-Origin"] = origin;
      context.corsHeaders["Vary"] = "Origin";
    }

    return null;
  };
}

/**
 * Get client IP from request
 * Handles proxied requests (X-Forwarded-For, etc.)
 */
function getClientIp(request) {
  // Check common proxy headers
  const forwardedFor = request.headers["x-forwarded-for"];
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, first is original client
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers["x-real-ip"];
  if (realIp) {
    return realIp;
  }

  // Fallback to socket address
  return request.socket?.remoteAddress || request.ip || "unknown";
}

/**
 * Create combined security middleware stack
 * @param {Object} config
 */
export function createSecurityMiddlewareStack(config) {
  const allowedOrigins = config.allowedOrigins || 
    (process.env.KASTONOM_ALLOWED_ORIGINS 
      ? process.env.KASTONOM_ALLOWED_ORIGINS.split(",").map(o => o.trim())
      : ["*"]);

  const rateLimit = createRateLimitMiddleware({
    maxRequests: config.rateLimitMaxRequests || 100,
    windowMs: config.rateLimitWindowMs || 15 * 60 * 1000
  });

  const secureHeaders = createSecureHeadersMiddleware();
  const bodyLimit = createBodyLimitMiddleware(config.bodyLimitBytes || 1_048_576);
  const cors = createCorsMiddleware({ allowedOrigins });

  return {
    rateLimit,
    secureHeaders,
    bodyLimit,
    cors,

    /**
     * Apply all security middleware in order
     * Returns early with error response if any middleware rejects
     */
    async apply(context, request) {
      // CORS (preflight check)
      const corsResult = await cors(context, request);
      if (corsResult) return corsResult;

      // Body limit
      const bodyResult = await bodyLimit(context, request);
      if (bodyResult) return bodyResult;

      // Rate limit
      const rateResult = await rateLimit(context, request);
      if (rateResult) return rateResult;

      // Secure headers
      await secureHeaders(context, request);

      return null; // All passed, continue
    }
  };
}

export default {
  createRateLimitStore,
  createRateLimitMiddleware,
  createSecureHeadersMiddleware,
  createBodyLimitMiddleware,
  createCorsMiddleware,
  createSecurityMiddlewareStack
};