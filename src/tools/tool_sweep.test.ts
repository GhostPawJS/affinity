import assert from "node:assert/strict";
import { test } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { affinityTools } from "./tool_registry.ts";
import type { ToolResult } from "./tool_types.ts";

for (const tool of affinityTools) {
  test(`${tool.name} handles missing and malformed arguments`, async () => {
    const variants: Record<string, unknown>[] = [{}];
    for (const key of ["action", "view", "kind"]) {
      for (const value of tool.inputSchema.properties?.[key]?.enum ?? []) {
        variants.push(
          { [key]: value },
          { [key]: value, contact: {}, confirm: true },
          {
            [key]: value,
            input: 42,
            contact: "wrong",
            link: false,
            target: [],
          },
        );
      }
    }
    for (const input of variants) {
      const db = await createInitializedAffinityDb();
      try {
        createContact(db, {
          name: "Owner",
          kind: "human",
          bootstrapOwner: true,
        });
        createContact(db, { name: "Jana Petersen", kind: "human" });
        const handler = tool.handler as (
          database: Parameters<typeof createContact>[0],
          input: unknown,
        ) => ToolResult<unknown>;
        const result = handler(db, input);
        assert.equal(typeof result.ok, "boolean", JSON.stringify(input));
        assert.equal(typeof result.summary, "string");
        assert.ok(Array.isArray(result.entities));
        if (result.outcome === "error")
          assert.notEqual(
            result.error.code,
            "system_error",
            `${tool.name} ${JSON.stringify(input)}: ${result.error.message}`,
          );
      } finally {
        db.close();
      }
    }
  });
}
