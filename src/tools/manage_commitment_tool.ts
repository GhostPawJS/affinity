import type { AffinityDb } from "../database.ts";
import { recordCommitment } from "../events/record_commitment.ts";
import { resolveCommitment } from "../events/resolve_commitment.ts";
import type { CommitmentResolutionKind } from "../lib/types/commitment_resolution_kind.ts";
import type { EventRecord } from "../lib/types/event_record.ts";
import type { RecordCommitmentInput } from "../lib/types/record_commitment_input.ts";
import type { ResolveCommitmentOptions } from "../lib/types/resolve_commitment_options.ts";
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

function commitmentInputSchema() {
  return objectSchema(
    {
      commitmentType: enumSchema("Promise or agreement.", [
        "promise",
        "agreement",
      ]),
      occurredAt: integerSchema("When the commitment was made."),
      summary: stringSchema("Commitment summary."),
      significance: integerSchema("Commitment significance."),
      dueAt: integerSchema("Optional due timestamp."),
      participants: arraySchema(
        objectSchema(
          {
            contactId: integerSchema("Participant contact id."),
            role: stringSchema("Participant role."),
            directionality: stringSchema("Optional directionality."),
          },
          ["contactId", "role"],
        ),
        "Participant list.",
      ),
      now: integerSchema("Optional timestamp."),
    },
    ["commitmentType", "occurredAt", "summary", "significance", "participants"],
  );
}

export function manageCommitmentToolHandler(
  db: AffinityDb,
  input: ManageCommitmentToolInput,
): ManageCommitmentToolResult {
  return withToolHandling<MutationToolData<EventRecord>>(() => {
    if (input.action === "record") {
      return mutationToolResult(
        "record",
        recordCommitment(db, input.input),
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
    "Record or resolve one commitment such as a promise or agreement.",
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
  inputSchema: oneOfSchema(
    [
      objectSchema(
        {
          action: literalSchema("record"),
          input: commitmentInputSchema(),
        },
        ["action", "input"],
      ),
      objectSchema(
        {
          action: literalSchema("resolve"),
          commitmentEventId: integerSchema("Commitment event id."),
          resolution: enumSchema("Commitment resolution.", [
            "kept",
            "cancelled",
            "broken",
          ]),
          options: objectSchema(
            {
              now: integerSchema("Optional timestamp."),
              resolvingEvent: objectSchema(
                {
                  type: stringSchema("Optional resolving event type."),
                  occurredAt: integerSchema(
                    "Optional resolving event timestamp.",
                  ),
                  summary: stringSchema("Optional resolving event summary."),
                  significance: integerSchema(
                    "Optional resolving event significance.",
                  ),
                },
                [],
              ),
            },
            [],
          ),
        },
        ["action", "commitmentEventId", "resolution"],
      ),
    ],
    "Manage commitments.",
  ),
  handler: manageCommitmentToolHandler,
});
