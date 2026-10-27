import { findOwnerContactId } from "../contacts/queries.ts";
import type { AffinityDb } from "../database.ts";
import { localCalendarDate } from "../lib/parse_calendar_time.ts";
import { assertDefaultOrdering } from "../lib/read/assert_default_ordering.ts";
import { resolveListLimitOffset } from "../lib/read/resolve_list_limit_offset.ts";
import type { LinkListReadFilters } from "../lib/types/link_list_read_filters.ts";
import type { RadarRecord } from "../lib/types/radar_record.ts";
import type { AffinityListReadOptions } from "../lib/types/read_list_options.ts";
import { resolveNow } from "../resolve_now.ts";
import { driftPriority } from "./mechanics.ts";

export function listRadar(
  db: AffinityDb,
  filters?: LinkListReadFilters,
  options?: AffinityListReadOptions,
): RadarRecord[] {
  assertDefaultOrdering("listRadar", options);
  const ownerId = findOwnerContactId(db);
  if (ownerId === null) {
    return [];
  }
  const now = resolveNow(options?.now);
  const today = localCalendarDate(now);
  const lastContact = `(SELECT MAX(le.occurred_at) FROM link_event_effects le JOIN events ev ON ev.id = le.event_id WHERE le.link_id = l.id AND le.counts_for_recency = 1 AND le.occurred_at <= ${now} AND ev.deleted_at IS NULL AND (ev.occurred_on IS NULL OR ev.occurred_on <= '${today}'))`;
  // A gap exceeding 1.5 cadences warrants an explicit drift reason.
  const drift = `(${lastContact} IS NOT NULL AND (${now} - ${lastContact}) > 1.5 * COALESCE(l.cadence_days, 1) * 86400000)`;
  const overdue = `EXISTS (SELECT 1 FROM open_commitments oc JOIN events e ON e.id = oc.event_id JOIN event_participants ep ON ep.event_id = e.id WHERE ep.contact_id = CASE WHEN l.from_contact_id = ${ownerId} THEN l.to_contact_id ELSE l.from_contact_id END AND e.deleted_at IS NULL AND oc.resolved_at IS NULL AND (CASE WHEN oc.due_on IS NOT NULL THEN oc.due_on < '${today}' ELSE oc.due_at < ${now} END))`;
  const { limit, offset } = resolveListLimitOffset(options);
  const clauses: string[] = [
    "l.removed_at IS NULL",
    "l.is_structural = 0",
    "(l.from_contact_id = ? OR l.to_contact_id = ?)",
  ];
  const params: (string | number)[] = [ownerId, ownerId];
  if (filters?.kind !== undefined) {
    clauses.push("l.kind = ?");
    params.push(filters.kind);
  }
  if (filters?.state !== undefined) {
    clauses.push("l.state = ?");
    params.push(filters.state);
  }
  if (options?.includeArchived !== true) {
    clauses.push("l.state != 'archived'");
  }
  if (options?.includeDormant !== true) {
    clauses.push("l.state != 'dormant'");
  }
  if (options?.includeObserved === false) {
    clauses.push("l.kind != 'observed'");
  }
  const where = clauses.join(" AND ");
  const rows = db
    .prepare(
      `SELECT
         l.id,
         l.cadence_days,
         ${lastContact} AS last_contact,
         ${drift} AS drift,
         ${overdue} AS overdue_commitment,
         l.from_contact_id,
         l.to_contact_id,
         l.trust,
         l.rank,
         lr.drift_priority,
         lr.recency_score,
         lr.normalized_rank
       FROM links l
       INNER JOIN contacts c_to ON c_to.id = CASE WHEN l.from_contact_id = ${ownerId} THEN l.to_contact_id ELSE l.from_contact_id END
         AND c_to.deleted_at IS NULL AND c_to.lifecycle_state != 'merged'
       LEFT JOIN link_rollups lr ON lr.link_id = l.id
       WHERE ${where}
       ORDER BY (${overdue} OR ${drift}) DESC, ${overdue} DESC, COALESCE(lr.radar_score, 0) DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as {
    overdue_commitment: number;
    cadence_days: number | null;
    last_contact: number | null;
    drift: number;
    id: number;
    from_contact_id: number;
    to_contact_id: number;
    trust: number | null;
    rank: number | null;
    drift_priority: number | null;
    recency_score: number | null;
    normalized_rank: number | null;
  }[];
  return rows.map((row) => {
    const contactId =
      row.from_contact_id === ownerId ? row.to_contact_id : row.from_contact_id;
    const promise = row.overdue_commitment
      ? (db
          .prepare(
            "SELECT e.summary, oc.due_at, oc.due_on FROM open_commitments oc JOIN events e ON e.id = oc.event_id JOIN event_participants ep ON ep.event_id = e.id WHERE ep.contact_id = ? AND e.deleted_at IS NULL AND oc.resolved_at IS NULL AND (CASE WHEN oc.due_on IS NOT NULL THEN oc.due_on < ? ELSE oc.due_at < ? END) ORDER BY oc.due_at LIMIT 1",
          )
          .get(contactId, today, now) as
          | { summary: string; due_at: number; due_on: string | null }
          | undefined)
      : undefined;
    const reasons = [
      ...(row.overdue_commitment ? ["overdue_commitment"] : []),
      ...(row.drift ? ["drift"] : []),
    ];
    const snippets = [
      ...(promise
        ? [
            `Overdue promise: ${promise.summary} (due ${promise.due_on ?? new Date(promise.due_at).toISOString().slice(0, 10)})`,
          ]
        : []),
      ...(row.drift
        ? [
            `No contact for ${Math.floor((now - (row.last_contact ?? now)) / 86400000)} days (cadence ${row.cadence_days ?? 1} days)`,
          ]
        : []),
    ];
    const elapsed =
      row.last_contact === null
        ? null
        : Math.max(0, (now - row.last_contact) / 86400000);
    const currentDrift =
      elapsed === null
        ? 0
        : driftPriority({
            daysSinceLastMeaningfulEvent: elapsed,
            cadenceDays: row.cadence_days ?? 1,
            trust: row.trust ?? 0,
            rank: row.rank ?? 0,
          });
    return {
      linkId: row.id,
      contactId:
        row.from_contact_id === ownerId
          ? row.to_contact_id
          : row.from_contact_id,
      reasons,
      driftPriority: row.overdue_commitment
        ? Math.max(1, currentDrift)
        : currentDrift,
      recencyScore:
        elapsed === null
          ? 0
          : Math.max(0, 1 - elapsed / Math.max(row.cadence_days ?? 1, 1)),
      normalizedRank: row.normalized_rank ?? 0,
      trust: row.trust ?? 0,
      recommendedReason: snippets.join("; ") || "Routine check-in recommended",
    };
  });
}
