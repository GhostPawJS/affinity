import { strictEqual } from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { describe, it } from "node:test";
import { initContactsTables } from "../contacts/init_contacts_tables.ts";
import { initContactMergesTables } from "./init_contact_merges_tables.ts";

describe("initContactMergesTables", () => {
  it("is idempotent once contacts exist", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON");
    initContactsTables(db);
    initContactMergesTables(db);
    initContactMergesTables(db);
    strictEqual(
      Number(
        db
          .prepare(
            "SELECT COUNT(*) AS c FROM sqlite_master WHERE name = 'contact_merges'",
          )
          .get()?.c ?? 0,
      ),
      1,
    );
    db.close();
  });
});
