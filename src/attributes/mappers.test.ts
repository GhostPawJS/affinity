import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { AttributeRow } from "../lib/types/attribute_row.ts";
import { mapAttributeRowToAttributeRecord } from "./mappers.ts";

describe("attributes mappers", () => {
  it("maps attribute rows to records", () => {
    const row: AttributeRow = {
      id: 1,
      contact_id: 2,
      link_id: null,
      name: "nickname",
      value: "Ace",
      created_at: 1,
      updated_at: 1,
      deleted_at: null,
    };
    const record = mapAttributeRowToAttributeRecord(row);
    strictEqual(record.contactId, 2);
    strictEqual(record.name, "nickname");
  });
});
