import { strictEqual } from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { describe, it } from "node:test";
import { initContactsTables } from "../contacts/init_contacts_tables.ts";
import { initLinksTables } from "../links/init_links_tables.ts";
import { initEventsTables } from "./init_events_tables.ts";
import { initOpenCommitmentsTables } from "./init_open_commitments_tables.ts";

describe("initOpenCommitmentsTables", () => {
  it("is idempotent once events exist", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON");
    initContactsTables(db);
    initLinksTables(db);
    initEventsTables(db);
    initOpenCommitmentsTables(db);
    initOpenCommitmentsTables(db);
    strictEqual(
      Number(
        db
          .prepare(
            "SELECT COUNT(*) AS c FROM sqlite_master WHERE name = 'open_commitments'",
          )
          .get()?.c ?? 0,
      ),
      1,
    );
    db.close();
  });
});
