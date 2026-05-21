/**
 * Error Handling Tests
 * Tests for API error codes and error mapper
 */
import { strict as assert } from "assert";
import {
  CommonErrorCodes,
  AuthErrorCodes,
  ResourceErrorCodes,
  ValidationErrorCodes,
  ProviderErrorCodes,
  AdPlatformErrorCodes,
  DemoErrorCodes,
  ErrorCodes,
  isValidErrorCode,
  getHttpStatusForErrorCode
} from "../src/http/errors/error-codes.js";
import {
  notFound,
  unauthorized,
  validationError,
  configurationMissing,
  internalError
} from "../src/http/errors/api-error.js";
import { mapError } from "../src/http/errors/error-mapper.js";

describe("Error Codes", () => {
  describe("CommonErrorCodes", () => {
    it("should have all required common error codes", () => {
      assert.ok(CommonErrorCodes.INVALID_REQUEST);
      assert.ok(CommonErrorCodes.UNAUTHORIZED);
      assert.ok(CommonErrorCodes.INVALID_TENANT);
      assert.ok(CommonErrorCodes.NOT_FOUND);
      assert.ok(CommonErrorCodes.CONFIGURATION_MISSING);
      assert.ok(CommonErrorCodes.INTERNAL_ERROR);
    });
  });

  describe("AuthErrorCodes", () => {
    it("should have all required auth error codes", () => {
      assert.ok(AuthErrorCodes.AUTHENTICATION_FAILED);
      assert.ok(AuthErrorCodes.INVALID_CREDENTIALS);
      assert.ok(AuthErrorCodes.TOKEN_EXPIRED);
      assert.ok(AuthErrorCodes.TOKEN_INVALID);
      assert.ok(AuthErrorCodes.REGISTRATION_FAILED);
    });
  });

  describe("ResourceErrorCodes", () => {
    it("should have all required resource error codes", () => {
      assert.ok(ResourceErrorCodes.CREATIVE_PROJECT_NOT_FOUND);
      assert.ok(ResourceErrorCodes.SOURCE_ASSET_NOT_FOUND);
      assert.ok(ResourceErrorCodes.GENERATION_REQUEST_NOT_FOUND);
      assert.ok(ResourceErrorCodes.VIDEO_JOB_NOT_FOUND);
      assert.ok(ResourceErrorCodes.GENERATED_VIDEO_NOT_FOUND);
      assert.ok(ResourceErrorCodes.AD_PUBLICATION_NOT_FOUND);
      assert.ok(ResourceErrorCodes.METRICS_SNAPSHOT_NOT_FOUND);
    });
  });

  describe("ValidationErrorCodes", () => {
    it("should have all required validation error codes", () => {
      assert.ok(ValidationErrorCodes.CREATIVE_SUBJECT_INVALID);
      assert.ok(ValidationErrorCodes.SOURCE_ASSET_INVALID);
      assert.ok(ValidationErrorCodes.INVALID_GENERATION_SETTINGS);
      assert.ok(ValidationErrorCodes.INVALID_ITERATION_SUGGESTION);
      assert.ok(ValidationErrorCodes.INVALID_METRICS_INPUT);
    });
  });

  describe("ProviderErrorCodes", () => {
    it("should have all required provider error codes", () => {
      assert.ok(ProviderErrorCodes.PROMPT_COMPILATION_FAILED);
      assert.ok(ProviderErrorCodes.PROVIDER_CONFIG_MISSING);
      assert.ok(ProviderErrorCodes.PROVIDER_UNAVAILABLE);
      assert.ok(ProviderErrorCodes.VIDEO_JOB_CREATION_FAILED);
      assert.ok(ProviderErrorCodes.VIDEO_GENERATION_FAILED);
    });
  });

  describe("AdPlatformErrorCodes", () => {
    it("should have all required ad platform error codes", () => {
      assert.ok(AdPlatformErrorCodes.AD_PLATFORM_CONFIG_MISSING);
      assert.ok(AdPlatformErrorCodes.AD_PLATFORM_CONNECTION_NOT_READY);
      assert.ok(AdPlatformErrorCodes.AD_PUBLICATION_FAILED);
      assert.ok(AdPlatformErrorCodes.METRICS_SOURCE_UNAVAILABLE);
    });
  });

  describe("DemoErrorCodes", () => {
    it("should have all required demo error codes", () => {
      assert.ok(DemoErrorCodes.DEMO_FALLBACK_UNAVAILABLE);
      assert.ok(DemoErrorCodes.MOCK_DATA_EXHAUSTED);
    });
  });

  describe("isValidErrorCode", () => {
    it("should return true for valid error codes", () => {
      assert.equal(isValidErrorCode("NOT_FOUND"), true);
      assert.equal(isValidErrorCode("UNAUTHORIZED"), true);
      assert.equal(isValidErrorCode("TOKEN_EXPIRED"), true);
    });

    it("should return false for invalid error codes", () => {
      assert.equal(isValidErrorCode("INVALID_CODE"), false);
      assert.equal(isValidErrorCode(""), false);
    });
  });

  describe("getHttpStatusForErrorCode", () => {
    it("should return correct status for common errors", () => {
      assert.equal(getHttpStatusForErrorCode("INVALID_REQUEST"), 400);
      assert.equal(getHttpStatusForErrorCode("UNAUTHORIZED"), 401);
      assert.equal(getHttpStatusForErrorCode("NOT_FOUND"), 404);
      assert.equal(getHttpStatusForErrorCode("CONFIGURATION_MISSING"), 500);
    });

    it("should return correct status for auth errors", () => {
      assert.equal(getHttpStatusForErrorCode("AUTHENTICATION_FAILED"), 401);
      assert.equal(getHttpStatusForErrorCode("INVALID_CREDENTIALS"), 401);
      assert.equal(getHttpStatusForErrorCode("TOKEN_EXPIRED"), 401);
    });

    it("should return correct status for resource errors", () => {
      assert.equal(getHttpStatusForErrorCode("CREATIVE_PROJECT_NOT_FOUND"), 404);
      assert.equal(getHttpStatusForErrorCode("VIDEO_JOB_NOT_FOUND"), 404);
    });

    it("should return correct status for validation errors", () => {
      assert.equal(getHttpStatusForErrorCode("CREATIVE_SUBJECT_INVALID"), 422);
      assert.equal(getHttpStatusForErrorCode("INVALID_GENERATION_SETTINGS"), 422);
    });

    it("should return correct status for provider errors", () => {
      assert.equal(getHttpStatusForErrorCode("PROVIDER_UNAVAILABLE"), 503);
      assert.equal(getHttpStatusForErrorCode("PROVIDER_CONFIG_MISSING"), 500);
    });

    it("should return default 500 for unknown codes", () => {
      assert.equal(getHttpStatusForErrorCode("UNKNOWN_CODE"), 500);
    });
  });
});

describe("API Error Factory", () => {
  describe("notFound", () => {
    it("should create proper not found error", () => {
      const error = notFound("CREATIVE_PROJECT_NOT_FOUND", "Project not found");
      assert.equal(error.status, 404);
      assert.equal(error.error, "CREATIVE_PROJECT_NOT_FOUND");
      assert.equal(error.message, "Project not found");
    });
  });

  describe("unauthorized", () => {
    it("should create proper unauthorized error", () => {
      const error = unauthorized("TOKEN_EXPIRED", "Token has expired");
      assert.equal(error.status, 401);
      assert.equal(error.error, "TOKEN_EXPIRED");
      assert.equal(error.message, "Token has expired");
    });
  });

  describe("validationError", () => {
    it("should create proper validation error", () => {
      const error = validationError("Invalid input", "INVALID_REQUEST");
      assert.equal(error.status, 422);
      assert.equal(error.error, "INVALID_REQUEST");
      assert.equal(error.message, "Invalid input");
    });
  });

  describe("configurationMissing", () => {
    it("should create proper configuration error", () => {
      const error = configurationMissing("PROVIDER_CONFIG_MISSING", "Provider not configured");
      assert.equal(error.status, 500);
      assert.equal(error.error, "PROVIDER_CONFIG_MISSING");
      assert.equal(error.message, "Provider not configured");
    });
  });

  describe("internalError", () => {
    it("should create proper internal error", () => {
      const error = internalError("Something went wrong");
      assert.equal(error.status, 500);
      assert.equal(error.error, "INTERNAL_ERROR");
      assert.equal(error.message, "Something went wrong");
    });
  });
});

describe("Error Mapper", () => {
  describe("mapError", () => {
    it("should map API errors correctly", () => {
      const error = notFound("VIDEO_JOB_NOT_FOUND", "Video job not found");
      const response = mapError(error, "req-123");
      
      assert.ok(response.body);
      assert.equal(response.body.error, "VIDEO_JOB_NOT_FOUND");
      assert.equal(response.body.message, "Video job not found");
      assert.equal(response.status, 404);
      assert.equal(response.body.request_id, "req-123");
    });

    it("should handle generic errors", () => {
      const error = new Error("Unexpected error");
      const response = mapError(error, "req-456");
      
      assert.ok(response.body);
      assert.equal(response.body.error, "INTERNAL_ERROR");
      assert.equal(response.status, 500);
    });

    it("should preserve error details", () => {
      const error = new ApiError(422, "INVALID_REQUEST", "Invalid creative subject", {
        field: "creative_subject"
      });
      const response = mapError(error, "req-789");
      
      assert.ok(response.body.details);
    });
  });
});

// Import ApiError for test
import { ApiError } from "../src/http/errors/api-error.js";