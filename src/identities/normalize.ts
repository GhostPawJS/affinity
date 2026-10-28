import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";

/**
 * Deterministic collision key — caller supplies trimmed type/value for storage;
 * normalization is always derived here, never caller-provided.
 */
export const handleIdentityTypes = new Set([
  "handle",
  "bluesky",
  "x",
  "twitter",
  "mastodon",
  "github",
  "instagram",
  "telegram",
  "linkedin",
  "facebook",
  "youtube",
  "tiktok",
  "discord",
  "slack",
]);
export function normalizeIdentityValue(type: string, value: string): string {
  const v = value.trim();
  return handleIdentityTypes.has(type.toLowerCase())
    ? v.replace(/^@/, "").toLowerCase()
    : v;
}
export function normalizeIdentityKey(type: string, value: string): string {
  let t = type.trim().toLowerCase();
  if (["did", "atproto_did", "custom:atproto-did"].includes(t)) t = "did";
  const v = normalizeIdentityValue(t, value).toLowerCase();
  if (t.length === 0 || v.length === 0) {
    throw new AffinityValidationError("type and value must be non-empty");
  }
  return `${t}:${v}`;
}

/** Compatibility with identities stored before handle normalization. */
export function legacyIdentityKey(key: string): string {
  const colon = key.indexOf(":");
  return handleIdentityTypes.has(key.slice(0, colon))
    ? `${key.slice(0, colon + 1)}@${key.slice(colon + 1)}`
    : key;
}
