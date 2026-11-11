import type { AffinityDb } from "../database.ts";
import { requireOwnerContactId } from "./queries.ts";

export function getOwnerContactId(db: AffinityDb): number {
  return requireOwnerContactId(db);
}
