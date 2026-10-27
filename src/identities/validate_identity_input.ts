import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";

export const identityTypes = [
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

export function validateIdentityInput(type: string, value: string): void {
  const kind = type.toLowerCase();
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
