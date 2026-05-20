import { invalidRequest, validationError } from "../http/errors/api-error.js";

export function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function cloneJson(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export function requireObject(value, name) {
  if (!isPlainObject(value)) {
    throw invalidRequest(`${name} must be an object.`);
  }
  return value;
}

export function requireString(value, name, options = {}) {
  if (typeof value !== "string" || value.trim() === "") {
    throw validationError(`${name} is required.`, options);
  }
  return value.trim();
}

export function optionalString(value, name) {
  if (value == null || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    throw validationError(`${name} must be a string.`);
  }
  return value.trim();
}

export function requireBoolean(value, name) {
  if (typeof value !== "boolean") {
    throw validationError(`${name} must be a boolean.`);
  }
  return value;
}

export function requireNumber(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw validationError(`${name} must be a finite number.`);
  }
  return value;
}

export function optionalNumber(value, name) {
  if (value == null || value === "") {
    return null;
  }
  return requireNumber(value, name);
}

export function requireInteger(value, name, options = {}) {
  if (!Number.isInteger(value)) {
    throw validationError(`${name} must be an integer.`, options);
  }
  return value;
}

export function requireArray(value, name, options = {}) {
  if (!Array.isArray(value)) {
    throw validationError(`${name} must be an array.`, options);
  }
  if (options.minLength && value.length < options.minLength) {
    throw validationError(`${name} must contain at least ${options.minLength} item(s).`, options);
  }
  return value;
}

export function stringArray(value, name, options = {}) {
  return requireArray(value, name, options).map((item, index) =>
    requireString(item, `${name}[${index}]`, options)
  );
}

export function enumValue(value, name, allowed, options = {}) {
  const nextValue = requireString(value, name, options);
  if (!allowed.includes(nextValue)) {
    throw validationError(`${name} must be one of: ${allowed.join(", ")}.`, options);
  }
  return nextValue;
}

export function optionalEnumValue(value, name, allowed, fallback = null) {
  if (value == null || value === "") {
    return fallback;
  }
  return enumValue(value, name, allowed);
}

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
    throw validationError(`${name} must be a valid http(s) URL.`);
  }
}

export function optionalSafeDestinationUrl(value, name) {
  return optionalUrl(value, name);
}

export function dateString(value, name) {
  const text = requireString(value, name);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw validationError(`${name} must be a YYYY-MM-DD date.`);
  }
  return text;
}
