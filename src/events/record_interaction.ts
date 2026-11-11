import type { AffinityDb } from "../database.ts";
import type { EventMutationReceipt } from "../lib/types/mutation_receipt.ts";
import type { RecordInteractionInput } from "../lib/types/record_interaction_input.ts";
import { recordSocialEvent } from "./record_social_event.ts";

export function recordInteraction(
  db: AffinityDb,
  input: RecordInteractionInput,
): EventMutationReceipt {
  return recordSocialEvent(db, input, "interaction");
}
