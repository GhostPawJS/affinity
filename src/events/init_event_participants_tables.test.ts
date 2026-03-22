import { strictEqual, throws } from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { describe, it } from "node:test";
import { initContactsTables } from "../contacts/init_contacts_tables.ts";
import { initLinksTables } from "../links/init_links_tables.ts";
import { initEventParticipantsTables } from "./init_event_participants_tables.ts";
import { initEventsTables } from "./init_events_tables.ts";

describe("initEventParticipantsTables", () => {
  it("is idempotent once prerequisites exist", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON");
    initContactsTables(db);
    initLinksTables(db);
    initEventsTables(db);
    initEventParticipantsTables(db);
    initEventParticipantsTables(db);
    strictEqual(
      Number(
        db
          .prepare(
            "SELECT COUNT(*) AS c FROM sqlite_master WHERE name = 'event_participants'",
          )
          .get()?.c ?? 0,
      ),
      1,
    );
    db.close();
  });

  it("rejects duplicate contact on the same event", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON");
    initContactsTables(db);
    initLinksTables(db);
    initEventsTables(db);
    initEventParticipantsTables(db);
    db.prepare(
      "INSERT INTO contacts (name, kind, created_at, updated_at) VALUES (?, ?, ?, ?)",
    ).run("A", "human", 1, 1);
    db.prepare(
      `INSERT INTO events (type, occurred_at, summary, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run("conversation", 1, "hi", 1, 1);
    db.prepare(
      "INSERT INTO event_participants (event_id, contact_id, role) VALUES (?, ?, ?)",
    ).run(1, 1, "actor");
    throws(
      () =>
        db
          .prepare(
            "INSERT INTO event_participants (event_id, contact_id, role) VALUES (?, ?, ?)",
          )
          .run(1, 1, "observer"),
      /UNIQUE constraint failed/,
    );
    db.close();
  });
});
