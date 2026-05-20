import { randomUUID } from "node:crypto";

export function createIdFactory() {
  const counters = new Map();

  return {
    /**
     * Generate human-readable ID for memory store (e.g., "tenant-0001")
     */
    next(prefix) {
      const normalized = String(prefix).replaceAll("_", "-");
      const nextValue = (counters.get(normalized) ?? 0) + 1;
      counters.set(normalized, nextValue);
      return `${normalized}-${String(nextValue).padStart(4, "0")}`;
    },

    /**
     * Generate a valid UUID for PostgreSQL storage
     */
    uuid() {
      return randomUUID();
    }
  };
}
