import type { ContactKind } from "../../contacts/types.ts";

/** Arguments for `write.createContact`. */
export interface CreateContactInput {
  name: string;
  kind: ContactKind;
  now?: number;
  /**
   * When true, marks this row as the sole owner contact.
   * Allowed only while no other live owner exists.
   */
  bootstrapOwner?: boolean;
}
