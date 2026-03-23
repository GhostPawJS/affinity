import { ok, strictEqual, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { AffinityStateError } from "../lib/errors/affinity_state_error.ts";
import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
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

  it("creates a resolving event and link effects for broken commitments", async () => {
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
        {
          contactId: owner.id,
          role: "actor",
          directionality: "owner_initiated",
        },
        {
          contactId: other.id,
          role: "recipient",
          directionality: "other_initiated",
        },
      ],
    });
    const broken = resolveCommitment(db, ev.id, "broken");
    strictEqual(broken.updated[0]?.id, ev.id);
    strictEqual(broken.created.length >= 1, true);
    strictEqual(broken.affectedLinks.length, 1);
    strictEqual(broken.derivedEffects.length, 1);
    const openAfter = db
      .prepare(
        "SELECT COUNT(*) AS c FROM open_commitments WHERE resolved_at IS NULL",
      )
      .get() as unknown as { c: number };
    strictEqual(Number(openAfter.c), 0);
    const eventCount = db
      .prepare("SELECT COUNT(*) AS c FROM events")
      .get() as unknown as { c: number };
    strictEqual(Number(eventCount.c), 2);
    db.close();
  });

  it("records an optional linked resolving event when provided", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: owner } = createContact(db, {
      name: "Me",
      kind: "human",
      bootstrapOwner: true,
    });
    const { primary: other } = createContact(db, { name: "A", kind: "human" });
    const { primary: ev } = recordCommitment(db, {
      commitmentType: "agreement",
      occurredAt: 1,
      summary: "will align",
      significance: 5,
      participants: [
        { contactId: owner.id, role: "actor", directionality: "mutual" },
        { contactId: other.id, role: "recipient", directionality: "mutual" },
      ],
    });
    const kept = resolveCommitment(db, ev.id, "kept", {
      resolvingEvent: {
        type: "support",
        summary: "followed through",
        significance: 6,
      },
    });
    strictEqual(kept.created.length >= 1, true);
    const resolvingEventId = kept.created[0]?.id;
    ok(resolvingEventId !== undefined);
    const row = db
      .prepare("SELECT type, summary FROM events WHERE id = ?")
      .get(resolvingEventId) as { type: string; summary: string };
    strictEqual(row.type, "support");
    strictEqual(row.summary, "followed through");
    db.close();
  });

  it("rejects invalid resolution string at app level", async () => {
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
    throws(
      () => resolveCommitment(db, ev.id, "invalid" as never),
      (e: unknown) => e instanceof AffinityValidationError,
    );
    db.close();
  });

  it("rejects non-finite dueAt", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: owner } = createContact(db, {
      name: "Me",
      kind: "human",
      bootstrapOwner: true,
    });
    const { primary: other } = createContact(db, { name: "A", kind: "human" });
    throws(
      () =>
        recordCommitment(db, {
          commitmentType: "promise",
          occurredAt: 1,
          summary: "will do",
          significance: 5,
          dueAt: Number.POSITIVE_INFINITY,
          participants: [
            { contactId: owner.id, role: "actor" },
            { contactId: other.id, role: "recipient" },
          ],
        }),
      (e: unknown) => e instanceof AffinityValidationError,
    );
    db.close();
  });
});
