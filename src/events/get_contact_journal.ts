import type { AffinityDb } from "../database.ts";
import { assertDefaultOrdering } from "../lib/read/assert_default_ordering.ts";
import { resolveListLimitOffset } from "../lib/read/resolve_list_limit_offset.ts";
import type { ContactJournalReadOptions } from "../lib/types/contact_journal_read_options.ts";
import type { EventRecord } from "../lib/types/event_record.ts";
import { loadEventRecord } from "./loaders.ts";

export function getContactJournal(
  db: AffinityDb,
  contactId: number,
  options?: ContactJournalReadOptions,
): EventRecord[] {
  assertDefaultOrdering("getContactJournal", options);
  const { limit, offset } = resolveListLimitOffset(options);
  const clauses: string[] = ["e.deleted_at IS NULL", "ep.contact_id = ?"];
  const params: (number | string)[] = [contactId];
  if (options?.since !== undefined) {
    clauses.push("e.occurred_at >= ?");
    params.push(options.since);
  }
  if (options?.until !== undefined) {
    clauses.push("e.occurred_at <= ?");
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
      `SELECT e.id FROM events e
       INNER JOIN event_participants ep ON ep.event_id = e.id
       WHERE ${where}
       ORDER BY e.occurred_at DESC, e.id DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as { id: number }[];
  const out: EventRecord[] = [];
  for (const r of rows) {
    out.push(loadEventRecord(db, r.id));
  }
  return out;
}
