import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { openTestDatabase } from "./open_test_database.ts";

describe("openTestDatabase", () => {
  it("returns an in-memory db with foreign keys enforced", async () => {
    const db = await openTestDatabase();
    const row = db.prepare("PRAGMA foreign_keys").get() as {
      foreign_keys?: number;
    };
    strictEqual(Number(row?.foreign_keys ?? 0), 1);
    db.close();
  });
});
