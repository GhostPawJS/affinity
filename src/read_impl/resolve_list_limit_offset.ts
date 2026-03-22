import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";
import type { AffinityListReadOptions } from "../lib/types/read_list_options.ts";
import { resolveAffinityListLimit } from "../lib/types/resolve_affinity_list_limit.ts";

export function resolveListLimitOffset(options?: AffinityListReadOptions): {
  limit: number;
  offset: number;
} {
  const limit = resolveAffinityListLimit(options?.limit);
  const offset = options?.offset ?? 0;
  if (!Number.isInteger(offset) || offset < 0) {
    throw new AffinityValidationError("offset must be a non-negative integer");
  }
  return { limit, offset };
}
