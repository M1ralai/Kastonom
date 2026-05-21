/**
 * Database - PostgreSQL connection pool with production hardening
 * Connection retry, health checks, transaction support
 */

import pg from "pg";
import { createLogger } from "../logger/index.js";

const { Pool } = pg;
const log = createLogger("db");

// Database config from env
const DB_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/kastonom";
const DB_POOL_SIZE = parseInt(process.env.DB_POOL_SIZE || "10", 10);
const DB_IDLE_TIMEOUT_MS = parseInt(process.env.DB_IDLE_TIMEOUT_MS || "30000", 10);
const DB_CONNECTION_TIMEOUT_MS = parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || "5000", 10);
const DB_QUERY_TIMEOUT_MS = parseInt(process.env.DB_QUERY_TIMEOUT_MS || "30000", 10);
const DB_RETRY_ATTEMPTS = parseInt(process.env.DB_RETRY_ATTEMPTS || "3", 10);
const DB_RETRY_DELAY_MS = parseInt(process.env.DB_RETRY_DELAY_MS || "1000", 10);

let pool = null;
let isInitialized = false;

/**
 * Sleep utility for retry delays
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Initialize database connection pool with retry logic
 */
export async function initDatabase() {
  if (pool) {
    log.warn("Database already initialized", { url: DB_URL.split("@")[1] });
    return pool;
  }

  log.info("Initializing database connection", {
    pool_size: DB_POOL_SIZE,
    idle_timeout: DB_IDLE_TIMEOUT_MS,
    connection_timeout: DB_CONNECTION_TIMEOUT_MS,
    retry_attempts: DB_RETRY_ATTEMPTS
  });

  // Retry connection with exponential backoff
  let lastError = null;
  for (let attempt = 1; attempt <= DB_RETRY_ATTEMPTS; attempt++) {
    try {
      pool = createPool();
      
      // Test connection
      const client = await pool.connect();
      await client.query("SELECT 1");
      client.release();
      
      log.info("Database connection pool created and verified", { 
        url: DB_URL.split("@")[1],
        attempt 
      });
      
      isInitialized = true;
      return pool;
    } catch (err) {
      lastError = err;
      log.warn("Database connection attempt failed", { 
        attempt, 
        maxAttempts: DB_RETRY_ATTEMPTS,
        error: err.message 
      });
      
      if (attempt < DB_RETRY_ATTEMPTS) {
        const delay = DB_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        log.info("Retrying database connection", { delayMs: delay });
        await sleep(delay);
      }
    }
  }

  // All retries exhausted
  log.error("Database connection failed after all retries", { 
    attempts: DB_RETRY_ATTEMPTS,
    error: lastError?.message 
  });
  throw lastError;
}

/**
 * Create pool with event handlers
 */
function createPool() {
  const newPool = new Pool({
    connectionString: DB_URL,
    max: DB_POOL_SIZE,
    idleTimeoutMillis: DB_IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: DB_CONNECTION_TIMEOUT_MS,
  });

  newPool.on("connect", (client) => {
    log.debug("New client connected to database");
    
    // Set query timeout for each client
    client.query(`SET statement_timeout = '${DB_QUERY_TIMEOUT_MS}'`)
      .catch(err => log.warn("Failed to set statement timeout", { error: err.message }));
  });

  newPool.on("error", (err) => {
    log.error("Unexpected database error", { error: err.message });
  });

  newPool.on("remove", () => {
    log.debug("Client removed from pool");
  });

  return newPool;
}

/**
 * Get the database pool (must call initDatabase first)
 */
export function getPool() {
  if (!pool) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return pool;
}

/**
 * Execute a query with automatic logging and retry on transient errors
 */
export async function query(text, params = [], meta = {}) {
  const start = Date.now();
  let lastError = null;

  for (let attempt = 1; attempt <= DB_RETRY_ATTEMPTS; attempt++) {
    try {
      const result = await getPool().query(text, params);
      const duration = Date.now() - start;

      // Log slow queries
      if (duration > 1000) {
        log.warn("Slow query detected", {
          duration_ms: duration,
          rows: result.rowCount,
          ...meta,
        });
      } else {
        log.debug("Query executed", {
          duration_ms: duration,
          rows: result.rowCount,
          ...meta,
        });
      }

      return result;
    } catch (err) {
      lastError = err;
      
      // Don't retry on client errors (invalid SQL, constraints, etc.)
      if (isClientError(err)) {
        log.error("Query failed (client error, not retrying)", {
          error: err.message,
          code: err.code,
          ...meta,
        });
        throw err;
      }

      // Retry on transient errors
      if (attempt < DB_RETRY_ATTEMPTS && isTransientError(err)) {
        log.warn("Transient query error, retrying", {
          attempt,
          error: err.message,
          ...meta,
        });
        await sleep(DB_RETRY_DELAY_MS * attempt);
        continue;
      }

      log.error("Query failed", {
        error: err.message,
        code: err.code,
        attempt,
        ...meta,
      });
      throw err;
    }
  }

  throw lastError;
}

/**
 * Check if error is a client-side error (don't retry)
 */
function isClientError(err) {
  // PostgreSQL error codes that should not be retried
  const clientErrorCodes = [
    "22P02", // invalid_text_representation
    "23505", // unique_violation
    "23503", // foreign_key_violation
    "23514", // check_violation
    "42804", // datatype_mismatch
    "42P01", // undefined_table
    "42703", // undefined_column
    "23502", // not_null_violation
  ];
  return err.code && clientErrorCodes.includes(err.code);
}

/**
 * Check if error is transient (can retry)
 */
function isTransientError(err) {
  const transientCodes = [
    "ECONNREFUSED",
    "ENOTFOUND",
    "ETIMEDOUT",
    "ECONNRESET",
    "57P01", // admin_shutdown
    "57P02", // crash_shutdown
    "57P03", // cannot_connect_now
    "08000", // connection_exception
    "08003", // connection_does_not_exist
    "08006", // connection_failure
  ];
  return transientCodes.includes(err.code) || 
         err.code?.startsWith("08") || // Connection-related PostgreSQL errors
         err.message?.includes("connection");
}

/**
 * Execute a transaction with multiple queries
 * Provides a client wrapper with automatic logging
 */
export async function transaction(callback) {
  const client = await getPool().connect();
  let start = Date.now();

  try {
    await client.query("BEGIN");
    log.debug("Transaction started");

    // Wrap client with query method for convenience
    const txClient = {
      query: async (text, params = []) => {
        const qStart = Date.now();
        try {
          const result = await client.query(text, params);
          log.debug("Transaction query", {
            duration_ms: Date.now() - qStart,
            rows: result.rowCount
          });
          return result;
        } catch (err) {
          log.error("Transaction query failed", {
            error: err.message,
            duration_ms: Date.now() - qStart
          });
          throw err;
        }
      },
      release: () => client.release()
    };

    const result = await callback(txClient);

    await client.query("COMMIT");
    log.debug("Transaction committed", { duration_ms: Date.now() - start });

    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(rbErr => {
      log.error("Rollback also failed", { error: rbErr.message });
    });
    log.error("Transaction rolled back", { error: err.message });
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Get connection pool statistics
 */
export function getPoolStats() {
  if (!pool) return null;
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
    max: pool.options.max
  };
}

/**
 * Close database connection pool
 */
export async function closeDatabase() {
  if (pool) {
    log.info("Closing database connection pool");
    await pool.end();
    pool = null;
    log.info("Database connection pool closed");
  }
}

/**
 * Check database health
 */
export async function healthCheck() {
  try {
    const start = Date.now();
    const result = await query("SELECT 1 as health", [], { check: "health" });
    const duration = Date.now() - start;

    return {
      healthy: true,
      duration_ms: duration,
    };
  } catch (err) {
    return {
      healthy: false,
      error: err.message,
    };
  }
}

export default {
  initDatabase,
  getPool,
  query,
  transaction,
  closeDatabase,
  healthCheck,
};
