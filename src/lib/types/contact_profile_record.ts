import type { AttributeEntry } from "./attribute_entry.ts";
import type { ContactCore } from "./contact_core.ts";
import type { IdentityRecord } from "./identity_record.ts";
import type { LinkListItem } from "./link_list_item.ts";
import type { OpaqueRollup } from "./rollup_opaque.ts";
import type { UpcomingDateRecord } from "./upcoming_date_record.ts";

/** Full contact detail — CONCEPT.md ContactProfileRecord. */
export interface ContactProfileRecord {
  contact: ContactCore;
  identities: readonly IdentityRecord[];
  attributes: readonly AttributeEntry[];
  topLinks: readonly LinkListItem[];
  activeDates: readonly UpcomingDateRecord[];
  warnings: readonly string[];
  rollups?: OpaqueRollup | null;
}
