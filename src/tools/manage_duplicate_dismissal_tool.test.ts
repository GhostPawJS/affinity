import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { listDuplicateCandidates } from "../contacts/list_duplicate_candidates.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { listDismissedDuplicates } from "../merges/list_dismissed_duplicates.ts";
import { manageDuplicateDismissalToolHandler } from "./manage_duplicate_dismissal_tool.ts";

describe("manageDuplicateDismissalToolHandler", () => {
  it("dismiss action suppresses the pair in listDuplicateCandidates", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "Sarah", kind: "human" });
    const { primary: b } = createContact(db, { name: "Sarah", kind: "human" });

    const result = manageDuplicateDismissalToolHandler(db, {
      action: "dismiss",
      left: { contactId: a.id },
      right: { contactId: b.id },
      reason: "confirmed different people",
    });

    strictEqual(result.outcome, "success");
    strictEqual(
      listDuplicateCandidates(db).some(
        (c) =>
          (c.leftContactId === a.id || c.rightContactId === a.id) &&
          (c.leftContactId === b.id || c.rightContactId === b.id),
      ),
      false,
    );

    db.close();
  });

  it("undismiss action re-surfaces the pair", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "Sarah", kind: "human" });
    const { primary: b } = createContact(db, { name: "Sarah", kind: "human" });

    manageDuplicateDismissalToolHandler(db, {
      action: "dismiss",
      left: { contactId: a.id },
      right: { contactId: b.id },
    });

    const result = manageDuplicateDismissalToolHandler(db, {
      action: "undismiss",
      left: { contactId: a.id },
      right: { contactId: b.id },
    });

    strictEqual(result.outcome, "success");
    strictEqual(
      listDuplicateCandidates(db).some(
        (c) =>
          (c.leftContactId === a.id || c.rightContactId === a.id) &&
          (c.leftContactId === b.id || c.rightContactId === b.id),
      ),
      true,
    );

    db.close();
  });

  it("returns failure when left contact does not exist", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: b } = createContact(db, { name: "Sarah", kind: "human" });

    const result = manageDuplicateDismissalToolHandler(db, {
      action: "dismiss",
      left: { contactId: 99999 },
      right: { contactId: b.id },
    });

    strictEqual(result.outcome, "error");

    db.close();
  });

  it("dismiss returns receipt with correct canonical pair in primary", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: a } = createContact(db, { name: "Bob", kind: "human" });
    const { primary: b } = createContact(db, { name: "Bob", kind: "human" });

    const result = manageDuplicateDismissalToolHandler(db, {
      action: "dismiss",
      left: { contactId: b.id },
      right: { contactId: a.id },
    });

    strictEqual(result.outcome, "success");
    if (result.outcome === "success") {
      strictEqual(result.data.primary.leftContactId, Math.min(a.id, b.id));
      strictEqual(result.data.primary.rightContactId, Math.max(a.id, b.id));
    }

    strictEqual(listDismissedDuplicates(db).length, 1);

    db.close();
  });
});
