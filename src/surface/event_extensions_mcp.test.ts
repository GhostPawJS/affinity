import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { initAffinityTables } from "../init_affinity_tables.ts";
import { createAffinityMcpServer } from "../mcp.ts";

test("MCP exposes and executes event intake, inspection, search, review and management", async () => {
  const db = new DatabaseSync(":memory:");
  initAffinityTables(db);
  createContact(db, { name: "Owner", kind: "human", bootstrapOwner: true });
  const server = createAffinityMcpServer({ db });
  const call = async (name: string, args: object) =>
    JSON.parse(
      (await server.handleLine(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name,
            arguments: args,
            _meta: {
              "io.modelcontextprotocol/protocolVersion": "2026-07-28",
              "io.modelcontextprotocol/clientCapabilities": {},
            },
          },
        }),
      )) ?? "null",
    ).result;
  try {
    const payload = {
      kind: "interaction",
      input: {
        type: "conversation",
        occurredAt: 1000,
        content: " exact ",
        significance: 3,
        externalRef: { source: "bsky", id: "one" },
        participants: [{ contactId: 1, role: "actor" }],
      },
    };
    const created = await call("record_event", payload);
    assert.ok(created.structuredContent.ok);
    const id = created.structuredContent.data.primary.id;
    assert.equal(
      (await call("record_event", payload)).structuredContent.outcome,
      "no_op",
    );
    const invalid = await call("record_event", {
      ...payload,
      input: { ...payload.input, unexpected: true },
    });
    assert.equal(invalid.structuredContent.ok, false);
    assert.match(invalid.structuredContent.error.message, /allowed keys/);
    assert.equal(
      (
        await call("inspect_affinity_item", {
          kind: "event",
          ref: { source: "bsky", id: "one" },
        })
      ).structuredContent.data.detail.content,
      " exact ",
    );
    assert.equal(
      (await call("search_affinity", { query: "exact", scope: "events" }))
        .structuredContent.data.items[0].id,
      id,
    );
    assert.equal(
      (
        await call("review_affinity", {
          view: "events.thread",
          ref: { source: "bsky", id: "one" },
          includeContent: true,
        })
      ).structuredContent.data.items[0].content,
      " exact ",
    );
    assert.equal(
      (
        await call("manage_event", {
          action: "revise",
          eventId: id,
          patch: { summary: "Revised" },
        })
      ).structuredContent.ok,
      true,
    );
    assert.equal(
      (
        await call("manage_event", {
          action: "delete",
          eventId: id,
          confirm: true,
        })
      ).structuredContent.ok,
      true,
    );
  } finally {
    db.close();
  }
});
