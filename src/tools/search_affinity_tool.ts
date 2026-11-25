import { searchContacts } from "../contacts/search_contacts.ts";
import type { ContactKind, ContactLifecycleState } from "../contacts/types.ts";
import type { AffinityDb } from "../database.ts";
import { searchEvents } from "../events/event_discovery.ts";
import { definedOptions } from "../lib/defined_options.ts";
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
import { withToolTimeZone } from "./tool_time_zone.ts";
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
  total?: number;
  hasMore?: boolean;
}

export type SearchAffinityToolResult = ToolResult<SearchAffinityToolData>;

export function searchAffinityToolHandler(
  db: AffinityDb,
  rawInput: TimeInputs<SearchAffinityToolInput>,
): SearchAffinityToolResult {
  return withToolTimeZone(rawInput, () =>
    searchAffinityToolHandlerInZone(db, rawInput),
  );
}

function searchAffinityToolHandlerInZone(
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
    const limit = input.limit ?? 50;
    const offset = input.offset ?? 0;
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 250 ||
      !Number.isInteger(offset) ||
      offset < 0
    )
      return invalidToolInput(
        "protocol",
        "invalid_input",
        "Invalid pagination.",
        "limit must be 1..250; offset must be non-negative",
      );
    const all: SearchAffinityToolData["items"] = [];
    const scopes =
      input.scope === "all"
        ? (["contacts", "events"] as const)
        : [input.scope ?? "contacts"];
    const filters = definedOptions({
      attribute: input.attribute,
      tag: input.tag,
      includeLost: input.includeLost,
      kind: input.kind,
      lifecycleState: input.lifecycleState,
      includeOwner: input.includeOwner,
      includeDormant: input.includeDormant,
    });
    for (const scope of scopes) {
      let nextOffset = 0;
      let page: SearchAffinityToolData["items"];
      do {
        const options = { limit: 250, offset: nextOffset };
        page =
          scope === "events"
            ? searchEvents(db, input.query, options)
            : searchContacts(db, input.query, filters, options).map(
                toContactListToolItem,
              );
        all.push(...page);
        nextOffset += page.length;
      } while (page.length === 250);
    }
    const items = all.slice(offset, offset + limit);
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
        total: all.length,
        hasMore: offset + items.length < all.length,
      },
      { entities: items },
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
        "agent",
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
