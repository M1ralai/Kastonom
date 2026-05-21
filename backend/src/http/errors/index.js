/**
 * HTTP Error Handling Module
 * @description Central export for all error handling utilities
 */

// ApiError class and factory functions
export {
  ApiError,
  ValidationFieldError,
  invalidRequest,
  validationError,
  notFound,
  unauthorized,
  forbidden,
  configurationMissing,
  internalError,
  wrapError
} from "./api-error.js";

// Standardized error codes
export {
  ErrorCodes,
  CommonErrorCodes,
  AuthErrorCodes,
  ResourceErrorCodes,
  ValidationErrorCodes,
  ProviderErrorCodes,
  AdPlatformErrorCodes,
  DemoErrorCodes,
  isValidErrorCode,
  getHttpStatusForErrorCode
} from "./error-codes.js";

// Error mapping utilities
export {
  mapError,
  validationFieldError,
  isValidErrorCode,
  getHttpStatus
} from "./error-mapper.js";
