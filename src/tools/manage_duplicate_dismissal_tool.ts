import type { AffinityDb } from "../database.ts";
import type { DismissedPairRef } from "../lib/types/dismissed_pair_ref.ts";
import { dismissDuplicate } from "../merges/dismiss_duplicate.ts";
import { undismissDuplicate } from "../merges/undismiss_duplicate.ts";
import type { TimeInputs } from "./parse_time_input.ts";
import {
  defineAffinityTool,
  enumSchema,
  integerSchema,
  nullableStringSchema,
  objectSchema,
  stringSchema,
} from "./tool_metadata.ts";
import type { MutationToolData } from "./tool_mutation.ts";
import { manageDuplicateDismissalToolName } from "./tool_names.ts";
import {
  type ContactLocator,
  resolveContactLocator,
  withToolHandling,
} from "./tool_resolvers.ts";
import { toolFailure as invalidToolInput } from "./tool_types.ts";
import { type ToolResult, toolSuccess } from "./tool_types.ts";
import { validateToolInput } from "./validate_tool_input.ts";

export interface ManageDuplicateDismissalToolInput {
  action: "dismiss" | "undismiss";
  left: ContactLocator;
  right: ContactLocator;
  reason?: string | null;
}

export type DismissalToolData = Omit<
  MutationToolData<DismissedPairRef>,
  "changes"
> & {
  changes: {
    entity: "duplicate_dismissal";
    leftContactId: number;
    rightContactId: number;
    action: string;
  }[];
};

export type ManageDuplicateDismissalToolResult = ToolResult<DismissalToolData>;

function contactLocatorSchema(description: string) {
  return {
    type: "object" as const,
    properties: {
      contactId: integerSchema("Exact contact id."),
      identity: objectSchema(
        {
          type: stringSchema("Identity type."),
          value: stringSchema("Identity value."),
        },
        ["type", "value"],
        "Contact identity locator.",
      ),
    },
    description,
  };
}

export function manageDuplicateDismissalToolHandler(
  db: AffinityDb,
  rawInput: TimeInputs<ManageDuplicateDismissalToolInput>,
): ManageDuplicateDismissalToolResult {
  const input = structuredClone(rawInput) as ManageDuplicateDismissalToolInput;
  const inputError = validateToolInput(
    manageDuplicateDismissalTool.inputSchema,
    input,
  );
  if (inputError)
    return invalidToolInput(
      "protocol",
      "invalid_input",
      "Invalid input.",
      inputError,
    );
  return withToolHandling<DismissalToolData>(() => {
    const left = resolveContactLocator(db, input.left, "left");
    if (!left.ok) {
      return left.result;
    }
    const right = resolveContactLocator(db, input.right, "right");
    if (!right.ok) {
      return right.result;
    }

    const leftContactId = Math.min(left.value.id, right.value.id);
    const rightContactId = Math.max(left.value.id, right.value.id);
    const existed =
      db
        .prepare(
          "SELECT 1 FROM dismissed_duplicates WHERE left_id = ? AND right_id = ?",
        )
        .get(leftContactId, rightContactId) !== undefined;
    if (input.action === "dismiss") {
      const receipt = dismissDuplicate(
        db,
        left.value.id,
        right.value.id,
        input.reason ?? null,
      );
      return toolSuccess(
        `Dismissed pair #${receipt.primary.leftContactId} / #${receipt.primary.rightContactId}.`,
        {
          ...receipt,
          action: "dismiss",
          changes: [
            {
              entity: "duplicate_dismissal",
              leftContactId,
              rightContactId,
              action: existed ? "updated" : "created",
            },
          ],
        },
      );
    }

    const receipt = undismissDuplicate(db, left.value.id, right.value.id);
    return toolSuccess(
      `Un-dismissed pair #${receipt.primary.leftContactId} / #${receipt.primary.rightContactId}.`,
      {
        ...receipt,
        action: "undismiss",
        changes: existed
          ? [
              {
                entity: "duplicate_dismissal",
                leftContactId,
                rightContactId,
                action: "removed",
              },
            ]
          : [],
      },
    );
  }, "Duplicate dismissal failed.");
}

export const manageDuplicateDismissalTool = defineAffinityTool<
  TimeInputs<ManageDuplicateDismissalToolInput>,
  ManageDuplicateDismissalToolResult
>({
  name: manageDuplicateDismissalToolName,
  description:
    "Dismiss or un-dismiss a duplicate candidate pair so it does not resurface in review_affinity contacts.duplicates.",
  whenToUse:
    "Use dismiss after confirming two contacts are different people (not duplicates). Use undismiss to re-surface a pair for re-evaluation.",
  whenNotToUse:
    "Do not use this to merge contacts — use merge_contacts for confirmed duplicates.",
  sideEffects: "writes_state",
  readOnly: false,
  supportsClarification: true,
  targetKinds: ["contact"],
  inputDescriptions: {
    action: "dismiss to suppress the pair; undismiss to re-surface it.",
    left: "One contact of the pair.",
    right: "The other contact of the pair.",
    reason: "Optional reason for the dismissal (audit trail).",
  },
  outputDescription:
    "Returns the dismissal receipt with the canonical pair identifiers.",
  inputSchema: objectSchema(
    {
      action: enumSchema("Action to perform.", ["dismiss", "undismiss"]),
      left: contactLocatorSchema(
        "Left contact. Provide contactId or identity.",
      ),
      right: contactLocatorSchema(
        "Right contact. Provide contactId or identity.",
      ),
      reason: nullableStringSchema("Optional reason for the dismissal."),
    },
    ["action", "left", "right"],
    "Dismiss or un-dismiss a duplicate candidate pair.",
  ),
  handler: manageDuplicateDismissalToolHandler,
});
