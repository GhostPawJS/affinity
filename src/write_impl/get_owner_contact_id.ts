import type { AffinityDb } from "../database.ts";
import { AffinityInvariantError } from "../lib/errors/affinity_invariant_error.ts";

export function getOwnerContactId(db: AffinityDb): number {
  const row = db
    .prepare(
      `SELECT id FROM contacts
       WHERE is_owner = 1 AND deleted_at IS NULL`,
    )
    .get();
  if (row === undefined) {
    throw new AffinityInvariantError("owner contact not found");
  }
  return Number((row as { id: number }).id);
}
