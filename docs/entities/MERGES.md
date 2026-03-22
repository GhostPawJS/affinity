# `merges`

## What It Is

`merges` is the contact reconciliation and lineage layer for Affinity.

A merge absorbs one contact (the loser) into another (the winner), rewiring all
downstream references — identities, event participants, links, attributes, and
date anchors — in a single atomic transaction. The `contact_merges` support
table records every merge for lineage tracing.

## Why It Exists

Duplicate contacts are inevitable. The same person appears under different names,
different email addresses, or from different import sources. Silently deleting
one copy loses history; keeping both produces fragmented relationship data with
two half-strength links instead of one accurate one.

The merge operation solves this by treating reconciliation as a first-class
atomic operation with deterministic rewiring rules and a permanent lineage trail.
After a merge, every piece of evidence and metadata that belonged to the loser
now belongs to the winner, and the loser enters a terminal `merged` state that
prevents further modification.

`merges` exists so the system has:

- one place for "these two contacts are actually the same entity"
- deterministic, transactional rewiring of all downstream references
- permanent lineage so the merge can be audited after the fact
- clean handling of identity collisions, link deduplication, and self-loops

## How To Use It

1. `read.listDuplicateCandidates(db)` — find contacts that may be duplicates
   based on identity overlap and name similarity.
2. `write.mergeContacts(db, { winnerContactId, loserContactId, reason? })` —
   execute the merge.
3. `read.getMergeHistory(db, contactId)` — inspect the lineage trail for a
   contact.

The merge is atomic: either everything succeeds or nothing changes.

## Good Uses

- reconciling two contacts that represent the same person
- cleaning up duplicate imports
- unifying contacts discovered through identity matching
- consolidating a personal and professional record for the same human

## Do Not Use It For

- archiving or retiring a contact — use `write.setContactLifecycle(db, id, "lost")`
- splitting a contact into two — merges are one-way and irreversible
- linking two distinct people — that belongs in [`links`](LINKS.md)

Merges answer "these two records are one entity" — not "these two entities are
related" or "I want to hide this contact."

## Rewiring Rules

When contact B (loser) is merged into contact A (winner), the following
rewiring happens in a single transaction:

### Identities

All of the loser's identities are transferred to the winner. If the winner
already has an identity with the same `normalized_key`, the loser's colliding
identity is soft-deleted. Non-colliding identities are reassigned.

### Event participants

All `event_participants` rows referencing the loser's `contact_id` are updated
to reference the winner's `contact_id`. Historical events are preserved —
evidence is never deleted.

### Links

Links are rewired from loser to winner. This produces three special cases:

- **Self-loops**: if the loser had a link to the winner (or vice versa), the
  rewired link would point from the winner to itself. Self-loops are removed.
- **Duplicate links**: if both the winner and loser had links of the same kind
  to a third contact, the system deduplicates by keeping the link with the
  higher rank (or the winner's link in case of a tie) and removing the
  duplicate.
- **Owner transfer**: if the loser is the owner, the owner flag transfers to
  the winner. The system enforces the invariant that exactly one contact is the
  owner.

### Attributes

All contact-targeted attributes from the loser are transferred to the winner.
If the winner already has an attribute with the same name, the winner's value
is kept and the loser's is discarded.

### Date anchors

`anchor_contact_id` references are updated from loser to winner. Upcoming
occurrences are rebuilt to reflect the new ownership.

## Terminal Merged State

After the merge, the loser contact enters `lifecycle_state = "merged"`. This
is a terminal state:

- the loser cannot be edited (`reviseContact`, `setContactLifecycle` throw
  `AffinityStateError`)
- the loser cannot participate in new events
- the loser cannot be merged again (as either winner or loser)
- the loser is excluded from default list views and search results
- historical data referencing the loser is preserved for lineage

The `merged` state is only reachable through `write.mergeContacts()`. Callers
cannot set it directly via `write.setContactLifecycle()`.

## Merge Lineage

The `contact_merges` support table records:

| Field | Meaning |
|---|---|
| `winner_contact_id` | the surviving contact |
| `loser_contact_id` | the absorbed contact |
| `merged_at` | timestamp of the merge |
| `reason` | optional caller-provided reason |
| `manual` | whether the merge was initiated manually |

Lineage is permanent and append-only. Multiple merges can chain (A absorbs B,
then C absorbs A), and the full history is traversable through
`read.getMergeHistory()`.

## Guard Rails

- **Merge into self**: throws `AffinityMergeError`.
- **Merged contact as winner**: throws `AffinityMergeError` — a contact in
  the `merged` state cannot absorb others.
- **Owner preservation**: if one party is the owner, exactly one owner remains
  after the merge. If neither is the owner, no owner change occurs.
- **Concurrent safety**: the merge runs inside `withTransaction` — all rewiring
  is atomic.

## Related Tables

- [`contacts`](CONTACTS.md): the entities being merged
- [`identities`](IDENTITIES.md): identities are rewired to the winner
- [`events`](EVENTS.md): event participants are rewired to the winner
- [`links`](LINKS.md): links are rewired, deduplicated, and self-loops removed
- [`attributes`](ATTRIBUTES.md): contact-targeted attributes are transferred
- [`dates`](DATES.md): anchor contact references are updated

Support tables:

- `contact_merges`: the lineage record for every merge operation

## Public APIs

### Writes

- `write.mergeContacts(db, input)`: merge one loser contact into one winner
  contact. Rewires all downstream references atomically. Returns a
  `MergeReceipt`.

### Reads

- `read.getMergeHistory(db, contactId)`: returns the merge lineage for a
  contact — all merges where the contact was either the winner or the loser.
  Returns `MergeHistoryRecord[]`.
