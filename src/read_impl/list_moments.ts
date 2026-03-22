import type { AffinityDb } from "../database.ts";
import { getEventRowById } from "../events/queries.ts";
import type { EventMomentKind } from "../events/types.ts";
import type { MomentRecord } from "../lib/types/moment_record.ts";
import type { AffinityListReadOptions } from "../lib/types/read_list_options.ts";
import { findRelationalLinkId } from "../links/queries.ts";
import { resolveListLimitOffset } from "./resolve_list_limit_offset.ts";

function inferLinkId(db: AffinityDb, eventId: number): number | null {
  const parts = db
    .prepare(
      "SELECT contact_id FROM event_participants WHERE event_id = ? ORDER BY contact_id",
    )
    .all(eventId) as { contact_id: number }[];
  const ids = parts.map((p) => p.contact_id);
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i];
      const b = ids[j];
      if (a === undefined || b === undefined) continue;
      const lid = findRelationalLinkId(db, a, b);
      if (lid !== null) return lid;
    }
  }
  return null;
}

export function listMoments(
  db: AffinityDb,
  filters?: { contactId?: number; linkId?: number },
  options?: AffinityListReadOptions,
): MomentRecord[] {
  const { limit, offset } = resolveListLimitOffset(options);
  const clauses: string[] = [
    "e.deleted_at IS NULL",
    "e.moment_kind IS NOT NULL",
  ];
  const params: (number | string)[] = [];
  if (options?.since !== undefined) {
    clauses.push("e.occurred_at >= ?");
    params.push(options.since);
  }
  if (options?.until !== undefined) {
    clauses.push("e.occurred_at <= ?");
    params.push(options.until);
  }
  if (filters?.contactId !== undefined) {
    clauses.push(
      "EXISTS (SELECT 1 FROM event_participants ep WHERE ep.event_id = e.id AND ep.contact_id = ?)",
    );
    params.push(filters.contactId);
  }
  const where = clauses.join(" AND ");
  const rows = db
    .prepare(
      `SELECT e.id FROM events e WHERE ${where}
       ORDER BY e.occurred_at DESC, e.id DESC`,
    )
    .all(...params) as { id: number }[];
  const out: MomentRecord[] = [];
  for (const r of rows) {
    const row = getEventRowById(db, r.id);
    if (!row || row.moment_kind === null) continue;
    const linkId = inferLinkId(db, r.id);
    if (filters?.linkId !== undefined && linkId !== filters.linkId) {
      continue;
    }
    if (linkId === null) {
      continue;
    }
    out.push({
      eventId: r.id,
      linkId,
      momentKind: row.moment_kind as EventMomentKind,
      occurredAt: row.occurred_at,
      summary: row.summary,
      impactScore: row.significance,
    });
  }
  return out.slice(offset, offset + limit);
}
