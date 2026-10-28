import type { ContactKind } from "../../contacts/types.ts";

/** Arguments for `write.createContact`. */
export interface CreateContactInput {
  name: string;
  kind: ContactKind;
  now?: number;
  identities?: import("./add_identity_input.ts").AddIdentityInput[];
  ifExists?: "error" | "return";
  /**
   * When true, marks this row as the sole owner contact.
   * Allowed only while no other live owner exists.
   */
  bootstrapOwner?: boolean;
}
