import type { AffinityDb } from "../database.ts";
import type { MergePrimary } from "../lib/types/merge_primary.ts";
import { mergeContacts } from "../merges/merge_contacts.ts";
import {
  defineAffinityTool,
  integerSchema,
  objectSchema,
  stringSchema,
} from "./tool_metadata.ts";
import { type MutationToolData, mutationToolResult } from "./tool_mutation.ts";
import { mergeContactsToolName } from "./tool_names.ts";
import {
  type ContactLocator,
  resolveContactLocator,
  withToolHandling,
} from "./tool_resolvers.ts";
import type { ToolResult } from "./tool_types.ts";

export interface MergeContactsToolInput {
  winner: ContactLocator;
  loser: ContactLocator;
  reasonSummary?: string | null;
  now?: number;
}

export type MergeContactsToolResult = ToolResult<
  MutationToolData<MergePrimary>
>;

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

export function mergeContactsToolHandler(
  db: AffinityDb,
  input: MergeContactsToolInput,
): MergeContactsToolResult {
  return withToolHandling<MutationToolData<MergePrimary>>(() => {
    const winner = resolveContactLocator(db, input.winner, "winner");
    if (!winner.ok) {
      return winner.result;
    }
    const loser = resolveContactLocator(db, input.loser, "loser");
    if (!loser.ok) {
      return loser.result;
    }
    return mutationToolResult(
      "merge",
      mergeContacts(db, {
        winnerContactId: winner.value.id,
        loserContactId: loser.value.id,
        ...(input.reasonSummary === undefined
          ? {}
          : { reasonSummary: input.reasonSummary }),
        ...(input.now === undefined ? {} : { now: input.now }),
      }),
      "entity",
    );
  }, "Merge failed.");
}

export const mergeContactsTool = defineAffinityTool<
  MergeContactsToolInput,
  MergeContactsToolResult
>({
  name: mergeContactsToolName,
  description:
    "Merge one loser contact into one winner contact using explicit contact locators.",
  whenToUse:
    "Use this only when two contacts are confirmed duplicates and the system should consolidate them.",
  whenNotToUse:
    "Do not use this for routine contact edits or identity cleanup.",
  sideEffects: "writes_state",
  readOnly: false,
  supportsClarification: true,
  targetKinds: ["contact"],
  inputDescriptions: {
    winner: "The contact that should survive the merge.",
    loser: "The contact that should be merged into the winner.",
    reasonSummary: "Optional short reason for the merge.",
    now: "Optional merge timestamp.",
  },
  outputDescription:
    "Returns the merge receipt with rewired entities and affected-link information.",
  inputSchema: objectSchema(
    {
      winner: contactLocatorSchema(
        "Winner contact. Provide contactId or identity.",
      ),
      loser: contactLocatorSchema(
        "Loser contact. Provide contactId or identity.",
      ),
      reasonSummary: stringSchema("Optional merge reason."),
      now: integerSchema("Optional merge timestamp."),
    },
    ["winner", "loser"],
    "Merge two contacts.",
  ),
  handler: mergeContactsToolHandler,
});
