import type { AffinityDb } from "../database.ts";
import type { EventMutationReceipt } from "../lib/types/mutation_receipt.ts";
import type { RecordTransactionInput } from "../lib/types/record_transaction_input.ts";
import { recordSocialEvent } from "./record_social_event.ts";

export function recordTransaction(
  db: AffinityDb,
  input: RecordTransactionInput,
): EventMutationReceipt {
  return recordSocialEvent(db, input, "transaction");
}
