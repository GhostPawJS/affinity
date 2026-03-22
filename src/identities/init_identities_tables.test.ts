import { strictEqual, throws } from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { describe, it } from "node:test";
import { initContactsTables } from "../contacts/init_contacts_tables.ts";
import { initIdentitiesTables } from "./init_identities_tables.ts";

describe("initIdentitiesTables", () => {
  it("is idempotent once contacts exist", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON");
    initContactsTables(db);
    initIdentitiesTables(db);
    initIdentitiesTables(db);
    strictEqual(
      Number(
        db
          .prepare(
            "SELECT COUNT(*) AS c FROM sqlite_master WHERE name = 'identities'",
          )
          .get()?.c ?? 0,
      ),
      1,
    );
    db.close();
  });

  it("rejects duplicate live normalized_key", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON");
    initContactsTables(db);
    initIdentitiesTables(db);
    db.prepare(
      "INSERT INTO contacts (name, kind, created_at, updated_at) VALUES (?, ?, ?, ?)",
    ).run("A", "human", 1, 1);
    db.prepare(
      `INSERT INTO identities (contact_id, type, value, normalized_key, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(1, "email", "a@b", "email:a@b", 1, 1);
    throws(
      () =>
        db
          .prepare(
            `INSERT INTO identities (contact_id, type, value, normalized_key, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
          )
          .run(1, "email", "a@b", "email:a@b", 2, 2),
      /UNIQUE constraint failed/,
    );
    db.close();
  });
});
