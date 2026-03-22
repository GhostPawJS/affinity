import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { getContactProfile } from "../contacts/get_contact_profile.ts";
import { recordInteraction } from "../events/record_interaction.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { getLinkDetail } from "../links/get_link_detail.ts";

describe("detail rollups", () => {
  it("hydrates contact warnings and link derivation details", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: owner } = createContact(db, {
      name: "Me",
      kind: "human",
      bootstrapOwner: true,
    });
    const { primary: other } = createContact(db, { name: "A", kind: "human" });
    const interaction = recordInteraction(db, {
      type: "conversation",
      occurredAt: 30,
      summary: "hello",
      significance: 6,
      participants: [
        { contactId: owner.id, role: "actor", directionality: "mutual" },
        { contactId: other.id, role: "recipient", directionality: "mutual" },
      ],
    });
    const profile = getContactProfile(db, other.id);
    ok(profile !== null);
    strictEqual(profile.warnings.includes("missing_identity"), true);
    const detail = getLinkDetail(db, interaction.affectedLinks[0] as number);
    ok(detail !== null);
    ok(detail.rollups !== null);
    ok(detail.derivation !== null);
    db.close();
  });
});
