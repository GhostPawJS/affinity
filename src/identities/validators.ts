import type { AffinityDb } from "../database.ts";
import { AffinityConflictError } from "../lib/errors/affinity_conflict_error.ts";

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
            "SELECT id FROM identities WHERE normalized_key = ? AND removed_at IS NULL",
          )
          .get(normalizedKey)
      : db
          .prepare(
            "SELECT id FROM identities WHERE normalized_key = ? AND removed_at IS NULL AND id != ?",
          )
          .get(normalizedKey, excludeIdentityId);
  if (row !== undefined) {
    const owner = db
      .prepare(
        "SELECT c.id, c.name FROM contacts c JOIN identities i ON i.contact_id = c.id WHERE i.normalized_key = ? AND i.removed_at IS NULL",
      )
      .get(normalizedKey) as { id: number; name: string } | undefined;
    throw new AffinityConflictError(
      `${normalizedKey.replace(":", " ")} already belongs to #${owner?.id} ${owner?.name}`,
    );
  }
}
