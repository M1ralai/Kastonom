import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ApiError } from "../http/errors/api-error.js";
import { cloneJson } from "../domain/validation.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
export const defaultDemoFixturePath = resolve(currentDir, "../../fixtures/demo-replay.json");

export function loadDemoFixture(path = defaultDemoFixturePath) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new ApiError(
      500,
      "DEMO_FALLBACK_UNAVAILABLE",
      "Demo fallback fixture could not be loaded."
    );
  }
}

export function cloneDemoFixture(path = defaultDemoFixturePath) {
  return cloneJson(loadDemoFixture(path));
}
