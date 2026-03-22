import { AffinityError } from "./affinity_error.ts";

/** Forbidden lifecycle or relationship transition. */
export class AffinityStateError extends AffinityError {
  readonly code = "STATE" as const;
}
