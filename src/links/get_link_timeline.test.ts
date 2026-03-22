import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { recordInteraction } from "../events/record_interaction.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { getLinkTimeline } from "./get_link_timeline.ts";

describe("getLinkTimeline", () => {
  it("loads timeline events from link_event_effects", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: owner } = createContact(db, {
      name: "Me",
      kind: "human",
      bootstrapOwner: true,
    });
    const { primary: other } = createContact(db, { name: "A", kind: "human" });
    const receipt = recordInteraction(db, {
      type: "conversation",
      occurredAt: 10,
      summary: "hello",
      significance: 5,
      participants: [
        { contactId: owner.id, role: "actor", directionality: "mutual" },
        { contactId: other.id, role: "recipient", directionality: "mutual" },
      ],
    });
    const events = getLinkTimeline(db, receipt.affectedLinks[0] as number);
    strictEqual(events.length, 1);
    strictEqual(events[0]?.id, receipt.primary.id);
    db.close();
  });
});
