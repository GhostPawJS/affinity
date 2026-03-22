import { AffinityValidationError } from "../errors/affinity_validation_error.ts";
import {
  AFFINITY_DEFAULT_LIST_LIMIT,
  AFFINITY_MAX_LIST_LIMIT,
} from "./read_list_options.ts";

/**
 * Applies default list limit and CONCEPT bounds (throws when out of range).
 */
export function resolveAffinityListLimit(limit: number | undefined): number {
  if (limit === undefined) {
    return AFFINITY_DEFAULT_LIST_LIMIT;
  }
  if (!Number.isInteger(limit) || limit < 1) {
    throw new AffinityValidationError("limit must be a positive integer");
  }
  if (limit > AFFINITY_MAX_LIST_LIMIT) {
    throw new AffinityValidationError(
      `limit must be <= ${String(AFFINITY_MAX_LIST_LIMIT)}`,
    );
  }
  return limit;
}
