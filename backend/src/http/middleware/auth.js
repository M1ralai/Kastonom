/**
 * Auth Middleware - JWT token validation and user context
 * @module backend/http/middleware
 */

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(headers) {
  const auth = headers.authorization || headers.Authorization;
  if (!auth) return null;

  if (auth.startsWith("Bearer ") || auth.startsWith("bearer ")) {
    return auth.slice(7);
  }
  return null;
}

/**
 * Create auth middleware function
 * @param {Object} options
 * @param {Object} options.auth - Auth service instance
 * @param {Function} options.next - Next middleware/handler
 */
export function createAuthMiddleware({ auth, next }) {
  return async function authMiddleware(context, request) {
    const token = extractBearerToken(request.headers);

    if (!token) {
      return {
        status: 401,
        body: { error: "UNAUTHORIZED", message: "Authentication required. Provide Bearer token." }
      };
    }

    const payload = auth.verifyToken(token);

    if (!payload) {
      return {
        status: 401,
        body: { error: "TOKEN_INVALID", message: "Invalid or expired token." }
      };
    }

    // Attach user context to request
    const userContext = {
      user_id: payload.sub,
      tenant_id: payload.tenant_id,
      email: payload.email
    };

    // Continue to next handler with user context
    return next({ ...context, user: userContext }, request);
  };
}

/**
 * Optional auth middleware - doesn't fail if no token
 */
export function createOptionalAuthMiddleware({ auth, next }) {
  return async function optionalAuthMiddleware(context, request) {
    const token = extractBearerToken(request.headers);

    if (token) {
      const payload = auth.verifyToken(token);
      if (payload) {
        context.user = {
          user_id: payload.sub,
          tenant_id: payload.tenant_id,
          email: payload.email
        };
      }
    }

    return next(context, request);
  };
}
