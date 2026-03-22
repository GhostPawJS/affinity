import type { IdentityType } from "../../identities/types.ts";

/** One routing identity on a contact — CONCEPT.md IdentityRecord. */
export interface IdentityRecord {
  id: number;
  contactId: number;
  type: IdentityType;
  value: string;
  label: string | null;
  verified: boolean;
  /** When the identity was marked verified, if known. */
  verifiedAt?: number | null;
}
