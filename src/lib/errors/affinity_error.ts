/**
 * Stable programmatic codes for `instanceof`-free logging or telemetry if needed.
 */
export type AffinityErrorCode =
  | "NOT_FOUND"
  | "CONFLICT"
  | "INVARIANT"
  | "VALIDATION"
  | "MERGE"
  | "STATE";

/** Base class for all domain failures thrown by Affinity. */
export abstract class AffinityError extends Error {
  abstract readonly code: AffinityErrorCode;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
