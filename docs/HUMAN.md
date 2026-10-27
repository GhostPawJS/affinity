# Affinity — Human Usage

This document is for human operators and developers using Affinity directly in
code.

It assumes you are working with the low-level public library surface exposed at
the package root through `initAffinityTables`, `read`, `write`, `types`, and
`errors`.

If you are wiring Affinity into an agent or LLM harness, read [`LLM.md`](LLM.md)
instead. That document covers the additive `soul`, `tools`, and `skills`
runtime. This document is about humans using the underlying library directly.

Contracts and vocabulary live in [`CONCEPT.md`](../CONCEPT.md). Exact concept
APIs live in the entity manuals under [`entities/`](entities/).

## Which Surface To Use

Human-facing direct usage usually looks like:

```ts
import { errors, initAffinityTables, read, types, write } from "@ghostpaw/affinity";
```

Use this surface when a human is still deciding how the world should be modeled
or what should happen next in application code, scripts, CLIs, backends, or
custom interfaces.

## Package Imports

| Symbol | Role |
|--------|------|
| `initAffinityTables` | One-shot DDL for the canonical schema |
| `read` | Query namespace (`getOwnerProfile`, `listContacts`, `listRadar`, …) |
| `write` | Mutation namespace (`createContact`, `recordInteraction`, `mergeContacts`, …) |
| `types` | Shared TypeScript types and enums |
| `errors` | Optional namespace mirroring root error exports |
| `AffinityDb` | Type alias for `DatabaseSync` |
| `resolveNow`, `withTransaction` | Plumbing hooks for time and transactions |

Root re-exports also surface concrete error classes and `isAffinityError`
without the `errors.` prefix.

## Minimal Session

```ts
import { DatabaseSync } from "node:sqlite";
import { initAffinityTables, read, write } from "@ghostpaw/affinity";

const db = new DatabaseSync(":memory:");
db.exec("PRAGMA foreign_keys = ON");
initAffinityTables(db);

const { primary: owner } = write.createContact(db, {
  name: "Mika",
  kind: "human",
  bootstrapOwner: true,
});

const { primary: ada } = write.createContact(db, {
  name: "Ada",
  kind: "human",
});

write.addIdentity(db, ada.id, {
  type: "email",
  value: "ada@example.com",
});

write.recordInteraction(db, {
  type: "conversation",
  occurredAt: Date.now(),
  summary: "Coffee together",
  significance: 6,
  participants: [
    { contactId: owner.id, role: "actor", directionality: "mutual" },
    { contactId: ada.id, role: "recipient", directionality: "mutual" },
  ],
});

const profile = read.getContactProfile(db, ada.id);
const radar = read.listRadar(db);
```

## The Human Modeling Rule

Affinity works best when a human keeps its boundaries clean.

1. Put entities in Contacts.
2. Put recognition handles in Identities.
3. Put factual affiliation and hierarchy in Ties.
4. Put lived owner-facing relationship dynamics in Social Links.
5. Put what happened in Journal evidence.
6. Put obligations in commitments.
7. Put recurring occasions in anchored dates.
8. Put metadata and preferences in attributes.

If those boundaries blur, the graph becomes harder to trust.

## Core Human Boundaries

### Contact vs Identity

- A Contact answers: who or what exists in my world?
- An Identity answers: how do I recognize or reach them exactly?

Create the contact first, then add the strongest natural keys you know.

### Tie vs Social Link

- A Tie is a structural fact such as `works_at`, `belongs_to`, or `parent_of`.
- A Social Link is a live relationship track with Rank, Trust, cadence, and Bond.

The same pair can have both, and those truths should stay separate.

### Direct Evidence vs Observation

- Direct evidence means the owner actually participated.
- Observation means the operator learned something about third parties.

Observation is still useful, but it is mechanically weaker and should not be
used to fake intimacy.

### Commitment vs Ordinary Journal Entry

- Use ordinary evidence writes for what happened.
- Use commitments when someone is now obligated to do something later.

If missing the item would create disappointment, operational debt, or trust
consequences, model it as a commitment.

### Recurring Date vs Loose Attribute

- Use a recurring date anchor for birthdays, anniversaries, renewals, memorials,
  and custom yearly reminders.
- Use attributes for metadata, preferences, and labels.

Important recurring salience should not be buried in plain attributes.

## Human Operating Loop

The direct-code operating loop is simple:

1. Bootstrap the owner and key Contacts.
2. Attach strong Identities early.
3. Record evidence honestly as it happens.
4. Model structure separately from live relationship quality.
5. Capture obligations and recurring dates explicitly.
6. Review direct reads like portfolios, journals, Radar, upcoming dates, and the
   Affinity Chart.
7. Reconcile duplicates carefully and preserve lineage through merges.

## Example Portfolio

Assume one operator is managing several overlapping realities at once:

- close personal friendships
- active client relationships
- referral sources and collaborators
- recurring important dates
- promises that still need follow-through

Each needs a different representation.

## 1. Bootstrap The Owner And First Contacts

```ts
const { primary: owner } = write.createContact(db, {
  name: "Mika",
  kind: "human",
  bootstrapOwner: true,
});

const { primary: ada } = write.createContact(db, {
  name: "Ada Lovelace",
  kind: "human",
});

write.addIdentity(db, ada.id, {
  type: "email",
  value: "ada@example.com",
});
```

Human habit:

- bootstrap the owner once
- add exact identities early
- prefer strong routing keys over relying on names later

## 2. Record Evidence, Not Vibes

```ts
write.recordInteraction(db, {
  type: "support",
  occurredAt: Date.now(),
  summary: "Helped Ada prepare for a difficult meeting",
  significance: 7,
  participants: [
    { contactId: owner.id, role: "actor", directionality: "mutual" },
    { contactId: ada.id, role: "recipient", directionality: "mutual" },
  ],
});
```

The system can now derive or update the owner-facing Social Link automatically.

What not to do:

- do not invent past journal entries just to justify a higher Rank
- do not manually narrate derived mechanics into the write payload
- do not use Bond text as evidence

## 3. Model Structure Separately

```ts
const { primary: northwind } = write.createContact(db, {
  name: "Northwind Studio",
  kind: "company",
});

write.setStructuralTie(db, {
  fromContactId: ada.id,
  toContactId: northwind.id,
  kind: "works_at",
  role: "designer",
});
```

This records a factual Tie. It does not claim anything about warmth, trust, or
cadence.

## 4. Track Real Obligations

```ts
const { primary: promise } = write.recordCommitment(db, {
  commitmentType: "promise",
  occurredAt: Date.now(),
  dueAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  summary: "Send the revised project recap",
  significance: 6,
  participants: [
    { contactId: owner.id, role: "actor" },
    { contactId: ada.id, role: "recipient" },
  ],
});

write.resolveCommitment(db, promise.id, "kept");
```

Commitments should not disappear inside generic Journal prose.

## 5. Materialize Recurring Dates

```ts
write.addDateAnchor(db, {
  target: { kind: "contact", contactId: ada.id },
  recurrenceKind: "birthday",
  anchorMonth: 12,
  anchorDay: 10,
  summary: "Ada birthday",
  significance: 7,
});
```

Then review it through reads like:

- `read.listUpcomingDates(db, filters?, options?)`
- `read.getContactProfile(db, ada.id)`

## 6. Read From The System, Not Memory

Typical human review reads:

- `read.listContacts(db, filters?, options?)`
- `read.getContactProfile(db, contactId, options?)`
- `read.getContactJournal(db, contactId, options?)`
- `read.listOwnerSocialLinks(db, filters?, options?)`
- `read.listRadar(db, filters?, options?)`
- `read.listOpenCommitments(db, filters?, options?)`
- `read.listUpcomingDates(db, filters?, options?)`
- `read.getAffinityChart(db, options?)`

The habit is:

- write the smallest honest mutation
- then read the resulting state from the system

## 7. Reconcile Carefully

When duplicate contacts appear:

- inspect both profiles
- prefer exact identities over fuzzy names
- merge only when the identity picture is actually clear

```ts
write.mergeContacts(db, {
  winnerContactId: winner.id,
  loserContactId: loser.id,
  reason: "Same person discovered during cleanup",
});
```

For merge detail and lineage, use:

- `read.listDuplicateCandidates(db, filters?, options?)`
- `read.getMergeHistory(db, contactId)`

## Where To Go Next

- Use [`entities/`](entities/) for exact concept APIs.
- Use [`README.md`](README.md) for architecture and mechanics.
- Use [`USECASES.md`](USECASES.md) for long-form lifecycle narratives.
- Use [`LLM.md`](LLM.md) only when you are building a harness around `soul`,
  `tools`, and `skills`.

## CLI Reference

```text
ghostpaw-affinity search <query> [--tag T] [--attribute name[=value]]
ghostpaw-affinity review <view> [--tag T] [--attribute name[=value]]
ghostpaw-affinity show <owner_profile|contact_profile|link> [--contact JSON --link JSON]
ghostpaw-affinity contact create|revise|lifecycle|export|delete|merge
ghostpaw-affinity identity add|revise|verify|remove [flags]
ghostpaw-affinity relationship add|bond|state|tie|untie [flags]
ghostpaw-affinity commitment record|resolve [flags]
ghostpaw-affinity attribute set|unset|replace [flags]
ghostpaw-affinity date add|revise|remove [flags]
ghostpaw-affinity event record [flags]
ghostpaw-affinity duplicate dismiss|undismiss [flags]
ghostpaw-affinity mcp|skill|tools|describe|call|completions|version|help
```

There are 29 domain commands. `review` accepts the existing view names,
including `contacts.list`, `contacts.duplicates` and `dates.upcoming`.
`show` selects an inspection kind; contact and link locators are JSON objects.
Use `help contact` or `contact create --help` for schema-derived help; a
mistyped command suggests the closest one. Nested payloads use JSON or `@path`
to read a file; repeated array flags accept JSON objects
(`--entries '{"name":"a","value":"x"}'`) or one JSON array.

Every time field accepts epoch milliseconds, ISO 8601 with `Z` or an offset,
`YYYY-MM-DD`, `DD.MM.YYYY`, `today`, `tomorrow`, `yesterday` and signed day offsets
such as `+3d` or `-2d`, with the same grammar in CLI, MCP and direct tool calls.
Date-only values preserve their calendar day: timestamps use UTC midnight, or
23:59:59.999Z for `dueAt`. Keywords first resolve against the process local
calendar date; this is the only time-zone-dependent parsing step. `occurredOn`
and `dueOn` retain the input day (the written offset day for ISO inputs; UTC day
for epoch inputs). Existing rows derive these fields from their UTC timestamps.
Review rows for dates include `occursOn`, the anchor occurrence day; the library
keeps its numeric `occursOn` sorting key and adds `occursOnDate`.
The existing `*Iso` fields remain UTC. Overdue commitments compare the local
date to `dueOn`. Future events carry a `future_event` warning and do not count
as contact until their timestamp and day arrive. Commitments and their
resolutions do not reset recency or cadence. Radar marks `drift` after a gap
exceeds 1.5 times the expected cadence and explains its reasons in the snippet.

Global flags: `--db <path>`, `--json`, `--quiet`, `--compact`,
`--help`/`-h`, `--version`/`-V`/`-v`, `--no-color`.
`NO_COLOR` is accepted. In a terminal, commands print a readable summary with
names and dates. With `--json` or piped stdout they print the tool result as
JSON with ISO date siblings and floats rounded to three decimals; `--compact`
removes indentation and empty receipt arrays. `--quiet` suppresses stdout.
Writes list what changed in `data.changes`, and creates warn about likely
duplicates. Kebab-case flags map to schema properties. `--` ends flags.
A positional `-`, or piped stdin when no other arguments are given, reads a
JSON object (`echo '{"name":"Sam","kind":"human"}' | ghostpaw-affinity contact create`).
Explicit flags override stdin fields.
Database selection uses `--db`, `GHOSTPAW_AFFINITY_DB`, then
`~/.ghostpaw/affinity.db`; relative paths resolve against the current
directory, and `--help` shows the resolved path. A new database is reported on
stderr. These commands work offline.

| Exit | Result |
|---|---|
| 0 | Success, including no_op |
| 1 | Other tool error |
| 2 | Usage, schema or invalid input |
| 3 | Clarification needed or not found |
| 4 | Conflict, already resolved or version mismatch |
| 70 | Internal error |

Errors go to stderr. With `--json`, errors also print to stdout.
`--version` names the variant: `affinity 0.5.0 (binary, linux-x64)`,
`(npm)` or `(library)`. Legacy `tools [--json]`, `describe <tool>`,
`call <tool> [JSON|-]` and `<tool_name> --parameter value` remain available.
`completions bash|zsh|fish` prints shell scripts.

```sh
ghostpaw-affinity contact create '{"name":"Sam","kind":"human"}' --db /tmp/affinity-example.db --json
ghostpaw-affinity search Sam --db /tmp/affinity-example.db --json
ghostpaw-affinity review contacts.list --db /tmp/affinity-example.db --json
```

See [installation instructions](../README.md#install).
