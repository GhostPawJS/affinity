import assert from "node:assert/strict";
import { test } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { addIdentity } from "./add_identity.ts";
import { reviseIdentity } from "./revise_identity.ts";
import {
  identityTypes,
  validateIdentityInput,
} from "./validate_identity_input.ts";

test("identity validation accepts documented types and rejects bad routing values", () => {
  for (const type of identityTypes) {
    const value =
      type === "email"
        ? "a@example.com"
        : type === "phone"
          ? "+49 12345"
          : ["url", "website"].includes(type)
            ? "example.com"
            : "value";
    assert.doesNotThrow(() => validateIdentityInput(type, value));
  }
  assert.doesNotThrow(() =>
    validateIdentityInput("custom:carrier-pigeon_2", "pigeon"),
  );
  for (const [type, value] of [
    ["carrier-pigeon", "x"],
    ["custom:Bad", "x"],
    ["custom:", "x"],
    ["email", "a@b"],
    ["email", "not-email"],
    ["phone", "1234"],
    ["website", "ftp://example.com"],
    ["url", "not a url"],
  ])
    assert.throws(
      () => validateIdentityInput(type as string, value as string),
      { code: "VALIDATION" },
    );
});

test("add and revise validate values without altering existing stored rows", async () => {
  const db = await createInitializedAffinityDb();
  try {
    const contact = createContact(db, { name: "Jana", kind: "human" }).primary;
    assert.throws(
      () => addIdentity(db, contact.id, { type: "email", value: "bad" }),
      { code: "VALIDATION" },
    );
    const identity = addIdentity(db, contact.id, {
      type: "email",
      value: "jana@example.com",
    }).primary;
    assert.throws(() => reviseIdentity(db, identity.id, { value: "bad" }), {
      code: "VALIDATION",
    });
    assert.equal(
      db.prepare("SELECT value FROM identities WHERE id = ?").get(identity.id)
        ?.value,
      "jana@example.com",
    );
    db.prepare(
      "UPDATE identities SET type = 'legacy', value = 'unvalidated' WHERE id = ?",
    ).run(identity.id);
    assert.equal(
      db.prepare("SELECT type FROM identities WHERE id = ?").get(identity.id)
        ?.type,
      "legacy",
    );
    assert.throws(() => reviseIdentity(db, identity.id, { label: "new" }), {
      code: "VALIDATION",
    });
    assert.equal(
      db.prepare("SELECT label FROM identities WHERE id = ?").get(identity.id)
        ?.label,
      null,
    );
  } finally {
    db.close();
  }
});
