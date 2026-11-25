import assert from "node:assert/strict";
import { test } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { checkContactableToolHandler } from "./check_contactable_tool.ts";

test("returns the contactability decision as a successful tool result", async (t) => {
  const db = await createInitializedAffinityDb();
  t.after(() => db.close());
  const id = createContact(db, {
    name: "Pat",
    kind: "human",
    doNotContact: true,
  }).primary.id;
  const result = checkContactableToolHandler(db, {
    contact: { contactId: id },
  });
  assert.ok(result.ok);
  assert.equal(result.outcome, "success");
  assert.equal(
    result.summary,
    `Contact #${id} Pat is blocked (do not contact) via Pat.`,
  );
  assert.deepEqual(result.entities, [{ kind: "contact", id, title: "Pat" }]);
  assert.equal(result.data.contactable, false);
  assert.equal(
    checkContactableToolHandler(db, { contact: { contactId: 999 } }).outcome,
    "error",
  );
  assert.equal(
    checkContactableToolHandler(db, { contact: { contactId: "x" } as never })
      .outcome,
    "error",
  );
});

test("an identity shared by a legacy and a normalized key requires clarification", async (t) => {
  const db = await createInitializedAffinityDb();
  t.after(() => db.close());
  const locator = { contact: { identity: { type: "handle", value: "@pat" } } };
  const insert = db.prepare(
    "INSERT INTO identities(contact_id,type,value,normalized_key,created_at,updated_at) VALUES (?,'handle','@pat',?,1,1)",
  );
  const pat = createContact(db, { name: "Pat", kind: "human" }).primary.id;
  insert.run(pat, "handle:@pat");
  const found = checkContactableToolHandler(db, locator);
  assert.ok(found.ok);
  assert.equal(found.data.contactId, pat);
  const duplicate = createContact(db, {
    name: "Other Pat",
    kind: "human",
    doNotContact: true,
  }).primary.id;
  insert.run(duplicate, "handle:pat");
  const ambiguous = checkContactableToolHandler(db, locator);
  assert.equal(ambiguous.outcome, "needs_clarification");
  assert.deepEqual(ambiguous.entities.map((e) => e.id).sort(), [
    pat,
    duplicate,
  ]);
});
