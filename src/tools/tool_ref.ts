import type { ContactRow } from "../lib/types/contact_row.ts";
import type { AttributeRecord } from "../lib/types/attribute_record.ts";
import type { ContactCore } from "../lib/types/contact_core.ts";
import type { ContactListItem } from "../lib/types/contact_list_item.ts";
import type { EntityRef } from "../lib/types/entity_ref.ts";
import type { EventRecord } from "../lib/types/event_record.ts";
import type { IdentityRecord } from "../lib/types/identity_record.ts";
import type { LinkListItem } from "../lib/types/link_list_item.ts";
import type { LinkRow } from "../lib/types/link_row.ts";
import type { MutationReceipt } from "../lib/types/mutation_receipt.ts";
import type { ToolEntityRef, ToolListItem } from "./tool_types.ts";

function contactState(
  value:
    | ContactCore
    | ContactListItem
    | ContactRow,
): string | null | undefined {
  if ("lifecycleState" in value) {
    return value.lifecycleState;
  }
  return value.lifecycle_state;
}

export function toContactEntityRef(
  value: ContactCore | ContactListItem | ContactRow,
): ToolEntityRef {
  return {
    kind: "contact",
    id: value.id,
    title: value.name,
    state: contactState(value),
  };
}

export function toContactListToolItem(
  value: ContactCore | ContactListItem | ContactRow,
): ToolListItem {
  return {
    ...toContactEntityRef(value),
    subtitle: "kind" in value ? value.kind : undefined,
  };
}

export function toIdentityEntityRef(value: IdentityRecord): ToolEntityRef {
  return {
    kind: "identity",
    id: value.id,
    title: value.value,
    subtitle: value.type,
    state: value.verified ? "verified" : "unverified",
  };
}

export function toIdentityListToolItem(value: IdentityRecord): ToolListItem {
  return {
    ...toIdentityEntityRef(value),
    snippet: value.label ?? undefined,
  };
}

export function toLinkEntityRef(value: LinkListItem | LinkRow): ToolEntityRef {
  const fromId =
    "fromContactId" in value ? value.fromContactId : value.from_contact_id;
  const toId = "toContactId" in value ? value.toContactId : value.to_contact_id;
  return {
    kind: "link",
    id: value.id,
    title: `${fromId} -> ${toId}`,
    subtitle: value.kind,
    state: value.state,
  };
}

export function toLinkListToolItem(value: LinkListItem | LinkRow): ToolListItem {
  return {
    ...toLinkEntityRef(value),
    snippet:
      "bond" in value && value.bond != null
        ? value.bond
        : undefined,
  };
}

export function toEventEntityRef(value: EventRecord): ToolEntityRef {
  return {
    kind: "event",
    id: value.id,
    title: value.summary,
    subtitle: value.type,
    state: value.type,
  };
}

export function toEventListToolItem(value: EventRecord): ToolListItem {
  return {
    ...toEventEntityRef(value),
    snippet: `${value.participants.length} participant(s)`,
  };
}

export function toAttributeEntityRef(value: AttributeRecord): ToolEntityRef {
  return {
    kind: "attribute",
    id: value.id,
    title: value.name,
    subtitle: value.value ?? undefined,
  };
}

export function toAttributeListToolItem(value: AttributeRecord): ToolListItem {
  return {
    ...toAttributeEntityRef(value),
    snippet: value.value ?? undefined,
  };
}

export function toMutationRefEntity(ref: EntityRef): ToolEntityRef {
  return { kind: ref.kind, id: ref.id };
}

export function toReceiptEntityRefs<TPrimary>(
  receipt: MutationReceipt<TPrimary>,
): ToolEntityRef[] {
  const refs = [
    ...receipt.created.map(toMutationRefEntity),
    ...receipt.updated.map(toMutationRefEntity),
    ...receipt.archived.map(toMutationRefEntity),
    ...receipt.removed.map(toMutationRefEntity),
  ];
  const seen = new Set<string>();
  return refs.filter((ref) => {
    const key = `${ref.kind}:${ref.id}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
