import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable, Writable } from "node:stream";
import { test } from "node:test";
import { runToolCli } from "../surfaces/cli.ts";
import { cliCommands } from "../surfaces/cli_commands.ts";
import { affinityCliOptions } from "./affinity_cli_options.ts";
import {
  affinityMcpSurfaceTools,
  affinitySurfaceTools,
} from "./affinity_surface_tools.ts";

test("affinity noun verb create, search, show and not found use a file database", async () => {
  const dir = mkdtempSync(join(tmpdir(), "affinity-cli-"));
  try {
    const invoke = async (args: string[]) => {
      let out = "";
      const code = await runToolCli(
        [...args, "--db", join(dir, "test.db"), "--json"],
        {
          ...affinityCliOptions,
          stdin: Readable.from([]),
          stdout: new Writable({
            write(chunk, _encoding, cb) {
              out += String(chunk);
              cb();
            },
          }),
          stderr: new Writable({
            write(_chunk, _encoding, cb) {
              cb();
            },
          }),
        },
      );
      return { code, result: JSON.parse(out) };
    };

    const added = await invoke([
      "contact",
      "create",
      '{"name":"Deploy Tuesday","kind":"human"}',
    ]);
    assert.equal(added.code, 0);
    const found = await invoke(["search", "Deploy Tuesday"]);
    assert.equal(found.code, 0);
    assert.equal(found.result.data.items.length, 1);
    assert.equal(found.result.data.items[0].id, added.result.data.primary.id);
    assert.equal(
      (
        await invoke([
          "show",
          "contact_profile",
          "--contact",
          JSON.stringify({ contactId: added.result.data.primary.id }),
        ])
      ).code,
      0,
    );
    assert.equal(
      (
        await invoke([
          "show",
          "contact_profile",
          "--contact",
          '{"contactId":99999}',
        ])
      ).code,
      3,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("affinity command tree covers every tool and action once without changing MCP metadata", () => {
  const commands = cliCommands(affinitySurfaceTools);
  assert.equal(commands.length, 27);
  assert.equal(
    new Set(commands.map((command) => command.path)).size,
    commands.length,
  );
  for (const tool of affinitySurfaceTools) {
    assert.ok(tool.cli, tool.name);
    const paths = commands.filter((command) => command.tool === tool);
    const actions = tool.inputSchema.properties?.action?.enum;
    assert.equal(paths.length, actions?.length ?? 1, tool.name);
    if (actions)
      assert.deepEqual(
        paths.map((command) => command.fixed.action),
        actions,
      );
  }
  assert.deepEqual(
    affinitySurfaceTools.map(({ cli: _cli, ...tool }) => tool),
    affinityMcpSurfaceTools,
  );
  assert.ok(affinityMcpSurfaceTools.every((tool) => !("cli" in tool)));
});
