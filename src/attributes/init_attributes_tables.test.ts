import { strictEqual, throws } from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { describe, it } from "node:test";
import { initContactsTables } from "../contacts/init_contacts_tables.ts";
import { initLinksTables } from "../links/init_links_tables.ts";
import { initAttributesTables } from "./init_attributes_tables.ts";

describe("initAttributesTables", () => {
  it("is idempotent once contacts and links exist", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON");
    initContactsTables(db);
    initLinksTables(db);
    initAttributesTables(db);
    initAttributesTables(db);
    strictEqual(
      Number(
        db
          .prepare(
            "SELECT COUNT(*) AS c FROM sqlite_master WHERE name = 'attributes'",
          )
          .get()?.c ?? 0,
      ),
      1,
    );
    db.close();
  });

  it("rejects rows with both targets set", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON");
    initContactsTables(db);
    initLinksTables(db);
    initAttributesTables(db);
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
    throws(
      () =>
        db
          .prepare(
            `INSERT INTO attributes (contact_id, link_id, name, value, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
          )
          .run(1, 1, "x", "y", 1, 1),
      /CHECK constraint failed/,
    );
    db.close();
  });

  it("rejects rows with neither target set", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON");
    initContactsTables(db);
    initLinksTables(db);
    initAttributesTables(db);
    throws(
      () =>
        db
          .prepare(
            `INSERT INTO attributes (name, value, created_at, updated_at)
             VALUES (?, ?, ?, ?)`,
          )
          .run("x", "y", 1, 1),
      /CHECK constraint failed/,
    );
    db.close();
  });

  it("allows null value", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON");
    initContactsTables(db);
    initLinksTables(db);
    initAttributesTables(db);
    db.prepare(
      "INSERT INTO contacts (name, kind, created_at, updated_at) VALUES (?, ?, ?, ?)",
    ).run("A", "human", 1, 1);
    db.prepare(
      `INSERT INTO attributes (contact_id, link_id, name, value, created_at, updated_at)
       VALUES (?, NULL, ?, NULL, ?, ?)`,
    ).run(1, "tag", 1, 1);
    const v = db.prepare("SELECT value FROM attributes WHERE id = 1").get() as {
      value: null;
    };
    strictEqual(v.value, null);
    db.close();
  });

  it("rejects duplicate live name for same contact", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON");
    initContactsTables(db);
    initLinksTables(db);
    initAttributesTables(db);
    db.prepare(
      "INSERT INTO contacts (name, kind, created_at, updated_at) VALUES (?, ?, ?, ?)",
    ).run("A", "human", 1, 1);
    db.prepare(
      `INSERT INTO attributes (contact_id, link_id, name, value, created_at, updated_at)
       VALUES (?, NULL, ?, ?, ?, ?)`,
    ).run(1, "k", "a", 1, 1);
    throws(
      () =>
        db
          .prepare(
            `INSERT INTO attributes (contact_id, link_id, name, value, created_at, updated_at)
             VALUES (?, NULL, ?, ?, ?, ?)`,
          )
          .run(1, "k", "b", 1, 1),
      /UNIQUE constraint failed/,
    );
    db.close();
  });
});
