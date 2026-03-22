import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import * as contacts from "./index.ts";

describe("contacts barrel", () => {
  it("exports schema init and internal helpers", () => {
    strictEqual(typeof contacts.initContactsTables, "function");
    strictEqual(typeof contacts.initContactRollupsTables, "function");
    strictEqual(typeof contacts.getContactRowById, "function");
    strictEqual(typeof contacts.mapContactRowToContactListItem, "function");
    strictEqual(typeof contacts.buildContactMutationReceipt, "function");
  });
});
