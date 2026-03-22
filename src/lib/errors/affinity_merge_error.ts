import { AffinityError } from "./affinity_error.ts";

/** Illegal or ambiguous merge (e.g. merge into self). */
export class AffinityMergeError extends AffinityError {
  readonly code = "MERGE" as const;
}
