import { strictEqual, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getAttributeRowById,
  listLiveAttributeIdsForTarget,
} from "../attributes/queries.ts";
import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";
import { createInitializedAffinityDb } from "../lib/test-db.ts";
import { createContact } from "./create_contact.ts";
import { replaceAttributes } from "./replace_attributes.ts";
import { setAttribute } from "./set_attribute.ts";

describe("replaceAttributes", () => {
  it("replaces the full live set", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: c } = createContact(db, { name: "A", kind: "human" });
    setAttribute(db, { kind: "contact", id: c.id }, "a", "1");
    setAttribute(db, { kind: "contact", id: c.id }, "b", "2");
    const r = replaceAttributes(db, { kind: "contact", id: c.id }, [
      { name: "b", value: "3" },
      { name: "c", value: null },
    ]);
    strictEqual(r.removed.length, 2);
    strictEqual(r.created.length, 2);
    strictEqual(
      listLiveAttributeIdsForTarget(db, { kind: "contact", id: c.id }).length,
      2,
    );
    db.close();
  });

  it("clears all attributes when entries empty", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: c } = createContact(db, { name: "A", kind: "human" });
    setAttribute(db, { kind: "contact", id: c.id }, "a", "1");
    const r = replaceAttributes(db, { kind: "contact", id: c.id }, []);
    strictEqual(r.primary.id, 0);
    strictEqual(r.removed.length, 1);
    strictEqual(r.created.length, 0);
    strictEqual(
      listLiveAttributeIdsForTarget(db, { kind: "contact", id: c.id }).length,
      0,
    );
    db.close();
  });

  it("rejects duplicate names in entries", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: c } = createContact(db, { name: "A", kind: "human" });
    throws(
      () =>
        replaceAttributes(db, { kind: "contact", id: c.id }, [
          { name: "dup", value: "1" },
          { name: "dup", value: "2" },
        ]),
      (e: unknown) => e instanceof AffinityValidationError,
    );
    db.close();
  });

  it("rejects duplicate names after trim", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: c } = createContact(db, { name: "A", kind: "human" });
    throws(
      () =>
        replaceAttributes(db, { kind: "contact", id: c.id }, [
          { name: " x ", value: "1" },
          { name: "x", value: "2" },
        ]),
      (e: unknown) => e instanceof AffinityValidationError,
    );
    db.close();
  });

  it("soft-deletes prior rows so ids rotate", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: c } = createContact(db, { name: "A", kind: "human" });
    const { primary: first } = setAttribute(
      db,
      { kind: "contact", id: c.id },
      "only",
      "v",
    );
    replaceAttributes(db, { kind: "contact", id: c.id }, [
      { name: "only", value: "w" },
    ]);
    const oldRow = getAttributeRowById(db, first.id);
    strictEqual(oldRow?.deleted_at !== null, true);
    db.close();
  });
});
