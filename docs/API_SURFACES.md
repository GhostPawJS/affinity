# Affinity API surfaces — exhaustive checklist

Implementation order: **one surface per iteration**, each with colocated tests and explicit edge-case coverage. After each surface, `npm run check` and `npm run test` must pass.

Legend: `[ ]` pending · `[x]` done

---

## 0. Foundation (already shipped)

- `[x]` `AffinityDb` + `initAffinityTables` — six canonical tables
- `[x]` Entity DDL inits + domain type unions under `types` namespace

---

## 1. Error model (`errors`) — **done**

Implementation: `src/lib/errors/*.ts` (one class or helper per file), public barrel `src/errors.ts`, re-exported from `src/index.ts`.

- `[x]` `AffinityError` (base) + `AffinityErrorCode` + six subclasses + `isAffinityError` guard
- `[x]` `AffinityNotFoundError`
- `[x]` `AffinityConflictError`
- `[x]` `AffinityInvariantError`
- `[x]` `AffinityValidationError`
- `[x]` `AffinityMergeError`
- `[x]` `AffinityStateError`

---

## 2. Shared types (`types` namespace) — **done**

Implementation: `src/lib/types/*.ts` (one primary type per file), aggregated in [`src/types.ts`](../src/types.ts), exposed as `import { types } from "@ghostpaw/affinity"` and `import type { … } from "@ghostpaw/affinity"`.

- `[x]` `EntityRef`, `MutationReceipt<T>`, receipt aliases, `DerivedLinkEffect`, `MergePrimary`
- `[x]` Read records: `ContactListItem`, `ContactProfileRecord`, `IdentityRecord`, `LinkListItem`, `LinkDetailRecord`, `EventRecord`, `MomentRecord`, `RadarRecord`, `UpcomingDateRecord` (+ `UpcomingDateTargetRef`), `DuplicateCandidateRecord`, `CommitmentRecord`, `MergeHistoryRecord`, `AffinityChartRecord` (+ node/edge types)
- `[x]` Opaque placeholders for rollups/derivation until mechanics land: `OpaqueRollup`, `OpaqueDerivation`
- `[x]` Write-related inputs: `SocialEventInput`, `SocialEventParticipantInput`, `MergeContactsInput`, `AttributeTarget`, `AttributeRecord`, `AttributeEntry`
- `[x]` Read filters/options: `ListContactsFilters`, `ContactProfileReadOptions`, `ContactJournalReadOptions`, `LinkListReadFilters` (compose with `AffinityListReadOptions` where noted)
- `[x]` Read list options: `AffinityListReadOptions`, `AFFINITY_DEFAULT_LIST_LIMIT`, `AFFINITY_MAX_LIST_LIMIT`, `resolveAffinityListLimit` (throws `AffinityValidationError` on invalid limits)

Per-operation write inputs (`CreateContactInput`, identity patches, link seeds, …) ship with the corresponding **write** surface iteration.

---

## 3. Plumbing — **done**

- `[x]` [`resolve_now.ts`](../src/resolve_now.ts) — injectable clock (`now`) for tests
- `[x]` [`with_transaction.ts`](../src/with_transaction.ts) — `BEGIN IMMEDIATE` / `COMMIT` / `ROLLBACK`, nested `SAVEPOINT affinity_<depth>` with release/rollback (same semantics as [questlog](https://github.com/GhostPawJS/questlog))

---

## 4. Write API (`write` namespace) — 25 operations

Public barrel: [`src/write.ts`](../src/write.ts) (`export * as write` from [`src/index.ts`](../src/index.ts)). Implementations live under [`src/write_impl/`](../src/write_impl/).

**Contacts**

- `[x]` `createContact` — `withTransaction`, `ContactMutationReceipt`, owner bootstrap conflicts with `AffinityConflictError`
- `[x]` `reviseContact` — merged read-only → `AffinityStateError`
- `[x]` `setContactLifecycle` — CONCEPT transition matrix + `merged` / direct-`merged` guards

**Identities**

- `[x]` `addIdentity` — `normalized_key` uniqueness (live rows); merged contact → `AffinityStateError`
- `[x]` `reviseIdentity` — empty patch no-op; type/value re-normalize + collision check
- `[x]` `verifyIdentity` — sets `verified` + `verified_at` (injectable via `resolveNow`)
- `[x]` `removeIdentity` — soft-delete (`removed_at`); receipt lists removed identity ref

**Structural ties**

- `[x]` `setStructuralTie` — upsert on `(from, to, kind, role)`; merged endpoint → `AffinityStateError`
- `[x]` `removeStructuralTie` — soft-delete; relational row → `AffinityInvariantError`

**Relational links**

- `[x]` `seedSocialLink` — defaults `rank`/`affinity`/`trust`/`state`; `link_rollups` deferred until table exists
- `[x]` `overrideLinkState` — relational only; merged endpoint → `AffinityStateError`; `link_rollups` deferred
- `[x]` `reviseBond` — relational only; merged endpoint → `AffinityStateError`

**Journal / evidence**

- `[x]` `recordInteraction` — owner must participate; auto-`seedSocialLink` personal when no relational edge to each non-owner; `link_event_effects`/rollups deferred
- `[x]` `recordObservation` — two non-owners only: may auto-seed `observed` link; otherwise event + participants only
- `[x]` `recordMilestone` — sets `moment_kind = milestone`; owner must participate
- `[x]` `recordTransaction` — owner must participate
- `[x]` `recordCommitment` — `promise`/`agreement` + `open_commitments` row
- `[x]` `resolveCommitment` — `kept`/`cancelled`/`broken`; rollups deferred

**Anchors**

- `[x]` `addDateAnchor` — `events.type = date_anchor` + target columns; duplicate `(recurrence, month, day, target)` → `AffinityConflictError` unless `force`
- `[x]` `reviseDateAnchor` — patch recurrence/summary/significance; same duplicate rule; recomputes `upcoming_occurrences`
- `[x]` `removeDateAnchor` — soft-delete (`events.deleted_at`)
- `[ ]` `rebuildUpcomingOccurrences` — internal repair helper, intentionally not exported from the public `write` namespace

**Attributes**

- `[x]` `setAttribute` — upsert by target + name; nullable `value` (tag/presence); partial unique `(contact|link, name)` when live
- `[x]` `unsetAttribute` — soft-delete; `AffinityNotFoundError` when missing
- `[x]` `replaceAttributes` — soft-delete all live for target, insert new set; duplicate names in `entries` → `AffinityValidationError`; empty set clears (`primary.id === 0`)

**Merge**

- `[x]` `mergeContacts` — `contact_merges` row; rewire identities (winner wins key collisions), attributes, `event_participants`, `events.anchor_contact_id`, `links`; drop self-loops on winner; dedupe live links by `(from, to, kind, structural, role)`; owner → winner when loser was owner; rollups deferred

*(Support tables: FTS, `link_event_effects`, `link_rollups`, `contact_rollups`, `open_commitments`, `upcoming_occurrences`, `contact_merges`, identity index — introduced as required by each write/read slice.)*

---

## 5. Read API (`read` namespace) — 17 operations

**Portfolio**

- `[x]` `getOwnerProfile` — owner contact profile; `null` if no owner row
- `[x]` `getContactProfile` — identities + contact attributes + top relational links; `activeDates` from `upcoming_occurrences` (contact + link-anchored involving this contact); `warnings` empty; `rollups` null
- `[x]` `listContacts` — merged contacts excluded; optional `ListContactsFilters`; `primaryIdentity` from first live identity
- `[x]` `searchContacts` — `LIKE` on name and identity value; relevance sort; merged excluded

**Journal**

- `[x]` `getContactJournal` — events where contact participates; `loadEventRecord` per row; optional `eventTypes` + since/until via `ContactJournalReadOptions`
- `[x]` `getLinkTimeline` — events where **both** link endpoints participate (until `link_event_effects` exists)
- `[x]` `listMoments` — events with `moment_kind`; infers `linkId` from first relational link between participant pairs; optional `contactId` / `linkId` filters

**Links**

- `[x]` `getLinkDetail` — counterparty = non-owner endpoint when owner exists, else `to_contact_id`; recent events + moments from timeline slice
- `[x]` `listOwnerSocialLinks` — `from_contact_id = owner`; optional kind/state; `includeArchived`/`includeDormant` on link `state`
- `[x]` `listObservedLinks` — `kind = observed`; order by `updated_at`
- `[x]` `listProgressionReadiness` — owner-origin `state = active`; readiness = CONCEPT formula with `normalized_rank = min(1, rank/10)`

**Maintenance**

- `[x]` `listRadar` — owner-origin links; CONCEPT radar formula with fixed `recencyScore = 0.5` until rollups/recency materialize
- `[x]` `listUpcomingDates` — `upcoming_occurrences` joined to `events`; optional `ListUpcomingDatesFilters` + `AffinityListReadOptions` (since/until, horizonDays); `occurs_on asc`, `significance desc`
- `[x]` `listOpenCommitments` — unresolved `open_commitments` joined to events; `resolutionState` for open rows is `open`

**Graph**

- `[x]` `getAffinityChart` — active/dormant contacts as nodes; non-archived relational edges; weight = `trust * (0.6 + 0.4 * normalized_rank)` with same rank normalization

**Dedup / lineage**

- `[x]` `listDuplicateCandidates` — returns `[]` until fuzzy dedupe + identity index surfaces exist
- `[x]` `getMergeHistory` — `contact_merges` where winner or loser matches; `merged_at desc`

---

## 6. Tool API (`tools` namespace) — 11 tools

Public barrel: `src/tools/index.ts` (`export * as tools` from `src/index.ts`).
This is an additive LLM-facing facade layered on top of `read` and `write`.

- `[x]` `search_affinity`
- `[x]` `review_affinity`
- `[x]` `inspect_affinity_item`
- `[x]` `manage_contact`
- `[x]` `merge_contacts`
- `[x]` `manage_identity`
- `[x]` `manage_relationship`
- `[x]` `record_event`
- `[x]` `manage_commitment`
- `[x]` `manage_date_anchor`
- `[x]` `manage_attribute`

Canonical reconciliation is tracked in `src/tools/tool_mapping.ts`.

The tool layer keeps these invariants:

- fewer than 12 tools total
- strict schemas with no generic catchall payloads
- explicit action and view discriminators
- consistent outcomes: `success`, `no_op`, `needs_clarification`, `error`
- every direct public `read` and `write` operation remains reachable through one mapped tool path

## 7. Package entry

- `[x]` Root `index.ts` exports: `initAffinityTables`, `read`, `write`, `types`, `tools`, thrown error classes (`export * from "./errors.ts"`), and optional `errors` namespace (`export * as errors from "./errors.ts"`).

---

## Notes

- Global read defaults: `limit` default `50`, max `250`; invalid combinations → `AffinityValidationError` (CONCEPT).
- Non-throw: list reads return `[]`; detail reads return `null` when absence is normal.
