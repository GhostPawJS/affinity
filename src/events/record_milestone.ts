import type { AffinityDb } from "../database.ts";
import type { EventMutationReceipt } from "../lib/types/mutation_receipt.ts";
import type { RecordMilestoneInput } from "../lib/types/record_milestone_input.ts";
import { recordSocialEvent } from "./record_social_event.ts";

export function recordMilestone(
  db: AffinityDb,
  input: RecordMilestoneInput,
): EventMutationReceipt {
  return recordSocialEvent(db, input, "milestone");
}
