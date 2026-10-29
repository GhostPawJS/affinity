import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  closeSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Readable, Writable } from "node:stream";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { runToolCli } from "../surfaces/cli.ts";
import {
  CliUsageError,
  parseCliArgs,
  readFileValue,
  renderCliHelp,
} from "../surfaces/cli_args.ts";
import { affinityCliOptions } from "./affinity_cli_options.ts";
import { openAffinityDb } from "./open_affinity_db.ts";

const root = fileURLToPath(new URL("../../", import.meta.url));

async function cli(args: string[]) {
  let out = "";
  let err = "";
  const sink = (append: (s: string) => void) =>
    new Writable({
      write(chunk, _enc, done) {
        append(String(chunk));
        done();
      },
    });
  const code = await runToolCli(args, {
    ...affinityCliOptions,
    stdin: Readable.from([""]),
    stdout: sink((s) => {
      out += s;
    }),
    stderr: sink((s) => {
      err += s;
    }),
  });
  return { code, out, err };
}

const spec = {
  command: "t",
  flags: [
    { name: "body", type: "string" as const, file: true },
    { name: "message", type: "string" as const },
    { name: "rationale", type: "string" as const },
    { name: "items", type: "array" as const },
  ],
};

test("file values are opt-in: only file-capable arguments read @path", () => {
  const dir = mkdtempSync(join(tmpdir(), "affinity-file-values-"));
  try {
    const file = join(dir, "body.txt");
    writeFileSync(file, "from file");
    assert.deepEqual(
      parseCliArgs(
        [
          "--body",
          `@${file}`,
          "--message",
          `@${file}`,
          "--rationale",
          "@@x",
          "--items",
          `@${file}`,
        ],
        spec,
      ),
      {
        body: "from file",
        message: `@${file}`,
        rationale: "@@x",
        items: [`@${file}`],
      },
    );
    assert.equal(readFileValue("@@x", "body"), "@x");
    assert.equal(readFileValue("@@@x", "body"), "@@x");
    assert.equal(readFileValue("plain", "body"), "plain");
    assert.throws(
      () => parseCliArgs(["--body", "@"], spec),
      (error: unknown) =>
        error instanceof CliUsageError &&
        error.exitCode === 2 &&
        error.message ===
          "Empty file path for body; use @@ for a literal leading @",
    );
    const missing = join(dir, "missing.txt");
    assert.throws(
      () => parseCliArgs(["--body", `@${missing}`], spec),
      (error: unknown) =>
        error instanceof CliUsageError &&
        error.message ===
          `Cannot read value file for body: ${missing} (use @@ for a literal leading @)`,
    );
    assert.throws(
      () => parseCliArgs(["--body", `@${dir}`], spec),
      /Cannot read value file for body/,
    );
    const help = renderCliHelp(spec);
    assert.match(help, /--body {2}string \(@file, @- stdin, @@ literal @\)/);
    assert.doesNotMatch(help, /--message {2}string \(@file/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI keeps free text literal and reads files only for JSON payloads", async () => {
  const dir = mkdtempSync(join(tmpdir(), "affinity-file-cli-"));
  const db = join(dir, "test.db");
  try {
    const owner = await cli([
      "--db",
      db,
      "contact",
      "create",
      '{"name":"Owner","kind":"human","bootstrapOwner":true}',
    ]);
    assert.equal(owner.code, 0, owner.err);
    // A free-text value that names a readable file stays a literal string.
    const set = await cli([
      "--db",
      db,
      "attribute",
      "set",
      "--target",
      '{"kind":"contact","contact":{"contactId":1}}',
      "--name",
      "note",
      "--value",
      '"@/etc/passwd"',
    ]);
    assert.equal(set.code, 0, set.err);
    const store = new DatabaseSync(db);
    try {
      const row = store
        .prepare("SELECT value FROM attributes WHERE name = 'note'")
        .get() as { value: string };
      assert.equal(row.value, "@/etc/passwd");
    } finally {
      store.close();
    }
    const unquoted = await cli([
      "--db",
      db,
      "attribute",
      "set",
      "--target",
      '{"kind":"contact","contact":{"contactId":1}}',
      "--name",
      "path_note",
      "--value",
      "@/etc/passwd",
    ]);
    assert.equal(unquoted.code, 0, unquoted.err);
    const reopened = new DatabaseSync(db);
    try {
      const row = reopened
        .prepare("SELECT value FROM attributes WHERE name = 'path_note'")
        .get() as { value: string };
      assert.equal(row.value, "@/etc/passwd");
    } finally {
      reopened.close();
    }
    const search = await cli(["--db", db, "search", "@/etc/passwd"]);
    assert.equal(search.code, 0);
    assert.doesNotMatch(search.out, /root:/);
    const payload = join(dir, "contact.json");
    writeFileSync(payload, '{"name":"From File","kind":"human"}');
    const created = await cli(["--db", db, "contact", "create", `@${payload}`]);
    assert.equal(created.code, 0, created.err);
    const flag = await cli([
      "--db",
      db,
      "contact",
      "create",
      "--input",
      `@${payload}`,
      "--if-exists",
      "return",
    ]);
    assert.equal(flag.code, 0, flag.err);
    const empty = await cli(["--db", db, "contact", "create", "--input", "@"]);
    assert.equal(empty.code, 2);
    assert.match(empty.err, /Empty file path for input/);
    const missing = await cli([
      "--db",
      db,
      "contact",
      "create",
      `@${join(dir, "nope.json")}`,
    ]);
    assert.equal(missing.code, 2);
    assert.match(missing.err, /use @@ for a literal leading @/);
    const call = await cli(["--db", db, "call", "search_affinity", "@"]);
    assert.equal(call.code, 2);
    const help = await cli(["contact", "create", "--help"]);
    assert.match(help.out, /\(@file, @- stdin, @@ literal @\)/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("@- reads a JSON payload from stdin", () => {
  const dir = mkdtempSync(join(tmpdir(), "affinity-file-stdin-"));
  try {
    const input = join(dir, "stdin.json");
    const output = join(dir, "stdout.json");
    const error = join(dir, "stderr.txt");
    writeFileSync(
      input,
      '{"name":"Owner","kind":"human","bootstrapOwner":true}',
    );
    // File-backed stdio supports runners that prohibit socketpair-backed child pipes.
    const descriptors = [
      openSync(input, "r"),
      openSync(output, "w"),
      openSync(error, "w"),
    ];
    try {
      const child = spawnSync(
        process.execPath,
        [
          "--experimental-strip-types",
          "--no-warnings",
          "src/cli.ts",
          "--db",
          join(dir, "a.db"),
          "contact",
          "create",
          "--input",
          "@-",
          "--json",
        ],
        { cwd: root, stdio: descriptors, timeout: 10000 },
      );
      assert.ifError(child.error);
      assert.equal(child.status, 0, readFileSync(error, "utf8"));
      assert.equal(JSON.parse(readFileSync(output, "utf8")).ok, true);
    } finally {
      for (const fd of descriptors) closeSync(fd);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("new databases are created 0600 inside a 0700 directory", async () => {
  if (process.platform === "win32") return;
  const dir = mkdtempSync(join(tmpdir(), "affinity-perms-"));
  try {
    const path = join(dir, "nested", "affinity.db");
    const db = await openAffinityDb(path);
    db.close();
    assert.equal(statSync(path).mode & 0o777, 0o600);
    assert.equal(statSync(join(dir, "nested")).mode & 0o777, 0o700);
    // Existing directories keep their mode.
    const shared = join(dir, "shared");
    mkdirSync(shared, { mode: 0o755 });
    const other = await openAffinityDb(join(shared, "b.db"));
    other.close();
    assert.equal(statSync(shared).mode & 0o777, 0o755);
    assert.equal(statSync(join(shared, "b.db")).mode & 0o777, 0o600);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
