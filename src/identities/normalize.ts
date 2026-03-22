import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";

/**
 * Deterministic collision key — caller supplies trimmed type/value for storage;
 * normalization is always derived here, never caller-provided.
 */
export function normalizeIdentityKey(type: string, value: string): string {
  const t = type.trim().toLowerCase();
  const v = value.trim().toLowerCase();
  if (t.length === 0 || v.length === 0) {
    throw new AffinityValidationError("type and value must be non-empty");
  }
  return `${t}:${v}`;
}
