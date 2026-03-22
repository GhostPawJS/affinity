# `links`

## What It Is

`links` is the relationship layer between contacts.

A link is one directional edge from one contact to another. Links come in two
families — **structural ties** that declare a named role (employer, parent,
sibling) and **relational social links** that carry live progression mechanics
(rank, affinity, trust, cadence, bond). Both families live in the same table,
distinguished by `kind`.

## Why It Exists

Relationships are not symmetric, not singular, and not static. A person can be
both a coworker (structural) and a friend (relational) to the same contact. The
friendship carries warmth and drift dynamics; the work relationship is a fact
that affects link auto-creation but doesn't progress on its own.

Traditional CRMs flatten all of this into one "relationship" field, or ignore
it entirely. Graph databases model it well structurally but provide no built-in
progression semantics.

Affinity splits the difference: structural links are cold facts, relational
links are living dynamics. Both sit in one table so queries can join across them
without separate schemas. The progression system (rank, affinity, trust,
cadence) exists exclusively on relational links and is never caller-set
directly — it is derived from evidence.

`links` exists so the system has:

- a single place for "how do these two entities relate?"
- a clean separation of declared facts (structural) from lived dynamics
  (relational)
- a progression model that captures relationship depth, warmth, reliability,
  and rhythm
- a state machine that models health: active, dormant, strained, broken,
  archived
- the foundation for Radar, progression readiness, and drift detection

## How To Use It

### Structural ties

Use structural ties to declare factual relationships:

1. `write.setStructuralTie(db, { fromContactId, toContactId, kind: "works_at", role? })` —
   declare a structural relationship.
2. `write.removeStructuralTie(db, tieId)` — remove when no longer true.

Structural ties affect auto-linking: when the owner first interacts with a
contact who has a kinship tie (`married_to`, `partner_of`, `parent_of`,
`child_of`, `sibling_of`), the auto-created relational link gets `kind: "family"`
instead of `"personal"`.

### Relational social links

Relational links are usually auto-created by the evidence pipeline:

1. `write.recordInteraction(db, ...)` — if no relational link exists between
   the owner and a participant, one is created automatically.
2. Subsequent events accumulate affinity and trust, update cadence, and
   eventually trigger rank-ups (breakthroughs).
3. `read.listOwnerSocialLinks(db)` — browse the relationship portfolio.
4. `read.listRadar(db)` — see which relationships need attention.
5. `read.getLinkDetail(db, linkId)` — deep dive into one relationship.

For imports and migrations, `write.seedSocialLink()` allows creating a relational
link with initial values without recording an event.

## Good Uses

- declaring that Alice works at Acme Corp (structural)
- tracking the deepening friendship between the owner and Bob (relational)
- modeling observed third-party relationships (observed relational)
- monitoring drift and recommending re-engagement (Radar)
- measuring trust recovery after conflict (repair mechanics)

## Do Not Use It For

- recording what happened — that belongs in [`events`](EVENTS.md)
- storing metadata about a contact — that belongs in
  [`attributes`](ATTRIBUTES.md)
- describing who a contact is — that belongs in [`contacts`](CONTACTS.md)

Links answer "how do these two relate, and how is it going?" — not "what
happened between them?" or "who are they individually?"

## Structural Kinds (14)

Structural ties are cold facts. They carry no progression columns (`rank`,
`affinity`, `trust`, `cadenceDays`, `bond` are all null).

| Kind | Meaning |
|---|---|
| `works_at` | employment |
| `manages` | management relationship |
| `member_of` | membership in a group or team |
| `married_to` | marriage |
| `partner_of` | domestic or life partnership |
| `parent_of` | parent-child (from = parent) |
| `child_of` | parent-child (from = child) |
| `sibling_of` | sibling relationship |
| `friend_of` | declared friendship (structural assertion) |
| `client_of` | client relationship |
| `vendor_of` | vendor relationship |
| `reports_to` | reporting chain |
| `belongs_to` | organizational membership |
| `other_structural` | explicit catch-all |

Duplicate structural links of the same `(from, to, kind, role)` resolve to
update-or-no-op, not duplicate rows. Structural ties may coexist with relational
links between the same pair.

## Relational Kinds (8)

Relational links carry live progression mechanics.

| Kind | Meaning | Cadence floor | Cadence ceiling |
|---|---|---|---|
| `personal` | personal friendship | 5 days | 120 days |
| `family` | familial bond | 3 days | 60 days |
| `professional` | work or business relationship | 5 days | 90 days |
| `romantic` | romantic relationship | 2 days | 45 days |
| `care` | caregiving relationship | 3 days | 90 days |
| `service` | service or vendor relationship | 30 days | 365 days |
| `observed` | third-party observed relationship | 30 days | 365 days |
| `other_relational` | explicit catch-all | 14 days | 180 days |

Auto-creation rules (when `recordInteraction` creates a link for the first time):

| Contact kind | Existing kinship tie? | Auto-created link kind |
|---|---|---|
| `human` | yes | `family` |
| `human` | no | `personal` |
| `company` / `team` | — | `professional` |
| `service` | — | `service` |
| all others | — | `observed` |

Third-party auto-created links (from `recordObservation`) are always `observed`.

## State Machine

Relational links move through a state that governs visibility, progression
behavior, and maintenance treatment.

| State | Meaning |
|---|---|
| `active` | normal working state |
| `dormant` | low-motion but not damaged |
| `strained` | materially tense or unstable |
| `broken` | actively severed or unusable |
| `archived` | intentionally frozen from normal progression |

Transition table:

| From | To | Trigger |
|---|---|---|
| `active` | `dormant` | manual or sustained low activity |
| `dormant` | `active` | new meaningful direct event |
| `active` / `dormant` | `strained` | conflict, repeated trust loss, or manual override |
| `strained` | `active` | repair sequence and trust recovery |
| `active` / `dormant` / `strained` | `broken` | severe rupture or explicit severing |
| `broken` | `active` | manual reset plus later positive evidence |
| any non-archived | `archived` | manual freeze |
| `archived` | prior non-archived state | manual restore |

Rules:

- structural links have no progression state
- `broken` suppresses automatic rank-up until the link is active again
- archived links are excluded from normal Radar and progression views
- positive evidence on a `broken` link may affect trust or affinity, but no
  auto rank-up occurs until state returns to `active`
- new evidence on an `archived` link requires explicit unarchive or override

## Progression Mechanics

All progression is computed, never caller-set. Evidence flows through the
mechanics pipeline:

```
event -> features -> base_weight -> affinity/trust/cadence -> moments -> rollups -> reads
```

### Rank

An integer floor at 0. Represents relationship depth. Rank increases by exactly
1 when `affinity_mass >= 1.0` and the link state is `active` — this is a
**breakthrough** moment. Automatic progression does not decrease rank.

Observational-only evidence cannot raise rank above 1.

### Affinity

A float in `[0, 1)` after carryover. Measures accumulated warmth and positive
interaction mass. When affinity mass reaches 1.0 during an active link, a
rank-up fires and the excess carries over (capped at 0.35).

### Trust

A float in `[0, 1]`. Measures reliability and safety. Trust grows slowly through
positive evidence and drops sharply through violations. Observational-only
evidence cannot raise trust above 0.35.

Trust repair applies when there is prior negative damage, no new negative events
in 30 days, and at least 2 qualifying repair events in that window:

```
repair_bonus = min(0.12, consecutive_repair_events * 0.02)
```

### Cadence

Expected contact rhythm in days, clamped between kind-specific floor and
ceiling. Updated on each meaningful event as a weighted average of current
cadence and the actual gap:

```
cadence_next = clamp(0.75 * cadence + 0.25 * gap_days, floor, ceiling)
```

### Drift

Measures how overdue a relationship is for contact:

```
drift_ratio = days_since_last / max(cadence_days, 1)
drift_severity = clamp((drift_ratio - 1.0) / 2.0, 0, 1)
drift_priority = drift_severity * (0.45 + 0.35 * trust + 0.20 * normalized_rank)
```

No drift before cadence is exceeded. Strong drift begins near 3x cadence.

### Bond

A freeform narrative label (e.g., "college roommate", "weekly tennis partner").
Set explicitly via `write.reviseBond()`. Bond is interpretation, not evidence —
it does not alter trust, rank, affinity, or cadence.

## Core Formulas

### Base event weight

```
base_weight = type_weight(event_type)
            * (0.35 + 0.65 * intensity)
            * directness
            * preference_match
            * novelty
```

### Affinity gain and loss

```
affinity_gain = base_weight
              * max(valence, 0)
              * (0.55 + 0.45 * intimacyDepth)
              * (0.7 + 0.3 * reciprocitySignal)
              * (1 / (1 + 0.22 * rank))

affinity_loss = base_weight * max(-valence, 0) * 0.35
affinity_mass = clamp(affinity + gain - loss, 0, 1.5)
```

### Trust gain and loss

```
trust_gain = base_weight
           * positive_trust_factor(event_type)
           * (0.6 * warmth_match + 0.4 * reliability_match)
           * (1 - trust)
           * 0.18

trust_loss = base_weight
           * violation_factor(event_type)
           * trust
           * damage_multiplier(event_type, provenance)
```

### Heavy-usage protection

```
mass_penalty = 1 / (1 + excess_weekly_mass / 8)
excess_weekly_mass = max(0, weekly_positive_base_weight - 8)
```

### Date salience bonus

```
date_salience_bonus = 1.0 + min(0.25, significance / 40)
```

Applied only when the event occurs within 7 days before or 2 days after an
anchored date for the relevant contact.

### Radar score

```
radar_score = 0.45 * drift_priority
            + 0.20 * (1 - recency_score)
            + 0.15 * normalized_rank
            + 0.10 * bridge_score
            + 0.10 * (1 - reciprocity_score)
```

### Helper lookups

| Helper | Formula |
|---|---|
| `normalized_rank` | `1 - exp(-rank / 4)` |
| `state_score` | `active 1.0`, `dormant 0.65`, `strained 0.3`, `broken 0.05`, `archived 0.0` |
| `positive_event_ratio` | `positive_meaningful / max(total_meaningful, 1)` over trailing 180 days |
| `reciprocity_score` | `1 - min(1, abs(out - in) / max(out + in, 1))` over trailing 180 days |
| `bridge_score` | node betweenness centrality percentile of the counterparty contact |

## DerivedLinkEffect

Every evidence write returns a `MutationReceipt` with `derivedEffects` — one
`DerivedLinkEffect` per affected link. This is the transparent math contract:

| Field | Type | Meaning |
|---|---|---|
| `linkId` | number | affected link |
| `eventId` | number | triggering event |
| `baseWeight` | number | computed base weight |
| `intensity` | number | `significance / 10` |
| `valence` | number | event type valence |
| `intimacyDepth` | number | event type intimacy depth |
| `reciprocitySignal` | number | directionality signal |
| `directness` | number | participant directness |
| `preferenceMatch` | number | preference alignment multiplier |
| `novelty` | number | same-day similarity discount |
| `affinityDelta` | number | net affinity change |
| `trustDelta` | number | net trust change |
| `rankBefore` | number | rank before this event |
| `rankAfter` | number | rank after this event |
| `stateBefore` | LinkState | state before this event |
| `stateAfter` | LinkState | state after this event |
| `cadenceBefore` | number | cadence before this event |
| `cadenceAfter` | number | cadence after this event |
| `momentKind` | MomentKind \| null | derived moment, if any |

## Related Tables

- [`contacts`](CONTACTS.md): the entities that links connect
- [`events`](EVENTS.md): the evidence that drives progression
- [`attributes`](ATTRIBUTES.md): metadata and preferences on links
- [`dates`](DATES.md): date salience bonus applies to link weights
- [`merges`](MERGES.md): merge operations rewire and deduplicate links
- [`graph`](GRAPH.md): the Affinity Chart is derived from contacts + links

Support tables:

- `link_event_effects`: per-event per-link mechanics snapshot
- `link_rollups`: materialized aggregate metrics (positive event ratio,
  reciprocity score, drift priority, recency, etc.)

## Public APIs

### Writes

- `write.setStructuralTie(db, input)`: create or update a structural tie.
  Duplicate `(from, to, kind, role)` resolves to update-or-no-op.
- `write.removeStructuralTie(db, tieId, removedAt?)`: archive or remove a
  structural tie.
- `write.seedSocialLink(db, input)`: create a relational link with optional
  initial values, without recording an event. For imports and migrations only.
- `write.overrideLinkState(db, linkId, state, options?)`: explicitly change
  link state. Valid for relational links only. Records override provenance.
- `write.reviseBond(db, linkId, bond, options?)`: rewrite the narrative label.
  Does not alter progression mechanics.

### Reads

- `read.getLinkDetail(db, linkId, options?)`: full link record with rollups,
  recent journal effects, and derivation block.
- `read.getLinkTimeline(db, linkId, options?)`: chronological event history for
  one link, including link_event_effects deltas.
- `read.listOwnerSocialLinks(db, filters?, options?)`: owner-origin relational
  links with rollups. Filterable by `kind`, `state`. Default order:
  `normalized_rank desc`, then `trust desc`.
- `read.listObservedLinks(db, filters?, options?)`: relational links where kind
  is `observed`. Default order: `last_meaningful_event_at desc`.
- `read.listProgressionReadiness(db, filters?, options?)`: active relational
  links ranked by how close they are to a breakthrough. Readiness considers
  affinity distance to 1.0, recent positive event density, and trust stability.
- `read.listRadar(db, filters?, options?)`: owner-origin relational links ranked
  by radar score. Each record includes a `recommendedReason` string explaining
  why the link surfaced.
