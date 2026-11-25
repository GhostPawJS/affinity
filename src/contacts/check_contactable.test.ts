import assert from "node:assert/strict";
import { test } from "node:test";
import { AffinityNotFoundError } from "../lib/errors/affinity_not_found_error.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { removeStructuralTie } from "../links/remove_structural_tie.ts";
import { setStructuralTie } from "../links/set_structural_tie.ts";
import { mergeContacts } from "../merges/merge_contacts.ts";
import { checkContactable } from "./check_contactable.ts";
import { createContact } from "./create_contact.ts";
import { deleteContact } from "./delete_contact.ts";

test("reports each flagged contact once along active outgoing organisation ties", async (t) => {
  const db = await createInitializedAffinityDb();
  t.after(() => db.close());
  const person = createContact(db, { name: "Pat", kind: "human" }).primary.id;
  const team = createContact(db, {
    name: "Team",
    kind: "team",
    doNotContact: true,
  }).primary.id;
  const company = createContact(db, {
    name: "Company",
    kind: "company",
    doNotContact: true,
  }).primary.id;
  const tie = (
    fromContactId: number,
    toContactId: number,
    kind: "works_at" | "member_of" | "client_of",
  ) => setStructuralTie(db, { fromContactId, toContactId, kind }).primary.id;
  tie(team, person, "member_of");
  tie(person, company, "client_of");
  assert.equal(checkContactable(db, person).contactable, true);
  const employment = tie(person, team, "works_at");
  tie(team, company, "member_of");
  assert.deepEqual(checkContactable(db, person), {
    contactId: person,
    name: "Pat",
    contactable: false,
    blockedBy: [
      { contactId: team, name: "Team", via: "works_at", path: [person, team] },
      {
        contactId: company,
        name: "Company",
        via: "member_of",
        path: [person, team, company],
      },
    ],
  });
  assert.deepEqual(checkContactable(db, team).blockedBy[0], {
    contactId: team,
    name: "Team",
    via: "self",
    path: [team],
  });
  removeStructuralTie(db, employment);
  assert.equal(checkContactable(db, person).contactable, true);
  tie(person, company, "member_of");
  assert.equal(checkContactable(db, person).contactable, false);
  deleteContact(db, company, { confirm: true });
  assert.equal(checkContactable(db, person).contactable, true);
});
test("evaluates merged ids as their survivor and throws for unknown ids", async (t) => {
  const db = await createInitializedAffinityDb();
  t.after(() => db.close());
  const winner = createContact(db, {
    name: "Winner",
    kind: "human",
    doNotContact: true,
  }).primary.id;
  const loser = createContact(db, { name: "Duplicate", kind: "human" }).primary
    .id;
  mergeContacts(db, {
    winnerContactId: winner,
    loserContactId: loser,
    reasonSummary: "duplicate",
  });
  assert.deepEqual(checkContactable(db, loser), checkContactable(db, winner));
  assert.throws(() => checkContactable(db, 999), AffinityNotFoundError);
});
