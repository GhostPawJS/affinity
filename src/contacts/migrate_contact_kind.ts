import type { AffinityDb } from "../database.ts";
import { insertJournalEvent } from "../events/persistence.ts";
import { AffinityNotFoundError } from "../lib/errors/affinity_not_found_error.ts";
import { AffinityStateError } from "../lib/errors/affinity_state_error.ts";
import { AffinityValidationError } from "../lib/errors/affinity_validation_error.ts";
import type { ContactMutationReceipt } from "../lib/types/mutation_receipt.ts";
import { resolveNow } from "../resolve_now.ts";
import { withTransaction } from "../with_transaction.ts";
import { mapContactRowToContactListItem } from "./mappers.ts";
import { getContactRowById } from "./queries.ts";
import { buildContactMutationReceipt } from "./receipts.ts";
import { refreshContactRollup } from "./rollups.ts";
import type { ContactKind } from "./types.ts";

/** Reclassify in place, atomically recording an audit event without social mechanics. */
export function migrateContactKind(
  db: AffinityDb,
  contactId: number,
  kind: ContactKind,
): ContactMutationReceipt {
  return withTransaction(db, () => {
    if (
      ![
        "human",
        "agent",
        "group",
        "company",
        "team",
        "pet",
        "service",
        "other",
      ].includes(kind)
    )
      throw new AffinityValidationError(
        "invalid contact kind; expected human, agent, group, company, team, pet, service or other",
      );
    const row = getContactRowById(db, contactId);
    if (!row) throw new AffinityNotFoundError("contact not found");
    if (row.lifecycle_state === "merged")
      throw new AffinityStateError("merged contact is read-only");
    if (row.is_owner && !["human", "agent"].includes(kind))
      throw new AffinityStateError("owner contact kind must be human or agent");
    if (row.kind === kind)
      return buildContactMutationReceipt(mapContactRowToContactListItem(row), {
        updated: [],
      });
    const now = resolveNow();
    db.prepare("UPDATE contacts SET kind=?, updated_at=? WHERE id=?").run(
      kind,
      now,
      contactId,
    );
    const eventId = insertJournalEvent(db, {
      type: "correction",
      occurredAt: now,
      now,
      significance: 0,
      momentKind: null,
      affectsBond: false,
      summary: `Contact kind changed from ${row.kind} to ${kind}`,
      provenance: { action: "migrate_contact_kind", from: row.kind, to: kind },
      participants: [{ contactId, role: "subject" }],
    });
    refreshContactRollup(db, contactId, now);
    const next = getContactRowById(db, contactId);
    if (!next) throw new AffinityNotFoundError("contact not found");
    return buildContactMutationReceipt(mapContactRowToContactListItem(next), {
      updated: [{ kind: "contact", id: contactId }],
      created: [{ kind: "event", id: eventId }],
    });
  });
}
