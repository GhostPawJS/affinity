import { searchContacts } from "../contacts/search_contacts.ts";
import type { ContactKind, ContactLifecycleState } from "../contacts/types.ts";
import type { AffinityDb } from "../database.ts";
import { searchEvents } from "../events/event_discovery.ts";
import type { TimeInputs } from "./parse_time_input.ts";
import {
  arraySchema,
  booleanSchema,
  defineAffinityTool,
  enumSchema,
  integerSchema,
  objectSchema,
  oneOfSchema,
  stringSchema,
} from "./tool_metadata.ts";
import { searchAffinityToolName } from "./tool_names.ts";
import { toContactListToolItem } from "./tool_ref.ts";
import { withToolHandling } from "./tool_resolvers.ts";
import { summarizeCount } from "./tool_summary.ts";
import { toolFailure as invalidToolInput } from "./tool_types.ts";
import type { ToolResult } from "./tool_types.ts";
import { toolSuccess } from "./tool_types.ts";
import { validateToolInput } from "./validate_tool_input.ts";

export interface SearchAffinityToolInput {
  scope?: "contacts" | "events" | "all";
  query: string;
  kind?: ContactKind;
  lifecycleState?: ContactLifecycleState;
  attribute?: string | string[];
  tag?: string | string[];
  includeLost?: boolean;
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
  rawInput: TimeInputs<SearchAffinityToolInput>,
): SearchAffinityToolResult {
  const input = structuredClone(rawInput) as SearchAffinityToolInput;
  const inputError = validateToolInput(searchAffinityTool.inputSchema, input);
  if (inputError)
    return invalidToolInput(
      "protocol",
      "invalid_input",
      "Invalid input.",
      inputError,
    );
  return withToolHandling<SearchAffinityToolData>(() => {
    const options = {
      ...(input.limit === undefined ? {} : { limit: input.limit }),
      ...(input.offset === undefined ? {} : { offset: input.offset }),
    };
    const rows =
      input.scope === "events"
        ? []
        : searchContacts(
            db,
            input.query,
            {
              ...(input.attribute === undefined
                ? {}
                : { attribute: input.attribute }),
              ...(input.tag === undefined ? {} : { tag: input.tag }),
              ...(input.includeLost === undefined
                ? {}
                : { includeLost: input.includeLost }),
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
    const items = [
      ...rows.map(toContactListToolItem),
      ...(input.scope === "events" || input.scope === "all"
        ? searchEvents(db, input.query, options)
        : []),
    ];
    return toolSuccess(
      summarizeCount(
        items.length,
        input.scope === "events"
          ? "event"
          : input.scope === "all"
            ? "item"
            : "contact",
      ),
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
  TimeInputs<SearchAffinityToolInput>,
  SearchAffinityToolResult
>({
  name: searchAffinityToolName,
  description:
    "Search contacts by name, identity, attributes, link roles, bonds and event text. All whitespace tokens must match. Dormant and lost contacts are excluded by default; use includeDormant and includeLost to include them.",
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
    attribute: "Attribute name or name=value; arrays require all filters.",
    tag: "Tag name; arrays require all tags.",
    includeLost: "Whether lost contacts are included in search.",
    includeOwner: "Whether owner contacts are eligible for results.",
    includeDormant: "Whether dormant contacts should be eligible for results.",
    limit: "Optional result limit.",
    offset: "Optional result offset.",
  },
  outputDescription:
    "Returns compact contact hits, the original query, and the hit count.",
  inputSchema: objectSchema(
    {
      scope: enumSchema("Search scope; defaults to contacts.", [
        "contacts",
        "events",
        "all",
      ]),
      query: stringSchema("Free-text or natural-key query."),
      kind: enumSchema("Optional contact kind filter.", [
        "human",
        "group",
        "company",
        "team",
        "pet",
        "service",
        "other",
      ]),
      lifecycleState: enumSchema("Optional lifecycle state filter.", [
        "active",
        "dormant",
        "merged",
        "lost",
      ]),
      attribute: oneOfSchema([
        stringSchema("Attribute filter."),
        arraySchema(stringSchema("Attribute filter."), "AND filters."),
      ]),
      tag: oneOfSchema([
        stringSchema("Tag filter."),
        arraySchema(stringSchema("Tag filter."), "AND tags."),
      ]),
      includeLost: booleanSchema(
        "Include lost contacts (search excludes them by default).",
      ),
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
