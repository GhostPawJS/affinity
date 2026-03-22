import type { AffinityDb } from "../database.ts";
import { AffinityInvariantError } from "../lib/errors/affinity_invariant_error.ts";
import { AffinityNotFoundError } from "../lib/errors/affinity_not_found_error.ts";
import type { LinkRow } from "../lib/types/link_row.ts";

export function getLinkRowById(db: AffinityDb, id: number): LinkRow | null {
  const row = db
    .prepare(
      `SELECT id, from_contact_id, to_contact_id, kind, role, is_structural,
              rank, affinity, trust, state, cadence_days, bond,
              created_at, updated_at, removed_at
       FROM links
       WHERE id = ? AND removed_at IS NULL`,
    )
    .get(id);
  if (row === undefined) {
    return null;
  }
  return row as unknown as LinkRow;
}

export function findRelationalLinkId(
  db: AffinityDb,
  a: number,
  b: number,
): number | null {
  const row = db
    .prepare(
      `SELECT id FROM links
       WHERE removed_at IS NULL AND is_structural = 0
         AND (
           (from_contact_id = ? AND to_contact_id = ?)
           OR (from_contact_id = ? AND to_contact_id = ?)
         )
       LIMIT 1`,
    )
    .get(a, b, b, a) as { id: number } | undefined;
  if (row === undefined) {
    return null;
  }
  return row.id;
}

/** Any live relational link between two contacts (either direction). */
export function findLiveRelationalLinkAnyDirection(
  db: AffinityDb,
  a: number,
  b: number,
): LinkRow | null {
  const row = db
    .prepare(
      `SELECT id, from_contact_id, to_contact_id, kind, role, is_structural,
              rank, affinity, trust, state, cadence_days, bond,
              created_at, updated_at, removed_at
       FROM links
       WHERE is_structural = 0 AND removed_at IS NULL
         AND (
           (from_contact_id = ? AND to_contact_id = ?)
           OR (from_contact_id = ? AND to_contact_id = ?)
         )
       LIMIT 1`,
    )
    .get(a, b, b, a);
  if (row === undefined) {
    return null;
  }
  return row as unknown as LinkRow;
}

/**
 * Live structural row matching `(from, to, kind, role)`; `role` null matches SQL NULL.
 */
export function findLiveStructuralTie(
  db: AffinityDb,
  fromContactId: number,
  toContactId: number,
  kind: string,
  roleNormalized: string | null,
): LinkRow | null {
  const roleKey = roleNormalized === null ? "" : roleNormalized;
  const row = db
    .prepare(
      `SELECT id, from_contact_id, to_contact_id, kind, role, is_structural,
              rank, affinity, trust, state, cadence_days, bond,
              created_at, updated_at, removed_at
       FROM links
       WHERE from_contact_id = ? AND to_contact_id = ? AND kind = ?
         AND is_structural = 1 AND removed_at IS NULL
         AND COALESCE(role, '') = ?`,
    )
    .get(fromContactId, toContactId, kind, roleKey);
  if (row === undefined) {
    return null;
  }
  return row as unknown as LinkRow;
}

export function requireRelationalLink(db: AffinityDb, linkId: number): LinkRow {
  const row = getLinkRowById(db, linkId);
  if (!row) {
    throw new AffinityNotFoundError("link not found");
  }
  if (row.is_structural !== 0) {
    throw new AffinityInvariantError("not a relational link");
  }
  return row;
}
