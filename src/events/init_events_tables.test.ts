import { strictEqual, throws } from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { describe, it } from "node:test";
import { initContactsTables } from "../contacts/init_contacts_tables.ts";
import { initLinksTables } from "../links/init_links_tables.ts";
import { initEventsTables } from "./init_events_tables.ts";

describe("initEventsTables", () => {
  it("is idempotent", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON");
    initContactsTables(db);
    initLinksTables(db);
    initEventsTables(db);
    initEventsTables(db);
    strictEqual(
      Number(
        db
          .prepare(
            "SELECT COUNT(*) AS c FROM sqlite_master WHERE name = 'events'",
          )
          .get()?.c ?? 0,
      ),
      1,
    );
    db.close();
  });

  it("rejects invalid event type", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON");
    initContactsTables(db);
    initLinksTables(db);
    initEventsTables(db);
    throws(
      () =>
        db
          .prepare(
            `INSERT INTO events (type, occurred_at, summary, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?)`,
          )
          .run("invalid", 1, "x", 1, 1),
      /CHECK constraint failed/,
    );
    db.close();
  });

  it("allows nullable moment_kind", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON");
    initContactsTables(db);
    initLinksTables(db);
    initEventsTables(db);
    db.prepare(
      `INSERT INTO events (type, occurred_at, summary, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run("conversation", 1, "hello", 1, 1);
    strictEqual(
      Number(db.prepare("SELECT COUNT(*) AS c FROM events").get()?.c ?? 0),
      1,
    );
    db.close();
  });
});
