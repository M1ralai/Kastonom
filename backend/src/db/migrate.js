/**
 * Migration CLI
 *
 * Usage:
 *   npm run db:migrate      # run pending migrations
 *   npm run db:create       # create new migration
 *   npm run db:rollback     # rollback last migration
 *   npm run db:status       # show migration status
 */

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "migrations");

// Load env from .env file if exists
function loadEnv() {
  try {
    const envPath = join(process.cwd(), ".env");
    const envContent = readFileSync(envPath, "utf8");
    for (const line of envContent.split("\n")) {
      const [key, ...valueParts] = line.split("=");
      if (key && valueParts.length > 0) {
        const value = valueParts.join("=").trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  } catch {
    // .env file not found, continue with existing env
  }
}

loadEnv();

const DB_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/kastonom";

const pool = new Pool({ connectionString: DB_URL });

const log = {
  info: (msg) => console.log(`  ${msg}`),
  success: (msg) => console.log(`  ✓ ${msg}`),
  error: (msg) => console.error(`  ✗ ${msg}`),
};

// ===========================================
// Migrations Table
// ===========================================

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// ===========================================
// Get executed migrations
// ===========================================

async function getExecutedMigrations() {
  const result = await pool.query("SELECT name FROM _migrations ORDER BY id");
  return result.rows.map((r) => r.name);
}

// ===========================================
// Run migrations
// ===========================================

async function runMigrations() {
  console.log("\n🔄 Running migrations...");

  await ensureMigrationsTable();
  const executed = await getExecutedMigrations();

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let runCount = 0;

  for (const file of files) {
    if (executed.includes(file)) {
      log.info(`Skipping ${file} (already executed)`);
      continue;
    }

    console.log(`\n  → Running ${file}`);
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");

    try {
      await pool.query("BEGIN");
      await pool.query(sql);
      await pool.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
      await pool.query("COMMIT");
      log.success(`${file} executed successfully`);
      runCount++;
    } catch (err) {
      await pool.query("ROLLBACK");
      log.error(`${file} failed: ${err.message}`);
      throw err;
    }
  }

  if (runCount === 0) {
    console.log("\n  No pending migrations.");
  } else {
    console.log(`\n✓ ${runCount} migration(s) completed.`);
  }
}

// ===========================================
// Create new migration
// ===========================================

async function createMigration(name) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `${timestamp}_${name}.sql`;
  const filepath = join(MIGRATIONS_DIR, filename);

  const template = `-- ===========================================
-- Migration: ${name}
-- Created: ${new Date().toISOString()}
-- ===========================================

`;

  writeFileSync(filepath, template);
  console.log(`\n✓ Created migration: ${filename}`);
  console.log(`  Path: ${filepath}`);
}

// ===========================================
// Rollback last migration
// ===========================================

async function rollbackMigration() {
  console.log("\n↩️  Rolling back last migration...");

  const result = await pool.query(
    "SELECT name FROM _migrations ORDER BY id DESC LIMIT 1"
  );

  if (result.rows.length === 0) {
    log.info("No migrations to rollback");
    return;
  }

  const lastMigration = result.rows[0].name;
  console.log(`  Rolling back: ${lastMigration}`);

  // Note: For full rollback support, migrations should have UP/DOWN
  // For now, we'll just remove the record (manual rollback required)
  // This is a simplified approach - production would need proper DOWN scripts

  await pool.query("DELETE FROM _migrations WHERE name = $1", [lastMigration]);
  log.success(`Rolled back: ${lastMigration}`);
  console.log(`\n  Note: Manual rollback required for ${lastMigration}`);
}

// ===========================================
// Show status
// ===========================================

async function showStatus() {
  console.log("\n📊 Migration Status\n");

  await ensureMigrationsTable();
  const executed = await getExecutedMigrations();

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log("  Migrations:");
  console.log("  ────────────────────────────────");

  for (const file of files) {
    const status = executed.includes(file) ? "✓ executed" : "○ pending";
    const color = executed.includes(file) ? "\x1b[32m" : "\x1b[33m";
    console.log(`  ${color}${status}\x1b[0m  ${file}`);
  }

  const pending = files.length - executed.length;
  console.log(`\n  Total: ${files.length} | Executed: ${executed.length} | Pending: ${pending}`);
}

// ===========================================
// CLI Entry Point
// ===========================================

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  try {
    switch (command) {
      case "create":
        const name = args[1];
        if (!name) {
          console.error("Usage: npm run db:create -- <migration-name>");
          process.exit(1);
        }
        await createMigration(name);
        break;

      case "rollback":
        await rollbackMigration();
        break;

      case "status":
        await showStatus();
        break;

      case undefined:
      case "migrate":
      case "up":
        await runMigrations();
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.log("Usage:");
        console.log("  npm run db:migrate    # run pending migrations");
        console.log("  npm run db:create     # create new migration");
        console.log("  npm run db:rollback   # rollback last");
        console.log("  npm run db:status     # show status");
        process.exit(1);
    }

    await pool.end();
  } catch (err) {
    log.error(err.message);
    await pool.end();
    process.exit(1);
  }
}

main();
