import type { AttributeEntry } from "./attribute_entry.ts";
import type { CommitmentRecord } from "./commitment_record.ts";
import type { ContactCore } from "./contact_core.ts";
import type { EventRecord } from "./event_record.ts";
import type { IdentityRecord } from "./identity_record.ts";
import type { LinkListItem } from "./link_list_item.ts";
import type { OpaqueRollup } from "./rollup_opaque.ts";
import type { UpcomingDateRecord } from "./upcoming_date_record.ts";

/** Full contact detail — CONCEPT.md ContactProfileRecord. */
export interface ContactProfileRecord {
  contact: ContactCore;
  recentEvents?: readonly (EventRecord & { occurredAtIso: string })[];
  openCommitments?: readonly CommitmentRecord[];
  ties?: readonly {
    id: number;
    kind: string;
    role: string | null;
    contactId: number;
    name: string;
  }[];
  mergedInto?: { id: number; name: string };
  identities: readonly IdentityRecord[];
  attributes: readonly AttributeEntry[];
  topLinks: readonly LinkListItem[];
  activeDates: readonly UpcomingDateRecord[];
  warnings: readonly string[];
  rollups?: OpaqueRollup | null;
}
