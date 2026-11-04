import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  closeSync,
  existsSync,
  mkdtempSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

test("default database notice stays on stderr and respects paths, quiet and database-free commands", () => {
  const home = mkdtempSync(join(tmpdir(), "affinity-notice-"));
  const path = join(home, ".ghostpaw", "affinity.db");
  const input = join(home, "stdin");
  writeFileSync(input, "");
  const notice = `using default db ${path}\n`;
  const invoke = (args: string[], env: Record<string, string> = {}) => {
    const out = join(home, "stdout");
    const err = join(home, "stderr");
    const descriptors = [
      openSync(input, "r"),
      openSync(out, "w"),
      openSync(err, "w"),
    ];
    let result: ReturnType<typeof spawnSync>;
    try {
      result = spawnSync(
        process.execPath,
        ["--experimental-strip-types", "src/cli.ts", ...args],
        {
          env: {
            ...process.env,
            HOME: home,
            GHOSTPAW_AFFINITY_DB: "",
            GHOSTPAW_QUIET: "",
            NODE_NO_WARNINGS: "1",
            ...env,
          },
          encoding: "utf8",
          stdio: descriptors,
        },
      );
    } finally {
      for (const descriptor of descriptors) closeSync(descriptor);
    }
    assert.ifError(result.error);
    return {
      status: result.status,
      stdout: readFileSync(out, "utf8"),
      stderr: readFileSync(err, "utf8"),
    };
  };
  try {
    const badWrite = ["contact", "create", '{"name":"","kind":"human"}'];
    const failed = invoke(badWrite);
    assert.notEqual(failed.status, 0);
    assert.ok(failed.stderr.startsWith(notice), failed.stderr);
    assert.equal(failed.stderr.split(notice).length - 1, 1);
    assert.equal(existsSync(path), false);
    assert.equal(existsSync(join(home, ".ghostpaw")), false);
    const first = invoke([
      "contact",
      "create",
      '{"name":"Sam","kind":"human"}',
    ]);
    assert.equal(first.status, 0, first.stderr);
    assert.equal(first.stderr, `${notice}created ${path}\n`);
    for (const args of [
      ["search", "Sam"],
      ["call", "search_affinity", '{"query":"Sam"}'],
    ]) {
      const normal = invoke(args);
      const silent = invoke(args, { GHOSTPAW_QUIET: "1" });
      assert.equal(normal.status, 0, normal.stderr);
      assert.equal(normal.stdout, silent.stdout);
      assert.equal(normal.stderr, notice);
      assert.equal(silent.stderr, "");
      const quiet = invoke([...args, "--quiet"]);
      assert.equal(quiet.stderr, "");
      assert.equal(quiet.stdout, "");
      assert.equal(invoke(["--db", path, ...args]).stderr, "");
      assert.equal(invoke(args, { GHOSTPAW_AFFINITY_DB: path }).stderr, "");
    }
    for (const args of [
      [],
      ["help"],
      ["--version"],
      ["tools"],
      ["describe", "search_affinity"],
      ["skill"],
      ["completions", "bash"],
      ["contact", "create", "--help"],
      ["batch", "--help"],
    ]) {
      const result = invoke(args);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stderr, "");
    }
    assert.equal(invoke(["batch"]).stderr, notice);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
