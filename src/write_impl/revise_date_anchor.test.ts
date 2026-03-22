import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createInitializedAffinityDb } from "../lib/test-db.ts";
import { addDateAnchor } from "./add_date_anchor.ts";
import { createContact } from "./create_contact.ts";
import { reviseDateAnchor } from "./revise_date_anchor.ts";

describe("reviseDateAnchor", () => {
  it("updates summary", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: c } = createContact(db, { name: "A", kind: "human" });
    const { primary: ev } = addDateAnchor(db, {
      target: { kind: "contact", contactId: c.id },
      recurrenceKind: "birthday",
      anchorMonth: 3,
      anchorDay: 15,
      summary: "birthday",
      significance: 5,
    });
    const r = reviseDateAnchor(db, ev.id, { summary: "big day" });
    strictEqual(r.primary.summary, "big day");
    db.close();
  });
});
