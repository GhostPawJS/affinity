/** Trims string values; blank after trim becomes null (tag/presence). */
export function normalizeAttributeValue(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
