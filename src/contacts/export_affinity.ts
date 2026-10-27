import type { AffinityDb } from "../database.ts";
import { exportContact } from "./export_contact.ts";

/** Export every contact, including merged and lost records. Version is the export format version. */
export function exportAffinity(db: AffinityDb) {
  const now = Date.now();
  return {
    version: 1,
    exportedAt: now,
    exportedAtIso: new Date(now).toISOString(),
    contacts: (
      db.prepare("SELECT id FROM contacts ORDER BY id").all() as {
        id: number;
      }[]
    ).map((row) => exportContact(db, row.id)),
  };
}
