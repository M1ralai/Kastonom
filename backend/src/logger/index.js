/**
 * Logger - Zap tarzı structured logging
 * Terminale renkli, okunabilir formatta log basar
 */

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

// Colors for terminal output
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
  gray: "\x1b[90m",
};

const LEVEL_COLORS = {
  debug: COLORS.gray,
  info: COLORS.blue,
  warn: COLORS.yellow,
  error: COLORS.red,
};

const LEVEL_TAGS = {
  debug: "DEBUG",
  info: "INFO ",
  warn: "WARN ",
  error: "ERROR",
};

// Parse LOG_LEVEL env var
function getLogLevel() {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase();
  const levels = ["debug", "info", "warn", "error"];
  if (envLevel && levels.includes(envLevel)) {
    return envLevel;
  }
  return "info";
}

// Parse LOG_FORMAT env var (text = terminal, json = production)
function getLogFormat() {
  const format = process.env.LOG_FORMAT?.toLowerCase();
  return format === "json" ? "json" : "text";
}

const CURRENT_LEVEL = getLogLevel();
const CURRENT_FORMAT = getLogFormat();

const LEVEL_PRIORITY = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

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
      ...meta,
    });
  }

  // Text format - terminal friendly
  const metaStr = Object.keys(meta).length > 0
    ? ` ${Object.entries(meta).map(([k, v]) => `${k}=${v}`).join(" ")}`
    : "";

  return `${COLORS.dim}${timestamp}${COLORS.reset} ${levelColor}${levelTag}${COLORS.reset} ${COLORS.bold}${componentStr}${COLORS.reset} ${message}${metaStr}`;
}

class Logger {
  constructor(component = null) {
    this.component = component;
  }

  _log(level, message, meta = {}) {
    if (!shouldLog(level)) return;

    const output = formatMessage(level, this.component, message, meta);

    if (level === "error") {
      console.error(output);
    } else {
      console.log(output);
    }
  }

  debug(message, meta = {}) {
    this._log("debug", message, meta);
  }

  info(message, meta = {}) {
    this._log("info", message, meta);
  }

  warn(message, meta = {}) {
    this._log("warn", message, meta);
  }

  error(message, meta = {}) {
    this._log("error", message, meta);
  }

  // Audit specific method for audit trail
  audit(action, entity, entityId, userId, tenantId, details = {}) {
    this._log("info", `[AUDIT] ${action} ${entity}`, {
      entity_id: entityId,
      user_id: userId,
      tenant_id: tenantId,
      ...details,
    });
  }

  // Child logger with component
  child(component) {
    return new Logger(component);
  }
}

// Create root logger
const rootLogger = new Logger();

export function createLogger(component) {
  if (component) {
    return rootLogger.child(component);
  }
  return rootLogger;
}

export default rootLogger;
