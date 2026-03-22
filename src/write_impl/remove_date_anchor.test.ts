import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { getEventRowById } from "../events/queries.ts";
import { createInitializedAffinityDb } from "../lib/test-db.ts";
import { addDateAnchor } from "./add_date_anchor.ts";
import { createContact } from "./create_contact.ts";
import { removeDateAnchor } from "./remove_date_anchor.ts";

describe("removeDateAnchor", () => {
  it("soft-deletes the anchor event", async () => {
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
    const r = removeDateAnchor(db, ev.id, 42);
    strictEqual(r.removed[0]?.kind, "event");
    strictEqual(getEventRowById(db, ev.id), null);
    db.close();
  });
});
