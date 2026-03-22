import type { AttributeRecord } from "../lib/types/attribute_record.ts";
import type { AttributeTarget } from "../lib/types/attribute_target.ts";

/** Receipt primary when `replaceAttributes` clears all rows (`id` is not a real row). */
export function clearedAttributePrimary(
  target: AttributeTarget,
): AttributeRecord {
  return {
    id: 0,
    contactId: target.kind === "contact" ? target.id : null,
    linkId: target.kind === "link" ? target.id : null,
    name: "",
    value: null,
  };
}
