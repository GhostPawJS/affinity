import assert from "node:assert/strict";
import { test } from "node:test";
import { createAffinityMcpServer } from "../mcp.ts";
import { affinityTools } from "../tools/tool_registry.ts";
import { openAffinityDb } from "./open_affinity_db.ts";

const meta = {
  "io.modelcontextprotocol/protocolVersion": "2026-07-28",
  "io.modelcontextprotocol/clientCapabilities": {},
};
test("MCP exposes the complete registry with honest annotations without opening a database", async () => {
  const server = createAffinityMcpServer({
    dbPath: "/nonexistent/unused/affinity.db",
  });
  const reply = JSON.parse(
    (await server.handleLine(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: { _meta: meta },
      }),
    )) ?? "null",
  );
  assert.deepEqual(
    reply.result.tools.map((tool: { name: string }) => tool.name),
    affinityTools.map((tool) => tool.name),
  );
  for (const tool of reply.result.tools) {
    const definition = affinityTools.find((item) => item.name === tool.name);
    assert.equal(tool.annotations.readOnlyHint, definition?.readOnly);
    assert.equal(tool.annotations.idempotentHint, definition?.readOnly);
    assert.equal(tool.annotations.openWorldHint, false);
    assert.equal(
      tool.annotations.destructiveHint,
      [
        "merge_contacts",
        "manage_duplicate_dismissal",
        "manage_identity",
        "manage_relationship",
        "manage_date_anchor",
        "manage_attribute",
      ].includes(tool.name),
    );
  }
});
test("MCP writes and searches real contacts using caller-owned SQLite", async () => {
  const db = await openAffinityDb(":memory:");
  try {
    const server = createAffinityMcpServer({ db });
    const call = async (name: string, args: object) =>
      JSON.parse(
        (await server.handleLine(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: { name, arguments: args, _meta: meta },
          }),
        )) ?? "null",
      );
    const created = await call("manage_contact", {
      action: "create",
      input: { name: "Sam", kind: "human" },
    });
    assert.equal(created.result.structuredContent.ok, true);
    const searched = await call("search_affinity", { query: "Sam" });
    assert.equal(
      searched.result.structuredContent.data.items[0].id,
      created.result.structuredContent.data.primary.id,
    );
    const invalid = await call("search_affinity", { query: 42 });
    assert.equal(invalid.result.isError, true);
    assert.ok(db.prepare("SELECT id FROM contacts").get());
  } finally {
    db.close();
  }
});
