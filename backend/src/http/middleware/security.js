/**
 * Security Middleware
 * Production-ready security: secure headers, body limits, CORS
 * @module backend/http/middleware
 */

import { createLogger } from "../../logger/index.js";

const log = createLogger("security");

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
 * Create combined security middleware stack
 * @param {Object} config
 */
export function createSecurityMiddlewareStack(config) {
  const allowedOrigins = config.allowedOrigins || 
    (process.env.KASTONOM_ALLOWED_ORIGINS 
      ? process.env.KASTONOM_ALLOWED_ORIGINS.split(",").map(o => o.trim())
      : ["*"]);

  const secureHeaders = createSecureHeadersMiddleware();
  const bodyLimit = createBodyLimitMiddleware(config.bodyLimitBytes || 1_048_576);
  const cors = createCorsMiddleware({ allowedOrigins });

  return {
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

      // Secure headers
      await secureHeaders(context, request);

      return null; // All passed, continue
    }
  };
}

export default {
  createSecureHeadersMiddleware,
  createBodyLimitMiddleware,
  createCorsMiddleware,
  createSecurityMiddlewareStack
};
