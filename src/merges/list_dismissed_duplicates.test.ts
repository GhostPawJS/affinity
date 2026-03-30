import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { dismissDuplicate } from "./dismiss_duplicate.ts";
import { listDismissedDuplicates } from "./list_dismissed_duplicates.ts";
import { undismissDuplicate } from "./undismiss_duplicate.ts";

describe("listDismissedDuplicates", () => {
  it("returns empty array when nothing is dismissed", async () => {
    const db = await createInitializedAffinityDb();
    strictEqual(listDismissedDuplicates(db).length, 0);
    db.close();
  });

  it("returns dismissed pairs with correct fields", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "Sarah", kind: "human" });
    const { primary: b } = createContact(db, { name: "Sarah", kind: "human" });

    dismissDuplicate(db, a.id, b.id, "confirmed different", 5000);

    const records = listDismissedDuplicates(db);
    strictEqual(records.length, 1);
    const rec = records[0];
    strictEqual(rec?.leftContactId, Math.min(a.id, b.id));
    strictEqual(rec?.rightContactId, Math.max(a.id, b.id));
    strictEqual(rec?.reason, "confirmed different");
    strictEqual(rec?.dismissedAt, 5000);

    db.close();
  });

  it("does not return a pair after it is undismissed", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "Sarah", kind: "human" });
    const { primary: b } = createContact(db, { name: "Sarah", kind: "human" });

    dismissDuplicate(db, a.id, b.id);
    strictEqual(listDismissedDuplicates(db).length, 1);

    undismissDuplicate(db, a.id, b.id);
    strictEqual(listDismissedDuplicates(db).length, 0);

    db.close();
  });

  it("orders by dismissed_at DESC", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "Alice", kind: "human" });
    const { primary: b } = createContact(db, { name: "Alice", kind: "human" });
    const { primary: c } = createContact(db, { name: "Alice", kind: "human" });

    dismissDuplicate(db, a.id, b.id, null, 1000);
    dismissDuplicate(db, a.id, c.id, null, 3000);

    const records = listDismissedDuplicates(db);
    strictEqual(records.length, 2);
    strictEqual(records[0]?.dismissedAt, 3000);
    strictEqual(records[1]?.dismissedAt, 1000);

    db.close();
  });
});
