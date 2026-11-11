import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Readable, Writable } from "node:stream";
import { test } from "node:test";
import { createAffinityMcpServer } from "../mcp.ts";
import { runToolCli } from "../surfaces/cli.ts";
import { serveMcpStdio } from "../surfaces/mcp_stdio.ts";
import { affinityCliOptions } from "./affinity_cli_options.ts";
import { openAffinityDb } from "./open_affinity_db.ts";

async function invoke(path: string, args: string[]) {
  let out = "";
  let err = "";
  const sink = (append: (text: string) => void) =>
    new Writable({
      write(chunk, _encoding, done) {
        append(String(chunk));
        done();
      },
    });
  const code = await runToolCli(["--db", path, ...args], {
    ...affinityCliOptions,
    stdout: sink((text) => {
      out += text;
    }),
    stderr: sink((text) => {
      err += text;
    }),
    stdin: Readable.from([]),
  });
  return { code, out, err };
}

test("read-only opener preserves DELETE journal and bytes and rejects writes", async () => {
  const directory = mkdtempSync(join(tmpdir(), "affinity-read-only-"));
  const path = join(directory, "db");
  try {
    const writable = await openAffinityDb(path);
    writable.exec("PRAGMA journal_mode=DELETE");
    writable.close();
    const before = readFileSync(path);
    const reader = await openAffinityDb(path, { readOnly: true });
    assert.equal(
      reader.prepare("PRAGMA journal_mode").get<{ journal_mode: string }>()
        ?.journal_mode,
      "delete",
    );
    assert.throws(
      () => reader.exec("CREATE TABLE forbidden (id INTEGER)"),
      /readonly/,
    );
    reader.close();
    for (const args of [
      ["search", "Sam"],
      ["call", "search_affinity", '{"query":"Sam"}'],
      ["search_affinity", "--query", "Sam"],
      ["review", "contacts.list"],
      ["contact", "export"],
    ]) {
      const result = await invoke(path, args);
      assert.equal(result.code, 0, result.err);
      assert.deepEqual(readFileSync(path), before);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("reads never create missing directories or databases", async () => {
  const directory = mkdtempSync(join(tmpdir(), "affinity-missing-"));
  const path = join(directory, "nested", "db");
  try {
    for (const args of [
      ["search", "Sam"],
      ["call", "search_affinity", '{"query":"Sam"}'],
    ]) {
      assert.equal((await invoke(path, args)).code, 3);
      assert.equal(existsSync(join(directory, "nested")), false);
    }
    await assert.rejects(
      openAffinityDb(path, { readOnly: true }),
      /Database not found/,
    );
    assert.equal(existsSync(path), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("outdated reads suggest migrate; explicit migration reports upgrades once", async () => {
  const directory = mkdtempSync(join(tmpdir(), "affinity-upgrade-"));
  const path = join(directory, "db");
  try {
    const db = await openAffinityDb(path);
    db.exec("ALTER TABLE contacts DROP COLUMN do_not_contact");
    db.close();
    const before = readFileSync(path);
    const read = await invoke(path, ["search", "Sam"]);
    assert.notEqual(read.code, 0);
    assert.match(read.err, /affinity migrate/);
    assert.deepEqual(readFileSync(path), before);
    const migration = await invoke(path, ["migrate"]);
    assert.equal(migration.code, 0, migration.err);
    assert.equal(migration.err, "Affinity database schema upgraded.\n");
    assert.equal((await invoke(path, ["migrate"])).err, "");
    const check = new DatabaseSync(path, { readOnly: true });
    assert.ok(
      check
        .prepare("PRAGMA table_info(contacts)")
        .all()
        .some((column) => column.name === "do_not_contact"),
    );
    check.close();
    assert.equal((await invoke(path, ["search", "Sam"])).code, 0);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("unknown subcommands suggest valid commands with and without help", async () => {
  for (const args of [
    ["contact", "update"],
    ["contact", "update", "--help"],
    ["contact", "creat", "--help"],
  ]) {
    const result = await invoke("unused.db", args);
    assert.equal(result.code, 2);
    assert.match(
      result.err,
      args[1] === "update"
        ? /Did you mean contact revise\?/
        : /Did you mean contact create\?/,
    );
  }
});

test("MCP reads preserve files and missing paths while writes upgrade", async () => {
  const directory = mkdtempSync(join(tmpdir(), "affinity-mcp-read-"));
  const path = join(directory, "db");
  const call = async (name: string, input: object) => {
    const messages = [
      {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { protocolVersion: "2025-11-25" },
      },
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name, arguments: input },
      },
    ];
    let output = "";
    await serveMcpStdio(createAffinityMcpServer({ dbPath: path }), {
      input: Readable.from([
        `${messages.map((message) => JSON.stringify(message)).join("\n")}\n`,
      ]),
      output: new Writable({
        write(chunk, _encoding, done) {
          output += String(chunk);
          done();
        },
      }),
    });
    return output
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line))
      .at(-1);
  };
  try {
    assert.equal(
      (await call("search_affinity", { query: "Sam" })).result.isError,
      true,
    );
    assert.equal(existsSync(path), false);
    const db = await openAffinityDb(path);
    db.exec("PRAGMA journal_mode=DELETE");
    db.close();
    const before = readFileSync(path);
    assert.equal(
      (await call("search_affinity", { query: "Sam" })).result.isError,
      false,
    );
    assert.equal(
      (await call("manage_contact", { action: "export" })).result.isError,
      false,
    );
    assert.deepEqual(readFileSync(path), before);
    const old = new DatabaseSync(path);
    old.exec("ALTER TABLE contacts DROP COLUMN do_not_contact");
    old.close();
    assert.match(
      JSON.stringify(await call("search_affinity", { query: "Sam" })),
      /affinity migrate/,
    );
    assert.equal(
      (
        await call("manage_contact", {
          action: "create",
          input: { name: "Sam", kind: "human", bootstrapOwner: true },
        })
      ).result.isError,
      false,
    );
    assert.equal(
      (await call("search_affinity", { query: "Sam" })).result.isError,
      false,
    );
    const partial = new DatabaseSync(path);
    partial.exec("DROP TABLE dismissed_duplicates");
    partial.close();
    const partialRead = await call("review_affinity", {
      view: "merges.dismissed",
    });
    assert.match(JSON.stringify(partialRead), /affinity migrate/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("migrate help and invalid arguments do not open a database", async () => {
  const directory = mkdtempSync(join(tmpdir(), "affinity-migrate-help-"));
  const path = join(directory, "db");
  try {
    const help = await invoke(path, ["migrate", "--help"]);
    assert.equal(help.code, 0);
    assert.match(help.out, /upgrade the database schema/);
    assert.equal((await invoke(path, ["migrate", "unexpected"])).code, 2);
    assert.equal(existsSync(path), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
