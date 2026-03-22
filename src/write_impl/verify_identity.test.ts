import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createInitializedAffinityDb } from "../lib/test-db.ts";
import { addIdentity } from "./add_identity.ts";
import { createContact } from "./create_contact.ts";
import { verifyIdentity } from "./verify_identity.ts";

describe("verifyIdentity", () => {
  it("sets verified and verifiedAt", async () => {
    const db = await createInitializedAffinityDb();
    const { primary: c } = createContact(db, { name: "A", kind: "human" });
    const { primary: id } = addIdentity(db, c.id, {
      type: "email",
      value: "a@b",
    });
    const r = verifyIdentity(db, id.id, 42);
    strictEqual(r.primary.verified, true);
    strictEqual(r.primary.verifiedAt, 42);
    db.close();
  });
});
