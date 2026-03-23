import type { AffinityDb } from "../database.ts";
import { addDateAnchor } from "../dates/add_date_anchor.ts";
import { removeDateAnchor } from "../dates/remove_date_anchor.ts";
import { reviseDateAnchor } from "../dates/revise_date_anchor.ts";
import type { EventRecord } from "../lib/types/event_record.ts";
import type {
  AddDateAnchorInput,
  DateAnchorTarget,
} from "../lib/types/add_date_anchor_input.ts";
import type { ReviseDateAnchorOptions } from "../lib/types/revise_date_anchor_options.ts";
import type { ReviseDateAnchorPatch } from "../lib/types/revise_date_anchor_patch.ts";
import {
  booleanSchema,
  defineAffinityTool,
  enumSchema,
  integerSchema,
  literalSchema,
  objectSchema,
  oneOfSchema,
  stringSchema,
} from "./tool_metadata.ts";
import { manageDateAnchorToolName } from "./tool_names.ts";
import { mutationToolResult, type MutationToolData } from "./tool_mutation.ts";
import {
  resolveContactLocator,
  resolveLinkLocator,
  type ContactLocator,
  type LinkLocator,
  withToolHandling,
} from "./tool_resolvers.ts";
import type {
  ToolFailure,
  ToolNeedsClarification,
  ToolResult,
} from "./tool_types.ts";

type DateAnchorTargetInput =
  | { kind: "contact"; contact: ContactLocator }
  | { kind: "link"; link: LinkLocator };

export type ManageDateAnchorToolInput =
  | {
      action: "add";
      input: Omit<AddDateAnchorInput, "target"> & { target: DateAnchorTargetInput };
    }
  | {
      action: "revise";
      anchorEventId: number;
      patch: ReviseDateAnchorPatch;
      options?: ReviseDateAnchorOptions;
    }
  | { action: "remove"; anchorEventId: number; removedAt?: number };

export type ManageDateAnchorToolResult = ToolResult<
  MutationToolData<EventRecord>
>;

function contactLocatorSchema(description: string) {
  return oneOfSchema(
    [
      objectSchema(
        { contactId: integerSchema("Exact contact id.") },
        ["contactId"],
      ),
      objectSchema(
        {
          identity: objectSchema(
            {
              type: stringSchema("Identity type."),
              value: stringSchema("Identity value."),
            },
            ["type", "value"],
          ),
        },
        ["identity"],
      ),
    ],
    description,
  );
}

function linkLocatorSchema(description: string) {
  return oneOfSchema(
    [
      objectSchema({ linkId: integerSchema("Exact link id.") }, ["linkId"]),
      objectSchema(
        {
          endpoints: objectSchema(
            {
              fromContactId: integerSchema("From contact id."),
              toContactId: integerSchema("To contact id."),
              kind: stringSchema("Optional link kind."),
              role: stringSchema("Optional link role."),
              isStructural: booleanSchema("Optional structural discriminator."),
            },
            ["fromContactId", "toContactId"],
          ),
        },
        ["endpoints"],
      ),
    ],
    description,
  );
}

function resolveDateAnchorTarget(
  db: AffinityDb,
  target: DateAnchorTargetInput,
): { kind: "ok"; target: DateAnchorTarget } | {
  kind: "error";
  result: ToolFailure | ToolNeedsClarification;
} {
  if (target.kind === "contact") {
    const contact = resolveContactLocator(db, target.contact, "target.contact");
    if (!contact.ok) {
      return { kind: "error", result: contact.result };
    }
    return { kind: "ok", target: { kind: "contact", contactId: contact.value.id } };
  }
  const link = resolveLinkLocator(db, target.link, "target.link");
  if (!link.ok) {
    return { kind: "error", result: link.result };
  }
  return { kind: "ok", target: { kind: "link", linkId: link.value.id } };
}

export function manageDateAnchorToolHandler(
  db: AffinityDb,
  input: ManageDateAnchorToolInput,
): ManageDateAnchorToolResult {
  return withToolHandling<MutationToolData<EventRecord>>(() => {
    if (input.action === "add") {
      const resolved = resolveDateAnchorTarget(db, input.input.target);
      if (resolved.kind === "error") {
        return resolved.result;
      }
      return mutationToolResult(
        "add",
        addDateAnchor(db, { ...input.input, target: resolved.target }),
        "date anchor",
      );
    }
    if (input.action === "revise") {
      return mutationToolResult(
        "revise",
        reviseDateAnchor(db, input.anchorEventId, input.patch, input.options),
        "date anchor",
      );
    }
    return mutationToolResult(
      "remove",
      removeDateAnchor(db, input.anchorEventId, input.removedAt),
      "date anchor",
    );
  }, "Date-anchor tool failed.");
}

export const manageDateAnchorTool = defineAffinityTool<
  ManageDateAnchorToolInput,
  ManageDateAnchorToolResult
>({
  name: manageDateAnchorToolName,
  description:
    "Add, revise, or remove recurring date anchors on contacts or links.",
  whenToUse:
    "Use this for birthdays, anniversaries, renewals, memorials, and other recurring anchors.",
  whenNotToUse:
    "Do not use this for one-off events or relationship state changes.",
  sideEffects: "writes_state",
  readOnly: false,
  supportsClarification: true,
  targetKinds: ["contact", "link", "event"],
  inputDescriptions: {
    action: "Which date-anchor action to perform.",
    input: "Creation payload for a new date anchor.",
    anchorEventId: "Exact anchor event id for revise or remove actions.",
    patch: "Allowed date-anchor patch fields.",
    options: "Optional revise metadata such as now and force.",
    removedAt: "Optional removal timestamp.",
  },
  outputDescription:
    "Returns the date-anchor mutation receipt, including any recomputed upcoming occurrences.",
  inputSchema: oneOfSchema(
    [
      objectSchema(
        {
          action: literalSchema("add"),
          input: objectSchema(
            {
              target: oneOfSchema(
                [
                  objectSchema(
                    {
                      kind: literalSchema("contact"),
                      contact: contactLocatorSchema("Target contact."),
                    },
                    ["kind", "contact"],
                  ),
                  objectSchema(
                    {
                      kind: literalSchema("link"),
                      link: linkLocatorSchema("Target link."),
                    },
                    ["kind", "link"],
                  ),
                ],
                "Date-anchor target.",
              ),
              recurrenceKind: enumSchema("Recurrence kind.", [
                "birthday", "anniversary", "renewal", "memorial", "custom_yearly",
              ]),
              anchorMonth: integerSchema("Anchor month."),
              anchorDay: integerSchema("Anchor day."),
              summary: stringSchema("Summary."),
              significance: integerSchema("Significance."),
              now: integerSchema("Optional timestamp."),
              force: booleanSchema("Whether duplicate checks should be bypassed."),
            },
            [
              "target",
              "recurrenceKind",
              "anchorMonth",
              "anchorDay",
              "summary",
              "significance",
            ],
          ),
        },
        ["action", "input"],
      ),
      objectSchema(
        {
          action: literalSchema("revise"),
          anchorEventId: integerSchema("Anchor event id."),
          patch: objectSchema(
            {
              recurrenceKind: enumSchema("Optional recurrence kind.", [
                "birthday", "anniversary", "renewal", "memorial", "custom_yearly",
              ]),
              anchorMonth: integerSchema("Optional month."),
              anchorDay: integerSchema("Optional day."),
              summary: stringSchema("Optional summary."),
              significance: integerSchema("Optional significance."),
            },
            [],
          ),
          options: objectSchema(
            {
              now: integerSchema("Optional timestamp."),
              force: booleanSchema("Whether duplicate checks should be bypassed."),
            },
            [],
          ),
        },
        ["action", "anchorEventId", "patch"],
      ),
      objectSchema(
        {
          action: literalSchema("remove"),
          anchorEventId: integerSchema("Anchor event id."),
          removedAt: integerSchema("Optional removal timestamp."),
        },
        ["action", "anchorEventId"],
      ),
    ],
    "Manage date anchors.",
  ),
  handler: manageDateAnchorToolHandler,
});
