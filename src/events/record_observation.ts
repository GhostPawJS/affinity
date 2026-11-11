import type { AffinityDb } from "../database.ts";
import type { EventMutationReceipt } from "../lib/types/mutation_receipt.ts";
import type { RecordObservationInput } from "../lib/types/record_observation_input.ts";
import { recordSocialEvent } from "./record_social_event.ts";

export function recordObservation(
  db: AffinityDb,
  input: RecordObservationInput,
): EventMutationReceipt {
  return recordSocialEvent(db, input, "observation");
}
