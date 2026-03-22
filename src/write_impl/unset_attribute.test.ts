import { strictEqual, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { getAttributeRowById } from "../attributes/queries.ts";
import { AffinityNotFoundError } from "../lib/errors/affinity_not_found_error.ts";
import { createInitializedAffinityDb } from "../lib/test-db.ts";
import { createContact } from "./create_contact.ts";
import { setAttribute } from "./set_attribute.ts";
import { unsetAttribute } from "./unset_attribute.ts";

describe("unsetAttribute", () => {
  it("soft-deletes a live attribute", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: c } = createContact(db, { name: "A", kind: "human" });
    const { primary: attr } = setAttribute(
      db,
      { kind: "contact", id: c.id },
      "k",
      "v",
    );
    const r = unsetAttribute(db, { kind: "contact", id: c.id }, "k", 42);
    strictEqual(r.removed[0]?.kind, "attribute");
    strictEqual(r.removed[0]?.id, attr.id);
    const row = getAttributeRowById(db, attr.id);
    strictEqual(row?.deleted_at, 42);
    db.close();
  });

  it("throws when attribute missing", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: c } = createContact(db, { name: "A", kind: "human" });
    throws(
      () => unsetAttribute(db, { kind: "contact", id: c.id }, "nope"),
      (e: unknown) => e instanceof AffinityNotFoundError,
    );
    db.close();
  });
});
