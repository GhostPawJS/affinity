import { mapAttributeRowToAttributeRecord } from "../attributes/mappers.ts";
import { normalizeAttributeValue } from "../attributes/normalize.ts";
import {
  getAttributeRowById,
  getLiveAttributeRow,
} from "../attributes/queries.ts";
import { buildAttributeMutationReceipt } from "../attributes/receipts.ts";
import {
  assertAttributeTargetWritable,
  validateAttributeName,
} from "../attributes/validators.ts";
import type { AffinityDb } from "../database.ts";
import { AffinityInvariantError } from "../lib/errors/affinity_invariant_error.ts";
import type { AttributeTarget } from "../lib/types/attribute_target.ts";
import type { AttributeMutationReceipt } from "../lib/types/mutation_receipt.ts";
import { resolveNow } from "../resolve_now.ts";
import { withTransaction } from "../with_transaction.ts";

export function setAttribute(
  db: AffinityDb,
  target: AttributeTarget,
  name: string,
  value: string | null,
): AttributeMutationReceipt {
  return withTransaction(db, () => {
    assertAttributeTargetWritable(db, target);
    const key = validateAttributeName(name);
    const stored = normalizeAttributeValue(value);
    const now = resolveNow();
    const existing = getLiveAttributeRow(db, target, key);
    if (existing) {
      db.prepare(
        "UPDATE attributes SET value = ?, updated_at = ? WHERE id = ?",
      ).run(stored, now, existing.id);
      const next = getAttributeRowById(db, existing.id);
      if (!next) {
        throw new AffinityInvariantError("attribute row missing after update");
      }
      return buildAttributeMutationReceipt(
        mapAttributeRowToAttributeRecord(next),
        {
          updated: [{ kind: "attribute", id: existing.id }],
        },
      );
    }
    if (target.kind === "contact") {
      const r = db
        .prepare(
          `INSERT INTO attributes (contact_id, link_id, name, value, created_at, updated_at)
           VALUES (?, NULL, ?, ?, ?, ?)`,
        )
        .run(target.id, key, stored, now, now);
      const id = Number(r.lastInsertRowid);
      const row = getAttributeRowById(db, id);
      if (!row) {
        throw new AffinityInvariantError("attribute row missing after insert");
      }
      return buildAttributeMutationReceipt(
        mapAttributeRowToAttributeRecord(row),
        {
          created: [{ kind: "attribute", id }],
        },
      );
    }
    const r = db
      .prepare(
        `INSERT INTO attributes (contact_id, link_id, name, value, created_at, updated_at)
         VALUES (NULL, ?, ?, ?, ?, ?)`,
      )
      .run(target.id, key, stored, now, now);
    const id = Number(r.lastInsertRowid);
    const row = getAttributeRowById(db, id);
    if (!row) {
      throw new AffinityInvariantError("attribute row missing after insert");
    }
    return buildAttributeMutationReceipt(
      mapAttributeRowToAttributeRecord(row),
      {
        created: [{ kind: "attribute", id }],
      },
    );
  });
}
