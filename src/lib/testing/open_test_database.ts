import { DatabaseSync } from "node:sqlite";
import type { AffinityDb } from "../core/affinity_db.ts";

/** In-memory SQLite for tests — async for questlog-compatible harness patterns. */
export async function openTestDatabase(): Promise<AffinityDb> {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  return db;
}
