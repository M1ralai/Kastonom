import { ApiError } from "./api-error.js";
import { ErrorCodes, getHttpStatusForErrorCode } from "./error-codes.js";
import { createLogger } from "../../logger/index.js";

const log = createLogger("error-mapper");

/**
 * Map any error to a standardized API response
 * @param {Error|ApiError|Object} error - The error to map
 * @param {string} requestId - Request ID for correlation
 * @returns {{status: number, body: Object}} Standardized error response
 */
export function mapError(error, requestId) {
  // Handle ApiError instance
  if (error instanceof ApiError) {
    const body = {
      error: error.error,
      message: error.message,
      request_id: requestId
    };

    if (error.details) {
      body.details = error.details;
    }

    if (error.field) {
      body.field = error.field;
    }

    if (typeof error.fallbackAvailable === "boolean") {
      body.fallback_available = error.fallbackAvailable;
    }

    // Log error with appropriate level
    if (error.status >= 500) {
      log.error("Server error", {
        requestId,
        error: error.error,
        status: error.status,
        message: error.message,
        stack: error.stack
      });
    } else if (error.status >= 400) {
      log.warn("Client error", {
        requestId,
        error: error.error,
        status: error.status,
        message: error.message
      });
    }

    return {
      status: error.status,
      body
    };
  }

  // Handle plain error objects with { status, body } shape
  if (error && typeof error === "object" && typeof error.status === "number" && error.body) {
    return {
      status: error.status,
      body: {
        ...error.body,
        request_id: requestId
      }
    };
  }

  // Handle PostgreSQL errors
  if (error && error.code) {
    const pgError = mapPgError(error, requestId);
    if (pgError) {
      return pgError;
    }
  }

  // Handle validation/syntax errors
  if (error instanceof SyntaxError) {
    log.warn("JSON parse error", { requestId, message: error.message });
    return {
      status: 400,
      body: {
        error: ErrorCodes.INVALID_REQUEST,
        message: "Request body must be valid JSON.",
        request_id: requestId
      }
    };
  }

  // Unknown/unhandled errors - log full details
  log.error("Unhandled error", {
    requestId,
    errorType: error?.constructor?.name,
    message: error?.message,
    stack: error?.stack,
    originalError: String(error)
  });

  return {
    status: 500,
    body: {
      error: ErrorCodes.INTERNAL_ERROR,
      message: "An internal server error occurred.",
      request_id: requestId
    }
  };
}

/**
 * Map PostgreSQL errors to standardized API responses
 * @param {Object} error - PostgreSQL error object
 * @param {string} requestId - Request ID
 * @returns {{status: number, body: Object}|null} Mapped error or null
 */
function mapPgError(error, requestId) {
  const pgErrorMap = {
    // Foreign key violation
    "23503": {
      status: 404,
      error: ErrorCodes.NOT_FOUND,
      message: "Referenced resource not found."
    },
    // Unique violation
    "23505": {
      status: 409,
      error: ErrorCodes.INVALID_REQUEST,
      message: "Resource already exists."
    },
    // Check constraint violation
    "23514": {
      status: 422,
      error: ErrorCodes.INVALID_REQUEST,
      message: "Data validation failed."
    },
    // Not null violation
    "23502": {
      status: 422,
      error: ErrorCodes.INVALID_REQUEST,
      message: "Required field is missing."
    }
  };

  const mapped = pgErrorMap[error.code];
  if (mapped) {
    log.warn("PostgreSQL error", {
      requestId,
      pgCode: error.code,
      message: error.message
    });

    return {
      status: mapped.status,
      body: {
        error: mapped.error,
        message: mapped.message,
        request_id: requestId
      }
    };
  }

  return null;
}

/**
 * Create a validation error for a specific field
 * @param {string} field - Field name
 * @param {string} message - Error message
 * @param {Object} options - Additional options
 * @returns {ApiError}
 */
export function validationFieldError(field, message, options = {}) {
  return new ApiError(422, ErrorCodes.INVALID_REQUEST, message, {
    ...options,
    field
  });
}

/**
 * Validate error code exists in ErrorCodes
 * @param {string} code - Error code to validate
 * @returns {boolean}
 */
export function isValidErrorCode(code) {
  return Object.values(ErrorCodes).includes(code);
}

/**
 * Get HTTP status for an error code
 * @param {string} code - Error code
 * @returns {number}
 */
export function getHttpStatus(code) {
  return getHttpStatusForErrorCode(code);
}
