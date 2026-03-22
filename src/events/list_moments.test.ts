import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { listMoments } from "./list_moments.ts";
import { recordMilestone } from "./record_milestone.ts";

describe("listMoments", () => {
  it("loads link-backed moments from link_event_effects", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: owner } = createContact(db, {
      name: "Me",
      kind: "human",
      bootstrapOwner: true,
    });
    const { primary: other } = createContact(db, { name: "A", kind: "human" });
    const receipt = recordMilestone(db, {
      occurredAt: 20,
      summary: "promotion",
      significance: 8,
      participants: [
        { contactId: owner.id, role: "actor", directionality: "mutual" },
        { contactId: other.id, role: "recipient", directionality: "mutual" },
      ],
    });
    const linkId = receipt.affectedLinks[0];
    ok(linkId !== undefined);
    const moments = listMoments(db, { linkId });
    strictEqual(moments.length, 1);
    strictEqual(moments[0]?.momentKind, "breakthrough");
    strictEqual(moments[0]?.eventId, receipt.primary.id);
    db.close();
  });
});
