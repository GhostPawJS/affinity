import { findOwnerContactId } from "../contacts/queries.ts";
import type { AffinityDb } from "../database.ts";
import { recordCommitment } from "../events/record_commitment.ts";
import { resolveCommitment } from "../events/resolve_commitment.ts";
import type { CommitmentResolutionKind } from "../lib/types/commitment_resolution_kind.ts";
import type { EventRecord } from "../lib/types/event_record.ts";
import type { RecordCommitmentInput } from "../lib/types/record_commitment_input.ts";
import type { ResolveCommitmentOptions } from "../lib/types/resolve_commitment_options.ts";
import type { SocialEventParticipantInput } from "../lib/types/social_event_input.ts";
import {
  arraySchema,
  defineAffinityTool,
  enumSchema,
  integerSchema,
  objectSchema,
  stringSchema,
} from "./tool_metadata.ts";
import { type MutationToolData, mutationToolResult } from "./tool_mutation.ts";
import { manageCommitmentToolName } from "./tool_names.ts";
import { withToolHandling } from "./tool_resolvers.ts";
import type { ToolResult } from "./tool_types.ts";

export type ManageCommitmentToolInput =
  | { action: "record"; input: RecordCommitmentInput }
  | {
      action: "resolve";
      commitmentEventId: number;
      resolution: CommitmentResolutionKind;
      options?: ResolveCommitmentOptions;
    };

export type ManageCommitmentToolResult = ToolResult<
  MutationToolData<EventRecord>
>;

function normalizeParticipant(
  p: Record<string, unknown>,
): SocialEventParticipantInput {
  let contactId = p.contactId as number | undefined;
  if (contactId === undefined && p.contact != null) {
    const loc = p.contact as Record<string, unknown>;
    contactId = loc.contactId as number | undefined;
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
): SocialEventParticipantInput[] {
  return ensureOwnerParticipates(db, raw.map(normalizeParticipant));
}

export function manageCommitmentToolHandler(
  db: AffinityDb,
  input: ManageCommitmentToolInput,
): ManageCommitmentToolResult {
  return withToolHandling<MutationToolData<EventRecord>>(() => {
    if (input.action === "record") {
      const patched: RecordCommitmentInput = {
        ...input.input,
        participants: prepareParticipants(
          db,
          input.input.participants as unknown as readonly Record<
            string,
            unknown
          >[],
        ),
      };
      return mutationToolResult(
        "record",
        recordCommitment(db, patched),
        "commitment",
      );
    }
    return mutationToolResult(
      "resolve",
      resolveCommitment(
        db,
        input.commitmentEventId,
        input.resolution,
        input.options,
      ),
      "commitment",
    );
  }, "Commitment tool failed.");
}

export const manageCommitmentTool = defineAffinityTool<
  ManageCommitmentToolInput,
  ManageCommitmentToolResult
>({
  name: manageCommitmentToolName,
  description:
    "Record or resolve one commitment such as a promise or agreement. The owner contact is auto-injected into participants if missing.",
  whenToUse:
    "Use this when the work is specifically about a commitment lifecycle rather than a general event.",
  whenNotToUse:
    "Do not use this for ordinary interactions or direct relationship state changes.",
  sideEffects: "writes_state",
  readOnly: false,
  supportsClarification: false,
  targetKinds: ["event", "contact", "link"],
  inputDescriptions: {
    action: "Whether to record or resolve a commitment.",
    input: "Commitment recording payload.",
    commitmentEventId: "Exact commitment event id to resolve.",
    resolution: "Resolution kind to apply.",
    options: "Optional resolution metadata and resolving event data.",
  },
  outputDescription:
    "Returns the commitment mutation receipt, including linked event creation and derived link effects.",
  inputSchema: objectSchema(
    {
      action: enumSchema("Operation to perform.", ["record", "resolve"]),
      input: objectSchema(
        {
          commitmentType: enumSchema("Promise or agreement.", [
            "promise",
            "agreement",
          ]),
          occurredAt: integerSchema(
            "When the commitment was made, Unix timestamp in milliseconds.",
          ),
          summary: stringSchema("Commitment summary. Must be non-empty."),
          significance: integerSchema("Commitment significance from 1 to 10."),
          dueAt: integerSchema("Optional due timestamp."),
          participants: arraySchema(
            objectSchema(
              {
                contactId: integerSchema(
                  "Participant contact id. The owner contact MUST be included.",
                ),
                role: stringSchema("Participant role."),
                directionality: stringSchema("Optional directionality."),
              },
              ["contactId", "role"],
            ),
            "Participant list. Must be non-empty and include the owner contact.",
          ),
          now: integerSchema("Optional timestamp override."),
        },
        [
          "commitmentType",
          "occurredAt",
          "summary",
          "significance",
          "participants",
        ],
        "Commitment payload. Required when action=record.",
      ),
      commitmentEventId: integerSchema(
        "Commitment event id. Required when action=resolve.",
      ),
      resolution: enumSchema(
        "How the commitment was resolved. Required when action=resolve.",
        ["kept", "cancelled", "broken"],
      ),
      options: objectSchema(
        {
          now: integerSchema("Optional timestamp."),
          resolvingEvent: objectSchema(
            {
              type: stringSchema("Optional resolving event type."),
              occurredAt: integerSchema("Optional resolving event timestamp."),
              summary: stringSchema("Optional resolving event summary."),
              significance: integerSchema(
                "Optional resolving event significance.",
              ),
            },
            [],
          ),
        },
        [],
        "Optional metadata.",
      ),
    },
    ["action"],
    "Record or resolve one commitment.",
  ),
  handler: manageCommitmentToolHandler,
});
