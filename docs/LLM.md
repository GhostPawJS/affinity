# Affinity LLM Building Blocks

Affinity supports two execution styles at the same time:

- direct-code use through `read` and `write`
- agent use through a smaller `tools` facade

The direct-code surface stays precise and domain-first. The `tools` surface is
an additive runtime layer for LLM systems that need fewer, clearer choices and
more structured outcomes.

## Runtime Surfaces

Affinity now exposes five top-level runtime namespaces:

- `initAffinityTables`
- `read`
- `write`
- `types`
- `tools`

Typical agent-facing usage:

```ts
import { tools } from "@ghostpaw/affinity";
```

## Why `tools` Exists

The direct library surface is intentionally explicit:

- `src/read.ts` exports 17 query operations
- `src/write.ts` exports 25 mutation operations

That is good for humans, but too many choices for reliable LLM tool selection.
The `tools` facade reconciles those 42 public operations into 11 intent-shaped
tools with:

- fewer top-level choices
- strict JSON-schema-compatible inputs
- explicit action and view discriminators
- structured machine-readable outcomes
- clarification paths for ambiguous targets

## Tool Runtime Shape

The shared runtime definition lives under `src/tools/` and mirrors the proven
`questlog` pattern.

Each tool definition includes:

- `name`
- `description`
- `whenToUse`
- `whenNotToUse`
- `sideEffects`
- `readOnly`
- `supportsClarification`
- `targetKinds`
- `inputDescriptions`
- `outputDescription`
- `inputSchema`
- `handler`

Every tool returns one of four outcomes:

- `success`
- `no_op`
- `needs_clarification`
- `error`

Failures are also categorized explicitly:

- `protocol`
- `domain`
- `system`

That means an adapter does not have to infer intent from vague prose or thrown
exceptions.

## Current Tool Set

The current `tools` namespace exports exactly these 11 tools:

- `search_affinity`
- `review_affinity`
- `inspect_affinity_item`
- `manage_contact`
- `merge_contacts`
- `manage_identity`
- `manage_relationship`
- `record_event`
- `manage_commitment`
- `manage_date_anchor`
- `manage_attribute`

## Tool Purposes

| Tool | Purpose |
|---|---|
| `search_affinity` | Search contacts by name or identity-like natural key |
| `review_affinity` | Return dashboard-style list or graph views |
| `inspect_affinity_item` | Open one exact profile or link detail |
| `manage_contact` | Create, revise, or set contact lifecycle |
| `merge_contacts` | Merge one loser contact into one winner |
| `manage_identity` | Add, revise, verify, or remove identities |
| `manage_relationship` | Seed links, revise bond/state, manage structural ties |
| `record_event` | Record interaction, observation, milestone, or transaction evidence |
| `manage_commitment` | Record or resolve commitments |
| `manage_date_anchor` | Add, revise, or remove recurring anchors |
| `manage_attribute` | Set, unset, or replace contact/link attributes |

## Locator Rules

To keep tool inputs explicit and low-ambiguity:

- contacts can be addressed by `contactId`
- contacts can also be addressed by an exact identity locator: `{ type, value }`
- links can be addressed by `linkId`
- links can also be addressed by explicit endpoints

When an endpoint-based link locator matches multiple live links, the tool
returns `needs_clarification` instead of guessing.

## Output Conventions

Read-oriented tools prefer compact, review-friendly outputs:

- `items`
- `count`
- `appliedFilters`
- `chart` for graph review

Write-oriented tools preserve the mutation receipt shape in a denser wrapper:

- `primary`
- `created`
- `updated`
- `archived`
- `removed`
- `affectedLinks`
- `derivedEffects`

All tools may also return:

- `entities`
- `warnings`
- `next`

## Exact Reconciliation

The canonical reconciliation table lives in `src/tools/tool_mapping.ts`.

### Read mappings

| Source | Tool | View / Action |
|---|---|---|
| `searchContacts` | `search_affinity` | |
| `getOwnerProfile` | `inspect_affinity_item` | `owner_profile` |
| `getContactProfile` | `inspect_affinity_item` | `contact_profile` |
| `getLinkDetail` | `inspect_affinity_item` | `link` |
| `listContacts` | `review_affinity` | `contacts.list` |
| `listDuplicateCandidates` | `review_affinity` | `contacts.duplicates` |
| `getContactJournal` | `review_affinity` | `events.contact_journal` |
| `getLinkTimeline` | `review_affinity` | `events.link_timeline` |
| `listMoments` | `review_affinity` | `events.moments` |
| `listOpenCommitments` | `review_affinity` | `commitments.open` |
| `listOwnerSocialLinks` | `review_affinity` | `links.owner` |
| `listObservedLinks` | `review_affinity` | `links.observed` |
| `listProgressionReadiness` | `review_affinity` | `links.progression_readiness` |
| `listRadar` | `review_affinity` | `links.radar` |
| `listUpcomingDates` | `review_affinity` | `dates.upcoming` |
| `getAffinityChart` | `review_affinity` | `graph.chart` |
| `getMergeHistory` | `review_affinity` | `merges.history` |

### Write mappings

| Source | Tool | View / Action |
|---|---|---|
| `createContact` | `manage_contact` | `create` |
| `reviseContact` | `manage_contact` | `revise` |
| `setContactLifecycle` | `manage_contact` | `set_lifecycle` |
| `mergeContacts` | `merge_contacts` | |
| `addIdentity` | `manage_identity` | `add` |
| `reviseIdentity` | `manage_identity` | `revise` |
| `verifyIdentity` | `manage_identity` | `verify` |
| `removeIdentity` | `manage_identity` | `remove` |
| `seedSocialLink` | `manage_relationship` | `seed_social_link` |
| `reviseBond` | `manage_relationship` | `revise_bond` |
| `overrideLinkState` | `manage_relationship` | `override_state` |
| `setStructuralTie` | `manage_relationship` | `set_structural_tie` |
| `removeStructuralTie` | `manage_relationship` | `remove_structural_tie` |
| `recordInteraction` | `record_event` | `interaction` |
| `recordObservation` | `record_event` | `observation` |
| `recordMilestone` | `record_event` | `milestone` |
| `recordTransaction` | `record_event` | `transaction` |
| `recordCommitment` | `manage_commitment` | `record` |
| `resolveCommitment` | `manage_commitment` | `resolve` |
| `addDateAnchor` | `manage_date_anchor` | `add` |
| `reviseDateAnchor` | `manage_date_anchor` | `revise` |
| `removeDateAnchor` | `manage_date_anchor` | `remove` |
| `setAttribute` | `manage_attribute` | `set` |
| `unsetAttribute` | `manage_attribute` | `unset` |
| `replaceAttributes` | `manage_attribute` | `replace` |

## Design Boundary

`tools` is additive. It does not replace:

- `read`
- `write`
- `types`

Humans still get the precise direct-code library. Agents get a smaller,
clearer, runtime-friendly surface on top of the same truthful core.
