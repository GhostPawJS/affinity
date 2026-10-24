import assert from "node:assert/strict";
import { test } from "node:test";
import { validateInput } from "../surfaces/validate_input.ts";
import { affinitySurfaceTools } from "./affinity_surface_tools.ts";

const inputs: Record<string, Record<string, unknown>> = {
  search_affinity: { query: "Sam" },
  review_affinity: { view: "contacts.list" },
  inspect_affinity_item: { kind: "owner_profile" },
  manage_contact: { action: "create", input: { name: "Sam", kind: "human" } },
  merge_contacts: { winner: { contactId: 1 }, loser: { contactId: 2 } },
  manage_duplicate_dismissal: {
    action: "dismiss",
    left: { contactId: 1 },
    right: { contactId: 2 },
  },
  manage_identity: {
    action: "add",
    contact: { contactId: 1 },
    input: { type: "email", value: "sam@example.com" },
  },
  manage_relationship: {
    action: "seed_social_link",
    from: { contactId: 1 },
    to: { contactId: 2 },
    input: { kind: "personal" },
  },
  record_event: {
    kind: "interaction",
    input: {
      type: "conversation",
      occurredAt: 10,
      summary: "Coffee",
      significance: 5,
      participants: [{ contactId: 1, role: "actor" }],
    },
  },
  manage_commitment: {
    action: "resolve",
    commitmentEventId: 1,
    resolution: "kept",
  },
  manage_date_anchor: { action: "remove", anchorEventId: 1 },
  manage_attribute: {
    action: "unset",
    target: { kind: "contact", contact: { contactId: 1 } },
    name: "favorite",
  },
};
test("every Affinity schema accepts representative handler inputs and rejects invalid shapes", () => {
  for (const tool of affinitySurfaceTools) {
    assert.ok(inputs[tool.name], tool.name);
    assert.deepEqual(
      validateInput(tool.inputSchema, inputs[tool.name]),
      [],
      tool.name,
    );
    assert.ok(validateInput(tool.inputSchema, []).length, tool.name);
    for (const required of tool.inputSchema.required ?? []) {
      const input = { ...inputs[tool.name] };
      delete input[required];
      assert.ok(
        validateInput(tool.inputSchema, input).length,
        `${tool.name}.${required}`,
      );
    }
  }
});
