import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";
/** Trims string values; blank after trim becomes null (tag/presence). */
export function normalizeAttributeValue(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  if (typeof value !== "string")
    throw new AffinityValidationError("attribute values are strings or null");
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
