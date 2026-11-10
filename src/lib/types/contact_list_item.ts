import type {
  ContactKind,
  ContactLifecycleState,
} from "../../contacts/types.ts";

/** Compact portfolio row — CONCEPT.md ContactListItem. */
export interface ContactListItem {
  matchedOn?: string[];
  id: number;
  name: string;
  kind: ContactKind;
  lifecycleState: ContactLifecycleState;
  isOwner: boolean;
  /** Omitted when false to preserve existing output. */
  doNotContact?: boolean;
  primaryIdentity?: string | null;
  lastMeaningfulEventAt?: number | null;
}
