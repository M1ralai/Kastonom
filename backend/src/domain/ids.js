export function createIdFactory() {
  const counters = new Map();

  return {
    next(prefix) {
      const normalized = String(prefix).replaceAll("_", "-");
      const nextValue = (counters.get(normalized) ?? 0) + 1;
      counters.set(normalized, nextValue);
      return `${normalized}-${String(nextValue).padStart(4, "0")}`;
    }
  };
}
