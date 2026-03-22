import type { LinkKind, LinkState } from "../../links/types.ts";

/** Compact link row for lists — CONCEPT.md LinkListItem. */
export interface LinkListItem {
  id: number;
  fromContactId: number;
  toContactId: number;
  kind: LinkKind;
  role?: string | null;
  rank?: number | null;
  affinity?: number | null;
  trust?: number | null;
  state?: LinkState | null;
  cadenceDays?: number | null;
  bond?: string | null;
}
