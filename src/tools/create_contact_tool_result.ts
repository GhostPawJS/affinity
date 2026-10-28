import { createContact } from "../contacts/create_contact.ts";
import { foldSearchText } from "../contacts/fold_search_text.ts";
import { fuzzyNameScore } from "../contacts/list_duplicate_candidates.ts";
import type { AffinityDb } from "../database.ts";
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
    const result = mutationToolResult("create", receipt, "contact");
    if (result.ok && receipt.outcome === "no_op") {
      result.outcome = "no_op";
      Object.assign(result.data, {
        matchedIdentities: receipt.matchedIdentities,
      });
      return result;
    }
    const fold = (name: string) =>
      foldSearchText(name).trim().replace(/\s+/g, " ");
    const warnings = (
      db
        .prepare(
          "SELECT id, name FROM contacts WHERE id != ? AND deleted_at IS NULL AND lifecycle_state IN ('active', 'dormant')",
        )
        .all(receipt.primary.id) as { id: number; name: string }[]
    ).flatMap((row) => {
      // Use the same positive-score listing threshold as duplicate review.
      const score =
        fold(row.name) === fold(input.name)
          ? 0.92
          : fuzzyNameScore(row.name, input.name);
      return score <= 0
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
