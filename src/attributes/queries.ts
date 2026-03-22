import type { AffinityDb } from "../database.ts";
import type { AttributeRow } from "../lib/types/attribute_row.ts";
import type { AttributeTarget } from "../lib/types/attribute_target.ts";

export function getAttributeRowById(
  db: AffinityDb,
  id: number,
): AttributeRow | null {
  const row = db
    .prepare(
      `SELECT id, contact_id, link_id, name, value, created_at, updated_at, deleted_at
       FROM attributes WHERE id = ?`,
    )
    .get(id);
  if (row === undefined) {
    return null;
  }
  return row as unknown as AttributeRow;
}

export function getLiveAttributeRow(
  db: AffinityDb,
  target: AttributeTarget,
  name: string,
): AttributeRow | null {
  if (target.kind === "contact") {
    const row = db
      .prepare(
        `SELECT id, contact_id, link_id, name, value, created_at, updated_at, deleted_at
         FROM attributes
         WHERE contact_id = ? AND name = ? AND deleted_at IS NULL`,
      )
      .get(target.id, name);
    if (row === undefined) {
      return null;
    }
    return row as unknown as AttributeRow;
  }
  const row = db
    .prepare(
      `SELECT id, contact_id, link_id, name, value, created_at, updated_at, deleted_at
       FROM attributes
       WHERE link_id = ? AND name = ? AND deleted_at IS NULL`,
    )
    .get(target.id, name);
  if (row === undefined) {
    return null;
  }
  return row as unknown as AttributeRow;
}

export function listLiveAttributeIdsForTarget(
  db: AffinityDb,
  target: AttributeTarget,
): number[] {
  if (target.kind === "contact") {
    const rows = db
      .prepare(
        "SELECT id FROM attributes WHERE contact_id = ? AND deleted_at IS NULL ORDER BY id",
      )
      .all(target.id) as { id: number }[];
    return rows.map((row) => row.id);
  }
  const rows = db
    .prepare(
      "SELECT id FROM attributes WHERE link_id = ? AND deleted_at IS NULL ORDER BY id",
    )
    .all(target.id) as { id: number }[];
  return rows.map((row) => row.id);
}
