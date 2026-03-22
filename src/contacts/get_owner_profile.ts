import type { AffinityDb } from "../database.ts";
import type { ContactProfileReadOptions } from "../lib/types/contact_profile_read_options.ts";
import type { ContactProfileRecord } from "../lib/types/contact_profile_record.ts";
import { loadContactProfileRecord } from "./load_contact_profile_record.ts";
import { findOwnerContactId } from "./queries.ts";

export function getOwnerProfile(
  db: AffinityDb,
  options?: ContactProfileReadOptions,
): ContactProfileRecord | null {
  const ownerId = findOwnerContactId(db);
  if (ownerId === null) {
    return null;
  }
  const t = options?.topLinksLimit ?? 8;
  return loadContactProfileRecord(db, ownerId, t);
}
