export { initContactMergesTables } from "./init_contact_merges_tables.ts";
export { initContactsTables } from "./init_contacts_tables.ts";
export {
  mapContactRowToContactCore,
  mapContactRowToContactListItem,
} from "./mappers.ts";
export {
  findOwnerContactId,
  getContactRowById,
  requireOwnerContactId,
} from "./queries.ts";
export {
  buildContactMutationReceipt,
  buildMergeMutationReceipt,
} from "./receipts.ts";
export type { ContactKind, ContactLifecycleState } from "./types.ts";
export { assertValidLifecycleTransition } from "./validators.ts";
