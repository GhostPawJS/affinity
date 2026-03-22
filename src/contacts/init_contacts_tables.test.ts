import { strictEqual, throws } from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { describe, it } from "node:test";
import type { AffinityDb } from "../database.ts";
import { initContactsTables } from "./init_contacts_tables.ts";

describe("initContactsTables", () => {
  it("is idempotent", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON");
    initContactsTables(db);
    initContactsTables(db);
    strictEqual(
      Number(
        db
          .prepare(
            "SELECT COUNT(*) AS c FROM sqlite_master WHERE name = 'contacts'",
          )
          .get()?.c ?? 0,
      ),
      1,
    );
    db.close();
  });

  it("enforces a single live owner row", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON");
    initContactsTables(db);
    db.prepare(
      "INSERT INTO contacts (name, kind, created_at, updated_at, is_owner) VALUES (?, ?, ?, ?, ?)",
    ).run("Owner", "human", 1, 1, 1);
    throws(
      () =>
        db
          .prepare(
            "INSERT INTO contacts (name, kind, created_at, updated_at, is_owner) VALUES (?, ?, ?, ?, ?)",
          )
          .run("Other", "human", 1, 1, 1),
      /UNIQUE constraint failed/,
    );
    db.close();
  });

  it("rejects invalid kind values", () => {
    const db: AffinityDb = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON");
    initContactsTables(db);
    throws(
      () =>
        db
          .prepare(
            "INSERT INTO contacts (name, kind, created_at, updated_at) VALUES (?, ?, ?, ?)",
          )
          .run("X", "invalid", 1, 1),
      /CHECK constraint failed/,
    );
    db.close();
  });
});
