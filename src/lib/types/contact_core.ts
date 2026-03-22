import type {
  ContactKind,
  ContactLifecycleState,
} from "../../contacts/types.ts";

/** Canonical contact row fields shared across list and profile reads. */
export interface ContactCore {
  id: number;
  name: string;
  kind: ContactKind;
  lifecycleState: ContactLifecycleState;
  isOwner: boolean;
}
