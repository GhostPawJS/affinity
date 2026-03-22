import type { AffinityDb } from "../database.ts";
import type { IdentityRow } from "../lib/types/identity_row.ts";

export function getIdentityRowById(
  db: AffinityDb,
  id: number,
): IdentityRow | null {
  const row = db
    .prepare(
      `SELECT id, contact_id, type, value, label, normalized_key, verified, verified_at,
              created_at, updated_at, removed_at
       FROM identities
       WHERE id = ? AND removed_at IS NULL`,
    )
    .get(id);
  if (row === undefined) {
    return null;
  }
  return row as unknown as IdentityRow;
}
