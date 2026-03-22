import { mapContactRowToContactCore } from "../contacts/mappers.ts";
import { findOwnerContactId, getContactRowById } from "../contacts/queries.ts";
import type { AffinityDb } from "../database.ts";
import { listMoments } from "../events/list_moments.ts";
import type { LinkDetailReadOptions } from "../lib/types/link_detail_read_options.ts";
import type { LinkDetailRecord } from "../lib/types/link_detail_record.ts";
import type { MomentRecord } from "../lib/types/moment_record.ts";
import { getLinkTimeline } from "./get_link_timeline.ts";
import { mapLinkRowToLinkListItem } from "./mappers.ts";
import { getLinkRowById } from "./queries.ts";
import { loadLinkRollup } from "./rollups.ts";

export function getLinkDetail(
  db: AffinityDb,
  linkId: number,
  options?: LinkDetailReadOptions,
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
  const recentEvents = getLinkTimeline(db, linkId, {
    limit: options?.recentEventsLimit ?? 5,
  });
  const moments: MomentRecord[] = listMoments(
    db,
    { linkId },
    { limit: options?.recentEventsLimit ?? 5 },
  );
  const rollup = loadLinkRollup(db, linkId);
  return {
    link: listItem,
    counterparty: mapContactRowToContactCore(otherRow),
    recentEvents,
    moments,
    rollups: rollup?.rollup ?? null,
    derivation: rollup?.derivation ?? null,
  };
}
