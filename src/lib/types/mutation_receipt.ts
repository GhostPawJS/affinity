import type { AttributeRecord } from "./attribute_record.ts";
import type { ContactListItem } from "./contact_list_item.ts";
import type { DerivedLinkEffect } from "./derived_link_effect.ts";
import type { EntityRef } from "./entity_ref.ts";
import type { EventRecord } from "./event_record.ts";
import type { IdentityRecord } from "./identity_record.ts";
import type { LinkListItem } from "./link_list_item.ts";
import type { MergePrimary } from "./merge_primary.ts";

/**
 * Universal write receipt envelope — CONCEPT.md MutationReceipt.
 */
export interface MutationReceipt<TPrimary> {
  primary: TPrimary;
  created: EntityRef[];
  updated: EntityRef[];
  archived: EntityRef[];
  removed: EntityRef[];
  affectedLinks: number[];
  derivedEffects: DerivedLinkEffect[];
}

export type ContactMutationReceipt = MutationReceipt<ContactListItem>;
export type IdentityMutationReceipt = MutationReceipt<IdentityRecord>;
export type LinkMutationReceipt = MutationReceipt<LinkListItem>;
export type EventMutationReceipt = MutationReceipt<EventRecord>;
export type AttributeMutationReceipt = MutationReceipt<AttributeRecord>;
export type MergeReceipt = MutationReceipt<MergePrimary>;
