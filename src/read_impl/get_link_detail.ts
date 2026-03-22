import { mapContactRowToContactCore } from "../contacts/mappers.ts";
import { findOwnerContactId, getContactRowById } from "../contacts/queries.ts";
import type { AffinityDb } from "../database.ts";
import type { LinkDetailRecord } from "../lib/types/link_detail_record.ts";
import type { MomentRecord } from "../lib/types/moment_record.ts";
import { mapLinkRowToLinkListItem } from "../links/mappers.ts";
import { getLinkRowById } from "../links/queries.ts";
import { getLinkTimeline } from "./get_link_timeline.ts";

export function getLinkDetail(
  db: AffinityDb,
  linkId: number,
): LinkDetailRecord | null {
  const link = getLinkRowById(db, linkId);
  if (!link) {
    return null;
  }
  const listItem = mapLinkRowToLinkListItem(link);
  const ownerId = findOwnerContactId(db);
  let otherId: number;
  if (ownerId !== null) {
    if (link.from_contact_id === ownerId) {
      otherId = link.to_contact_id;
    } else if (link.to_contact_id === ownerId) {
      otherId = link.from_contact_id;
    } else {
      otherId = link.to_contact_id;
    }
  } else {
    otherId = link.to_contact_id;
  }
  const otherRow = getContactRowById(db, otherId);
  if (!otherRow) {
    return null;
  }
  const recentEvents = getLinkTimeline(db, linkId, { limit: 5 });
  const moments: MomentRecord[] = [];
  for (const e of recentEvents) {
    if (e.momentKind === null) continue;
    moments.push({
      eventId: e.id,
      linkId,
      momentKind: e.momentKind,
      occurredAt: e.occurredAt,
      summary: e.summary,
      impactScore: e.significance,
    });
  }
  return {
    link: listItem,
    counterparty: mapContactRowToContactCore(otherRow),
    recentEvents,
    moments,
    rollups: null,
    derivation: null,
  };
}
