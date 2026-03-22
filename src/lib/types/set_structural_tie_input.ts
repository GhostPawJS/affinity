import type { StructuralLinkKind } from "../../links/types.ts";

/** Arguments for `write.setStructuralTie`. */
export interface SetStructuralTieInput {
  fromContactId: number;
  toContactId: number;
  kind: StructuralLinkKind;
  role?: string | null;
  now?: number;
}
