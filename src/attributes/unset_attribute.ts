import { mapAttributeRowToAttributeRecord } from "../attributes/mappers.ts";
import { getLiveAttributeRow } from "../attributes/queries.ts";
import { buildAttributeMutationReceipt } from "../attributes/receipts.ts";
import {
  assertAttributeTargetWritable,
  validateAttributeName,
} from "../attributes/validators.ts";
import type { AffinityDb } from "../database.ts";
import { AffinityNotFoundError } from "../lib/errors/affinity_not_found_error.ts";
import type { AttributeTarget } from "../lib/types/attribute_target.ts";
import type { AttributeMutationReceipt } from "../lib/types/mutation_receipt.ts";
import { resolveNow } from "../resolve_now.ts";
import { withTransaction } from "../with_transaction.ts";

export function unsetAttribute(
  db: AffinityDb,
  target: AttributeTarget,
  name: string,
  removedAt?: number,
): AttributeMutationReceipt {
  return withTransaction(db, () => {
    assertAttributeTargetWritable(db, target);
    const key = validateAttributeName(name);
    const existing = getLiveAttributeRow(db, target, key);
    if (!existing) {
      throw new AffinityNotFoundError("attribute not found");
    }
    const primary = mapAttributeRowToAttributeRecord(existing);
    const now = resolveNow(removedAt);
    db.prepare(
      "UPDATE attributes SET deleted_at = ?, updated_at = ? WHERE id = ?",
    ).run(now, now, existing.id);
    return buildAttributeMutationReceipt(primary, {
      removed: [{ kind: "attribute", id: existing.id }],
    });
  });
}
