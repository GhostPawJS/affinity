---
name: affinity
description: "Search and maintain local contacts, identities, relationships, events, commitments, and recurring dates. Use when recording relationship evidence or reviewing a social CRM."
license: "MIT"
compatibility: "Node.js 24 or newer. MCP stdio or ghostpaw-affinity CLI."
---

# affinity

Affinity is a local relationship model and social CRM. Search before creating contacts. Inspect before revising or merging. Record direct evidence honestly, keep identities and structural ties distinct from social links, and ask for clarification when a target is ambiguous. Review commitments and recurring dates regularly. Derived scores guide attention and do not prove relationship quality.

## Calling tools

MCP: connect to ghostpaw-affinity, then call a tool by name with its JSON arguments.

CLI: `ghostpaw-affinity call <tool> '<JSON object>'` or `ghostpaw-affinity <tool> --parameter value` (without a global install: `npx -y @ghostpaw/affinity <tool> ...`).

Inspect schemas with `ghostpaw-affinity describe <tool>`. Use `--db <path>` to select a database.

## search_affinity

Search contacts by name or identity, including exact natural-key lookups like email-style identifiers.

Use when: Use this when you want to find contacts from free text or a known routing identity such as an email or URL-like handle.

Not for: Do not use this when you already know the exact contact you want to inspect in depth.

Read-only.

| Parameter | Type | Required | Values / description |
| --- | --- | --- | --- |
| query | string | yes | Free-text or natural-key query. |
| kind | string | no | human, group, company, team, pet, service, other. Optional contact kind filter. |
| lifecycleState | string | no | active, dormant, merged, lost. Optional lifecycle state filter. |
| includeOwner | boolean | no | Whether owner contacts are included. |
| includeDormant | boolean | no | Whether dormant contacts are included. |
| limit | integer | no | Optional result limit. |
| offset | integer | no | Optional result offset. |

## review_affinity

Review one affinity surface such as contacts, journals, link queues, commitments, dates, graph state, or merge history.

Use when: Use this when you want a dashboard-style list or review view instead of inspecting one exact item.

Not for: Do not use this when you already know the exact contact or link you want to inspect in depth.

Read-only.

| Parameter | Type | Required | Values / description |
| --- | --- | --- | --- |
| view | string | yes | contacts.list, contacts.duplicates, events.contact_journal, events.link_timeline, events.moments, commitments.open, links.owner, links.observed, links.progression_readiness, links.radar, dates.upcoming, graph.chart, merges.history, merges.dismissed. Which review surface to return. |
| contact | object | no | Optional target contact locator. |
| link | object | no | Optional target link locator. |
| contactIds | array | no | Optional contact-id subset. |
| kind | string | no | Optional contact kind or link kind filter, depending on the view. |
| lifecycleState | string | no | active, dormant, merged, lost. Optional contact lifecycle-state filter. |
| linkState | string | no | active, dormant, strained, broken, archived. Optional link state filter. |
| includeOwner | boolean | no | Whether owner contacts are included. |
| includeDormant | boolean | no | Whether dormant rows are included. |
| includeArchived | boolean | no | Whether archived links are included. |
| includeObserved | boolean | no | Whether observed links are included. |
| eventTypes | array | no | Optional event-type filter. |
| momentKind | string | no | breakthrough, rupture, reconciliation, milestone, turning_point. Optional moment kind filter. |
| commitmentType | string | no | promise, agreement. Optional commitment type filter. |
| recurrenceKind | string | no | birthday, anniversary, renewal, memorial, custom_yearly. Optional recurrence-kind filter. |
| horizonDays | integer | no | Optional horizon-days filter. |
| exactOnly | boolean | no | Whether duplicate review is exact-only. |
| minScore | number | no | Optional duplicate minimum score. |
| includeDismissed | boolean | no | Whether dismissed pairs are included in duplicate review (marked with dismissed flag). |
| since | integer | no | Optional lower timestamp bound. |
| until | integer | no | Optional upper timestamp bound. |
| limit | integer | no | Optional result limit. |
| offset | integer | no | Optional result offset. |

## inspect_affinity_item

Inspect one exact affinity item such as the owner profile, a contact profile, or one link detail.

Use when: Use this when you already know the exact item you want to inspect in depth.

Not for: Do not use this for search-style discovery or dashboard-like list reviews.

Read-only.

| Parameter | Type | Required | Values / description |
| --- | --- | --- | --- |
| kind | string | yes | owner_profile, contact_profile, link. What to inspect. |
| contact | object | no | Target contact. Required when kind=contact_profile. Provide contactId or identity. |
| link | object | no | Target link. Required when kind=link. Provide linkId or endpoints. |
| topLinksLimit | integer | no | Optional top-links cap. |
| recentEventsLimit | integer | no | Optional recent-events cap. |

## manage_contact

Create a contact, revise one contact's core fields, or change lifecycle state. ALWAYS search_affinity first before creating — duplicates corrupt the graph.

Use when: Use this for contact creation and lifecycle-safe contact maintenance.

Not for: Do not use this for identities, links, attributes, or merges.

Writes: writes_state.

| Parameter | Type | Required | Values / description |
| --- | --- | --- | --- |
| action | string | yes | create, revise, set_lifecycle. Operation to perform. |
| input | object | no | New contact payload. Required when action=create. |
| contact | object | no | Target contact. Required when action=revise or set_lifecycle. Provide contactId or identity. |
| patch | object | no | Allowed contact patch. Required when action=revise. |
| lifecycleState | string | no | active, dormant, merged, lost. Target lifecycle state. Required when action=set_lifecycle. |
| options | object | no | Optional lifecycle metadata. |

## merge_contacts

Merge one loser contact into one winner contact using explicit contact locators.

Use when: Use this only when two contacts are confirmed duplicates and the system should consolidate them.

Not for: Do not use this for routine contact edits or identity cleanup.

Writes: writes_state.

| Parameter | Type | Required | Values / description |
| --- | --- | --- | --- |
| winner | object | yes | Winner contact. Provide contactId or identity. |
| loser | object | yes | Loser contact. Provide contactId or identity. |
| reasonSummary | string | no | Optional merge reason. |
| now | integer | no | Optional merge timestamp. |

## manage_duplicate_dismissal

Dismiss or un-dismiss a duplicate candidate pair so it does not resurface in listDuplicateCandidates.

Use when: Use dismiss after confirming two contacts are different people (not duplicates). Use undismiss to re-surface a pair for re-evaluation.

Not for: Do not use this to merge contacts — use merge_contacts for confirmed duplicates.

Writes: writes_state.

| Parameter | Type | Required | Values / description |
| --- | --- | --- | --- |
| action | string | yes | dismiss, undismiss. Action to perform. |
| left | object | yes | Left contact. Provide contactId or identity. |
| right | object | yes | Right contact. Provide contactId or identity. |
| reason | any | no | Optional reason for the dismissal. |

## manage_identity

Add, revise, verify, or remove one routing identity on a contact. Use this for emails, phone numbers, social handles, and URLs — anything that could locate a person. Do not use manage_attribute for these.

Use when: Use this for contact identity management such as email, handle, or phone routing keys.

Not for: Do not use this for contact core fields, links, or attributes.

Writes: writes_state.

| Parameter | Type | Required | Values / description |
| --- | --- | --- | --- |
| action | string | yes | add, revise, verify, remove. Operation to perform. |
| contact | object | no | Target contact. Required when action=add. Provide contactId or identity. |
| input | object | no | New identity payload. Required when action=add. |
| identityId | integer | no | Identity id. Required when action=revise, verify, or remove. |
| patch | object | no | Identity patch. Required when action=revise. |
| verifiedAt | integer | no | Verification timestamp. Optional for action=verify. |
| removedAt | integer | no | Removal timestamp. Optional for action=remove. |

## manage_relationship

Seed social links, revise bond and state, and manage structural ties. Seed a link as soon as a relationship is mentioned — do not wait for repeated evidence.

Use when: Use this for direct relationship modeling and link-state changes.

Not for: Do not use this for recording social evidence or resolving commitments.

Writes: writes_state.

| Parameter | Type | Required | Values / description |
| --- | --- | --- | --- |
| action | string | yes | seed_social_link, revise_bond, override_state, set_structural_tie, remove_structural_tie. Operation to perform. |
| from | object | no | Source contact. Required when action=seed_social_link or set_structural_tie. Provide contactId or identity. |
| to | object | no | Target contact. Required when action=seed_social_link or set_structural_tie. Provide contactId or identity. |
| kind | string | no | Link kind. Required for seed_social_link and set_structural_tie. Can be passed here or inside input. For seed_social_link: personal, family, professional, romantic, care, service, observed, other_relational. For set_structural_tie: works_at, manages, member_of, married_to, partner_of, parent_of, child_of, sibling_of, friend_of, client_of, vendor_of, reports_to, belongs_to, other_structural. |
| role | string | no | Optional role for seed_social_link or set_structural_tie. Can be passed here or inside input. |
| input | object | no | Full payload for seed_social_link or set_structural_tie. Alternative to top-level kind/role. |
| link | object | no | Target link. Required when action=revise_bond, override_state, or remove_structural_tie. Provide linkId or endpoints. |
| bond | any | no | Bond text. Required when action=revise_bond. Null to clear. |
| state | string | no | active, dormant, strained, broken, archived. Link state. Required when action=override_state. |
| options | object | no | Optional metadata. |
| removedAt | integer | no | Removal timestamp. Optional for action=remove_structural_tie. |

## record_event

Record one social event such as an interaction, observation, milestone, or transaction. For interactions, milestones, and transactions the owner contact is auto-injected into participants if missing. Observations may omit the owner when recording third-party evidence.

Use when: Use this when you are capturing something that happened in the relationship graph.

Not for: Do not use this for commitments, date anchors, or direct relationship state overrides.

Writes: writes_state.

| Parameter | Type | Required | Values / description |
| --- | --- | --- | --- |
| kind | string | yes | interaction, observation, milestone, transaction. Event kind. |
| input | object | yes | Event payload. Always required. Interaction events also require `type`. |

## manage_commitment

Record or resolve one commitment such as a promise or agreement. The owner contact is auto-injected into participants if missing.

Use when: Use this when the work is specifically about a commitment lifecycle rather than a general event.

Not for: Do not use this for ordinary interactions or direct relationship state changes.

Writes: writes_state.

| Parameter | Type | Required | Values / description |
| --- | --- | --- | --- |
| action | string | yes | record, resolve. Operation to perform. |
| input | object | no | Commitment payload. Required when action=record. |
| commitmentEventId | integer | no | Commitment event id. Required when action=resolve. |
| resolution | string | no | kept, cancelled, broken. How the commitment was resolved. Required when action=resolve. |
| options | object | no | Optional metadata. |

## manage_date_anchor

Add, revise, or remove recurring date anchors on contacts or links. Use this for birthdays, anniversaries, and yearly events — not manage_attribute.

Use when: Use this for birthdays, anniversaries, renewals, memorials, and other recurring anchors.

Not for: Do not use this for one-off events or relationship state changes.

Writes: writes_state.

| Parameter | Type | Required | Values / description |
| --- | --- | --- | --- |
| action | string | yes | add, revise, remove. Operation to perform. |
| input | object | no | Date anchor payload. Required when action=add. |
| anchorEventId | integer | no | Anchor event id. Required when action=revise or remove. |
| patch | object | no | Anchor patch. Required when action=revise. |
| options | object | no | Optional metadata. |
| removedAt | integer | no | Removal timestamp. Optional for action=remove. |

## manage_attribute

Set, unset, or replace custom metadata attributes on contacts and links. For emails, phones, handles, and URLs use manage_identity instead — those are routing keys, not attributes.

Use when: Use this for metadata such as tags, notes, or small labeled facts attached to a contact or link.

Not for: Do not use this for core contact fields, identities, or direct relationship mechanics.

Writes: writes_state.

| Parameter | Type | Required | Values / description |
| --- | --- | --- | --- |
| action | string | yes | set, unset, replace. Operation to perform. |
| target | object | no | Attribute target. Always required. |
| name | string | no | Attribute name. Required when action=set or unset. |
| value | any | no | Attribute value. Required when action=set. Null for presence/tag semantics. |
| entries | array | no | Key-value map to replace all attributes. Required when action=replace. |
| removedAt | integer | no | Removal timestamp. Optional for action=unset. |

## Workflow guides

- [bootstrap-and-cold-start](references/bootstrap-and-cold-start.md): Establish a clean Affinity baseline with one owner, one verified identity, and the minimum structure needed for later evidence and review work.
- [identify-and-locate-contacts](references/identify-and-locate-contacts.md): Find the right contact reliably, prefer stable natural keys when possible, and avoid creating duplicates through weak lookup discipline.
- [import-history-without-faking-evidence](references/import-history-without-faking-evidence.md): Import pre-existing relationship state honestly, using seeded links for known history instead of inventing fake journal evidence.
- [model-structure-orgs-and-households](references/model-structure-orgs-and-households.md): Model factual structure such as employment, membership, hierarchy, and household ties without confusing it with live relational mechanics.
- [record-direct-evidence-well](references/record-direct-evidence-well.md): Record direct owner-facing social evidence in a way that produces truthful mechanics, good moments, and useful future review surfaces.
- [record-observations-and-referrals](references/record-observations-and-referrals.md): Capture third-party and referral truth without overclaiming intimacy, directness, or trust that the operator did not actually earn.
- [capture-transactions-and-commercial-events](references/capture-transactions-and-commercial-events.md): Capture commercially meaningful interactions as transactions so operational and service relationships accumulate the right evidence shape.
- [manage-promises-and-agreements](references/manage-promises-and-agreements.md): Track obligations explicitly from creation to resolution so open commitments remain actionable and trust consequences stay honest.
- [manage-recurring-dates-and-reminders](references/manage-recurring-dates-and-reminders.md): Use date anchors for recurring salience so important birthdays, anniversaries, renewals, and memorials feed review surfaces cleanly.
- [review-radar-progression-and-graph](references/review-radar-progression-and-graph.md): Use the review surfaces to prioritize maintenance, understand progression readiness, and read the shape of the relationship graph without guessing from raw rows.
- [reconcile-duplicates-and-merge-safely](references/reconcile-duplicates-and-merge-safely.md): Review duplicate candidates carefully and merge only after the identity, history, and structural consequences are understood.

## Principles

- Honor evidence before narrative.
- Clarify before you act.
- Keep truths in their proper layer.
- Read derived signals with judgment.
- Protect relationship integrity over time.
- Follow the operational protocol.
