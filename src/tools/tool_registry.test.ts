import { deepStrictEqual, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  affinityTools,
  getAffinityToolByName,
  listAffinityToolDefinitions,
} from "./tool_registry.ts";

describe("tool_registry", () => {
  it("registers all 11 tools", () => {
    strictEqual(affinityTools.length, 11);
    deepStrictEqual(
      affinityTools.map((tool) => tool.name),
      [
        "search_affinity",
        "review_affinity",
        "inspect_affinity_item",
        "manage_contact",
        "merge_contacts",
        "manage_identity",
        "manage_relationship",
        "record_event",
        "manage_commitment",
        "manage_date_anchor",
        "manage_attribute",
      ],
    );
  });

  it("lists definitions and resolves by name", () => {
    strictEqual(listAffinityToolDefinitions().length, 11);
    strictEqual(getAffinityToolByName("review_affinity")?.name, "review_affinity");
    strictEqual(getAffinityToolByName("missing_tool"), null);
  });
});
