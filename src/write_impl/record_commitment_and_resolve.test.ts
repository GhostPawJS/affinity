import { strictEqual, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { AffinityStateError } from "../lib/errors/affinity_state_error.ts";
import { createInitializedAffinityDb } from "../lib/test-db.ts";
import { createContact } from "./create_contact.ts";
import { recordCommitment } from "./record_commitment.ts";
import { resolveCommitment } from "./resolve_commitment.ts";

describe("recordCommitment + resolveCommitment", () => {
  it("opens and resolves a promise", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: owner } = createContact(db, {
      name: "Me",
      kind: "human",
      bootstrapOwner: true,
    });
    const { primary: other } = createContact(db, { name: "A", kind: "human" });
    const { primary: ev } = recordCommitment(db, {
      commitmentType: "promise",
      occurredAt: 1,
      summary: "will do",
      significance: 5,
      participants: [
        { contactId: owner.id, role: "actor" },
        { contactId: other.id, role: "recipient" },
      ],
    });
    const openBefore = db
      .prepare(
        "SELECT COUNT(*) AS c FROM open_commitments WHERE resolved_at IS NULL",
      )
      .get() as unknown as { c: number };
    strictEqual(Number(openBefore.c), 1);
    const r = resolveCommitment(db, ev.id, "kept");
    strictEqual(r.updated[0]?.kind, "event");
    const openAfter = db
      .prepare(
        "SELECT COUNT(*) AS c FROM open_commitments WHERE resolved_at IS NULL",
      )
      .get() as unknown as { c: number };
    strictEqual(Number(openAfter.c), 0);
    throws(
      () => resolveCommitment(db, ev.id, "kept"),
      (e: unknown) => e instanceof AffinityStateError,
    );
    db.close();
  });
});
