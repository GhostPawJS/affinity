import assert from "node:assert/strict";
import { test } from "node:test";
import { setAttribute } from "../attributes/set_attribute.ts";
import { addIdentity } from "../identities/add_identity.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { searchAffinityToolHandler } from "../tools/search_affinity_tool.ts";
import { createContact } from "./create_contact.ts";
import { listContacts } from "./list_contacts.ts";
import { searchContacts } from "./search_contacts.ts";

test("search matches unordered folded tokens across attributes, identities, roles and events", async () => {
  const db = await createInitializedAffinityDb();
  try {
    const jana = createContact(db, {
      name: "Jana Petersen",
      kind: "human",
    }).primary;
    const company = createContact(db, {
      name: "Fischbrötchen",
      kind: "company",
    }).primary;
    addIdentity(db, jana.id, {
      type: "email",
      value: "jana@fischbroetchen.de",
    });
    addIdentity(db, jana.id, { type: "phone", value: "+49 40 1234567" });
    setAttribute(
      db,
      { kind: "contact", id: jana.id },
      "tag:gastro-radar",
      null,
    );
    setAttribute(db, { kind: "contact", id: jana.id }, "city", '"Hamburg"');
    db.prepare(
      "INSERT INTO links (from_contact_id,to_contact_id,kind,role,is_structural,created_at,updated_at) VALUES (?,?,'works_at','MICE lead',1,1,1)",
    ).run(jana.id, company.id);
    db.exec(
      "INSERT INTO events (type,occurred_at,summary,created_at,updated_at) VALUES ('observation',1,'Summer conference',1,1)",
    );
    db.prepare(
      "INSERT INTO event_participants (event_id,contact_id,role) VALUES (1,?,'subject')",
    ).run(jana.id);
    for (const query of [
      "Petersen Jana",
      "gastro Hamburg",
      "MICE Jana",
      "conference Petersen",
      "+4940 1234567",
      "+49 40 1234567",
      "0049401234567",
      "040 1234567",
      "401234567",
    ]) {
      assert.equal(searchContacts(db, query)[0]?.id, jana.id, query);
    }
    assert.deepEqual(searchContacts(db, "023456"), []);
    for (const query of ["Fischbrötchen", "fischbroetchen", "Fischbrotchen"])
      assert.equal(searchContacts(db, query)[0]?.id, company.id);
    assert.deepEqual(searchContacts(db, "gastro")[0]?.matchedOn, [
      "attribute:tag:gastro-radar",
    ]);
    assert.equal(
      listContacts(db, {
        tag: ["gastro-radar"],
        attribute: ["city=hamburg"],
      })[0]?.id,
      jana.id,
    );
    assert.equal(listContacts(db, { attribute: "city=Berlin" }).length, 0);
    const result = searchAffinityToolHandler(db, {
      query: "gastro",
      tag: "gastro-radar",
    });
    assert.ok(result.ok);
    assert.deepEqual(result.data.items[0]?.matchedOn, [
      "attribute:tag:gastro-radar",
    ]);
    db.prepare("UPDATE contacts SET lifecycle_state='lost' WHERE id=?").run(
      jana.id,
    );
    assert.equal(searchContacts(db, "Jana").length, 0);
    assert.equal(searchContacts(db, "Jana", { includeLost: true }).length, 1);
  } finally {
    db.close();
  }
});
