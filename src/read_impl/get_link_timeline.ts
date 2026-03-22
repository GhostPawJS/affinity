import type { AffinityDb } from "../database.ts";
import { loadEventRecord } from "../events/loaders.ts";
import type { ContactJournalReadOptions } from "../lib/types/contact_journal_read_options.ts";
import type { EventRecord } from "../lib/types/event_record.ts";
import { getLinkRowById } from "../links/queries.ts";
import { resolveListLimitOffset } from "./resolve_list_limit_offset.ts";

/**
 * Events where both link endpoints participated (journal slice until `link_event_effects` exists).
 */
export function getLinkTimeline(
  db: AffinityDb,
  linkId: number,
  options?: ContactJournalReadOptions,
): EventRecord[] {
  const link = getLinkRowById(db, linkId);
  if (!link) {
    return [];
  }
  const { limit, offset } = resolveListLimitOffset(options);
  const a = link.from_contact_id;
  const b = link.to_contact_id;
  const clauses: string[] = [
    "e.deleted_at IS NULL",
    "EXISTS (SELECT 1 FROM event_participants ep1 WHERE ep1.event_id = e.id AND ep1.contact_id = ?)",
    "EXISTS (SELECT 1 FROM event_participants ep2 WHERE ep2.event_id = e.id AND ep2.contact_id = ?)",
  ];
  const params: (number | string)[] = [a, b];
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
