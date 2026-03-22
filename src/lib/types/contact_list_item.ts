import type {
  ContactKind,
  ContactLifecycleState,
} from "../../contacts/types.ts";

/** Compact portfolio row — CONCEPT.md ContactListItem. */
export interface ContactListItem {
  id: number;
  name: string;
  kind: ContactKind;
  lifecycleState: ContactLifecycleState;
  isOwner: boolean;
  primaryIdentity?: string | null;
  lastMeaningfulEventAt?: number | null;
}
