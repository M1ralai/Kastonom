export function createClock(options = {}) {
  const fixed = options.fixed;

  return {
    now() {
      return fixed ?? new Date().toISOString();
    },
    today() {
      return (fixed ?? new Date().toISOString()).slice(0, 10);
    }
  };
}
