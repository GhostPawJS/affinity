import { Buffer } from "node:buffer";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath, pathToFileURL } from "node:url";

// Optional source checkout permits the same fixture to measure a baseline.
const root =
  process.argv[2] ?? fileURLToPath(new URL("../../", import.meta.url));
const load = (path) => import(pathToFileURL(resolve(root, "src", path)).href);
const [
  { initAffinityTables },
  write,
  { reviewAffinityToolHandler },
  { exportAffinity },
  { affinitySkillCommand },
  { plainJson },
  { manageContactToolHandler },
  { createMcpServer },
  { affinityMcpOptions },
] = await Promise.all([
  load("init_affinity_tables.ts"),
  load("write.ts"),
  load("tools/review_affinity_tool.ts"),
  load("contacts/export_affinity.ts"),
  load("surface/affinity_skill_command.ts"),
  load("surfaces/cli_output.ts"),
  load("tools/manage_contact_tool.ts"),
  load("surfaces/mcp_server.ts"),
  load("surface/affinity_mcp_options.ts"),
]);
const db = new DatabaseSync(":memory:");
try {
  initAffinityTables(db);
  const now = Date.parse("2026-10-28T12:00:00Z");
  const owner = write.createContact(db, {
    name: "Owner",
    kind: "human",
    bootstrapOwner: true,
    now,
  }).primary;
  const jana = write.createContact(db, {
    name: "Jana",
    kind: "human",
    now,
  }).primary;
  write.recordInteraction(db, {
    type: "conversation",
    summary: "Quick call",
    significance: 5,
    occurredAt: now,
    now,
    participants: [
      { contactId: owner.id, role: "actor" },
      { contactId: jana.id, role: "recipient" },
    ],
  });
  write.addDateAnchor(db, {
    target: { kind: "link", linkId: 1 },
    recurrenceKind: "anniversary",
    anchorMonth: 10,
    anchorDay: 28,
    summary: "Anniversary",
    significance: 4,
    now,
  });
  const size = (value) => Buffer.byteLength(JSON.stringify(value));
  for (const view of [
    "events.contact_journal",
    "links.radar",
    "dates.upcoming",
  ]) {
    const result = reviewAffinityToolHandler(db, {
      view,
      now,
      ...(view === "events.contact_journal"
        ? { contact: { contactId: jana.id }, eventTypes: ["conversation"] }
        : {}),
    });
    if (!result.ok) throw new Error(JSON.stringify(result));
    console.log(`${view}: ${size(result.data.items[0])} B/row`);
  }
  console.log(`export: ${size(exportAffinity(db))} B`);
  console.log(`skill: ${Buffer.byteLength(affinitySkillCommand([]))} B`);
  const server = createMcpServer(affinityMcpOptions(() => db));
  const response = JSON.parse(
    await server.handleLine(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {
          _meta: {
            "io.modelcontextprotocol/protocolVersion": "2026-07-28",
            "io.modelcontextprotocol/clientCapabilities": {},
          },
        },
      }),
    ),
  );
  console.log(`tools/list: ${size(response.result.tools)} B`);
  const receipt = manageContactToolHandler(db, {
    action: "create",
    input: { name: "Sam", kind: "human", now },
  });
  console.log(`compact receipt: ${size(plainJson(receipt, true))} B`);
} finally {
  db.close();
}
