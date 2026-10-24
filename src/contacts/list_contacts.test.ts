import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { it } from "node:test";
import { addIdentity } from "../identities/add_identity.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { searchAffinityToolHandler } from "../tools/search_affinity_tool.ts";
import { createContact } from "./create_contact.ts";
import { listContacts } from "./list_contacts.ts";
import { searchContacts } from "./search_contacts.ts";
import { setContactLifecycle } from "./set_contact_lifecycle.ts";

it("combines portfolio and search filters without including owner or dormant contacts", async () => {
  const db = await createInitializedAffinityDb();
  try {
    createContact(db, {
      name: "Person Owner",
      kind: "human",
      bootstrapOwner: true,
    });
    const active = createContact(db, {
      name: "Person Active",
      kind: "human",
    }).primary;
    const dormant = createContact(db, {
      name: "Person Dormant",
      kind: "human",
    }).primary;
    createContact(db, { name: "Person Company", kind: "company" });
    setContactLifecycle(db, dormant.id, "dormant");
    addIdentity(db, active.id, { type: "email", value: "active@example.com" });
    const filters = {
      kind: "human" as const,
      lifecycleState: "active" as const,
      includeOwner: false,
      includeDormant: false,
    };
    deepStrictEqual(
      listContacts(db, filters).map((c) => c.id),
      [active.id],
    );
    deepStrictEqual(
      searchContacts(db, "Person", filters).map((c) => c.id),
      [active.id],
    );
    strictEqual(
      listContacts(db, {}, { includeDormant: false }).some(
        (c) => c.id === dormant.id,
      ),
      false,
    );
    strictEqual(
      searchContacts(db, "Person", {}, { includeDormant: false }).some(
        (c) => c.id === dormant.id,
      ),
      false,
    );
    strictEqual(listContacts(db, { includeDormant: true }).length, 4);
    deepStrictEqual(searchContacts(db, "  "), []);
    strictEqual(searchContacts(db, "Active")[0]?.id, active.id);
    const result = searchAffinityToolHandler(db, {
      query: "Person",
      ...filters,
      limit: 1,
      offset: 0,
    });
    ok(result.ok);
    strictEqual(result.data.count, 1);
    strictEqual(result.data.items[0]?.id, active.id);
  } finally {
    db.close();
  }
});
