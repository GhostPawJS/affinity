import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";

import { handleIdentityTypes, normalizeIdentityValue } from "./normalize.ts";

export const identityTypes = [
  "did",
  "atproto_did",
  "email",
  "phone",
  "url",
  "website",
  "handle",
  "x",
  "twitter",
  "linkedin",
  "github",
  "mastodon",
  "bluesky",
  "telegram",
  "whatsapp",
  "signal",
  "matrix",
  "discord",
  "slack",
  "instagram",
  "facebook",
  "youtube",
  "tiktok",
  "address",
  "other",
  "account_id",
  "alias",
];

export function validateIdentityInput(type: string, rawValue: string): void {
  const kind = type.toLowerCase();
  const value = normalizeIdentityValue(kind, rawValue);
  if (
    ["did", "atproto_did", "custom:atproto-did"].includes(kind) &&
    !/^did:[a-z0-9]+:[A-Za-z0-9._:%-]+$/.test(value)
  )
    throw new AffinityValidationError(
      "did value must match did:<method>:<identifier> (for example did:plc:abc123)",
    );
  if (handleIdentityTypes.has(kind)) {
    const pattern =
      kind === "bluesky"
        ? /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/
        : ["x", "twitter"].includes(kind)
          ? /^[a-z0-9_]{1,15}$/
          : kind === "mastodon"
            ? /^[a-z0-9_.-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/
            : /^[a-z0-9_.-]+$/;
    if (!pattern.test(value))
      throw new AffinityValidationError(
        `invalid ${kind === "handle" ? "" : `${kind} `}handle; use a handle without spaces or a URI${kind === "mastodon" ? ": user@host.tld" : kind === "bluesky" ? ": name.bsky.social" : " (leading @ is optional)"}`,
      );
  }
  if (!identityTypes.includes(kind) && !/^custom:[a-z0-9_-]+$/.test(type))
    throw new AffinityValidationError(
      `identity type must be one of ${identityTypes.join(", ")}, or custom:<name> (lowercase a-z, 0-9, underscore or hyphen)`,
    );
  if (!value.trim())
    throw new AffinityValidationError("identity value must be non-empty");
  if (kind === "email" && !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(value))
    throw new AffinityValidationError(
      "email value must match local@domain.tld",
    );
  if (kind === "phone" && value.replace(/\D/g, "").length < 5)
    throw new AffinityValidationError(
      "phone value must contain at least 5 digits",
    );
  if (kind === "url" || kind === "website") {
    try {
      const url = new URL(value.includes("://") ? value : `https://${value}`);
      if (
        !["http:", "https:"].includes(url.protocol) ||
        !url.hostname ||
        /\s/.test(value)
      )
        throw new Error();
    } catch {
      throw new AffinityValidationError(
        "url/website value must be an http/https URL or bare domain",
      );
    }
  }
}
