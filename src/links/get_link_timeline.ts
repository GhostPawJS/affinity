import type { AffinityDb } from "../database.ts";
import { batchLoadEventRecords } from "../events/loaders.ts";
import { assertDefaultOrdering } from "../lib/read/assert_default_ordering.ts";
import { resolveListLimitOffset } from "../lib/read/resolve_list_limit_offset.ts";
import type { ContactJournalReadOptions } from "../lib/types/contact_journal_read_options.ts";
import type { EventRecord } from "../lib/types/event_record.ts";
import { getLinkRowById } from "./queries.ts";

export function getLinkTimeline(
  db: AffinityDb,
  linkId: number,
  options?: ContactJournalReadOptions,
): EventRecord[] {
  assertDefaultOrdering("getLinkTimeline", options);
  const link = getLinkRowById(db, linkId);
  if (!link) {
    return [];
  }
  const { limit, offset } = resolveListLimitOffset(options);
  const clauses: string[] = ["e.deleted_at IS NULL", "le.link_id = ?"];
  const params: (number | string)[] = [linkId];
  if (options?.since !== undefined) {
    clauses.push("le.occurred_at >= ?");
    params.push(options.since);
  }
  if (options?.until !== undefined) {
    clauses.push("le.occurred_at <= ?");
    params.push(options.until);
  }
  if (options?.eventTypes !== undefined && options.eventTypes.length > 0) {
    const ph = options.eventTypes.map(() => "?").join(", ");
    clauses.push(`e.type IN (${ph})`);
    params.push(...options.eventTypes);
  }
  const where = clauses.join(" AND ");
  const rows = db
    .prepare(
      `SELECT e.id
       FROM link_event_effects le
       INNER JOIN events e ON e.id = le.event_id
       WHERE ${where}
       ORDER BY le.occurred_at DESC, e.id DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as { id: number }[];
  return batchLoadEventRecords(db, rows.map((r) => r.id));
}
