import assert from "node:assert/strict";
import { Readable, Writable } from "node:stream";
import { test } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { runToolCli } from "../surfaces/cli.ts";
import { affinityCliOptions } from "./affinity_cli_options.ts";

test("contact migrate-kind exposes explicit audited reclassification in the CLI", async () => {
  const db = await createInitializedAffinityDb();
  const contact = createContact(db, { name: "Desk", kind: "service" }).primary;
  let out = "";
  let err = "";
  const sink = (append: (text: string) => void) =>
    new Writable({
      write(chunk, _enc, cb) {
        append(String(chunk));
        cb();
      },
    });
  try {
    const code = await runToolCli(
      [
        "contact",
        "migrate-kind",
        "--contact",
        JSON.stringify({ contactId: contact.id }),
        "--kind",
        "agent",
        "--db",
        ":memory:",
        "--json",
      ],
      {
        ...affinityCliOptions,
        openContext: () => db,
        closeContext: () => {},
        stdin: Readable.from([]),
        stdout: sink((text) => {
          out += text;
        }),
        stderr: sink((text) => {
          err += text;
        }),
      },
    );
    assert.equal(code, 0, err);
    const result = JSON.parse(out);
    assert.equal(result.data.primary.kind, "agent");
    assert.equal(result.data.primary.id, contact.id);
    assert.equal(result.data.created[0].kind, "event");
  } finally {
    db.close();
  }
});
