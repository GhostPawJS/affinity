import type { LinkListItem } from "../lib/types/link_list_item.ts";
import type { LinkRow } from "../lib/types/link_row.ts";
import type { LinkKind, LinkState } from "./types.ts";

export function mapLinkRowToLinkListItem(row: LinkRow): LinkListItem {
  const kind = row.kind as LinkKind;
  const base = {
    id: row.id,
    fromContactId: row.from_contact_id,
    toContactId: row.to_contact_id,
    kind,
  };
  if (row.is_structural === 1) {
    return {
      ...base,
      role: row.role,
    };
  }
  return {
    ...base,
    role: row.role,
    rank: row.rank,
    affinity: row.affinity,
    trust: row.trust,
    state: row.state as LinkState,
    cadenceDays: row.cadence_days,
    bond: row.bond,
  };
}
