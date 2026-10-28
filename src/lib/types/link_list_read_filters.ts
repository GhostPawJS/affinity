import type { LinkKind, LinkState } from "../../links/types.ts";

/** Common filters for link list reads — CONCEPT.md. */
export interface LinkListReadFilters {
  includeLost?: boolean;
  kind?: LinkKind;
  state?: LinkState;
}
