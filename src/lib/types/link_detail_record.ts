import type { ContactCore } from "./contact_core.ts";
import type { OpaqueDerivation } from "./derivation_opaque.ts";
import type { EventRecord } from "./event_record.ts";
import type { LinkListItem } from "./link_list_item.ts";
import type { MomentRecord } from "./moment_record.ts";
import type { OpaqueRollup } from "./rollup_opaque.ts";

/** Link detail with journal slices — CONCEPT.md LinkDetailRecord. */
export interface LinkDetailRecord {
  link: LinkListItem;
  counterparty: ContactCore;
  recentEvents: readonly EventRecord[];
  moments: readonly MomentRecord[];
  rollups?: OpaqueRollup | null;
  derivation?: OpaqueDerivation | null;
}
