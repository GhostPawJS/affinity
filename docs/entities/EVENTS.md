# `events`

## What It Is

`events` is the canonical evidence and temporal record for Affinity.

An event is something that happened — a conversation, an activity, a gift, a
conflict, a milestone, or any other interaction or observation. Events are the
**only** way that relationship mechanics change. Every affinity gain, trust
shift, rank-up, and moment in the system traces back to an event row.

Events live in two tables: `events` (the core record) and `event_participants`
(the per-contact participation details).

## Why It Exists

Relationship quality cannot be measured without evidence. CRMs typically store
"activities" as flat logs with no downstream effect. Personal relationship tools
often skip evidence entirely and ask users to self-report feelings.

Affinity takes a
[journaling](https://en.wikipedia.org/wiki/Journaling_file_system)-inspired
approach: every meaningful social interaction is recorded as an immutable event,
and the mechanics pipeline derives all relationship state from the accumulated
evidence. This makes the system auditable, explainable, and self-correcting.

`events` exists so the system has:

- one place for "what happened?"
- a uniform input surface for all evidence types
- immutable temporal records that cannot be silently rewritten
- the foundation for derived mechanics (affinity, trust, rank, cadence, moments)
- commitment tracking lifecycle
- date anchor storage for recurring occasions

## How To Use It

Record events through the evidence write API. Each write accepts a shared
`SocialEventInput` shape:

```ts
interface SocialEventInput {
  occurredAt: number;
  summary: string;
  significance: number; // 1..10
  participants: readonly {
    contactId: number;
    role: "actor" | "recipient" | "subject" | "observer" | "mentioned";
    directionality?: "owner_initiated" | "other_initiated" | "mutual" | "observed";
  }[];
  provenance?: unknown;
}
```

Typical flow:

1. `write.recordInteraction(db, { type: "conversation", ...input })` — direct
   evidence between owner and contacts.
2. The system auto-creates relational links when needed, computes mechanics,
   and returns `derivedEffects` in the receipt.
3. `read.getContactJournal(db, contactId)` — chronological event history.
4. `read.getLinkTimeline(db, linkId)` — event history for one relationship.

## Good Uses

- a phone call, text exchange, or video chat (`conversation`)
- a dinner, hike, meeting, or hangout (`activity`)
- giving or receiving a gift or thoughtful gesture (`gift`)
- helping someone or being helped (`support`)
- a notable life event, promotion, or relationship milestone (`milestone`)
- observing something about a third party (`observation`)
- a disagreement, argument, or hurt (`conflict`)
- an apology, clarification, or course correction (`correction`)
- a purchase, payment, or business transaction (`transaction`)
- a stated future commitment (`promise`)
- an explicit shared commitment (`agreement`)

## Do Not Use It For

- relationship status or depth — that belongs in [`links`](LINKS.md)
- contact metadata or preferences — that belongs in
  [`attributes`](ATTRIBUTES.md)
- recurring date definitions — use date anchor writes in [`dates`](DATES.md)
  (they create event rows internally, but the semantic entry point is the date
  API)

Events answer "what happened?" — not "how is the relationship?" or "what do I
know about them?"

## Event Type Enum (11 values)

| Type | Meaning | Valence | Intimacy Depth |
|---|---|---|---|
| `conversation` | exchange of words/messages | 0.35 | 0.35 |
| `activity` | shared time, hangout, meeting | 0.55 | 0.45 |
| `gift` | gift or thoughtful gesture | 0.65 | 0.50 |
| `support` | help, assistance, care, task-sharing | 0.70 | 0.65 |
| `milestone` | notable life or relationship milestone | 0.60 | 0.70 |
| `observation` | observed fact without direct interaction | 0.15 | 0.20 |
| `conflict` | openly negative interaction | -0.85 | 0.80 |
| `correction` | repair, clarification, course correction | 0.20 | 0.55 |
| `transaction` | commercial or operational interaction | 0.10 | 0.15 |
| `promise` | stated future commitment | 0.25 | 0.35 |
| `agreement` | explicit shared commitment | 0.30 | 0.40 |

Each event type maps to fixed `valence` and `intimacyDepth` values used in the
affinity and trust formulas. See [`links`](LINKS.md) for the full formula
reference.

## Participant Roles (5 values)

| Role | Meaning | Directness |
|---|---|---|
| `actor` | active participant, initiator | 1.0 (direct two-way) or 0.8 (owner-initiated one-way) |
| `recipient` | passive receiver of the action | 0.7 (passive incoming) |
| `subject` | the event is about them | context-dependent |
| `observer` | witnessed but not directly involved | 0.45 (observed third-party) |
| `mentioned` | referenced but not present | 0.25 (mention-only) |

## Directionality (4 values)

Persisted on `event_participants` to capture who initiated the interaction.
Used in the reciprocity signal formula.

| Value | Reciprocity Signal |
|---|---|
| `mutual` | 1.0 |
| `other_initiated` | 0.75 |
| `owner_initiated` | 0.65 |
| `observed` | 0.35 |

When directionality is not provided, the default reciprocity signal is 0.5.

## Evidence Write Routing

Each evidence write accepts a specific subset of event types:

| Write function | Allowed types |
|---|---|
| `recordInteraction` | `conversation`, `activity`, `gift`, `support`, `conflict`, `correction` |
| `recordObservation` | `observation` |
| `recordMilestone` | `milestone` |
| `recordTransaction` | `transaction` |
| `recordCommitment` | `promise`, `agreement` |

Caller-forbidden fields for all evidence writes: `affinity`, `trust`, `rank`,
`state`, `momentKind`, direct `link_event_effects`. These are system-derived.

## Event-to-Link Resolution

The mechanics pipeline determines which links are affected by an event based on
the participant shape:

| Participant shape | Affected links |
|---|---|
| owner + one non-owner | owner -> contact relational link |
| owner + multiple non-owners | owner -> each non-owner relational link |
| no owner, two non-owners | one third-party observational link (if `observation`) |
| no owner, 3+ non-owners | only explicitly referenced existing links |
| one contact only | no relational effect (unless owner self-anchor or maintenance case) |

## Moment Derivation

The system derives `moment_kind` after computing mechanics. Callers never set
it directly.

Derivation order (first match wins):

1. rank-up -> `breakthrough`
2. state enters `strained` or `broken` -> `rupture`
3. state returns from `strained`/`broken` to `active` -> `reconciliation`
4. milestone event with `significance >= 7` -> `milestone`
5. `significance >= 8` and (`abs(affinity_delta) >= 0.45` or
   `abs(trust_delta) >= 0.2`) -> `turning_point`
6. else `null`

| Moment Kind | Meaning |
|---|---|
| `breakthrough` | rank-up occurred |
| `rupture` | relationship entered strained or broken state |
| `reconciliation` | relationship returned to active from damaged state |
| `milestone` | significant life or relationship milestone |
| `turning_point` | high-impact event without state change |

## Commitment Lifecycle

Commitments are `promise` or `agreement` events with an additional resolution
lifecycle. They are recorded via `write.recordCommitment()` and track open
obligations.

```
promise/agreement event  ->  open commitment  ->  kept / cancelled / broken
```

Resolution states:

| State | Meaning |
|---|---|
| `open` | unresolved, still pending |
| `kept` | fulfilled as promised |
| `cancelled` | withdrawn without blame |
| `broken` | failed to fulfill |

`write.resolveCommitment(db, commitmentEventId, resolution, options?)` closes
the commitment. Broken commitments affect trust through `violation_factor` and
`damage_multiplier`. Resolution may optionally record a linked resolving event.

Open commitments are not a public table — they are an internal support model
backed by unresolved event rows. `read.listOpenCommitments()` surfaces them as
`CommitmentRecord` objects.

## Sparse Usage and Cold Start

- mentions and observations may create contacts and weak observational links
- mentions alone cannot raise rank above 1
- non-direct evidence (observation, mention) cannot raise trust above 0.35
- the system does not require a minimum event count to be useful

## Related Tables

- [`contacts`](CONTACTS.md): events reference contacts through participants
- [`links`](LINKS.md): events drive link progression mechanics
- [`attributes`](ATTRIBUTES.md): `pref.*` attributes affect preference match
  in weight formulas
- [`dates`](DATES.md): date anchors are stored as event rows with recurrence
  metadata
- [`merges`](MERGES.md): merge operations rewire event participant references

Support tables:

- `link_event_effects`: per-event per-link mechanics snapshot (the transparent
  math record)
- `open_commitments`: unresolved promise/agreement tracking
- `contact_rollups`: aggregate contact-level metrics

## Public APIs

### Writes

- `write.recordInteraction(db, input)`: direct social evidence between owner
  and contacts. Auto-creates relational links when needed.
- `write.recordObservation(db, input)`: third-party or low-directness evidence.
  May create `observed` links.
- `write.recordMilestone(db, input)`: notable life or relationship milestone.
  High significance may derive `moment_kind = milestone`.
- `write.recordTransaction(db, input)`: commercial or operational interaction.
  Weakly affects affinity, may change trust and cadence.
- `write.recordCommitment(db, input)`: records a promise or agreement and opens
  unresolved commitment state.
- `write.resolveCommitment(db, commitmentEventId, resolution, options?)`:
  closes an open commitment as kept, cancelled, or broken.

### Reads

- `read.getContactJournal(db, contactId, options?)`: chronological event history
  for one contact. Filterable by `since`/`until` and event type. Default order:
  `occurred_at desc`.
- `read.getLinkTimeline(db, linkId, options?)`: event history for one
  relationship, including link_event_effects deltas. Default order:
  `occurred_at desc`, then `event_id desc`.
- `read.listMoments(db, filters?, options?)`: events where `moment_kind` is not
  null. Filterable by moment kind, contact, link, `since`/`until`. Default
  order: `occurred_at desc`, then impact desc.
- `read.listOpenCommitments(db, filters?, options?)`: unresolved commitments.
  Filterable by due horizon, commitment type, contact or link scope. Default
  order: `due_at asc`, else oldest first.
