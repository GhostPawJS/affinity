import type { AffinityDb } from "../database.ts";
import { assertDefaultOrdering } from "../lib/read/assert_default_ordering.ts";
import { resolveListLimitOffset } from "../lib/read/resolve_list_limit_offset.ts";
import type { DismissedDuplicateRecord } from "../lib/types/dismissed_duplicate_record.ts";
import type { AffinityListReadOptions } from "../lib/types/read_list_options.ts";

export function listDismissedDuplicates(
  db: AffinityDb,
  options?: AffinityListReadOptions,
): DismissedDuplicateRecord[] {
  assertDefaultOrdering("listDismissedDuplicates", options);
  const { limit, offset } = resolveListLimitOffset(options);
  const rows = db
    .prepare(
      `SELECT left_id, right_id, reason, dismissed_at
       FROM dismissed_duplicates
       ORDER BY dismissed_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(limit, offset) as {
    left_id: number;
    right_id: number;
    reason: string | null;
    dismissed_at: number;
  }[];
  return rows.map((row) => ({
    leftContactId: row.left_id,
    rightContactId: row.right_id,
    reason: row.reason,
    dismissedAt: row.dismissed_at,
  }));
}
