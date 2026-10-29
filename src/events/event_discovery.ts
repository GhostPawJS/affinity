import { foldSearchText } from "../contacts/fold_search_text.ts";
import type { AffinityDb } from "../database.ts";
import { resolveListLimitOffset } from "../lib/read/resolve_list_limit_offset.ts";
import type { EventRecord } from "../lib/types/event_record.ts";
import type { ExternalRef } from "../lib/types/social_event_input.ts";
import { deriveEventSummary, getEventByExternalRef } from "./event_metadata.ts";
import { batchLoadEventRecords } from "./loaders.ts";
import { decodeEventText } from "./mappers.ts";
export interface EventSearchItem {
  [key: string]: unknown;
  kind: "event";
  id: number;
  occurredOn: string;
  type: string;
  title: string;
  matchedOn: string[];
  externalRef?: ExternalRef;
}
export function searchEvents(
  db: AffinityDb,
  query: string,
  options?: { limit?: number; offset?: number },
): EventSearchItem[] {
  const { limit, offset } = resolveListLimitOffset(options);
  const tokens = foldSearchText(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  const rows = db
    .prepare(
      "SELECT id,type,occurred_at,occurred_on,CAST(summary AS BLOB) AS summary,CAST(content AS BLOB) AS content,external_source,external_id,channel FROM events WHERE deleted_at IS NULL ORDER BY occurred_at DESC,id DESC",
    )
    .all() as {
    id: number;
    type: string;
    occurred_at: number;
    occurred_on: string | null;
    summary: string;
    content: string | null;
    external_source: string | null;
    external_id: string | null;
    channel: string | null;
  }[];
  return rows
    .flatMap((row) => {
      const fields = {
        summary: decodeEventText(row.summary),
        content: row.content === null ? null : decodeEventText(row.content),
        source: row.external_source,
        id: row.external_id,
        channel: row.channel,
      };
      const folded = Object.entries(fields).map(
        ([key, value]) => [key, foldSearchText(value ?? "")] as const,
      );
      if (!tokens.every((t) => folded.some(([, v]) => v.includes(t))))
        return [];
      return [
        {
          kind: "event" as const,
          id: row.id,
          type: row.type,
          title: deriveEventSummary(decodeEventText(row.summary)),
          occurredOn:
            row.occurred_on ??
            new Date(row.occurred_at).toISOString().slice(0, 10),
          matchedOn: folded
            .filter(([, v]) => tokens.some((t) => v.includes(t)))
            .map(([k]) => k),
          ...(row.external_source && row.external_id
            ? {
                externalRef: {
                  source: row.external_source,
                  id: row.external_id,
                },
              }
            : {}),
        },
      ];
    })
    .slice(offset, offset + limit);
}
export function getEventThread(
  db: AffinityDb,
  source: string,
  id: string,
  options?: {
    eventTypes?: readonly import("./types.ts").EventType[];
    includeContent?: boolean;
    channel?: string;
    limit?: number;
    offset?: number;
  },
): EventRecord[] {
  const { limit, offset } = resolveListLimitOffset(options);
  const root = getEventByExternalRef(db, source, id);
  if (!root) return [];
  const rows = db
    .prepare(`WITH RECURSIVE thread(id) AS (
    SELECT ? UNION SELECT e.id FROM events e JOIN thread t JOIN events p ON p.id=t.id
    WHERE e.deleted_at IS NULL AND (e.parent_event_id=p.id OR (e.parent_source=p.external_source AND e.parent_ref_id=p.external_id) OR (e.thread_source=? AND e.thread_id=?))
  ) SELECT e.id FROM events e JOIN thread t ON e.id=t.id WHERE e.deleted_at IS NULL AND (? IS NULL OR e.channel=?) AND (? IS NULL OR e.type IN (SELECT value FROM json_each(?))) ORDER BY e.occurred_at,e.id LIMIT ? OFFSET ?`)
    .all(
      root.id,
      root.externalRef?.source ?? null,
      root.externalRef?.id ?? null,
      options?.channel ?? null,
      options?.channel?.trim().toLowerCase() ?? null,
      options?.eventTypes === undefined
        ? null
        : JSON.stringify(options.eventTypes),
      options?.eventTypes === undefined
        ? null
        : JSON.stringify(options.eventTypes),
      limit,
      offset,
    ) as { id: number }[];
  return batchLoadEventRecords(
    db,
    rows.map((r) => r.id),
    options?.includeContent ?? false,
  );
}
