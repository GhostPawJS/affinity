import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createInitializedAffinityDb } from "../lib/test-db.ts";
import { createContact } from "./create_contact.ts";
import { recordObservation } from "./record_observation.ts";

describe("recordObservation", () => {
  it("seeds observed link for two non-owners", async () => {
    const db = await createInitializedAffinityDb();
    createContact(db, { name: "Me", kind: "human", bootstrapOwner: true });
    const { primary: a } = createContact(db, { name: "A", kind: "human" });
    const { primary: b } = createContact(db, { name: "B", kind: "human" });
    const r = recordObservation(db, {
      occurredAt: 1,
      summary: "saw them together",
      significance: 3,
      participants: [
        { contactId: a.id, role: "observer" },
        { contactId: b.id, role: "subject" },
      ],
    });
    strictEqual(r.primary.type, "observation");
    const linkCount = db
      .prepare("SELECT COUNT(*) AS c FROM links")
      .get() as unknown as { c: number };
    strictEqual(Number(linkCount.c), 1);
    db.close();
  });
});
