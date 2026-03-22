import { strictEqual, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { getAttributeRowById } from "../attributes/queries.ts";
import { createContact } from "../contacts/create_contact.ts";
import { AffinityNotFoundError } from "../lib/errors/affinity_not_found_error.ts";
import { AffinityStateError } from "../lib/errors/affinity_state_error.ts";
import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { seedSocialLink } from "../links/seed_social_link.ts";
import { setAttribute } from "./set_attribute.ts";

describe("setAttribute", () => {
  it("inserts then updates on second call", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: c } = createContact(db, { name: "A", kind: "human" });
    const r1 = setAttribute(
      db,
      { kind: "contact", id: c.id },
      "pref.channel",
      "sms",
    );
    strictEqual(r1.created.length, 1);
    strictEqual(r1.updated.length, 0);
    strictEqual(r1.primary.value, "sms");
    const r2 = setAttribute(
      db,
      { kind: "contact", id: c.id },
      "pref.channel",
      "email",
    );
    strictEqual(r2.updated.length, 1);
    strictEqual(r2.created.length, 0);
    strictEqual(r2.primary.value, "email");
    db.close();
  });

  it("stores null value for tag semantics", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: c } = createContact(db, { name: "A", kind: "human" });
    const r = setAttribute(db, { kind: "contact", id: c.id }, "tag.only", null);
    strictEqual(r.primary.value, null);
    const row = getAttributeRowById(db, r.primary.id);
    strictEqual(row?.value, null);
    db.close();
  });

  it("sets on link target", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "A", kind: "human" });
    const { primary: b } = createContact(db, { name: "B", kind: "human" });
    const { primary: link } = seedSocialLink(db, {
      fromContactId: a.id,
      toContactId: b.id,
      kind: "personal",
    });
    const r = setAttribute(db, { kind: "link", id: link.id }, "note", "hello");
    strictEqual(r.primary.linkId, link.id);
    strictEqual(r.primary.contactId, null);
    db.close();
  });

  it("throws when contact missing", async () => {
    const db = await createInitializedAffinityDb();
    throws(
      () => setAttribute(db, { kind: "contact", id: 999 }, "x", "y"),
      (e: unknown) => e instanceof AffinityNotFoundError,
    );
    db.close();
  });

  it("throws when link missing", async () => {
    const db = await createInitializedAffinityDb();
    throws(
      () => setAttribute(db, { kind: "link", id: 999 }, "x", "y"),
      (e: unknown) => e instanceof AffinityNotFoundError,
    );
    db.close();
  });

  it("rejects merged contact", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: c } = createContact(db, { name: "A", kind: "human" });
    db.prepare(
      "UPDATE contacts SET lifecycle_state = 'merged' WHERE id = ?",
    ).run(c.id);
    throws(
      () => setAttribute(db, { kind: "contact", id: c.id }, "x", "y"),
      (e: unknown) => e instanceof AffinityStateError,
    );
    db.close();
  });

  it("rejects blank attribute name", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: c } = createContact(db, { name: "A", kind: "human" });
    throws(
      () => setAttribute(db, { kind: "contact", id: c.id }, "  ", "y"),
      (e: unknown) => e instanceof AffinityValidationError,
    );
    db.close();
  });
});
