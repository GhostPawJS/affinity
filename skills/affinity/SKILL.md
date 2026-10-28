---
name: affinity
description: "Search and maintain local contacts, identities, relationships, events, commitments, and recurring dates. Use when recording relationship evidence or reviewing a social CRM."
license: "MIT"
compatibility: "The release binary needs no runtime. MCP stdio or ghostpaw-affinity CLI."
---

# affinity

## CLI cheat sheet

Install: `curl -fsSL https://raw.githubusercontent.com/GhostPawJS/affinity/main/install.sh | sh`
Windows: `irm https://raw.githubusercontent.com/GhostPawJS/affinity/main/install.ps1 | iex`

```sh
export GHOSTPAW_AFFINITY_DB=/abs/path/affinity.db
# Or --db; default ~/.ghostpaw/affinity.db. Piped output is JSON; --compact omits empty receipt arrays.
# Version: --version includes variant; scripts should use --version --short for exact semver matching.
# --version --json (or version --json) returns name, version, variant, target (null outside a binary).
# Missing DB reads exit 3 and create nothing; the first write creates it. MCP creates on startup.
# JSON: --input - reads stdin; @existing-file loads a value, @@x escapes @x. Use stdin/@file for E2BIG.
# Arrays accept JSON, comma lists or repeats. Tag filters accept gastro-radar or tag:gastro-radar. Use per-command --help for action flags.
# Exit: 0 ok/no_op, 1 tool error, 2 usage/invalid input, 3 not found/clarification, 4 conflict, 70 internal.
# Dates: epoch ms, ISO with offset/Z, YYYY-MM-DD, DD.MM.YYYY, today, tomorrow, +3d, -2d.
# CLI and MCP use the same grammar, including yesterday. Keywords use the local date.
# Date-only occurredAt uses UTC midnight; dueAt uses UTC end of day; calendar days are preserved.
# Read occurredOn/dueOn/occursOn for days; *Iso stays UTC. Future events warn and do not count yet.
# Commitments and resolutions do not reset recency; radar drift means gap > 1.5 times cadence.
ghostpaw-affinity contact create '{"name":"Fox","kind":"human","bootstrapOwner":true}'
ghostpaw-affinity search "Jana" # Search names, identities, tags, attributes, roles and events before creating.
ghostpaw-affinity contact create '{"name":"Jana Petersen","kind":"human"}' --if-exists return
ghostpaw-affinity identity add --contact '{"contactId":2}' --input '{"type":"email","value":"jana@x.de"}'
ghostpaw-affinity relationship tie --from '{"contactId":2}' --to '{"contactId":3}' --kind works_at --role Founder
ghostpaw-affinity relationship add --from '{"contactId":1}' --to '{"contactId":2}' --kind professional --role lead
ghostpaw-affinity event record --kind interaction --input '{"type":"conversation","occurredAt":"today","summary":"Call re pilot","significance":6,"participants":[{"contactId":2,"role":"recipient","directionality":"mutual"}]}'
ghostpaw-affinity commitment record --input '{"commitmentType":"promise","occurredAt":"today","dueAt":"+3d","summary":"Send proposal","significance":6,"participants":[{"contactId":2,"role":"recipient"}]}'
ghostpaw-affinity commitment resolve --commitment-event-id 6 --resolution kept
ghostpaw-affinity date add --input '{"target":{"kind":"contact","contact":{"contactId":2}},"recurrenceKind":"birthday","anchorMonth":11,"anchorDay":3,"summary":"Jana bday","significance":4}'
ghostpaw-affinity attribute set --target '{"kind":"contact","contact":{"contactId":2}}' --name pipeline_stage --value '"proposal"'
ghostpaw-affinity attribute set --target '{"kind":"contact","contact":{"contactId":2}}' --name tag:gastro-radar --value null
ghostpaw-affinity show contact_profile --contact '{"contactId":2}'
ghostpaw-affinity review events.contact_journal --with-content --channel bluesky --contact '{"contactId":2}'
ghostpaw-affinity search --scope events "record id"
ghostpaw-affinity review links.radar
ghostpaw-affinity review commitments.open
ghostpaw-affinity review dates.upcoming --horizon-days 14
ghostpaw-affinity review contacts.list --tag gastro-radar
ghostpaw-affinity review contacts.list --attribute pipeline_stage=proposal
ghostpaw-affinity review contacts.duplicates
ghostpaw-affinity contact merge --winner '{"contactId":2}' --loser '{"contactId":8}' --reason-summary "same person"
ghostpaw-affinity duplicate dismiss --left '{"contactId":5}' --right '{"contactId":10}' --reason '"different people"'
ghostpaw-affinity contact revise '{"contactId":3}' --patch '{"name":"New Name"}'
ghostpaw-affinity contact lifecycle '{"contactId":9}' dormant
ghostpaw-affinity relationship state --link '{"linkId":7}' --state dormant
ghostpaw-affinity event revise --event-id 12 --patch '{"summary":"Corrected"}'
ghostpaw-affinity event delete --event-id 12 --confirm
ghostpaw-affinity contact export --contact '{"contactId":2}'
ghostpaw-affinity contact delete --contact '{"contactId":2}' --confirm
```

Batch imports: use `ghostpaw-affinity batch --chunk 500 < import.jsonl` with {tool,args} lines. See `ghostpaw-affinity skill import-history-without-faking-evidence`.

For bots and agents: run `ghostpaw-affinity mcp` for MCP stdio, or use this CLI with `--json`. Read a guide with `ghostpaw-affinity skill <guide>`.


## Appendix: MCP and tool calls

Affinity is a local relationship model and social CRM. Search before creating contacts. Inspect before revising or merging. Record direct evidence honestly, keep identities and structural ties distinct from social links, and ask for clarification when a target is ambiguous. Review commitments and recurring dates regularly. Derived scores guide attention and do not prove relationship quality.

### Calling tools

MCP: connect to ghostpaw-affinity, then call a tool by name with its JSON arguments.

CLI: `ghostpaw-affinity call <tool> '<JSON object>'` or `ghostpaw-affinity <tool> --parameter value`.

Inspect schemas with `ghostpaw-affinity describe <tool>`. Use `--db <path>` to select a database.

### Tool index

- **search_affinity**: Search contacts by name, identity, attributes, link roles, bonds and event text.
- **review_affinity**: Review one affinity surface such as contacts, journals, link queues, commitments, dates, graph state, or merge history..
- **inspect_affinity_item**: Inspect one exact affinity item such as the owner profile, a contact profile, or one link detail..
- **manage_contact**: Create, revise, export or permanently delete a contact (confirm: true required; owner cannot be deleted).
- **merge_contacts**: Merge one loser contact into one winner contact using explicit contact locators..
- **manage_duplicate_dismissal**: Dismiss or un-dismiss a duplicate candidate pair so it does not resurface in review_affinity contacts.duplicates..
- **manage_identity**: Add, revise, verify, or remove one routing identity on a contact.
- **manage_relationship**: Seed social links, revise bond and state, and manage structural ties.
- **record_event**: Record one social event such as an interaction, observation, milestone, or transaction.
- **manage_commitment**: Record or resolve one commitment such as a promise or agreement.
- **manage_date_anchor**: Add, revise, or remove recurring date anchors on contacts or links.
- **manage_attribute**: Set, unset, or replace custom metadata attributes on contacts, links and events.
- **manage_event**: Revise or delete one event by eventId or external reference.

Parameter details and examples: `ghostpaw-affinity skill tools` or `ghostpaw-affinity describe <tool>`.

### Workflow guides

- `ghostpaw-affinity skill bootstrap-and-cold-start`: Establish a clean Affinity baseline with one owner, one verified identity, and the minimum structure needed for later evidence and review work.
- `ghostpaw-affinity skill identify-and-locate-contacts`: Find the right contact reliably, prefer stable natural keys when possible, and avoid creating duplicates through weak lookup discipline.
- `ghostpaw-affinity skill import-history-without-faking-evidence`: Import pre-existing relationship state honestly, using seeded links for known history instead of inventing fake journal evidence.
- `ghostpaw-affinity skill model-structure-orgs-and-households`: Model factual structure such as employment, membership, hierarchy, and household ties without confusing it with live relational mechanics.
- `ghostpaw-affinity skill record-direct-evidence-well`: Record direct owner-facing social evidence in a way that produces truthful mechanics, good moments, and useful future review surfaces.
- `ghostpaw-affinity skill record-observations-and-referrals`: Capture third-party and referral truth without overclaiming intimacy, directness, or trust that the operator did not actually earn.
- `ghostpaw-affinity skill capture-transactions-and-commercial-events`: Capture commercially meaningful interactions as transactions so operational and service relationships accumulate the right evidence shape.
- `ghostpaw-affinity skill manage-promises-and-agreements`: Track obligations explicitly from creation to resolution so open commitments remain actionable and trust consequences stay honest.
- `ghostpaw-affinity skill manage-recurring-dates-and-reminders`: Use date anchors for recurring salience so important birthdays, anniversaries, renewals, and memorials feed review surfaces cleanly.
- `ghostpaw-affinity skill review-radar-progression-and-graph`: Use the review surfaces to prioritize maintenance, understand progression readiness, and read the shape of the relationship graph without guessing from raw rows.
- `ghostpaw-affinity skill reconcile-duplicates-and-merge-safely`: Review duplicate candidates carefully and merge only after the identity, history, and structural consequences are understood.
- `ghostpaw-affinity skill tools`: Tool parameters, nested fields, and examples.

### Principles

- Honor evidence before narrative.
- Clarify before you act.
- Keep truths in their proper layer.
- Read derived signals with judgment.
- Protect relationship integrity over time.
- Follow the operational protocol.

From the binary: `ghostpaw-affinity skill <guide>`.

## Without the binary

Use `npx -y @ghostpaw/affinity ...` (Node.js 24 or newer), or import `@ghostpaw/affinity` as a library.
