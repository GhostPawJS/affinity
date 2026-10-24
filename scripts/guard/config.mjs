import assert from "node:assert/strict";
export const packageName = "@ghostpaw/affinity";
export const publicEntries = [".", "./mcp"];
export const binName = "ghostpaw-affinity";
export const extraFiles = ["SKILL.md", "skills/affinity/SKILL.md"];
export const entries = {
  full: `export * from './dist/index.js';`,
  tools: `import {tools} from './dist/index.js'; export const registry = tools.affinityTools;`,
  "read-write": `export {read, write} from './dist/index.js';`,
  mcp: `export * from './dist/mcp.js';`,
  cli: { entryPoints: ["dist/cli.js"] },
  "mcp-server": { entryPoints: ["dist/mcp-server.js"] },
};
export const claim = {
  action: "create",
  input: { name: "Mira jasmine tea", kind: "human" },
};
export const search = { query: "jasmine tea" };
export const modernMeta = {
  "io.modelcontextprotocol/protocolVersion": "2026-07-28",
  "io.modelcontextprotocol/clientCapabilities": {},
};
export const discover = {
  jsonrpc: "2.0",
  id: 4,
  method: "server/discover",
  params: { _meta: modernMeta },
};
export const searchRequest = {
  jsonrpc: "2.0",
  id: 5,
  method: "tools/call",
  params: { name: "search_affinity", arguments: search, _meta: modernMeta },
};
export const legacyRequests = [
  {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: "guard", version: "1" },
    },
  },
  { jsonrpc: "2.0", id: 2, method: "tools/list" },
  {
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: { name: "search_affinity", arguments: search },
  },
];
export const cliRemember = ["call", "manage_contact", JSON.stringify(claim)];
export const cliSearch = ["call", "search_affinity", JSON.stringify(search)];
export function assertApi(root, mcp) {
  for (const key of ["initAffinityTables", "read", "write", "tools"])
    assert.ok(root[key], key);
  assert.equal(typeof mcp.createAffinityMcpServer, "function");
}
export function smokeLibrary(api, db) {
  api.initAffinityTables(db);
  const item = api.write.createContact(db, claim.input);
  assert.ok(
    api.read
      .searchContacts(db, search.query)
      .some((value) => value.id === item.primary.id),
  );
}
export const typeConsumer = `import {DatabaseSync} from 'node:sqlite';
import {initAffinityTables, read, write} from '${packageName}';
import {createAffinityMcpServer} from '${packageName}/mcp';
const db = new DatabaseSync(':memory:'); initAffinityTables(db);
write.createContact(db, {name: 'Tea', kind: 'human'});
read.searchContacts(db, 'Tea'); createAffinityMcpServer({db});`;
export function createServer(mcp, db) {
  return mcp.createAffinityMcpServer({ db });
}
export function hotPaths(api, db, server) {
  return {
    "write.createContact": (i) =>
      api.write.createContact(
        db,
        seedClaim(i, () => 0.5),
      ),
    "read.searchContacts": () => api.read.searchContacts(db, search.query),
    search_affinity: () => api.tools.searchAffinityToolHandler(db, search),
    inspect_affinity_item: () =>
      api.tools.inspectAffinityItemToolHandler(db, {
        kind: "contact_profile",
        contact: { contactId: 5000 },
      }),
    review_affinity: () =>
      api.tools.reviewAffinityToolHandler(db, { view: "contacts.list" }),
    "MCP tools/call": () => server.handleLine(JSON.stringify(searchRequest)),
  };
}
export function seedClaim(i, random) {
  const people = ["Mira", "Theo", "Aya", "Leon", "Nora", "Sam"];
  return {
    name: `${people[Math.floor(random() * people.length)]} jasmine tea project ${i}`,
    kind: "human",
  };
}

export function consumerSmoke(configUrl) {
  return `import {createRequire} from 'node:module'; import {DatabaseSync} from 'node:sqlite';
 import {assertApi,smokeLibrary} from ${JSON.stringify(configUrl)};
 const require = createRequire(import.meta.url);
 const root = await import(${JSON.stringify(packageName)}); const mcp = await import(${JSON.stringify(`${packageName}/mcp`)});
 assertApi(root,mcp); assertApi(require(${JSON.stringify(packageName)}),require(${JSON.stringify(`${packageName}/mcp`)}));
 const db = new DatabaseSync(':memory:'); try {smokeLibrary(root,db);} finally {db.close();}`;
}
export function assertRoundTrip(remembered, searched) {
  assert.equal(remembered.outcome, "success");
  assert.ok(
    searched.data.items.some((item) => item.id === remembered.data.primary.id),
  );
}
export function assertMcpReplies(replies, remembered) {
  assert.ok(
    replies[1].result.tools.some((tool) => tool.name === "search_affinity"),
  );
  assert.ok(
    replies[2].result.structuredContent.data.items.some(
      (item) => item.id === remembered.data.primary.id,
    ),
  );
  assert.equal(replies[3].result.resultType, "complete");
}
