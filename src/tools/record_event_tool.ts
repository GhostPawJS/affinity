import { findOwnerContactId } from "../contacts/queries.ts";
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
import type { SocialEventParticipantInput } from "../lib/types/social_event_input.ts";
import { eventMetadataSchema } from "./event_metadata_schema.ts";
import type { TimeInputs } from "./parse_time_input.ts";
import {
  arraySchema,
  defineAffinityTool,
  enumSchema,
  integerSchema,
  objectSchema,
  stringSchema,
} from "./tool_metadata.ts";
import { type MutationToolData, mutationToolResult } from "./tool_mutation.ts";
import { recordEventToolName } from "./tool_names.ts";
import {
  type ContactLocator,
  resolveContactLocator,
  withToolHandling,
} from "./tool_resolvers.ts";
import { toolFailure as invalidToolInput } from "./tool_types.ts";
import type { ToolResult } from "./tool_types.ts";
import { validateToolInput } from "./validate_tool_input.ts";

type ToolEvidence<
  T extends { participants: readonly SocialEventParticipantInput[] },
> = Omit<T, "participants"> & {
  participants: readonly (
    | SocialEventParticipantInput
    | {
        contact: ContactLocator;
        role: SocialEventParticipantInput["role"];
        directionality?: SocialEventParticipantInput["directionality"];
      }
  )[];
};

export type RecordEventToolInput =
  | { kind: "interaction"; input: ToolEvidence<RecordInteractionInput> }
  | { kind: "observation"; input: ToolEvidence<RecordObservationInput> }
  | { kind: "milestone"; input: ToolEvidence<RecordMilestoneInput> }
  | { kind: "transaction"; input: ToolEvidence<RecordTransactionInput> };

export type RecordEventToolResult = ToolResult<MutationToolData<EventRecord>>;

/**
 * Normalize a participant entry: accept `{ contact: { contactId }, role }` locator
 * pattern (used everywhere else) in addition to `{ contactId, role }`.
 */
function normalizeParticipant(
  db: AffinityDb,
  p: Record<string, unknown>,
): SocialEventParticipantInput {
  let contactId = p.contactId as number | undefined;
  if (contactId === undefined && p.contact != null) {
    const loc = p.contact as Record<string, unknown>;
    const resolved = resolveContactLocator(db, loc as ContactLocator);
    if (!resolved.ok) throw resolved.result;
    contactId = resolved.value.id;
  }
  const result: SocialEventParticipantInput = {
    contactId: contactId as number,
    role: p.role as SocialEventParticipantInput["role"],
  };
  if (p.directionality !== undefined) {
    result.directionality = p.directionality as NonNullable<
      SocialEventParticipantInput["directionality"]
    >;
  }
  return result;
}

/**
 * Ensure the owner contact is included in participants. If absent, inject it as
 * "actor" so the domain-layer assertion never fails silently.
 */
function ensureOwnerParticipates(
  db: AffinityDb,
  participants: SocialEventParticipantInput[],
): SocialEventParticipantInput[] {
  const ownerId = findOwnerContactId(db);
  if (ownerId === null) return participants;
  if (participants.some((p) => p.contactId === ownerId)) return participants;
  return [{ contactId: ownerId, role: "actor" }, ...participants];
}

function prepareParticipants(
  db: AffinityDb,
  raw: readonly Record<string, unknown>[],
  injectOwner: boolean,
): SocialEventParticipantInput[] {
  const normalized = raw.map((p) => normalizeParticipant(db, p));
  return injectOwner ? ensureOwnerParticipates(db, normalized) : normalized;
}

export function recordEventToolHandler(
  db: AffinityDb,
  rawInput: TimeInputs<RecordEventToolInput>,
): RecordEventToolResult {
  const input = structuredClone(rawInput) as RecordEventToolInput;
  const inputError = validateToolInput(
    recordEventTool.inputSchema,
    input,
    "input",
    Date.now(),
    true,
  );
  if (inputError)
    return invalidToolInput(
      "protocol",
      "invalid_input",
      "Invalid input.",
      inputError,
    );
  return withToolHandling<MutationToolData<EventRecord>>(() => {
    const patched = {
      ...input.input,
      participants: prepareParticipants(
        db,
        input.input.participants as unknown as readonly Record<
          string,
          unknown
        >[],
        input.kind !== "observation",
      ),
    };
    switch (input.kind) {
      case "interaction":
        return mutationToolResult(
          "interaction",
          recordInteraction(db, patched as RecordInteractionInput),
          "event",
        );
      case "observation":
        return mutationToolResult(
          "observation",
          recordObservation(db, patched as RecordObservationInput),
          "event",
        );
      case "milestone":
        return mutationToolResult(
          "milestone",
          recordMilestone(db, patched as RecordMilestoneInput),
          "event",
        );
      case "transaction":
        return mutationToolResult(
          "transaction",
          recordTransaction(db, patched as RecordTransactionInput),
          "event",
        );
    }
  }, "Event recording failed.");
}

export const recordEventTool = defineAffinityTool<
  TimeInputs<RecordEventToolInput>,
  RecordEventToolResult
>({
  name: recordEventToolName,
  description:
    "Record one social event such as an interaction, observation, milestone, or transaction. For interactions, milestones, and transactions the owner contact is auto-injected into participants if missing. Observations may omit the owner when recording third-party evidence.",
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
    input:
      "The event payload for that family. Interaction events require a `type` subtype; the others do not.",
  },
  outputDescription:
    "Returns the primary event plus the mutation receipt fields and any affected links or derived effects.",
  inputSchema: objectSchema(
    {
      kind: enumSchema("Event kind.", [
        "interaction",
        "observation",
        "milestone",
        "transaction",
      ]),
      input: objectSchema(
        {
          type: enumSchema(
            "Interaction subtype. Required when kind=interaction, omit otherwise.",
            [
              "conversation",
              "activity",
              "gift",
              "support",
              "conflict",
              "correction",
            ],
          ),
          ...eventMetadataSchema,
          occurredAt: integerSchema(
            "When the event occurred, Unix timestamp in milliseconds.",
          ),
          summary: stringSchema("Event summary. Must be non-empty."),
          significance: integerSchema("Event significance from 1 to 10."),
          participants: arraySchema(
            objectSchema(
              {
                contact: objectSchema(
                  {
                    contactId: integerSchema("Contact id."),
                    identity: objectSchema(
                      {
                        type: stringSchema("Identity type."),
                        value: stringSchema("Identity value."),
                      },
                      ["type", "value"],
                    ),
                  },
                  [],
                ),
                contactId: integerSchema(
                  "Participant contact id. The owner contact MUST be included.",
                ),
                role: enumSchema("Participant role.", [
                  "actor",
                  "recipient",
                  "subject",
                  "observer",
                  "mentioned",
                ]),
                directionality: enumSchema("Optional directionality.", [
                  "owner_initiated",
                  "other_initiated",
                  "mutual",
                  "observed",
                ]),
              },
              ["role"],
            ),
            "Participant list. Must be non-empty and include the owner contact.",
          ),
          now: integerSchema("Optional timestamp override."),
        },
        ["occurredAt", "significance", "participants"],
        "Event payload. Always required. Interaction events also require `type`.",
      ),
    },
    ["kind", "input"],
    "Record one social event.",
  ),
  handler: recordEventToolHandler,
});
