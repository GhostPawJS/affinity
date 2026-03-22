# `dates`

## What It Is

`dates` is the recurring occasion layer for Affinity.

A date anchor is a yearly recurring event tied to a contact — a birthday, an
anniversary, a renewal, a memorial, or a custom yearly occasion. Date anchors
are stored as `events` rows with recurrence metadata (`recurrence_kind`,
`anchor_month`, `anchor_day`), and their next calendar occurrence is
materialized into the `upcoming_occurrences` support table.

## Why It Exists

Birthdays, anniversaries, and other annual occasions are the most universal
social obligations. Missing them damages trust; remembering them near the date
strengthens relationships disproportionately to the effort involved.

Most CRM systems treat dates as static fields on the contact record. This works
for birthdays but falls apart for multi-contact occasions, anniversaries tied
to relationships, and custom recurring events.

Affinity stores date anchors as events — one unified record type with
recurrence metadata. The system materializes the next occurrence into
`upcoming_occurrences` so Radar and the date salience bonus can reason about
temporal proximity without rescanning all anchor events on every query.

`dates` exists so the system has:

- one place for "when are the important recurring occasions?"
- materialized upcoming occurrences for efficient date-aware queries
- a salience bonus that strengthens evidence weight near important dates
- clean integration with the event and evidence pipeline

## How To Use It

1. `write.addDateAnchor(db, { contactId, recurrenceKind: "birthday", anchorMonth: 3, anchorDay: 15, summary: "Alice's birthday", significance: 8 })` —
   create the anchor.
2. `read.listUpcomingDates(db, { horizon: 30 })` — see what's coming up in the
   next 30 days.
3. `write.reviseDateAnchor(db, anchorEventId, { anchorDay: 16 })` — correct a
   date.
4. `write.removeDateAnchor(db, anchorEventId)` — remove an anchor that is no
   longer relevant.

The date salience bonus automatically applies when evidence is recorded near an
anchored date, without any caller action.

## Good Uses

- birthdays
- relationship anniversaries
- work anniversaries
- subscription or contract renewals
- memorials
- custom yearly occasions (annual trip, holiday tradition)

## Do Not Use It For

- one-time events — record those directly via [`events`](EVENTS.md)
- non-yearly recurrence — date anchors are strictly annual
- commitments or promises — those belong in the commitment lifecycle in
  [`events`](EVENTS.md)
- general-purpose scheduling — Affinity is a relationship engine, not a
  calendar

Dates answer "when is the next important recurring occasion?" — not "what
happened on that date?" or "what should I do?"

## Recurrence Kinds

| Kind | Meaning |
|---|---|
| `birthday` | annual birthday |
| `anniversary` | relationship or work anniversary |
| `renewal` | subscription, contract, or service renewal |
| `memorial` | remembrance of a person or event |
| `custom_yearly` | any other annual occasion |

## Calendar Rules

Date anchors are defined by `anchor_month` (1–12) and `anchor_day` (1–31).
The system computes the next occurrence on or after today:

- **Feb 29 in non-leap years**: rolls forward to Feb 28. The anchor retains its
  original `anchor_day = 29` so it fires correctly in leap years.
- **Duplicate conflict**: adding a second anchor of the same `recurrence_kind`
  for the same contact throws `AffinityConflictError` unless explicitly forced.

`upcoming_occurrences` is rebuilt when anchors are added, revised, or removed.
The internal `rebuildUpcomingOccurrences` function is not part of the public
write API — it runs automatically as a side effect of anchor mutations.

## Date Salience Bonus

When an evidence event occurs near an anchored date, the base weight formula
receives a multiplier:

```
date_salience_bonus = 1.0 + min(0.25, significance / 40)
```

The bonus applies when the event's `occurredAt` falls within **7 days before**
or **2 days after** the anchored occurrence date. The `significance` used is the
anchor's significance, not the event's.

This means an interaction recorded the day before a birthday (significance 8)
gets a `1.0 + min(0.25, 8/40) = 1.2` multiplier on its base weight, making it
contribute more to affinity and trust for that relationship.

## Related Tables

- [`contacts`](CONTACTS.md): date anchors are tied to contacts via event
  participants
- [`events`](EVENTS.md): date anchors are stored as event rows with recurrence
  metadata
- [`links`](LINKS.md): the date salience bonus modifies evidence weight on
  link mechanics

Support tables:

- `upcoming_occurrences`: materialized next calendar occurrence for each active
  anchor. Contains `anchor_event_id`, `contact_id`, `occurs_on`, `recurrence_kind`,
  and `significance`.

## Public APIs

### Writes

- `write.addDateAnchor(db, input)`: create an anchored recurring event. Input
  includes target contact, `recurrenceKind`, `anchorMonth`, `anchorDay`,
  `summary`, and `significance`. Materializes the next occurrence automatically.
- `write.reviseDateAnchor(db, anchorEventId, patch)`: update recurrence
  metadata, summary, or significance on an existing anchor. Rebuilds the
  upcoming occurrence.
- `write.removeDateAnchor(db, anchorEventId, removedAt?)`: archive or remove
  an anchor from the active date surface. Cleans up the upcoming occurrence.

### Reads

- `read.listUpcomingDates(db, filters?, options?)`: upcoming occurrences within
  a horizon window. Filterable by `recurrenceKind`, contact kind, and horizon
  (days). Default order: `occurs_on asc`, then `significance desc`.

Internal:

- `rebuildUpcomingOccurrences`: not a public API. Runs as a side effect of
  anchor mutations and on system initialization to keep the materialized table
  current.
