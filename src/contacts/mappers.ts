import type { ContactCore } from "../lib/types/contact_core.ts";
import type { ContactListItem } from "../lib/types/contact_list_item.ts";
import type { ContactRow } from "../lib/types/contact_row.ts";
import type { ContactKind, ContactLifecycleState } from "./types.ts";

function mapContactRowBase(row: ContactRow): {
  id: number;
  name: string;
  kind: ContactKind;
  lifecycleState: ContactLifecycleState;
  isOwner: boolean;
  doNotContact?: boolean;
} {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind as ContactKind,
    lifecycleState: row.lifecycle_state as ContactLifecycleState,
    isOwner: row.is_owner === 1,
    ...(row.do_not_contact === 1 ? { doNotContact: true } : {}),
  };
}

export function mapContactRowToContactCore(row: ContactRow): ContactCore {
  return mapContactRowBase(row);
}

export function mapContactRowToContactListItem(
  row: ContactRow,
): ContactListItem {
  return mapContactRowBase(row);
}
