import type {
  ContactKind,
  ContactLifecycleState,
} from "../../contacts/types.ts";

/** Filters for `read.listContacts` — CONCEPT.md portfolio list. */
export interface ListContactsFilters {
  attribute?: string | string[];
  tag?: string | string[];
  includeLost?: boolean;
  kind?: ContactKind;
  lifecycleState?: ContactLifecycleState;
  includeOwner?: boolean;
  includeDormant?: boolean;
}
