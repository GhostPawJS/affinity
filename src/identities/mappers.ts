import type { IdentityRecord } from "../lib/types/identity_record.ts";
import type { IdentityRow } from "../lib/types/identity_row.ts";
import type { IdentityType } from "./types.ts";

export function mapIdentityRowToIdentityRecord(
  row: IdentityRow,
): IdentityRecord {
  return {
    id: row.id,
    contactId: row.contact_id,
    type: row.type as IdentityType,
    value: row.value,
    label: row.label,
    verified: row.verified === 1,
    verifiedAt: row.verified_at,
  };
}
