# `contacts`

## What It Is

`contacts` is the canonical entity registry for Affinity.

A contact is any tracked entity the operator cares about: a person, a company,
a team, a household, a pet, a service, or something else entirely. Contacts are
the anchor for everything else in the system — identities, links, events,
attributes, and maintenance all hang off contact rows.

## Why It Exists

Most CRMs force a distinction between "people" and "companies" at the schema
level, producing parallel tables with overlapping semantics and special-case
join logic. This is the
[object-relational impedance](https://en.wikipedia.org/wiki/Object%E2%80%93relational_impedance_mismatch)
problem applied to social data.

Affinity treats every tracked entity as one `contacts` row with a `kind`
discriminator. This keeps the schema flat, the queries uniform, and the
relationship model agnostic about whether a link connects two humans, a human
and a company, or a company and a service.

The `contacts` table exists so the system has:

- one place for "who or what exists"
- a single owner identity for the operator themselves
- a lifecycle model that covers normal use, dormancy, merge, and retirement
- a stable anchor for identities, links, evidence, and metadata

## How To Use It

Create a contact when the operator wants to say:

- "this entity exists in my world"
- "I want to track interactions with them"
- "they should appear in my portfolio"

Typical flow:

1. `write.createContact(db, { name, kind })` — optionally with
   `bootstrapOwner: true` on the very first contact to mark the operator
   themselves.
2. `write.addIdentity(db, contactId, ...)` — attach emails, phones, handles.
3. `write.recordInteraction(db, ...)` — evidence auto-creates links when needed.
4. `read.listContacts(db, filters?)` — browse the portfolio.
5. `read.getContactProfile(db, contactId)` — full detail with identities,
   attributes, top links, and active dates.

## Good Uses

- a friend, family member, or acquaintance
- a client, prospect, or vendor
- a company or team the operator works with
- a service account, bot, or API entity
- a pet the operator cares about
- a group or household treated as one social unit

## Do Not Use It For

- a relationship between two entities — that belongs in [`links`](LINKS.md)
- an interaction or event — that belongs in [`events`](EVENTS.md)
- a recognition handle like an email address — that belongs in
  [`identities`](IDENTITIES.md)
- a custom field or preference — that belongs in [`attributes`](ATTRIBUTES.md)

Contacts answer "who or what exists?" — not "how do they relate?", "what
happened?", or "how do I reach them?"

## Kind Enum

Every contact has exactly one `kind` that describes the type of entity.

| Value | Meaning |
|---|---|
| `human` | person |
| `group` | informal group, household, circle |
| `company` | company or organization |
| `team` | formal team or sub-organization |
| `pet` | cared-for animal or being |
| `service` | service, vendor, API, bot, account-like entity |
| `other` | explicit catch-all |

Kind affects auto-linking rules. When the operator interacts with a `company` or
`team` for the first time, the system creates a `professional` link. For
`service` contacts, a `service` link. For `human` contacts, a `personal` link
(unless a structural kinship tie already exists, in which case `family`).

## Lifecycle State Machine

Contacts move through a lifecycle that governs visibility, mutability, and
relationship behavior.

| Value | Meaning |
|---|---|
| `active` | normal live record |
| `dormant` | retained but low-current-use record |
| `merged` | absorbed into another contact — terminal, read-only |
| `lost` | invalidated, unreachable, or intentionally retired |

Allowed transitions:

| From | To | Trigger |
|---|---|---|
| `active` | `dormant` | manual or inactivity policy |
| `dormant` | `active` | manual or new evidence |
| `active` / `dormant` | `merged` | `write.mergeContacts()` only |
| `active` / `dormant` | `lost` | manual invalidation |
| `lost` | `active` | manual recovery |

`merged` is terminal. A merged contact cannot be edited, cannot participate in
new events, and cannot be merged again. The system reaches `merged` only through
the deterministic merge operation — callers cannot set it directly via
`write.setContactLifecycle()`.

## Owner Semantics

Exactly one contact may have `is_owner = true`. This is the operator
themselves — the first-person perspective that anchors the entire relationship
graph. Owner semantics enforce:

- owner bootstrap happens exactly once via `write.createContact()` with
  `bootstrapOwner: true`
- a second bootstrap attempt throws `AffinityConflictError`
- the owner participates in direct interactions (`recordInteraction`,
  `recordMilestone`, `recordTransaction`)
- owner-to-contact links are the primary relational surface
- `read.listOwnerSocialLinks()` and `read.listRadar()` filter by owner origin

## Related Tables

- [`identities`](IDENTITIES.md): recognition and routing handles
- [`links`](LINKS.md): structural ties and relational social links
- [`events`](EVENTS.md): evidence and temporal record
- [`attributes`](ATTRIBUTES.md): metadata and preferences
- [`merges`](MERGES.md): merge lineage when contacts are reconciled
- [`dates`](DATES.md): anchored recurring dates (birthdays, anniversaries)

## Public APIs

### Writes

- `write.createContact(db, input)`: create a new contact. Optional
  `bootstrapOwner` for the operator's own record.
- `write.reviseContact(db, contactId, patch)`: update name or intrinsic profile
  fields. Merged contacts throw `AffinityStateError`.
- `write.setContactLifecycle(db, contactId, state, options?)`: change lifecycle
  state per the transition matrix above.

### Reads

- `read.getOwnerProfile(db)`: load the owner's full profile. Returns `null` if
  no owner row exists.
- `read.getContactProfile(db, contactId, options?)`: full profile with
  identities, attributes, top links, active dates, warnings, and rollups.
- `read.listContacts(db, filters?, options?)`: portfolio listing. Merged
  contacts excluded by default. Filterable by `kind` and `lifecycleState`.
  Default order: `name asc`.
- `read.searchContacts(db, query, options?)`: search by name and identity value.
  Relevance-sorted. Merged contacts excluded.
- `read.listDuplicateCandidates(db, filters?, options?)`: fuzzy and exact
  identity-based duplicate detection. Merged contacts excluded from candidate
  pairs.
