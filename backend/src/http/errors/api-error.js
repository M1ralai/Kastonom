import { ErrorCodes, getHttpStatusForErrorCode } from "./error-codes.js";

/**
 * ApiError class for standardized API errors
 * @extends Error
 */
export class ApiError extends Error {
  /**
   * @param {number|string} statusOrCode - HTTP status code or error code
   * @param {string} error - Error code (defaults to status if string passed)
   * @param {string} message - Human-readable error message
   * @param {Object} options - Additional options
   */
  constructor(statusOrCode, error, message, options = {}) {
    super(message);
    this.name = "ApiError";

    // Support both old-style (status, error, message) and new-style (code, message) signatures
    if (typeof statusOrCode === "number") {
      this.status = statusOrCode;
      this.error = error;
    } else {
      // New style: (errorCode, message, options)
      this.error = statusOrCode;
      this.status = options.status ?? getHttpStatusForErrorCode(statusOrCode);
      message = error;
    }

    this.details = options.details ?? null;
    this.fallbackAvailable = options.fallbackAvailable ?? null;
    this.field = options.field ?? null;
    this.requestId = options.requestId ?? null;
  }

  /**
   * Convert to plain object for JSON serialization
   */
  toJSON() {
    const body = {
      error: this.error,
      message: this.message
    };

    if (this.details) {
      body.details = this.details;
    }

    if (this.field) {
      body.field = this.field;
    }

    if (this.fallbackAvailable !== null) {
      body.fallback_available = this.fallbackAvailable;
    }

    return body;
  }
}

/**
 * Validation error with field information
 */
export class ValidationFieldError extends ApiError {
  constructor(field, message, options = {}) {
    super(422, ErrorCodes.INVALID_REQUEST, message, {
      ...options,
      field
    });
    this.name = "ValidationFieldError";
  }
}

/**
 * Create invalid request error (400)
 */
export function invalidRequest(message, options = {}) {
  return new ApiError(400, options.error ?? ErrorCodes.INVALID_REQUEST, message, options);
}

/**
 * Create validation error (422)
 */
export function validationError(message, options = {}) {
  return new ApiError(422, options.error ?? ErrorCodes.INVALID_REQUEST, message, options);
}

/**
 * Create not found error (404)
 */
export function notFound(error, message, options = {}) {
  return new ApiError(404, error, message, options);
}

/**
 * Create unauthorized error (401)
 */
export function unauthorized(message, options = {}) {
  return new ApiError(401, options.error ?? ErrorCodes.UNAUTHORIZED, message, options);
}

/**
 * Create forbidden error (403)
 */
export function forbidden(message, options = {}) {
  return new ApiError(403, options.error ?? ErrorCodes.INVALID_TENANT, message, options);
}

/**
 * Create configuration missing error (500)
 */
export function configurationMissing(error, message, options = {}) {
  return new ApiError(500, error, message, options);
}

/**
 * Create internal server error (500)
 */
export function internalError(message, options = {}) {
  return new ApiError(500, ErrorCodes.INTERNAL_ERROR, message, options);
}

/**
 * Wrap a plain error with an ApiError
 */
export function wrapError(error, fallbackCode = ErrorCodes.INTERNAL_ERROR) {
  if (error instanceof ApiError) {
    return error;
  }

  if (error && error.status && error.body) {
    return new ApiError(error.status, error.body.error ?? fallbackCode, error.body.message ?? error.message, {
      details: error.body
    });
  }

  return new ApiError(500, fallbackCode, error?.message ?? "Internal server error");
}
