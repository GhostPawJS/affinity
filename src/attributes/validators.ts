import { getContactRowById } from "../contacts/queries.ts";
import type { AffinityDb } from "../database.ts";
import { AffinityNotFoundError } from "../lib/errors/affinity_not_found_error.ts";
import { AffinityStateError } from "../lib/errors/affinity_state_error.ts";
import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";
import type { AttributeEntry } from "../lib/types/attribute_entry.ts";
import type { AttributeTarget } from "../lib/types/attribute_target.ts";
import { getLinkRowById } from "../links/queries.ts";
import { assertLinkEndpointsNotMerged } from "../links/validators.ts";
import { normalizeAttributeValue } from "./normalize.ts";

export function validateAttributeName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new AffinityValidationError("attribute name must be non-empty");
  }
  return trimmed;
}

/** Returns normalized entries (trimmed names, normalized values). */
export function validateAttributeEntries(
  entries: readonly AttributeEntry[],
): { name: string; value: string | null }[] {
  const seen = new Set<string>();
  const out: { name: string; value: string | null }[] = [];
  for (const entry of entries) {
    const name = validateAttributeName(entry.name);
    if (seen.has(name)) {
      throw new AffinityValidationError(
        "duplicate attribute name in replacement set",
      );
    }
    seen.add(name);
    out.push({ name, value: normalizeAttributeValue(entry.value) });
  }
  return out;
}

export function assertAttributeTargetWritable(
  db: AffinityDb,
  target: AttributeTarget,
): void {
  if (target.kind === "contact") {
    const contact = getContactRowById(db, target.id);
    if (!contact) {
      throw new AffinityNotFoundError("contact not found");
    }
    if (contact.lifecycle_state === "merged") {
      throw new AffinityStateError("merged contact is read-only");
    }
    return;
  }
  const link = getLinkRowById(db, target.id);
  if (!link) {
    throw new AffinityNotFoundError("link not found");
  }
  assertLinkEndpointsNotMerged(db, link);
}
