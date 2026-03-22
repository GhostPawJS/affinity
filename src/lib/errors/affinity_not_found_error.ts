import { AffinityError } from "./affinity_error.ts";

/** Referenced entity or row does not exist. */
export class AffinityNotFoundError extends AffinityError {
  readonly code = "NOT_FOUND" as const;
}
