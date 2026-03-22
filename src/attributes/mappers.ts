import type { AttributeRecord } from "../lib/types/attribute_record.ts";
import type { AttributeRow } from "../lib/types/attribute_row.ts";

export function mapAttributeRowToAttributeRecord(
  row: AttributeRow,
): AttributeRecord {
  return {
    id: row.id,
    contactId: row.contact_id,
    linkId: row.link_id,
    name: row.name,
    value: row.value,
  };
}
