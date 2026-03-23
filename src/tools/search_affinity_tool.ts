import { searchContacts } from "../contacts/search_contacts.ts";
import type { ContactKind, ContactLifecycleState } from "../contacts/types.ts";
import type { AffinityDb } from "../database.ts";
import {
  defineAffinityTool,
  booleanSchema,
  enumSchema,
  integerSchema,
  objectSchema,
  stringSchema,
} from "./tool_metadata.ts";
import { searchAffinityToolName } from "./tool_names.ts";
import { toContactListToolItem } from "./tool_ref.ts";
import { withToolHandling } from "./tool_resolvers.ts";
import { summarizeCount } from "./tool_summary.ts";
import type { ToolResult } from "./tool_types.ts";
import { toolSuccess } from "./tool_types.ts";

export interface SearchAffinityToolInput {
  query: string;
  kind?: ContactKind;
  lifecycleState?: ContactLifecycleState;
  includeOwner?: boolean;
  includeDormant?: boolean;
  limit?: number;
  offset?: number;
}

export interface SearchAffinityToolData {
  query: string;
  items: ReturnType<typeof toContactListToolItem>[];
  count: number;
}

export type SearchAffinityToolResult = ToolResult<SearchAffinityToolData>;

export function searchAffinityToolHandler(
  db: AffinityDb,
  input: SearchAffinityToolInput,
): SearchAffinityToolResult {
  return withToolHandling<SearchAffinityToolData>(() => {
    const options = {
      ...(input.limit === undefined ? {} : { limit: input.limit }),
      ...(input.offset === undefined ? {} : { offset: input.offset }),
    };
    const rows = searchContacts(
      db,
      input.query,
      {
        ...(input.kind === undefined ? {} : { kind: input.kind }),
        ...(input.lifecycleState === undefined
          ? {}
          : { lifecycleState: input.lifecycleState }),
        ...(input.includeOwner === undefined
          ? {}
          : { includeOwner: input.includeOwner }),
        ...(input.includeDormant === undefined
          ? {}
          : { includeDormant: input.includeDormant }),
      },
      options,
    );
    const items = rows.map(toContactListToolItem);
    return toolSuccess(
      summarizeCount(items.length, "contact"),
      {
        query: input.query,
        items,
        count: items.length,
      },
      {
        entities: items,
      },
    );
  }, "Search failed.");
}

export const searchAffinityTool = defineAffinityTool<
  SearchAffinityToolInput,
  SearchAffinityToolResult
>({
  name: searchAffinityToolName,
  description:
    "Search contacts by name or identity, including exact natural-key lookups like email-style identifiers.",
  whenToUse:
    "Use this when you want to find contacts from free text or a known routing identity such as an email or URL-like handle.",
  whenNotToUse:
    "Do not use this when you already know the exact contact you want to inspect in depth.",
  sideEffects: "none",
  readOnly: true,
  supportsClarification: false,
  targetKinds: ["contact"],
  inputDescriptions: {
    query: "Free-text or natural-key search text.",
    kind: "Optional contact kind filter.",
    lifecycleState: "Optional lifecycle state filter.",
    includeOwner: "Whether owner contacts are eligible for results.",
    includeDormant: "Whether dormant contacts should be eligible for results.",
    limit: "Optional result limit.",
    offset: "Optional result offset.",
  },
  outputDescription:
    "Returns compact contact hits, the original query, and the hit count.",
  inputSchema: objectSchema(
    {
      query: stringSchema("Free-text or natural-key query."),
      kind: enumSchema("Optional contact kind filter.", [
        "human", "group", "company", "team", "pet", "service", "other",
      ]),
      lifecycleState: enumSchema("Optional lifecycle state filter.", [
        "active", "dormant", "merged", "lost",
      ]),
      includeOwner: booleanSchema("Whether owner contacts are included."),
      includeDormant: booleanSchema("Whether dormant contacts are included."),
      limit: integerSchema("Optional result limit."),
      offset: integerSchema("Optional result offset."),
    },
    ["query"],
    "Search affinity contacts.",
  ),
  handler: searchAffinityToolHandler,
});
