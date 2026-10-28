import type { AffinityDb } from "../database.ts";
import {
  type ReviseEventPatch,
  deleteEvent,
  reviseEvent,
} from "../events/manage_event.ts";
import type { EventRecord } from "../lib/types/event_record.ts";
import type { ExternalRef } from "../lib/types/social_event_input.ts";
import { externalRefSchema } from "./event_metadata_schema.ts";
import type { TimeInputs } from "./parse_time_input.ts";
import {
  booleanSchema,
  defineAffinityTool,
  enumSchema,
  integerSchema,
  objectSchema,
  stringSchema,
} from "./tool_metadata.ts";
import { type MutationToolData, mutationToolResult } from "./tool_mutation.ts";
import { manageEventToolName } from "./tool_names.ts";
import { withToolHandling } from "./tool_resolvers.ts";
import { type ToolResult, toolFailure } from "./tool_types.ts";
import { validateToolInput } from "./validate_tool_input.ts";
export interface ManageEventToolInput {
  action: "revise" | "delete";
  eventId?: number;
  ref?: ExternalRef;
  patch?: ReviseEventPatch;
  confirm?: boolean;
}
export type ManageEventToolResult = ToolResult<MutationToolData<EventRecord>>;
export function manageEventToolHandler(
  db: AffinityDb,
  raw: TimeInputs<ManageEventToolInput>,
): ManageEventToolResult {
  const input = structuredClone(raw) as ManageEventToolInput;
  const error = validateToolInput(
    manageEventTool.inputSchema,
    input,
    "input",
    Date.now(),
    true,
  );
  if (error)
    return toolFailure("protocol", "invalid_input", "Invalid input.", error);
  return withToolHandling(() => {
    const target = {
      ...(input.eventId === undefined ? {} : { eventId: input.eventId }),
      ...(input.ref === undefined ? {} : { ref: input.ref }),
    };
    return mutationToolResult(
      input.action,
      input.action === "revise"
        ? reviseEvent(db, target, input.patch ?? {})
        : deleteEvent(db, target, { confirm: input.confirm === true }),
      "event",
    );
  }, "Event management failed.");
}
export const manageEventTool = defineAffinityTool<
  TimeInputs<ManageEventToolInput>,
  ManageEventToolResult
>({
  name: manageEventToolName,
  description:
    "Revise or delete one event by eventId or external reference. Delete requires confirm=true and recomputes affected relationships.",
  whenToUse: "Correct imported event text or metadata, or remove an event.",
  whenNotToUse: "Use record_event to capture new evidence.",
  sideEffects: "writes_state",
  readOnly: false,
  supportsClarification: false,
  targetKinds: ["event"],
  inputDescriptions: {
    action: "revise or delete",
    eventId: "Exact event id",
    ref: "External event reference",
    patch: "Fields to revise",
    confirm: "Required true for deletion",
  },
  outputDescription: "Event mutation receipt and affected links.",
  inputSchema: objectSchema(
    {
      action: enumSchema("Action.", ["revise", "delete"]),
      eventId: integerSchema("Event id; provide eventId or ref."),
      ref: externalRefSchema,
      confirm: booleanSchema("Must be true to delete."),
      patch: objectSchema(
        {
          summary: stringSchema("Short non-empty label."),
          content: stringSchema("Verbatim content, at most 1 MB UTF-8."),
          occurredAt: integerSchema("Event timestamp."),
          significance: integerSchema("Significance 1..10."),
          channel: stringSchema("Channel, at most 40 characters."),
          type: enumSchema("Type within the same event kind.", [
            "conversation",
            "activity",
            "gift",
            "support",
            "conflict",
            "correction",
            "observation",
            "milestone",
            "transaction",
            "promise",
            "agreement",
            "date_anchor",
          ]),
          externalRef: externalRefSchema,
        },
        [],
        "Fields to revise; externalRef may only be added when absent.",
      ),
    },
    ["action"],
  ),
  handler: manageEventToolHandler,
});
