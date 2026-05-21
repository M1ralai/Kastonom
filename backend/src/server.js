import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createApp } from "./app.js";
import { initDatabase, closeDatabase } from "./db/index.js";
import { createLogger } from "./logger/index.js";

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: resolve(backendRoot, ".env") });
dotenv.config({ path: resolve(backendRoot, ".env.local"), override: true });

const log = createLogger("server");

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "0.0.0.0";

// Initialize database
initDatabase();

const app = createApp();
const server = app.createServer();

server.listen(port, host, () => {
  log.info(`Kastonom backend listening on http://${host}:${port}`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  log.info("SIGTERM received, shutting down gracefully...");
  await closeDatabase();
  process.exit(0);
});

process.on("SIGINT", async () => {
  log.info("SIGINT received, shutting down gracefully...");
  await closeDatabase();
  process.exit(0);
});
