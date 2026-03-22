import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createInitializedAffinityDb } from "../lib/test-db.ts";
import { addDateAnchor } from "../write_impl/add_date_anchor.ts";
import { createContact } from "../write_impl/create_contact.ts";
import { seedSocialLink } from "../write_impl/seed_social_link.ts";
import {
  deleteUpcomingOccurrence,
  loadActiveDatesForContact,
  rebuildUpcomingOccurrences,
  upsertUpcomingOccurrence,
} from "./upcoming_occurrences.ts";

describe("events upcoming occurrences", () => {
  it("upserts and deletes a materialized occurrence", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: contact } = createContact(db, {
      name: "A",
      kind: "human",
    });
    const receipt = addDateAnchor(db, {
      target: { kind: "contact", contactId: contact.id },
      recurrenceKind: "birthday",
      anchorMonth: 6,
      anchorDay: 1,
      summary: "Birthday",
      significance: 5,
    });
    deleteUpcomingOccurrence(db, receipt.primary.id);
    let row = db
      .prepare("SELECT COUNT(*) AS c FROM upcoming_occurrences")
      .get() as { c?: number };
    strictEqual(Number(row.c ?? 0), 0);
    upsertUpcomingOccurrence(db, receipt.primary.id, Date.UTC(2025, 0, 1));
    row = db
      .prepare("SELECT COUNT(*) AS c FROM upcoming_occurrences")
      .get() as {
      c?: number;
    };
    strictEqual(Number(row.c ?? 0), 1);
    db.close();
  });

  it("loads active dates for both contact and link anchors and rebuilds rows", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "A", kind: "human" });
    const { primary: b } = createContact(db, { name: "B", kind: "human" });
    addDateAnchor(db, {
      target: { kind: "contact", contactId: a.id },
      recurrenceKind: "birthday",
      anchorMonth: 4,
      anchorDay: 10,
      summary: "Solo",
      significance: 5,
    });
    const { primary: link } = seedSocialLink(db, {
      fromContactId: a.id,
      toContactId: b.id,
      kind: "personal",
    });
    addDateAnchor(db, {
      target: { kind: "link", linkId: link.id },
      recurrenceKind: "anniversary",
      anchorMonth: 7,
      anchorDay: 4,
      summary: "Shared",
      significance: 8,
    });
    db.prepare("DELETE FROM upcoming_occurrences").run();
    strictEqual(rebuildUpcomingOccurrences(db), 2);
    strictEqual(loadActiveDatesForContact(db, a.id).length, 2);
    strictEqual(loadActiveDatesForContact(db, b.id).length, 1);
    db.close();
  });
});
