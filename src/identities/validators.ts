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
    throw new AffinityConflictError(
      "another contact already owns this normalized identity",
    );
  }
}
