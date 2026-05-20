import { ApiError } from "./api-error.js";

export function mapError(error, requestId) {
  // Handle ApiError instance
  if (error instanceof ApiError) {
    const body = {
      error: error.error,
      message: error.message,
      request_id: requestId
    };

    if (typeof error.fallbackAvailable === "boolean") {
      body.fallback_available = error.fallbackAvailable;
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

  return {
    status: 500,
    body: {
      error: "INTERNAL_ERROR",
      message: "Internal backend error.",
      request_id: requestId
    }
  };
}
