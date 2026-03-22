import type { AffinityDb } from "../database.ts";
import type { ContactProfileReadOptions } from "../lib/types/contact_profile_read_options.ts";
import type { ContactProfileRecord } from "../lib/types/contact_profile_record.ts";
import { loadContactProfileRecord } from "./load_contact_profile_record.ts";

export function getContactProfile(
  db: AffinityDb,
  contactId: number,
  options?: ContactProfileReadOptions,
): ContactProfileRecord | null {
  const t = options?.topLinksLimit ?? 8;
  return loadContactProfileRecord(db, contactId, t);
}
