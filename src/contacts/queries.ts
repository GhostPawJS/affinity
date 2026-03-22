import type { AffinityDb } from "../database.ts";
import { AffinityInvariantError } from "../lib/errors/affinity_invariant_error.ts";
import type { ContactRow } from "../lib/types/contact_row.ts";

export function getContactRowById(
  db: AffinityDb,
  id: number,
): ContactRow | null {
  const row = db
    .prepare(
      `SELECT id, name, kind, lifecycle_state, is_owner, merged_into_contact_id,
              created_at, updated_at, deleted_at
       FROM contacts
       WHERE id = ? AND deleted_at IS NULL`,
    )
    .get(id);
  if (row === undefined) {
    return null;
  }
  return row as unknown as ContactRow;
}

export function findOwnerContactId(db: AffinityDb): number | null {
  const row = db
    .prepare(
      `SELECT id FROM contacts
       WHERE is_owner = 1 AND deleted_at IS NULL`,
    )
    .get() as { id: number } | undefined;
  if (row === undefined) {
    return null;
  }
  return Number(row.id);
}

export function requireOwnerContactId(db: AffinityDb): number {
  const ownerId = findOwnerContactId(db);
  if (ownerId === null) {
    throw new AffinityInvariantError("owner contact not found");
  }
  return ownerId;
}
