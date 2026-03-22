import { strictEqual, throws } from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { describe, it } from "node:test";
import { initContactsTables } from "../contacts/init_contacts_tables.ts";
import { initLinksTables } from "./init_links_tables.ts";

describe("initLinksTables", () => {
  it("is idempotent once contacts exist", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON");
    initContactsTables(db);
    initLinksTables(db);
    initLinksTables(db);
    strictEqual(
      Number(
        db
          .prepare(
            "SELECT COUNT(*) AS c FROM sqlite_master WHERE name = 'links'",
          )
          .get()?.c ?? 0,
      ),
      1,
    );
    db.close();
  });

  it("accepts a structural tie with null progression", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON");
    initContactsTables(db);
    initLinksTables(db);
    db.prepare(
      "INSERT INTO contacts (name, kind, created_at, updated_at) VALUES (?, ?, ?, ?)",
    ).run("A", "human", 1, 1);
    db.prepare(
      "INSERT INTO contacts (name, kind, created_at, updated_at) VALUES (?, ?, ?, ?)",
    ).run("B", "human", 1, 1);
    db.prepare(
      `INSERT INTO links (
         from_contact_id, to_contact_id, kind, is_structural, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(1, 2, "works_at", 1, 1, 1);
    strictEqual(
      Number(db.prepare("SELECT COUNT(*) AS c FROM links").get()?.c ?? 0),
      1,
    );
    db.close();
  });

  it("rejects relational row missing progression", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON");
    initContactsTables(db);
    initLinksTables(db);
    db.prepare(
      "INSERT INTO contacts (name, kind, created_at, updated_at) VALUES (?, ?, ?, ?)",
    ).run("A", "human", 1, 1);
    db.prepare(
      "INSERT INTO contacts (name, kind, created_at, updated_at) VALUES (?, ?, ?, ?)",
    ).run("B", "human", 1, 1);
    throws(
      () =>
        db
          .prepare(
            `INSERT INTO links (
               from_contact_id, to_contact_id, kind, is_structural, created_at, updated_at
             ) VALUES (?, ?, ?, ?, ?, ?)`,
          )
          .run(1, 2, "personal", 0, 1, 1),
      /CHECK constraint failed/,
    );
    db.close();
  });

  it("accepts a relational row with full progression", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON");
    initContactsTables(db);
    initLinksTables(db);
    db.prepare(
      "INSERT INTO contacts (name, kind, created_at, updated_at) VALUES (?, ?, ?, ?)",
    ).run("A", "human", 1, 1);
    db.prepare(
      "INSERT INTO contacts (name, kind, created_at, updated_at) VALUES (?, ?, ?, ?)",
    ).run("B", "human", 1, 1);
    db.prepare(
      `INSERT INTO links (
         from_contact_id, to_contact_id, kind, is_structural, rank, affinity, trust, state,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(1, 2, "personal", 0, 0, 0, 0.1, "active", 1, 1);
    strictEqual(
      Number(db.prepare("SELECT COUNT(*) AS c FROM links").get()?.c ?? 0),
      1,
    );
    db.close();
  });
});
