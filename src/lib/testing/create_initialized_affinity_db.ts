import { initAffinityTables } from "../../init_affinity_tables.ts";
import type { AffinityDb } from "../core/affinity_db.ts";
import { openTestDatabase } from "./open_test_database.ts";

/** In-memory DB with full affinity schema — shared by tests. */
export async function createInitializedAffinityDb(): Promise<AffinityDb> {
  const db = await openTestDatabase();
  initAffinityTables(db);
  return db;
}
