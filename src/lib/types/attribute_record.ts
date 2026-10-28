/** Attribute row for mutation receipts — stable id + target + payload. */
export interface AttributeRecord {
  eventId?: number;
  id: number;
  contactId: number | null;
  linkId: number | null;
  name: string;
  value: string | null;
}
