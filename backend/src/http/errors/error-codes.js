/**
 * Standardized Error Codes for Kastonom Backend
 * @description Central error code definitions following api.contract.yaml
 */

/**
 * Common error codes
 */
export const CommonErrorCodes = {
  INVALID_REQUEST: "INVALID_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  INVALID_TENANT: "INVALID_TENANT",
  NOT_FOUND: "NOT_FOUND",
  CONFIGURATION_MISSING: "CONFIGURATION_MISSING",
  INTERNAL_ERROR: "INTERNAL_ERROR"
};

/**
 * Authentication error codes
 */
export const AuthErrorCodes = {
  AUTHENTICATION_FAILED: "AUTHENTICATION_FAILED",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  TOKEN_INVALID: "TOKEN_INVALID",
  REGISTRATION_FAILED: "REGISTRATION_FAILED"
};

/**
 * Resource error codes
 */
export const ResourceErrorCodes = {
  CREATIVE_PROJECT_NOT_FOUND: "CREATIVE_PROJECT_NOT_FOUND",
  SOURCE_ASSET_NOT_FOUND: "SOURCE_ASSET_NOT_FOUND",
  GENERATION_REQUEST_NOT_FOUND: "GENERATION_REQUEST_NOT_FOUND",
  VIDEO_JOB_NOT_FOUND: "VIDEO_JOB_NOT_FOUND",
  GENERATED_VIDEO_NOT_FOUND: "GENERATED_VIDEO_NOT_FOUND",
  AD_PUBLICATION_NOT_FOUND: "AD_PUBLICATION_NOT_FOUND",
  METRICS_SNAPSHOT_NOT_FOUND: "METRICS_SNAPSHOT_NOT_FOUND"
};

/**
 * Validation error codes
 */
export const ValidationErrorCodes = {
  CREATIVE_SUBJECT_INVALID: "CREATIVE_SUBJECT_INVALID",
  SOURCE_ASSET_INVALID: "SOURCE_ASSET_INVALID",
  INVALID_GENERATION_SETTINGS: "INVALID_GENERATION_SETTINGS",
  INVALID_ITERATION_SUGGESTION: "INVALID_ITERATION_SUGGESTION",
  INVALID_METRICS_INPUT: "INVALID_METRICS_INPUT"
};

/**
 * Provider error codes
 */
export const ProviderErrorCodes = {
  PROMPT_COMPILATION_FAILED: "PROMPT_COMPILATION_FAILED",
  PROVIDER_CONFIG_MISSING: "PROVIDER_CONFIG_MISSING",
  PROVIDER_UNAVAILABLE: "PROVIDER_UNAVAILABLE",
  VIDEO_JOB_CREATION_FAILED: "VIDEO_JOB_CREATION_FAILED",
  VIDEO_GENERATION_FAILED: "VIDEO_GENERATION_FAILED"
};

/**
 * Ad platform error codes
 */
export const AdPlatformErrorCodes = {
  AD_PLATFORM_CONFIG_MISSING: "AD_PLATFORM_CONFIG_MISSING",
  AD_PLATFORM_CONNECTION_NOT_READY: "AD_PLATFORM_CONNECTION_NOT_READY",
  AD_PUBLICATION_FAILED: "AD_PUBLICATION_FAILED",
  METRICS_SOURCE_UNAVAILABLE: "METRICS_SOURCE_UNAVAILABLE"
};

/**
 * Demo/Mock error codes
 */
export const DemoErrorCodes = {
  DEMO_FALLBACK_UNAVAILABLE: "DEMO_FALLBACK_UNAVAILABLE",
  MOCK_DATA_EXHAUSTED: "MOCK_DATA_EXHAUSTED"
};

/**
 * All error codes combined
 */
export const ErrorCodes = {
  ...CommonErrorCodes,
  ...AuthErrorCodes,
  ...ResourceErrorCodes,
  ...ValidationErrorCodes,
  ...ProviderErrorCodes,
  ...AdPlatformErrorCodes,
  ...DemoErrorCodes
};

/**
 * Check if error code is valid
 * @param {string} code - Error code to check
 * @returns {boolean}
 */
export function isValidErrorCode(code) {
  return Object.values(ErrorCodes).includes(code);
}

/**
 * Get HTTP status for error code
 * @param {string} code - Error code
 * @returns {number} HTTP status code
 */
export function getHttpStatusForErrorCode(code) {
  const codeStatusMap = {
    // Common
    [CommonErrorCodes.INVALID_REQUEST]: 400,
    [CommonErrorCodes.UNAUTHORIZED]: 401,
    [CommonErrorCodes.INVALID_TENANT]: 403,
    [CommonErrorCodes.NOT_FOUND]: 404,
    [CommonErrorCodes.CONFIGURATION_MISSING]: 500,
    [CommonErrorCodes.INTERNAL_ERROR]: 500,

    // Auth
    [AuthErrorCodes.AUTHENTICATION_FAILED]: 401,
    [AuthErrorCodes.INVALID_CREDENTIALS]: 401,
    [AuthErrorCodes.TOKEN_EXPIRED]: 401,
    [AuthErrorCodes.TOKEN_INVALID]: 401,
    [AuthErrorCodes.REGISTRATION_FAILED]: 400,

    // Resource
    [ResourceErrorCodes.CREATIVE_PROJECT_NOT_FOUND]: 404,
    [ResourceErrorCodes.SOURCE_ASSET_NOT_FOUND]: 404,
    [ResourceErrorCodes.GENERATION_REQUEST_NOT_FOUND]: 404,
    [ResourceErrorCodes.VIDEO_JOB_NOT_FOUND]: 404,
    [ResourceErrorCodes.GENERATED_VIDEO_NOT_FOUND]: 404,
    [ResourceErrorCodes.AD_PUBLICATION_NOT_FOUND]: 404,
    [ResourceErrorCodes.METRICS_SNAPSHOT_NOT_FOUND]: 404,

    // Validation
    [ValidationErrorCodes.CREATIVE_SUBJECT_INVALID]: 422,
    [ValidationErrorCodes.SOURCE_ASSET_INVALID]: 422,
    [ValidationErrorCodes.INVALID_GENERATION_SETTINGS]: 422,
    [ValidationErrorCodes.INVALID_ITERATION_SUGGESTION]: 422,
    [ValidationErrorCodes.INVALID_METRICS_INPUT]: 422,

    // Provider
    [ProviderErrorCodes.PROMPT_COMPILATION_FAILED]: 422,
    [ProviderErrorCodes.PROVIDER_CONFIG_MISSING]: 500,
    [ProviderErrorCodes.PROVIDER_UNAVAILABLE]: 503,
    [ProviderErrorCodes.VIDEO_JOB_CREATION_FAILED]: 500,
    [ProviderErrorCodes.VIDEO_GENERATION_FAILED]: 500,

    // Ad Platform
    [AdPlatformErrorCodes.AD_PLATFORM_CONFIG_MISSING]: 500,
    [AdPlatformErrorCodes.AD_PLATFORM_CONNECTION_NOT_READY]: 400,
    [AdPlatformErrorCodes.AD_PUBLICATION_FAILED]: 500,
    [AdPlatformErrorCodes.METRICS_SOURCE_UNAVAILABLE]: 503,

    // Demo
    [DemoErrorCodes.DEMO_FALLBACK_UNAVAILABLE]: 500,
    [DemoErrorCodes.MOCK_DATA_EXHAUSTED]: 503
  };

  return codeStatusMap[code] || 500;
}

export default ErrorCodes;
