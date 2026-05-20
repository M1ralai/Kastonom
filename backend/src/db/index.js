/**
 * Database - PostgreSQL connection pool
 * Tüm veritabanı işlemleri için tek erişim noktası
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

let pool = null;

/**
 * Initialize database connection pool
 */
export function initDatabase() {
  if (pool) {
    log.warn("Database already initialized", { url: DB_URL.split("@")[1] });
    return pool;
  }

  log.info("Initializing database connection", {
    pool_size: DB_POOL_SIZE,
    idle_timeout: DB_IDLE_TIMEOUT_MS,
  });

  pool = new Pool({
    connectionString: DB_URL,
    max: DB_POOL_SIZE,
    idleTimeoutMillis: DB_IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: DB_CONNECTION_TIMEOUT_MS,
  });

  pool.on("connect", () => {
    log.debug("New client connected to database");
  });

  pool.on("error", (err) => {
    log.error("Unexpected database error", { error: err.message });
  });

  log.info("Database connection pool created", { url: DB_URL.split("@")[1] });
  return pool;
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
 * Execute a query with automatic logging
 */
export async function query(text, params = [], meta = {}) {
  const start = Date.now();

  try {
    const result = await getPool().query(text, params);
    const duration = Date.now() - start;

    log.debug("Query executed", {
      duration_ms: duration,
      rows: result.rowCount,
      ...meta,
    });

    return result;
  } catch (err) {
    log.error("Query failed", {
      error: err.message,
      ...meta,
    });
    throw err;
  }
}

/**
 * Execute a transaction with multiple queries
 */
export async function transaction(callback) {
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");
    log.debug("Transaction started");

    const result = await callback(client);

    await client.query("COMMIT");
    log.debug("Transaction committed");

    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    log.error("Transaction rolled back", { error: err.message });
    throw err;
  } finally {
    client.release();
  }
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
