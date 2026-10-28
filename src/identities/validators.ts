import type { AffinityDb } from "../database.ts";
import { AffinityConflictError } from "../lib/errors/affinity_conflict_error.ts";
import { legacyIdentityKey } from "./normalize.ts";

/** Ensures no other live identity owns this normalized key. */
export function assertNoIdentityCollision(
  db: AffinityDb,
  normalizedKey: string,
  excludeIdentityId?: number,
): void {
  const row =
    excludeIdentityId === undefined
      ? db
          .prepare(
            "SELECT id FROM identities WHERE (normalized_key IN (?, ?) OR (type='custom:atproto-did' AND ? = 'did:' || lower(value))) AND removed_at IS NULL",
          )
          .get(normalizedKey, legacyIdentityKey(normalizedKey), normalizedKey)
      : db
          .prepare(
            "SELECT id FROM identities WHERE (normalized_key IN (?, ?) OR (type='custom:atproto-did' AND ? = 'did:' || lower(value))) AND removed_at IS NULL AND id != ?",
          )
          .get(
            normalizedKey,
            legacyIdentityKey(normalizedKey),
            normalizedKey,
            excludeIdentityId,
          );
  if (row !== undefined) {
    const owner = db
      .prepare(
        "SELECT c.id, c.name FROM contacts c JOIN identities i ON i.contact_id = c.id WHERE (i.normalized_key IN (?, ?) OR (i.type='custom:atproto-did' AND ? = 'did:' || lower(i.value))) AND i.removed_at IS NULL",
      )
      .get(normalizedKey, legacyIdentityKey(normalizedKey), normalizedKey) as
      | { id: number; name: string }
      | undefined;
    throw new AffinityConflictError(
      `${normalizedKey.replace(":", " ")} already belongs to #${owner?.id} ${owner?.name}`,
    );
  }
}
