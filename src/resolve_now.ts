/**
 * Returns the provided timestamp or the current wall-clock time (injectable `now` for tests).
 */
export function resolveNow(now?: number): number {
  return now ?? Date.now();
}
