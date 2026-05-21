/**
 * Logger - Zap tarzı structured logging
 * Terminale renkli, okunabilir formatta log basar
 * Destekler: text format (development), json format (production)
 */

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

// ─── Configuration ─────────────────────────────────────────────────

const ENV_CONFIG = {
  LOG_LEVEL: process.env.LOG_LEVEL?.toLowerCase(),
  LOG_FORMAT: process.env.LOG_FORMAT?.toLowerCase(),
  NODE_ENV: process.env.NODE_ENV
};

// Parse LOG_LEVEL env var
function getLogLevel() {
  const levels = ["debug", "info", "warn", "error"];
  if (ENV_CONFIG.LOG_LEVEL && levels.includes(ENV_CONFIG.LOG_LEVEL)) {
    return ENV_CONFIG.LOG_LEVEL;
  }
  return "info";
}

// Parse LOG_FORMAT env var (text = terminal, json = production)
function getLogFormat() {
  if (ENV_CONFIG.LOG_FORMAT === "json") {
    return "json";
  }
  // Auto-detect: use json in production
  if (ENV_CONFIG.NODE_ENV === "production") {
    return "json";
  }
  return "text";
}

const CURRENT_LEVEL = getLogLevel();
const CURRENT_FORMAT = getLogFormat();

const LEVEL_PRIORITY = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

// ─── Colors ───────────────────────────────────────────────────────

const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m"
};

const LEVEL_COLORS = {
  debug: COLORS.gray,
  info: COLORS.blue,
  warn: COLORS.yellow,
  error: COLORS.red
};

const LEVEL_TAGS = {
  debug: "DEBUG",
  info: "INFO ",
  warn: "WARN ",
  error: "ERROR"
};

// ─── Helpers ──────────────────────────────────────────────────────

function shouldLog(level) {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[CURRENT_LEVEL];
}

function formatTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function formatMessage(level, component, message, meta = {}) {
  const timestamp = formatTimestamp();
  const levelColor = LEVEL_COLORS[level];
  const levelTag = LEVEL_TAGS[level];
  const componentStr = component ? `[${component}]` : "";

  if (CURRENT_FORMAT === "json") {
    return JSON.stringify({
      timestamp,
      level: level.toUpperCase(),
      component,
      message,
      service: "kastonom-backend",
      ...meta
    });
  }

  // Text format - terminal friendly
  const metaStr = Object.keys(meta).length > 0
    ? ` ${Object.entries(meta).map(([k, v]) => `${k}=${v}`).join(" ")}`
    : "";

  return `${COLORS.dim}${timestamp}${COLORS.reset} ${levelColor}${levelTag}${COLORS.reset} ${COLORS.bold}${componentStr}${COLORS.reset} ${message}${metaStr}`;
}

function sanitizeForLog(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string") {
    // Truncate long strings
    if (value.length > 1000) {
      return value.substring(0, 1000) + "... [truncated]";
    }
    return value;
  }
  if (typeof value === "object") {
    try {
      const serialized = JSON.stringify(value);
      if (serialized.length > 1000) {
        return "[large object truncated]";
      }
      return value;
    } catch {
      return "[unserializable object]";
    }
  }
  return value;
}

// ─── Logger Class ─────────────────────────────────────────────────

/**
 * Structured logger with component names and context tracking
 */
class Logger {
  /**
   * @param {string|null} component - Component name (e.g., "request", "auth")
   * @param {Object} initialContext - Initial context (e.g., { requestId, tenantId })
   */
  constructor(component = null, initialContext = {}) {
    this.component = component;
    this.context = { ...initialContext };
  }

  /**
   * Set context values that will be included in all subsequent logs
   * @param {Object} context - Context key-value pairs
   * @returns {Logger} Same logger instance (for chaining)
   */
  withContext(context) {
    Object.assign(this.context, context);
    return this;
  }

  /**
   * Create a child logger with additional component context
   * @param {string} component - Child component name
   * @returns {Logger} New logger with combined context
   */
  child(component) {
    const combinedComponent = this.component
      ? `${this.component}:${component}`
      : component;
    return new Logger(combinedComponent, this.context);
  }

  _log(level, message, meta = {}) {
    if (!shouldLog(level)) {
      return;
    }

    // Merge meta with context
    const mergedMeta = {
      ...this.context,
      ...Object.fromEntries(
        Object.entries(meta).map(([k, v]) => [k, sanitizeForLog(v)])
      )
    };

    const output = formatMessage(level, this.component, message, mergedMeta);

    if (level === "error") {
      console.error(output);
    } else {
      console.log(output);
    }
  }

  /**
   * Log debug message
   */
  debug(message, meta = {}) {
    this._log("debug", message, meta);
  }

  /**
   * Log info message
   */
  info(message, meta = {}) {
    this._log("info", message, meta);
  }

  /**
   * Log warning message
   */
  warn(message, meta = {}) {
    this._log("warn", message, meta);
  }

  /**
   * Log error message
   */
  error(message, meta = {}) {
    this._log("error", message, meta);
  }

  /**
   * Log HTTP request
   */
  httpRequest(method, path, status, durationMs, meta = {}) {
    const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
    this._log(level, `${method} ${path} ${status} ${durationMs}ms`, {
      http: {
        method,
        path,
        status,
        duration_ms: durationMs
      },
      ...meta
    });
  }

  /**
   * Audit specific method for audit trail
   */
  audit(action, entity, entityId, userId, tenantId, details = {}) {
    this._log("info", `[AUDIT] ${action} ${entity}`, {
      entity_id: entityId,
      user_id: userId,
      tenant_id: tenantId,
      ...details
    });
  }
}

// ─── Root Logger ──────────────────────────────────────────────────

const rootLogger = new Logger();

/**
 * Create a logger for a specific component
 * @param {string} component - Component name
 * @returns {Logger}
 */
export function createLogger(component) {
  if (component) {
    return rootLogger.child(component);
  }
  return rootLogger;
}

/**
 * Create a logger with initial context (e.g., request tracking)
 * @param {Object} context - Initial context { requestId, tenantId, ... }
 * @param {string} component - Optional component name
 * @returns {Logger}
 */
export function createLoggerWithContext(context, component = null) {
  return new Logger(component, context);
}

export default rootLogger;
