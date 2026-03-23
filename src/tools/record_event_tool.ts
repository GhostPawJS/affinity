import type { AffinityDb } from "../database.ts";
import { recordInteraction } from "../events/record_interaction.ts";
import { recordMilestone } from "../events/record_milestone.ts";
import { recordObservation } from "../events/record_observation.ts";
import { recordTransaction } from "../events/record_transaction.ts";
import type { EventRecord } from "../lib/types/event_record.ts";
import type { RecordInteractionInput } from "../lib/types/record_interaction_input.ts";
import type { RecordMilestoneInput } from "../lib/types/record_milestone_input.ts";
import type { RecordObservationInput } from "../lib/types/record_observation_input.ts";
import type { RecordTransactionInput } from "../lib/types/record_transaction_input.ts";
import {
  arraySchema,
  defineAffinityTool,
  enumSchema,
  integerSchema,
  literalSchema,
  objectSchema,
  oneOfSchema,
  stringSchema,
} from "./tool_metadata.ts";
import { recordEventToolName } from "./tool_names.ts";
import { mutationToolResult, type MutationToolData } from "./tool_mutation.ts";
import { withToolHandling } from "./tool_resolvers.ts";
import type { ToolResult } from "./tool_types.ts";

export type RecordEventToolInput =
  | { kind: "interaction"; input: RecordInteractionInput }
  | { kind: "observation"; input: RecordObservationInput }
  | { kind: "milestone"; input: RecordMilestoneInput }
  | { kind: "transaction"; input: RecordTransactionInput };

export type RecordEventToolResult = ToolResult<MutationToolData<EventRecord>>;

const participantSchema = objectSchema(
  {
    contactId: integerSchema("Participant contact id."),
    role: enumSchema("Participant role.", [
      "actor", "recipient", "subject", "observer", "mentioned",
    ]),
    directionality: enumSchema("Optional participant directionality.", [
      "owner_initiated", "other_initiated", "mutual", "observed",
    ]),
  },
  ["contactId", "role"],
);

function interactionInputSchema() {
  return objectSchema(
    {
      type: enumSchema("Interaction subtype.", [
        "conversation", "activity", "gift", "support", "conflict", "correction",
      ]),
      occurredAt: integerSchema("When the event occurred."),
      summary: stringSchema("Event summary."),
      significance: integerSchema("Event significance from 1 to 10."),
      participants: arraySchema(participantSchema, "Participant list."),
      now: integerSchema("Optional timestamp."),
    },
    ["type", "occurredAt", "summary", "significance", "participants"],
  );
}

function socialEventInputSchema() {
  return objectSchema(
    {
      occurredAt: integerSchema("When the event occurred."),
      summary: stringSchema("Event summary."),
      significance: integerSchema("Event significance from 1 to 10."),
      participants: arraySchema(participantSchema, "Participant list."),
      now: integerSchema("Optional timestamp."),
    },
    ["occurredAt", "summary", "significance", "participants"],
  );
}

export function recordEventToolHandler(
  db: AffinityDb,
  input: RecordEventToolInput,
): RecordEventToolResult {
  return withToolHandling<MutationToolData<EventRecord>>(() => {
    switch (input.kind) {
      case "interaction":
        return mutationToolResult(
          "interaction",
          recordInteraction(db, input.input),
          "event",
        );
      case "observation":
        return mutationToolResult(
          "observation",
          recordObservation(db, input.input),
          "event",
        );
      case "milestone":
        return mutationToolResult(
          "milestone",
          recordMilestone(db, input.input),
          "event",
        );
      case "transaction":
        return mutationToolResult(
          "transaction",
          recordTransaction(db, input.input),
          "event",
        );
    }
  }, "Event recording failed.");
}

export const recordEventTool = defineAffinityTool<
  RecordEventToolInput,
  RecordEventToolResult
>({
  name: recordEventToolName,
  description:
    "Record one social event such as an interaction, observation, milestone, or transaction.",
  whenToUse:
    "Use this when you are capturing something that happened in the relationship graph.",
  whenNotToUse:
    "Do not use this for commitments, date anchors, or direct relationship state overrides.",
  sideEffects: "writes_state",
  readOnly: false,
  supportsClarification: false,
  targetKinds: ["event", "contact", "link"],
  inputDescriptions: {
    kind: "Which event family to record: interaction (requires type subtype), observation, milestone, or transaction.",
    input: "The event payload for that family. Interaction events require a `type` subtype; the others do not.",
  },
  outputDescription:
    "Returns the primary event plus the mutation receipt fields and any affected links or derived effects.",
  inputSchema: oneOfSchema(
    [
      objectSchema(
        {
          kind: literalSchema("interaction"),
          input: interactionInputSchema(),
        },
        ["kind", "input"],
      ),
      objectSchema(
        {
          kind: literalSchema("observation"),
          input: socialEventInputSchema(),
        },
        ["kind", "input"],
      ),
      objectSchema(
        {
          kind: literalSchema("milestone"),
          input: socialEventInputSchema(),
        },
        ["kind", "input"],
      ),
      objectSchema(
        {
          kind: literalSchema("transaction"),
          input: socialEventInputSchema(),
        },
        ["kind", "input"],
      ),
    ],
    "Record one event.",
  ),
  handler: recordEventToolHandler,
});
