import { invalidRequest, validationError } from "../http/errors/api-error.js";
import { ValidationErrorCodes } from "../http/errors/error-codes.js";

/**
 * Validation result container for field-level errors
 */
export class ValidationResult {
  constructor() {
    this.errors = [];
  }

  addError(field, message, code = ValidationErrorCodes.INVALID_REQUEST) {
    this.errors.push({ field, message, code });
  }

  hasErrors() {
    return this.errors.length > 0;
  }

  throwIfErrors() {
    if (this.hasErrors()) {
      const firstError = this.errors[0];
      throw validationError(firstError.message, {
        error: firstError.code,
        details: this.errors.length > 1 ? this.errors : undefined
      });
    }
  }

  getErrors() {
    return this.errors;
  }
}

/**
 * Validate multiple fields at once
 * @param {Object} fields - Object with field validations { fieldName: [value, validatorFn] }
 * @returns {Object} Validated fields object
 */
export function validateFields(fields) {
  const result = new ValidationResult();
  const validated = {};

  for (const [fieldName, [value, validatorFn]] of Object.entries(fields)) {
    try {
      validated[fieldName] = validatorFn(value, fieldName);
    } catch (error) {
      result.addError(fieldName, error.message);
    }
  }

  result.throwIfErrors();
  return validated;
}

// ─── Basic Type Validators ──────────────────────────────────────────

export function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function cloneJson(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

// ─── Object Validators ─────────────────────────────────────────────

export function requireObject(value, name, options = {}) {
  if (!isPlainObject(value)) {
    throw validationError(`${name} must be an object.`, {
      error: options.error,
      field: name
    });
  }
  return value;
}

export function optionalObject(value, name) {
  if (value == null || value === "") {
    return null;
  }
  if (!isPlainObject(value)) {
    throw validationError(`${name} must be an object.`, { field: name });
  }
  return value;
}

// ─── String Validators ─────────────────────────────────────────────

export function requireString(value, name, options = {}) {
  if (typeof value !== "string" || value.trim() === "") {
    throw validationError(`${name} is required.`, {
      error: options.error,
      field: name
    });
  }
  return value.trim();
}

export function optionalString(value, name) {
  if (value == null || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    throw validationError(`${name} must be a string.`, { field: name });
  }
  return value.trim();
}

/**
 * Require string with minimum length
 */
export function requireStringMinLength(value, name, minLength, options = {}) {
  const str = requireString(value, name, options);
  if (str.length < minLength) {
    throw validationError(`${name} must be at least ${minLength} characters.`, {
      ...options,
      field: name
    });
  }
  return str;
}

/**
 * Require string with maximum length
 */
export function requireStringMaxLength(value, name, maxLength, options = {}) {
  const str = requireString(value, name, options);
  if (str.length > maxLength) {
    throw validationError(`${name} must be at most ${maxLength} characters.`, {
      ...options,
      field: name
    });
  }
  return str;
}

/**
 * Require string matching a pattern
 */
export function requireStringPattern(value, name, pattern, options = {}) {
  const str = requireString(value, name, options);
  const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;
  if (!regex.test(str)) {
    throw validationError(
      options.patternMessage || `${name} format is invalid.`,
      { ...options, field: name }
    );
  }
  return str;
}

// ─── UUID Validator ─────────────────────────────────────────────────

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(value) {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function requireUuid(value, name, options = {}) {
  const str = requireString(value, name, options);
  if (!isValidUuid(str)) {
    throw validationError(`${name} must be a valid UUID.`, {
      ...options,
      field: name
    });
  }
  return str;
}

export function optionalUuid(value, name) {
  if (value == null || value === "") {
    return null;
  }
  if (typeof value === "string" && isValidUuid(value)) {
    return value;
  }
  throw validationError(`${name} must be a valid UUID or null.`, { field: name });
}

// ─── Email Validator ───────────────────────────────────────────────

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value) {
  return typeof value === "string" && EMAIL_PATTERN.test(value);
}

export function requireEmail(value, name, options = {}) {
  const str = requireString(value, name, options);
  if (!isValidEmail(str)) {
    throw validationError(`${name} must be a valid email address.`, {
      ...options,
      field: name
    });
  }
  return str;
}

export function optionalEmail(value, name) {
  if (value == null || value === "") {
    return null;
  }
  if (!isValidEmail(value)) {
    throw validationError(`${name} must be a valid email address.`, { field: name });
  }
  return value.trim();
}

// ─── Boolean Validators ────────────────────────────────────────────

export function requireBoolean(value, name, options = {}) {
  if (typeof value !== "boolean") {
    throw validationError(`${name} must be a boolean.`, {
      ...options,
      field: name
    });
  }
  return value;
}

export function optionalBoolean(value, name) {
  if (value == null) {
    return null;
  }
  if (typeof value !== "boolean") {
    throw validationError(`${name} must be a boolean or null.`, { field: name });
  }
  return value;
}

// ─── Number Validators ─────────────────────────────────────────────

export function requireNumber(value, name, options = {}) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw validationError(`${name} must be a finite number.`, {
      ...options,
      field: name
    });
  }
  return value;
}

export function optionalNumber(value, name) {
  if (value == null || value === "") {
    return null;
  }
  return requireNumber(value, name, { field: name });
}

export function requireNumberMin(value, name, min, options = {}) {
  const num = requireNumber(value, name, options);
  if (num < min) {
    throw validationError(`${name} must be at least ${min}.`, {
      ...options,
      field: name
    });
  }
  return num;
}

export function requireNumberMax(value, name, max, options = {}) {
  const num = requireNumber(value, name, options);
  if (num > max) {
    throw validationError(`${name} must be at most ${max}.`, {
      ...options,
      field: name
    });
  }
  return num;
}

export function requireNumberRange(value, name, min, max, options = {}) {
  const num = requireNumber(value, name, options);
  if (num < min || num > max) {
    throw validationError(`${name} must be between ${min} and ${max}.`, {
      ...options,
      field: name
    });
  }
  return num;
}

// ─── Integer Validators ─────────────────────────────────────────────

export function requireInteger(value, name, options = {}) {
  if (!Number.isInteger(value)) {
    throw validationError(`${name} must be an integer.`, {
      ...options,
      field: name
    });
  }
  return value;
}

export function optionalInteger(value, name) {
  if (value == null || value === "") {
    return null;
  }
  return requireInteger(value, name, { field: name });
}

export function requireIntegerMin(value, name, min, options = {}) {
  const num = requireInteger(value, name, options);
  if (num < min) {
    throw validationError(`${name} must be at least ${min}.`, {
      ...options,
      field: name
    });
  }
  return num;
}

// ─── Array Validators ──────────────────────────────────────────────

export function requireArray(value, name, options = {}) {
  if (!Array.isArray(value)) {
    throw validationError(`${name} must be an array.`, {
      ...options,
      field: name
    });
  }
  if (options.minLength && value.length < options.minLength) {
    throw validationError(`${name} must contain at least ${options.minLength} item(s).`, {
      ...options,
      field: name
    });
  }
  if (options.maxLength && value.length > options.maxLength) {
    throw validationError(`${name} must contain at most ${options.maxLength} item(s).`, {
      ...options,
      field: name
    });
  }
  return value;
}

export function optionalArray(value, name) {
  if (value == null) {
    return null;
  }
  if (!Array.isArray(value)) {
    throw validationError(`${name} must be an array or null.`, { field: name });
  }
  return value;
}

export function stringArray(value, name, options = {}) {
  return requireArray(value, name, options).map((item, index) =>
    requireString(item, `${name}[${index}]`, options)
  );
}

// ─── Enum Validators ───────────────────────────────────────────────

export function enumValue(value, name, allowed, options = {}) {
  const nextValue = requireString(value, name, options);
  if (!allowed.includes(nextValue)) {
    throw validationError(`${name} must be one of: ${allowed.join(", ")}.`, {
      ...options,
      field: name
    });
  }
  return nextValue;
}

export function optionalEnumValue(value, name, allowed, fallback = null) {
  if (value == null || value === "") {
    return fallback;
  }
  return enumValue(value, name, allowed);
}

// ─── URL Validators ───────────────────────────────────────────────

export function optionalUrl(value, name) {
  const text = optionalString(value, name);
  if (text == null) {
    return null;
  }
  try {
    const parsed = new URL(text);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("unsupported protocol");
    }
    return text;
  } catch {
    throw validationError(`${name} must be a valid http(s) URL.`, { field: name });
  }
}

export function optionalSafeDestinationUrl(value, name) {
  return optionalUrl(value, name);
}

// ─── Date Validators ───────────────────────────────────────────────

export function dateString(value, name) {
  const text = requireString(value, name);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw validationError(`${name} must be a YYYY-MM-DD date.`, { field: name });
  }
  return text;
}

export function optionalDateString(value, name) {
  if (value == null || value === "") {
    return null;
  }
  return dateString(value, name);
}

export function dateTimeString(value, name) {
  const text = requireString(value, name);
  // ISO 8601 format with optional timezone
  const datetimePattern = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/;
  if (!datetimePattern.test(text)) {
    throw validationError(`${name} must be a valid ISO 8601 datetime.`, { field: name });
  }
  return text;
}

// ─── Object Schema Validator ──────────────────────────────────────

/**
 * Validate object against a schema
 * @param {Object} obj - Object to validate
 * @param {Object} schema - Schema definition { fieldName: [validator, isRequired] }
 * @param {string} objectName - Name for error messages
 * @returns {Object} Validated object
 */
export function validateSchema(obj, schema, objectName = "object") {
  const result = new ValidationResult();
  const validated = {};

  // Check for unknown fields
  const knownFields = Object.keys(schema);
  const unknownFields = Object.keys(obj).filter(key => !knownFields.includes(key));
  if (unknownFields.length > 0) {
    result.addError(
      unknownFields[0],
      `Unknown field(s): ${unknownFields.join(", ")}`,
      ValidationErrorCodes.INVALID_REQUEST
    );
  }

  // Validate each schema field
  for (const [fieldName, [validator, isRequired]] of Object.entries(schema)) {
    const value = obj[fieldName];

    if (value === undefined && isRequired) {
      result.addError(fieldName, `${fieldName} is required.`, ValidationErrorCodes.INVALID_REQUEST);
      continue;
    }

    if (value === undefined) {
      continue;
    }

    try {
      validated[fieldName] = validator(value, fieldName);
    } catch (error) {
      result.addError(fieldName, error.message);
    }
  }

  result.throwIfErrors();
  return validated;
}
