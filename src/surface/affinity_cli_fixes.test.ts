import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Readable, Writable } from "node:stream";
import { test } from "node:test";
import type { AffinityDb } from "../database.ts";
import { runToolCli } from "../surfaces/cli.ts";
import { cliCommands } from "../surfaces/cli_commands.ts";
import { createMcpServer } from "../surfaces/mcp_server.ts";
import { validateInput } from "../surfaces/validate_input.ts";
import { affinityCliOptions } from "./affinity_cli_options.ts";
import { affinityMcpOptions } from "./affinity_mcp_options.ts";
import { affinitySkillCommand } from "./affinity_skill_command.ts";
import { affinitySkillReferences } from "./affinity_skill_references.ts";
import {
  affinityCheatSheet,
  affinityCliExamples,
} from "./affinity_skill_spec.ts";
import { affinitySurfaceTools } from "./affinity_surface_tools.ts";
import { cliVersion } from "./cli_version.ts";
import { openAffinityDb } from "./open_affinity_db.ts";
import { normalizeTimeInputs, parsePlainDue } from "./plain_dates.ts";

function sink(append: (value: string) => void, tty = false) {
  return Object.assign(
    new Writable({
      write(chunk, _encoding, done) {
        append(String(chunk));
        done();
      },
    }),
    { isTTY: tty },
  );
}
async function invoke(
  args: string[],
  stdin = "",
  opts: { tty?: boolean; real?: boolean; result?: unknown } = {},
) {
  let out = "";
  let err = "";
  let captured: { name: string; input: Record<string, unknown> } | undefined;
  const code = await runToolCli(args, {
    ...affinityCliOptions,
    stdout: sink((v) => {
      out += v;
    }, opts.tty),
    stderr: sink((v) => {
      err += v;
    }),
    stdin: Readable.from([stdin]),
    ...(opts.real
      ? {}
      : {
          tools: affinitySurfaceTools.map((tool) => ({
            ...tool,
            handler: (_db: AffinityDb, input: Record<string, unknown>) => {
              captured = { name: tool.name, input };
              return (
                opts.result ?? { ok: true, outcome: "success", summary: "Done" }
              );
            },
          })),
          openContext: () => ({}) as AffinityDb,
          closeContext: () => {},
        }),
  });
  return { code, out, err, captured };
}
// Shell quoting only: commands are data, never executed through a shell.
function splitCommand(line: string): string[] {
  const words: string[] = [];
  const regex = /'([^']*)'|"([^"]*)"|([^\s]+)/g;
  for (const match of line.split(" #")[0]?.matchAll(regex) ?? [])
    words.push(match[1] ?? match[2] ?? match[3] ?? "");
  return words.slice(1);
}
test("cheat sheet command paths and flags all parse and validate", async () => {
  const lines = affinityCheatSheet
    .split("\n")
    .filter((line) => /^(?:affinity|ghostpaw-affinity) /.test(line));
  assert.ok(lines.length >= 20);
  const failures: string[] = [];
  for (const line of lines) {
    const result = await invoke(splitCommand(line));
    if (result.code !== 0 || !result.captured)
      failures.push(`${line}\n${result.err}`);
  }
  assert.deepEqual(failures, []);
});
test("each tool has one curated noun-verb example valid against its schema", async () => {
  assert.deepEqual(
    Object.keys(affinityCliExamples).sort(),
    affinitySurfaceTools.map((t) => t.name).sort(),
  );
  for (const tool of affinitySurfaceTools) {
    const line = affinityCliExamples[tool.name];
    assert.ok(line, tool.name);
    const result = await invoke(splitCommand(line));
    assert.equal(result.code, 0, `${tool.name}: ${result.err}`);
    assert.equal(result.captured?.name, tool.name);
    assert.deepEqual(
      validateInput(tool.inputSchema, result.captured?.input),
      [],
    );
  }
});
test("stdin maps bare and wrapped objects to the sole object positional", async () => {
  for (const args of [
    ["contact", "create"],
    ["contact", "create", "-"],
  ]) {
    for (const input of [
      { name: "X", kind: "human" },
      { input: { name: "X", kind: "human" } },
    ]) {
      const result = await invoke(args, JSON.stringify(input));
      assert.equal(result.code, 0, result.err);
      assert.deepEqual(result.captured?.input, {
        action: "create",
        input: { name: "X", kind: "human" },
      });
    }
  }
  const revised = await invoke(
    ["contact", "revise", "-", "--patch", '{"name":"Y"}'],
    '{"contactId":2}',
  );
  assert.equal(revised.code, 0, revised.err);
  assert.deepEqual(revised.captured?.input.contact, { contactId: 2 });
  const created = await invoke(
    ["contact", "create", "--db", ":memory:"],
    '{"name":"X","kind":"human"}',
    { real: true },
  );
  assert.equal(created.code, 0, created.err);
  assert.equal(JSON.parse(created.out).data.primary.name, "X");
});
test("date grammar uses UTC storage boundaries and local keywords, strict dates, ISO offsets and signed days", () => {
  const now = new Date(2026, 9, 27, 12).getTime();
  assert.equal(
    parsePlainDue("2026-10-27"),
    Date.UTC(2026, 9, 27, 23, 59, 59, 999),
  );
  assert.equal(parsePlainDue("27.10.2026", now, false), Date.UTC(2026, 9, 27));
  for (const [raw, day] of [
    ["today", 27],
    ["tomorrow", 28],
    ["+3d", 30],
    ["-2d", 25],
  ] as const) {
    assert.equal(parsePlainDue(raw, now, false), Date.UTC(2026, 9, day));
  }
  assert.equal(
    parsePlainDue("2026-10-20T14:00:00+02:00"),
    Date.UTC(2026, 9, 20, 12),
  );
  assert.equal(parsePlainDue("1792497600000"), 1792497600000);
  for (const raw of [
    "2026-02-30",
    "31.04.2026",
    "2026-01-01T12:00",
    "nope",
    "+xd",
  ])
    assert.throws(() => parsePlainDue(raw), /Use YYYY-MM-DD/);
  const normalized = normalizeTimeInputs(
    {
      input: [
        {
          occurredAt: "today",
          dueAt: "today",
          now: "-2d",
          asOf: "tomorrow",
          note: "today",
        },
      ],
    },
    now,
  ) as { input: Record<string, unknown>[] };
  assert.equal(normalized.input[0]?.occurredAt, Date.UTC(2026, 9, 27));
  assert.equal(
    normalized.input[0]?.dueAt,
    Date.UTC(2026, 9, 27, 23, 59, 59, 999),
  );
  assert.equal(normalized.input[0]?.note, "today");
});
test("timestamp conversion covers flags, JSON, files and legacy calls before validation", async () => {
  const dir = mkdtempSync(join(tmpdir(), "affinity-times-"));
  try {
    const file = join(dir, "input.json");
    writeFileSync(
      file,
      JSON.stringify({ name: "X", kind: "human", now: "2026-10-27" }),
    );
    for (const args of [
      ["contact", "create", `@${file}`],
      [
        "contact",
        "create",
        "--input",
        '{"name":"X","kind":"human","now":"2026-10-27"}',
      ],
      [
        "call",
        "manage_contact",
        '{"action":"create","input":{"name":"X","kind":"human","now":"2026-10-27"}}',
      ],
    ]) {
      const result = await invoke(args);
      assert.equal(result.code, 0, result.err);
      assert.equal(
        (result.captured?.input.input as { now: number }).now,
        Date.UTC(2026, 9, 27),
      );
    }
    const flags = await invoke([
      "identity",
      "verify",
      "1",
      "--verified-at",
      "2026-10-27T12:00:00Z",
    ]);
    assert.equal(flags.code, 0, flags.err);
    assert.equal(flags.captured?.input.verifiedAt, Date.UTC(2026, 9, 27, 12));
    for (const args of [
      ["identity", "verify", "1", "--verified-at", "2026-02-30"],
      [
        "call",
        "manage_identity",
        '{"action":"verify","identityId":1,"verifiedAt":"bad"}',
      ],
    ]) {
      const result = await invoke(args);
      assert.equal(result.code, 2);
      assert.match(result.err, /Invalid timestamp/);
      assert.equal(result.captured, undefined);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("array flags parse object items and spread a single JSON array", async () => {
  for (const entries of [
    [
      "--entries",
      '{"name":"a","value":null}',
      "--entries",
      '{"name":"b","value":1}',
    ],
    ["--entries", '[{"name":"a","value":null},{"name":"b","value":1}]'],
  ]) {
    const result = await invoke([
      "attribute",
      "replace",
      "--target",
      '{"kind":"contact","contact":{"contactId":1}}',
      ...entries,
    ]);
    assert.equal(result.code, 0, result.err);
    assert.deepEqual(result.captured?.input.entries, [
      { name: "a", value: null },
      { name: "b", value: 1 },
    ]);
  }
  const invalid = await invoke(["attribute", "replace", "--entries", "{bad"]);
  assert.equal(invalid.code, 2);
  assert.match(invalid.err, /Invalid JSON/);
});
test("version variants and both version commands", async () => {
  assert.equal(
    cliVersion("1", { sea: () => true, platform: "win32", arch: "x64" }),
    "affinity 1 (binary, windows-x64)",
  );
  assert.equal(
    cliVersion("1", { sea: () => true, platform: "linux", arch: "x64" }),
    "affinity 1 (binary, linux-x64)",
  );
  assert.equal(
    cliVersion("1", { sea: () => false, npm: true }),
    "affinity 1 (npm)",
  );
  assert.equal(
    cliVersion("1", {
      sea: () => {
        throw Error();
      },
      npm: false,
    }),
    "affinity 1 (library)",
  );
  const flag = await invoke(["--version"]);
  assert.match(flag.out, /^affinity \d+\.\d+\.\d+ \(library\)\n$/);
  assert.equal((await invoke(["version"])).out, flag.out);
  assert.equal((await invoke(["--version", "--quiet"])).out, "");
});
test("embedded guides, help, list and suggestions are accessible without a database", async () => {
  const list = affinitySkillCommand(["--list"]);
  for (const [name, entry] of Object.entries(affinitySkillReferences)) {
    assert.ok(list.includes(`${name}\t${entry.description}`));
    assert.equal(affinitySkillCommand([name]), entry.content);
  }
  assert.match((await invoke(["skill", "--help"])).out, /Usage:.*skill/);
  assert.equal((await invoke(["skill", "--list", "--quiet"])).out, "");
  const unknown = await invoke(["skill", "bootstrap-and-cold-star"]);
  assert.equal(unknown.code, 2);
  assert.match(unknown.err, /Did you mean bootstrap-and-cold-start/);
  const skill = affinitySkillCommand([]);
  assert.ok(skill.indexOf("## CLI cheat sheet") < skill.indexOf("## Appendix"));
  assert.match(skill, /\| input\.name \|/);
  assert.match(skill, /\| entries\.name \|/);
  const beforeFallback = skill.split("## Without the binary")[0] ?? "";
  assert.doesNotMatch(beforeFallback, /npx|Node.js 24/);
  assert.match(skill, /From the binary: `ghostpaw-affinity skill <guide>`/);
});
test("exit codes and library-name replacement are consistent on both invocation paths", async () => {
  for (const [code, expected] of [
    ["invalid_input", 2],
    ["not_found", 3],
    ["conflict", 4],
    ["version_mismatch", 4],
    ["already_in_state", 4],
    ["system_error", 70],
    ["other", 1],
  ] as const) {
    for (const args of [
      ["search", "X"],
      ["call", "search_affinity", '{"query":"X"}'],
    ]) {
      const result = await invoke(args, "", {
        result: {
          ok: false,
          error: { code, message: "use mergeContacts to reach merged state" },
        },
      });
      assert.equal(result.code, expected, `${args}: ${code}`);
      assert.match(result.err, /use: ghostpaw-affinity contact merge/);
      if (expected === 70) assert.match(result.err, /^internal error:/);
    }
  }
  const resolved = await invoke(["search", "X"], "", {
    result: {
      ok: false,
      error: { code: "invalid_state", message: "commitment already resolved" },
    },
  });
  assert.equal(resolved.code, 4);
  const typo = await invoke(["contact", "creat"]);
  assert.equal(typo.code, 2);
  assert.equal(
    typo.err,
    "Unknown command: contact creat. Did you mean contact create?\n",
  );
});
test("resolved database path appears in help and first creation only", async () => {
  const dir = mkdtempSync(join(tmpdir(), "affinity-created-"));
  try {
    const path = join(dir, "contacts.sqlite");
    const args = [
      "contact",
      "create",
      '{"name":"X","kind":"human"}',
      "--db",
      path,
    ];
    const first = await invoke(args, "", { real: true });
    assert.equal(first.code, 0, first.err);
    assert.equal(first.err, `created ${path}\n`);
    const second = await invoke(args, "", { real: true });
    assert.equal(second.code, 0, second.err);
    assert.doesNotMatch(second.err, /created /);
    const help = await invoke(["--help", "--db", "relative.sqlite"]);
    assert.ok(help.out.includes(`Database: ${resolve("relative.sqlite")}`));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("MCP accepts ISO timestamps and reports invalid calendar dates", async () => {
  const db = await openAffinityDb(":memory:");
  try {
    const server = createMcpServer(affinityMcpOptions(() => db));
    await server.handleMessage({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {},
    });
    for (const [now, valid] of [
      ["2026-10-27T12:00:00Z", true],
      ["2026-02-30", false],
    ] as const) {
      const response = (await server.handleMessage({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "manage_contact",
          arguments: {
            action: "create",
            input: { name: "MCP", kind: "human", now },
          },
        },
      })) as {
        result: {
          isError: boolean;
          structuredContent?: { data?: { primary?: { createdAt: number } } };
          content: { text: string }[];
        };
      };
      assert.equal(response.result.isError, !valid);
      if (valid)
        assert.equal(
          (
            db
              .prepare(
                "SELECT created_at FROM contacts ORDER BY id DESC LIMIT 1",
              )
              .get() as { created_at: number }
          ).created_at,
          Date.UTC(2026, 9, 27, 12),
        );
      else
        assert.match(
          response.result.content[0]?.text ?? "",
          /Invalid timestamp/,
        );
    }
  } finally {
    db.close();
  }
});
