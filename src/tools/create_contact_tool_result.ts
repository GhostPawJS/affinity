import { createContact } from "../contacts/create_contact.ts";
import { foldSearchText } from "../contacts/fold_search_text.ts";
import type { AffinityDb } from "../database.ts";
import { addIdentity } from "../identities/add_identity.ts";
import { normalizeIdentityKey } from "../identities/normalize.ts";
import { validateIdentityInput } from "../identities/validate_identity_input.ts";
import type { AddIdentityInput } from "../lib/types/add_identity_input.ts";
import type { CreateContactInput } from "../lib/types/create_contact_input.ts";
import { withTransaction } from "../with_transaction.ts";
import { mutationToolResult } from "./tool_mutation.ts";

export function createContactToolResult(
  db: AffinityDb,
  input: CreateContactInput & { identities?: AddIdentityInput[] },
) {
  return withTransaction(db, () => {
    const receipt = createContact(db, input);
    const identityOwners = new Set<number>();
    for (const identity of input.identities ?? []) {
      validateIdentityInput(identity.type.trim(), identity.value.trim());
      const existing = db
        .prepare(
          "SELECT contact_id FROM identities WHERE normalized_key = ? AND removed_at IS NULL",
        )
        .get(normalizeIdentityKey(identity.type, identity.value));
      if (existing) {
        if (Number(existing.contact_id) !== receipt.primary.id)
          identityOwners.add(Number(existing.contact_id));
        continue;
      }
      const added = addIdentity(db, receipt.primary.id, identity);
      receipt.created.push(...added.created);
    }
    const result = mutationToolResult("create", receipt, "contact");
    const fold = (name: string) =>
      foldSearchText(name).trim().replace(/\s+/g, " ");
    const warnings = (
      db
        .prepare(
          "SELECT id, name FROM contacts WHERE id != ? AND deleted_at IS NULL AND lifecycle_state IN ('active', 'dormant')",
        )
        .all(receipt.primary.id) as { id: number; name: string }[]
    ).flatMap((row) => {
      // Existing duplicate scoring only exceeds 0.85 for equal normalized names.
      const score = identityOwners.has(row.id)
        ? 1
        : fold(row.name) === fold(input.name)
          ? 0.92
          : undefined;
      return score === undefined
        ? []
        : [
            {
              code: "possible_duplicate" as const,
              message: `Possible duplicate of #${row.id} ${row.name} (score ${score})`,
              contactId: row.id,
              score,
            },
          ];
    });
    if (warnings.length) result.warnings = warnings;
    return result;
  });
}
