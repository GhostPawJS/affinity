import { AffinityError } from "./affinity_error.ts";

/** Narrow unknown failures from Affinity operations. */
export function isAffinityError(value: unknown): value is AffinityError {
  return value instanceof AffinityError;
}
