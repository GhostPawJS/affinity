import type {
  ContactKind,
  ContactLifecycleState,
} from "../../contacts/types.ts";

/** Filters for `read.listContacts` — CONCEPT.md portfolio list. */
export interface ListContactsFilters {
  kind?: ContactKind;
  lifecycleState?: ContactLifecycleState;
  includeOwner?: boolean;
  includeDormant?: boolean;
}
