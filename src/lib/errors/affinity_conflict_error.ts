import { AffinityError } from "./affinity_error.ts";

/** Uniqueness, routing, or ownership collision. */
export class AffinityConflictError extends AffinityError {
  existingContactId?: number;
  readonly code = "CONFLICT" as const;
}
