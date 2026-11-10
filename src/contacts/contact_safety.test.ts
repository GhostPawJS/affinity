import assert from "node:assert/strict";
import { Writable } from "node:stream";
import { test } from "node:test";
import { initAffinityTables } from "../init_affinity_tables.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { openTestDatabase } from "../lib/testing/open_test_database.ts";
import { affinityCliOptions } from "../surface/affinity_cli_options.ts";
import { runToolCli } from "../surfaces/cli.ts";
import { manageContactToolHandler } from "../tools/manage_contact_tool.ts";
import { recordEventToolHandler } from "../tools/record_event_tool.ts";
import * as write from "../write.ts";
import { getContactProfile } from "./get_contact_profile.ts";
import { listContacts } from "./list_contacts.ts";

test("contact safety is opt-in, survives revisions, and protects every outbound event family", async () => {
  const db = await createInitializedAffinityDb();
  try {
    const owner = write.createContact(db, {
      name: "Owner",
      kind: "agent",
      bootstrapOwner: true,
    }).primary;
    const ordinary = write.createContact(db, {
      name: "Ordinary",
      kind: "human",
    }).primary;
    assert.equal(Object.hasOwn(ordinary, "doNotContact"), false);
    const blocked = manageContactToolHandler(db, {
      action: "create",
      input: { name: "Blocked", kind: "human", doNotContact: true },
    });
    assert.equal(blocked.ok, true);
    if (!blocked.ok) throw new Error("expected creation");
    assert.equal(blocked.id, blocked.data.primary.id);
    const id = blocked.id as number;
    assert.equal(blocked.entities[0]?.id, id);
    assert.equal(getContactProfile(db, id)?.contact.doNotContact, true);
    assert.equal(listContacts(db).find((c) => c.id === id)?.doNotContact, true);
    const input = {
      occurredAt: Date.now(),
      summary: "Engagement",
      significance: 4,
      participants: [
        { contactId: owner.id, role: "actor" as const },
        { contactId: id, role: "recipient" as const },
      ],
    };
    for (const record of [
      write.recordInteraction,
      write.recordTransaction,
      write.recordMilestone,
      write.recordCommitment,
    ]) {
      const event = {
        ...input,
        type: "conversation" as const,
        commitmentType: "promise" as const,
      };
      assert.throws(
        () => record(db, event),
        /doNotContact.*overrideDoNotContact/,
      );
      record(db, { ...event, overrideDoNotContact: true });
    }
    const before = db.prepare("SELECT COUNT(*) AS n FROM events").get();
    const refused = recordEventToolHandler(db, {
      kind: "interaction",
      input: {
        ...input,
        type: "conversation",
        participants: [{ contactId: id, role: "recipient" }],
      },
    });
    assert.equal(refused.ok, false);
    assert.deepEqual(
      db.prepare("SELECT COUNT(*) AS n FROM events").get(),
      before,
    );
    for (const directionality of ["other_initiated", "observed"] as const) {
      write.recordInteraction(db, {
        ...input,
        type: "conversation",
        participants: [
          { contactId: owner.id, role: "actor" },
          { contactId: id, role: "recipient", directionality },
        ],
      });
    }
    write.reviseContact(db, id, { name: "Renamed" });
    assert.equal(getContactProfile(db, id)?.contact.doNotContact, true);
    write.reviseContact(db, id, { doNotContact: false });
    assert.equal(
      Object.hasOwn(getContactProfile(db, id)?.contact ?? {}, "doNotContact"),
      false,
    );
    write.recordInteraction(db, { ...input, type: "conversation" });
    write.reviseContact(db, id, { doNotContact: true });
    const winner = write.createContact(db, {
      name: "Winner",
      kind: "human",
    }).primary;
    write.mergeContacts(db, {
      winnerContactId: winner.id,
      loserContactId: id,
      reasonSummary: "same contact",
    });
    assert.equal(getContactProfile(db, winner.id)?.contact.doNotContact, true);
  } finally {
    db.close();
  }
});

test("existing databases gain a default-false safety column idempotently", async () => {
  const db = await openTestDatabase();
  try {
    db.exec(`CREATE TABLE contacts (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('human','agent')), lifecycle_state TEXT NOT NULL DEFAULT 'active', is_owner INTEGER NOT NULL DEFAULT 0, merged_into_contact_id INTEGER, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER);
      INSERT INTO contacts(name,kind,created_at,updated_at) VALUES ('Existing','human',1,1)`);
    initAffinityTables(db);
    initAffinityTables(db);
    assert.equal(
      db
        .prepare("SELECT do_not_contact AS flag FROM contacts WHERE id=1")
        .get<{ flag: number }>()?.flag,
      0,
    );
    assert.equal(listContacts(db)[0]?.name, "Existing");
    assert.equal(
      Object.hasOwn(listContacts(db)[0] ?? {}, "doNotContact"),
      false,
    );
  } finally {
    db.close();
  }
});

test("CLI bootstrap, creation ids, and outbound override flags reach real tools", async () => {
  const db = await createInitializedAffinityDb();
  const invoke = async (args: string[]) => {
    let out = "";
    let err = "";
    const sink = (append: (s: string) => void) =>
      new Writable({
        write(chunk, _encoding, done) {
          append(String(chunk));
          done();
        },
      });
    const code = await runToolCli(["--db", ":memory:", ...args, "--json"], {
      ...affinityCliOptions,
      preflight: async () => undefined,
      openContext: () => db,
      closeContext: () => {},
      stdout: sink((s) => {
        out += s;
      }),
      stderr: sink((s) => {
        err += s;
      }),
    });
    return { code, out, err };
  };
  try {
    const missing = recordEventToolHandler(db, {
      kind: "interaction",
      input: {
        type: "conversation",
        occurredAt: "today",
        significance: 3,
        summary: "Call",
        participants: [{ contactId: 1, role: "actor" }],
      },
    });
    assert.equal(missing.ok, false);
    if (!missing.ok && "error" in missing)
      assert.match(
        missing.error.message,
        /owner contact not found.*--bootstrap-owner.*input.bootstrapOwner/,
      );
    const owner = await invoke([
      "contact",
      "create",
      '{"name":"Bot","kind":"agent"}',
      "--bootstrap-owner",
    ]);
    assert.equal(owner.code, 0, owner.err);
    assert.equal(JSON.parse(owner.out).id, 1);
    const created = await invoke([
      "contact",
      "create",
      '{"name":"Sam","kind":"human"}',
      "--do-not-contact",
    ]);
    assert.equal(created.code, 0, created.err);
    assert.equal(JSON.parse(created.out).id, 2);
    const args = [
      "event",
      "record",
      "--kind",
      "interaction",
      "--input",
      '{"type":"conversation","occurredAt":"today","significance":3,"summary":"Call","participants":[{"contactId":2,"role":"recipient"}]}',
    ];
    assert.notEqual((await invoke(args)).code, 0);
    const overridden = await invoke([...args, "--override-do-not-contact"]);
    assert.equal(overridden.code, 0, overridden.err);
  } finally {
    db.close();
  }
});
