export class ApiError extends Error {
  constructor(status, error, message, options = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.error = error;
    this.details = options.details ?? null;
    this.fallbackAvailable = options.fallbackAvailable;
  }
}

export function invalidRequest(message, options = {}) {
  return new ApiError(400, options.error ?? "INVALID_REQUEST", message, options);
}

export function validationError(message, options = {}) {
  return new ApiError(422, options.error ?? "INVALID_REQUEST", message, options);
}

export function notFound(error, message) {
  return new ApiError(404, error, message);
}

export function configurationMissing(error, message, options = {}) {
  return new ApiError(500, error, message, options);
}
