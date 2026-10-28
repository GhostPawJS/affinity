import type { AffinityDb } from "../database.ts";
import type { AttributeRow } from "../lib/types/attribute_row.ts";
import type { AttributeTarget } from "../lib/types/attribute_target.ts";
export function attributeTargetSql(target: AttributeTarget) {
  return {
    column:
      target.kind === "event"
        ? "event_id"
        : target.kind === "contact"
          ? "contact_id"
          : "link_id",
    id: target.kind === "event" ? target.eventId : target.id,
  };
}
export function getAttributeRowById(
  db: AffinityDb,
  id: number,
): AttributeRow | null {
  return (
    (db
      .prepare("SELECT * FROM attributes WHERE id=?")
      .get(id) as unknown as AttributeRow) ?? null
  );
}
export function getLiveAttributeRow(
  db: AffinityDb,
  target: AttributeTarget,
  name: string,
): AttributeRow | null {
  const t = attributeTargetSql(target);
  return (
    (db
      .prepare(
        `SELECT * FROM attributes WHERE ${t.column}=? AND name=? AND deleted_at IS NULL`,
      )
      .get(t.id, name) as unknown as AttributeRow) ?? null
  );
}
export function listLiveAttributeIdsForTarget(
  db: AffinityDb,
  target: AttributeTarget,
): number[] {
  const t = attributeTargetSql(target);
  return (
    db
      .prepare(
        `SELECT id FROM attributes WHERE ${t.column}=? AND deleted_at IS NULL ORDER BY id`,
      )
      .all(t.id) as { id: number }[]
  ).map((r) => r.id);
}
