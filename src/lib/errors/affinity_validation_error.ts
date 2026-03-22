import { AffinityError } from "./affinity_error.ts";

/** Malformed input, unsupported sort/filter, or out-of-range value. */
export class AffinityValidationError extends AffinityError {
  readonly code = "VALIDATION" as const;
}
