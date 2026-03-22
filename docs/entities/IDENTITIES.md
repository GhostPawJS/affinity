# `identities`

## What It Is

`identities` is the recognition and routing layer for contacts.

An identity is one concrete way to recognize or reach a contact: an email
address, a phone number, a social handle, a website, an account ID, or an
alias. A single contact may have many identities, and identities are how the
system resolves "who is this?" from an external signal.

## Why It Exists

Real people and organizations appear under many names across many systems. A
friend is an email address in one context, a phone number in another, and a
Slack handle in a third.

Forcing all of this into the contact row itself produces bloated schemas with
dozens of nullable columns, while generic key-value stores lose the ability to
enforce uniqueness and do efficient lookups. The
[identity resolution](https://en.wikipedia.org/wiki/Identity_resolution)
literature consistently separates the "who" (entity) from the "how I recognize
them" (identifier), and that is exactly what Affinity does.

`identities` exists so the system has:

- one place for "how do I recognize or reach this entity?"
- normalized matching that is case-insensitive and whitespace-insensitive
- uniqueness enforcement: one normalized identity belongs to one live contact
- verification provenance without conflating it with trust
- clean separation from the entity record itself

## How To Use It

Attach identities after creating a contact. Typical flow:

1. `write.createContact(db, { name, kind })` — create the entity.
2. `write.addIdentity(db, contactId, { type: "email", value: "ada@example.com" })` —
   attach the first identity.
3. `write.addIdentity(db, contactId, { type: "phone", value: "+1-555-0100" })` —
   attach additional identities as discovered.
4. `write.verifyIdentity(db, identityId)` — mark as verified when confirmed.
5. `read.searchContacts(db, "ada@example")` — identity values are searchable.

## Good Uses

- email addresses
- phone numbers
- social media handles (@username)
- website URLs
- account IDs from external systems
- aliases or nicknames used for recognition

## Do Not Use It For

- the contact's display name — that belongs on the contact row itself
- relationship data — that belongs in [`links`](LINKS.md)
- operational metadata or preferences — that belongs in
  [`attributes`](ATTRIBUTES.md)
- merge lineage — that belongs in [`merges`](MERGES.md)

Identities answer "how do I recognize or reach them?" — not "who are they?" or
"what do I know about them?"

## Normalization

Every identity has a raw `value` (what the caller provides) and a derived
`normalized_key` (what the system uses for matching). Normalization rules:

- lowercased
- leading and trailing whitespace trimmed
- type-specific rules may apply (e.g., phone numbers stripped of formatting)

Normalized keys enforce a uniqueness constraint: no two live identities on
different contacts may share the same `normalized_key`. Attempting to add a
colliding identity throws `AffinityConflictError`. Collisions across the same
contact are also rejected.

During a merge, the winner contact keeps its existing identities and absorbs
non-colliding identities from the loser. Colliding loser identities are
soft-deleted.

## Verification

`write.verifyIdentity()` marks an identity as verified and records
`verified_at`. This is provenance only — it tells the operator "yes, this email
really belongs to this contact." Verification does not change trust, rank, or
any relationship mechanic. It exists so the profile can show confidence in
routing accuracy.

## Merged Contact Rule

Contacts in the `merged` lifecycle state are read-only. Adding, revising, or
removing identities on a merged contact throws `AffinityStateError`. Historical
identities remain visible for lineage but cannot be changed.

## Related Tables

- [`contacts`](CONTACTS.md): the entity that owns identities
- [`merges`](MERGES.md): merge operations rewire identities to the winner
- [`attributes`](ATTRIBUTES.md): metadata is separate from identity

## Public APIs

### Writes

- `write.addIdentity(db, contactId, input)`: attach one recognition identity.
  Normalization and collision checks run before insert.
- `write.reviseIdentity(db, identityId, patch)`: update type, value, or label.
  Re-runs normalization and collision checks.
- `write.verifyIdentity(db, identityId, verifiedAt?)`: mark as verified.
  Provenance only — does not affect trust.
- `write.removeIdentity(db, identityId, removedAt?)`: soft-delete from the live
  routing surface. Removing the last reachable endpoint is allowed but may
  surface a warning in the contact profile.

### Reads

There is no dedicated identity read surface. Identities are surfaced through:

- `read.getContactProfile(db, contactId)` — includes full `identities` array
- `read.getOwnerProfile(db)` — includes owner's identities
- `read.searchContacts(db, query)` — searches identity values alongside names
- `read.listContacts(db, filters?)` — includes `primaryIdentity` from the first
  live identity
