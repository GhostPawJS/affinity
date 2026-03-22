import { AffinityError } from "./affinity_error.ts";

/** Request would violate model truth (e.g. progression on a structural tie). */
export class AffinityInvariantError extends AffinityError {
  readonly code = "INVARIANT" as const;
}
