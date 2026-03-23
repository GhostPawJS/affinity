import { AffinityValidationError } from "./lib/errors/affinity_validation_error.ts";

/**
 * Returns the provided timestamp or the current wall-clock time (injectable `now` for tests).
 */
export function resolveNow(now?: number): number {
  if (now !== undefined) {
    if (!Number.isFinite(now) || now < 0) {
      throw new AffinityValidationError(
        "now must be a finite non-negative number",
      );
    }
    return now;
  }
  return Date.now();
}
