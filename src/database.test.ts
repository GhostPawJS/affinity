import { DatabaseSync } from "node:sqlite";
import { describe, it } from "node:test";
import type { AffinityDb } from "./database.ts";

describe("AffinityDb", () => {
  it("accepts a DatabaseSync instance", () => {
    const db: AffinityDb = new DatabaseSync(":memory:");
    db.close();
  });
});
