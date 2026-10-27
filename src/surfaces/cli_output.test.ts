import assert from "node:assert/strict";
import { Readable, Writable } from "node:stream";
import { test } from "node:test";
import { runToolCli } from "./cli.ts";
import {
  enrichPlainJson,
  formatLocalTime,
  humanResult,
  plainJson,
  suggestCommand,
} from "./cli_output.ts";
import type { SurfaceTool } from "./surface_types.ts";

test("plain JSON adds nested ISO siblings, rounds floats, drops duplicate entities, and compacts receipts only", () => {
  const items = [
    { id: 1, title: "Sam", dueAt: 1793102400000, score: 0.7388696874999999 },
  ];
  const original = {
    ok: true,
    entities: items,
    data: {
      items,
      updated: [],
      created: [{ id: 1 }],
      other: [],
      nested: { occurredAt: 0, removedAt: null },
    },
  };
  const enriched = plainJson(original, true) as typeof original;
  assert.equal(JSON.stringify(enriched).includes('"entities"'), false);
  assert.equal("updated" in enriched.data, false);
  assert.deepEqual(enriched.data.created, [{ id: 1 }]);
  assert.deepEqual(enriched.data.other, []);
  assert.equal(enriched.data.items[0]?.score, 0.739);
  assert.equal(
    (enriched.data.nested as unknown as { occurredAtIso: string })
      .occurredAtIso,
    "1970-01-01T00:00:00.000Z",
  );
  assert.equal(
    (enriched.data.items[0] as unknown as { dueAtIso: string }).dueAtIso,
    "2026-10-27T12:00:00.000Z",
  );
  assert.equal(original.data.items[0]?.score, 0.7388696874999999);
  assert.equal(original.entities, items);
  assert.ok("updated" in (plainJson(original) as typeof original).data);
  assert.deepEqual(plainJson({ entities: [{ id: 2 }], data: { items } }), {
    entities: [{ id: 2 }],
    data: { items: enrichPlainJson(items) },
  });
});
test("human output renders list rows, dates, overdue flags, fields and write ids", () => {
  assert.equal(
    humanResult({
      data: {
        items: [
          {
            id: 1,
            title: "Proposal",
            subtitle: "Sam",
            dueAt: 0,
            overdue: true,
          },
        ],
      },
    }),
    `#1 Proposal — Sam · due ${formatLocalTime(0)} · OVERDUE\n`,
  );
  assert.equal(
    humanResult({
      summary: "Created contact.",
      data: { primary: { id: 2, name: "Sam" } },
    }),
    "Created contact. (id 2)\n",
  );
  assert.equal(
    humanResult({ data: { name: "Sam", kind: "human" } }),
    "name: Sam\nkind: human\n",
  );
  assert.equal(
    suggestCommand("contact delet", ["contact create", "contact delete"]),
    "contact delete",
  );
  assert.equal(suggestCommand("unrelated", ["contact delete"]), undefined);
});
test("TTY output is human, JSON and piped output are enriched, quiet suppresses output", async () => {
  const tool: SurfaceTool<null> = {
    name: "list_items",
    description: "List",
    inputSchema: { type: "object" },
    handler: () => ({
      ok: true,
      summary: "Found",
      data: { items: [{ id: 1, title: "Sam", subtitle: "Friend", dueAt: 0 }] },
    }),
  };
  for (const [args, tty, expectedJson] of [
    [["items", "list"], true, false],
    [["items", "list", "--json"], true, true],
    [["items", "list"], false, true],
    [["call", "list_items", "{}"], true, false],
  ] as const) {
    let out = "";
    const code = await runToolCli([...args], {
      bin: "test",
      version: "1",
      description: "",
      tools: [tool],
      openContext: () => null,
      stdin: Readable.from([]),
      stdout: Object.assign(
        new Writable({
          write(chunk, _enc, cb) {
            out += String(chunk);
            cb();
          },
        }),
        { isTTY: tty },
      ),
    });
    assert.equal(code, 0);
    if (expectedJson)
      assert.equal(
        JSON.parse(out).data.items[0].dueAtIso,
        "1970-01-01T00:00:00.000Z",
      );
    else assert.equal(out, `#1 Sam — Friend · due ${formatLocalTime(0)}\n`);
  }
});
