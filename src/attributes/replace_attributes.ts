import { clearedAttributePrimary } from "../attributes/helpers.ts";
import { mapAttributeRowToAttributeRecord } from "../attributes/mappers.ts";
import {
  getAttributeRowById,
  listLiveAttributeIdsForTarget,
} from "../attributes/queries.ts";
import { buildAttributeMutationReceipt } from "../attributes/receipts.ts";
import {
  assertAttributeTargetWritable,
  validateAttributeEntries,
} from "../attributes/validators.ts";
import type { AffinityDb } from "../database.ts";
import { AffinityInvariantError } from "../lib/errors/affinity_invariant_error.ts";
import type { AttributeEntry } from "../lib/types/attribute_entry.ts";
import type { AttributeTarget } from "../lib/types/attribute_target.ts";
import type { EntityRef } from "../lib/types/entity_ref.ts";
import type { AttributeMutationReceipt } from "../lib/types/mutation_receipt.ts";
import { resolveNow } from "../resolve_now.ts";
import { withTransaction } from "../with_transaction.ts";

export function replaceAttributes(
  db: AffinityDb,
  target: AttributeTarget,
  entries: readonly AttributeEntry[],
): AttributeMutationReceipt {
  return withTransaction(db, () => {
    assertAttributeTargetWritable(db, target);
    const normalized = validateAttributeEntries(entries);
    const now = resolveNow();
    const previousIds = listLiveAttributeIdsForTarget(db, target);
    const removed: EntityRef[] = previousIds.map((id) => ({
      kind: "attribute",
      id,
    }));
    for (const id of previousIds) {
      db.prepare(
        "UPDATE attributes SET deleted_at = ?, updated_at = ? WHERE id = ?",
      ).run(now, now, id);
    }
    const created: EntityRef[] = [];
    let lastId = 0;
    if (target.kind === "contact") {
      const insert = db.prepare(
        `INSERT INTO attributes (contact_id, link_id, name, value, created_at, updated_at)
         VALUES (?, NULL, ?, ?, ?, ?)`,
      );
      for (const e of normalized) {
        const r = insert.run(target.id, e.name, e.value, now, now);
        lastId = Number(r.lastInsertRowid);
        created.push({ kind: "attribute", id: lastId });
      }
    } else {
      const insert = db.prepare(
        `INSERT INTO attributes (contact_id, link_id, name, value, created_at, updated_at)
         VALUES (NULL, ?, ?, ?, ?, ?)`,
      );
      for (const e of normalized) {
        const r = insert.run(target.id, e.name, e.value, now, now);
        lastId = Number(r.lastInsertRowid);
        created.push({ kind: "attribute", id: lastId });
      }
    }
    if (normalized.length === 0) {
      return buildAttributeMutationReceipt(clearedAttributePrimary(target), {
        created: [],
        removed,
      });
    }
    const lastRow = getAttributeRowById(db, lastId);
    if (!lastRow) {
      throw new AffinityInvariantError("attribute row missing after replace");
    }
    return buildAttributeMutationReceipt(
      mapAttributeRowToAttributeRecord(lastRow),
      {
        created,
        removed,
      },
    );
  });
}
