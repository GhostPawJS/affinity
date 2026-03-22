import { initAttributesTables } from "./attributes/init_attributes_tables.ts";
import { initContactRollupsTables } from "./contacts/init_contact_rollups_tables.ts";
import { initContactsTables } from "./contacts/init_contacts_tables.ts";
import type { AffinityDb } from "./database.ts";
import { initUpcomingOccurrencesTables } from "./dates/init_upcoming_occurrences_tables.ts";
import { initEventParticipantsTables } from "./events/init_event_participants_tables.ts";
import { initEventsTables } from "./events/init_events_tables.ts";
import { initOpenCommitmentsTables } from "./events/init_open_commitments_tables.ts";
import { initIdentitiesTables } from "./identities/init_identities_tables.ts";
import { initLinkEventEffectsTables } from "./links/init_link_event_effects_tables.ts";
import { initLinkRollupsTables } from "./links/init_link_rollups_tables.ts";
import { initLinksTables } from "./links/init_links_tables.ts";
import { initContactMergesTables } from "./merges/init_contact_merges_tables.ts";

/**
 * Creates the full standalone affinity public schema (contacts through attributes).
 */
export function initAffinityTables(db: AffinityDb): void {
  initContactsTables(db);
  initContactRollupsTables(db);
  initContactMergesTables(db);
  initIdentitiesTables(db);
  initLinksTables(db);
  initLinkRollupsTables(db);
  initEventsTables(db);
  initLinkEventEffectsTables(db);
  initUpcomingOccurrencesTables(db);
  initOpenCommitmentsTables(db);
  initEventParticipantsTables(db);
  initAttributesTables(db);
}
