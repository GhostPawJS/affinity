import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Readable, Writable } from "node:stream";
import { test } from "node:test";
import { runToolCli } from "../surfaces/cli.ts";
import * as write from "../write.ts";
import { affinityCliOptions } from "./affinity_cli_options.ts";
import { affinitySurfaceTools } from "./affinity_surface_tools.ts";
import { openAffinityDb } from "./open_affinity_db.ts";

async function invoke(args: string[]) {
  let out = "";
  let err = "";
  const sink = (append: (s: string) => void) =>
    new Writable({
      write(chunk, _encoding, done) {
        append(String(chunk));
        done();
      },
    });
  const code = await runToolCli([...args, "--json"], {
    ...affinityCliOptions,
    stdin: Readable.from([]),
    stdout: sink((s) => {
      out += s;
    }),
    stderr: sink((s) => {
      err += s;
    }),
  });
  return { code, out, err };
}

test("every revision patch rejects unknown fields through CLI and facade", async () => {
  const db = await openAffinityDb(":memory:");
  try {
    for (const [name, command, target, keys] of [
      ["manage_contact", "contact", { contact: { contactId: 1 } }, ["name"]],
      [
        "manage_identity",
        "identity",
        { identityId: 1 },
        ["type", "value", "label"],
      ],
      [
        "manage_date_anchor",
        "date",
        { anchorEventId: 1 },
        [
          "recurrenceKind",
          "anchorMonth",
          "anchorDay",
          "summary",
          "significance",
        ],
      ],
      [
        "manage_event",
        "event",
        { eventId: 1 },
        [
          "summary",
          "content",
          "occurredAt",
          "significance",
          "channel",
          "type",
          "externalRef",
        ],
      ],
    ] as const) {
      const input = {
        action: "revise",
        ...target,
        patch: {
          nickname: "ignored",
          [command === "date" ? "summary" : keys[0]]: "changed",
        },
      };
      const tool = affinitySurfaceTools.find((tool) => tool.name === name);
      assert.ok(tool);
      const result = (await tool.handler(db, input)) as {
        ok: boolean;
        outcome: string;
        error: { code: string; message: string; details: unknown };
      };
      assert.equal(result.ok, false);
      assert.equal(result.outcome, "error");
      assert.equal(result.error.code, "invalid_input");
      assert.equal(
        result.error.message,
        `input.patch.nickname: unknown patch key; allowed keys: ${keys.join(", ")}`,
      );
      assert.deepEqual(result.error.details, { validKeys: keys });
      const args = Object.entries(target).flatMap(([key, value]) => [
        `--${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`,
        typeof value === "object" ? JSON.stringify(value) : String(value),
      ]);
      const cli = await invoke([
        command,
        "revise",
        ...args,
        "--patch",
        JSON.stringify(input.patch),
        "--db",
        ":memory:",
      ]);
      assert.equal(cli.code, 2, cli.err);
      assert.equal(JSON.parse(cli.out).error.message, result.error.message);
      assert.equal(cli.err.trim(), result.error.message);
      assert.deepEqual(JSON.parse(cli.out).error.details, { validKeys: keys });
    }
  } finally {
    db.close();
  }
});

test("database parent directories are created and file components are usage errors", async () => {
  const dir = mkdtempSync(join(process.cwd(), ".db-directory-test-"));
  try {
    const path = join(dir, "nested", "missing", "contacts.db");
    const created = await invoke([
      "contact",
      "create",
      '{"name":"Sam","kind":"human"}',
      "--db",
      path,
    ]);
    assert.equal(created.code, 0, created.err);
    assert.ok(existsSync(path));
    writeFileSync(join(dir, "file"), "regular file");
    for (const directory of [join(dir, "file"), join(dir, "file", "nested")]) {
      const message = `Cannot create database directory ${directory}: a path component is not a directory`;
      await assert.rejects(openAffinityDb(join(directory, "contacts.db")), {
        message,
      });
      const failed = await invoke([
        "contact",
        "create",
        '{"name":"Sam","kind":"human"}',
        "--db",
        join(directory, "contacts.db"),
      ]);
      assert.equal(failed.code, 2);
      assert.equal(failed.err.trim(), message);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("valid revision keys still update records through facade and CLI", async () => {
  const dir = mkdtempSync(join(process.cwd(), ".revise-test-"));
  const path = join(dir, "contacts.db");
  const db = await openAffinityDb(path);
  try {
    const contact = write.createContact(db, {
      name: "Sam",
      kind: "human",
    }).primary;
    const identity = write.addIdentity(db, contact.id, {
      type: "email",
      value: "sam@example.com",
    }).primary;
    const date = write.addDateAnchor(db, {
      target: { kind: "contact", contactId: contact.id },
      recurrenceKind: "birthday",
      anchorMonth: 1,
      anchorDay: 2,
      summary: "Birthday",
      significance: 5,
    }).primary;
    const event = write.recordObservation(db, {
      occurredAt: 1,
      summary: "Observation",
      significance: 1,
      participants: [{ contactId: contact.id, role: "subject" }],
    }).primary;
    for (const [name, command, target, field] of [
      [
        "manage_contact",
        "contact",
        { contact: { contactId: contact.id } },
        "name",
      ],
      ["manage_identity", "identity", { identityId: identity.id }, "label"],
      ["manage_date_anchor", "date", { anchorEventId: date.id }, "summary"],
      ["manage_event", "event", { eventId: event.id }, "summary"],
    ] as const) {
      const tool = affinitySurfaceTools.find((tool) => tool.name === name);
      assert.ok(tool);
      const result = (await tool.handler(db, {
        action: "revise",
        ...target,
        patch: { [field]: "Facade change" },
      })) as {
        ok: boolean;
        data: { primary: Record<string, unknown> };
      };
      assert.equal(result.ok, true, JSON.stringify(result));
      assert.equal(result.data.primary[field], "Facade change");
      const args = Object.entries(target).flatMap(([key, value]) => [
        `--${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`,
        typeof value === "object" ? JSON.stringify(value) : String(value),
      ]);
      const cli = await invoke([
        command,
        "revise",
        ...args,
        "--patch",
        JSON.stringify({ [field]: "CLI change" }),
        "--db",
        path,
      ]);
      assert.equal(cli.code, 0, cli.err);
      const output = JSON.parse(cli.out);
      assert.equal(output.ok, true);
      assert.equal(output.data.primary[field], "CLI change");
    }
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("contact revision help accepts a positional patch without opening a database", async () => {
  for (const flag of ["--help", "-h"]) {
    const result = await invoke(["contact", "revise", "{}", flag]);
    assert.equal(result.code, 0, result.err);
    assert.match(result.out, /^Usage: .* contact revise /);
    assert.match(result.out, /--patch/);
    assert.equal(result.err, "");
  }
});
