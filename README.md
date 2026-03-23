# @ghostpaw/affinity

[![npm](https://img.shields.io/npm/v/@ghostpaw/affinity)](https://www.npmjs.com/package/@ghostpaw/affinity)
[![node](https://img.shields.io/node/v/@ghostpaw/affinity)](https://nodejs.org)
[![license](https://img.shields.io/npm/l/@ghostpaw/affinity)](LICENSE)
[![dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org)

A standalone social CRM core for Node.js, built on SQLite.

Affinity treats contacts, identities, relationship mechanics, structural ties,
journal evidence, commitments, recurring dates, attributes, and graph review as
one coherent model instead of separate systems. It ships as a single prebundled
blob with zero runtime dependencies, designed for two audiences at once: human
developers working directly in code, and LLM agents operating through a
structured `soul` / `tools` / `skills` runtime.

## Install

```bash
npm install @ghostpaw/affinity
```

Requires **Node.js 24+** (uses the built-in `node:sqlite` module).

## Quick Start

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
  name: "Ada Lovelace",
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

## The Model

Eight concepts, strict separation of concerns:

| Concept | Purpose |
|---|---|
| **Contact** | Any tracked entity: person, company, team, service, pet, household, or group |
| **Identity** | Exact recognition and routing handle such as email, phone, URL, or account id |
| **Social Link** | A live relationship track with Rank, Affinity, Trust, cadence, Bond, and state |
| **Tie** | A structural fact such as `works_at`, `belongs_to`, `reports_to`, or kinship |
| **Journal Entry** | Recorded evidence: interaction, observation, milestone, transaction, or commitment |
| **Date Anchor** | A recurring yearly date such as a birthday, anniversary, renewal, or memorial |
| **Attribute** | Flexible metadata and preference layer for contacts and links |
| **Affinity Chart** | Derived graph view of the active relationship network |

The model means each kind of truth has its own home:

| What it looks like | What it actually is |
|---|---|
| A person, company, team, service, or household | A Contact |
| An email address or handle | An Identity |
| A friendship or business relationship that changes over time | A Social Link |
| Employment, hierarchy, family, or membership | A Tie |
| “We talked yesterday” | A Journal entry |
| “I promised to send the recap” | A commitment-shaped Journal entry |
| “Their birthday is important every year” | A Date Anchor |

State is derived, not hand-toggled. Rank, hidden Affinity, Trust movement,
Moments, drift, readiness, and graph bridge significance are computed from
evidence and explicit structural truth, not caller-written status flags.

## Two Audiences

### Human developers

Use the `read` and `write` namespaces for direct-code access to the domain:

```ts
import { read, write } from "@ghostpaw/affinity";

write.createContact(db, { name: "Ada", kind: "human" });
write.addIdentity(db, contactId, { type: "email", value: "ada@example.com" });
write.recordInteraction(db, {
  type: "support",
  occurredAt: now,
  summary: "Helped prepare for a difficult meeting",
  significance: 7,
  participants: [
    { contactId: ownerId, role: "actor", directionality: "mutual" },
    { contactId, role: "recipient", directionality: "mutual" },
  ],
});

const profile = read.getContactProfile(db, contactId);
const radar = read.listRadar(db);
```

See [HUMAN.md](docs/HUMAN.md) for the full direct-code guide with modeling
boundaries and worked examples.

### LLM agents

Use the `tools`, `skills`, and `soul` namespaces for a structured runtime
surface designed to minimize LLM cognitive load:

```ts
import { tools, skills, soul } from "@ghostpaw/affinity";

const allTools = tools.affinityTools;
const searchTool = tools.getAffinityToolByName("search_affinity")!;
const result = searchTool.handler(db, { query: "email:ada@example.com" });

const allSkills = skills.affinitySkills;
const prompt = soul.renderAffinitySoulPromptFoundation();
```

Every tool returns a discriminated result with `outcome: "success" | "no_op" |
"needs_clarification" | "error"`, structured entities, next-step hints, and
actionable recovery signals.

See [LLM.md](docs/LLM.md) for the full AI-facing guide covering soul, tools,
and skills.

## Tools

Eleven tools shaped around operator intent, not raw storage operations:

| Tool | What it does |
|---|---|
| `search_affinity` | Search contacts by natural key or name |
| `review_affinity` | Dashboard-style list and graph review views |
| `inspect_affinity_item` | Open one exact profile or link detail |
| `manage_contact` | Create, revise, or change contact lifecycle |
| `merge_contacts` | Merge duplicate contacts safely |
| `manage_identity` | Add, revise, verify, or remove identities |
| `manage_relationship` | Seed social links, revise bond/state, manage structural ties |
| `record_event` | Record direct evidence, observations, milestones, or transactions |
| `manage_commitment` | Record or resolve obligations |
| `manage_date_anchor` | Add, revise, or remove recurring important dates |
| `manage_attribute` | Set, unset, or replace contact/link metadata |

Each tool exports runtime metadata, JSON-Schema-compatible inputs, and
structured outputs so harnesses can wire them without parsing vague prose.

## Key Properties

- **Zero runtime dependencies.** Only `node:sqlite` (built into Node 24+).
- **Single prebundled blob.** One ESM + one CJS entry in `dist/`. No subpath
  exports, no code splitting.
- **Pure SQLite storage.** CHECK-constrained state, trigger-maintained support
  tables, and deterministic derived reads. Bring your own `DatabaseSync`.
- **Derived mechanics.** Rank, hidden Affinity, Trust, cadence, Moments, Radar,
  and bridge significance are computed from evidence and structure, never
  directly caller-set.
- **Intention-shaped writes.** `createContact`, `setStructuralTie`,
  `recordInteraction`, `recordCommitment`, `addDateAnchor`, `mergeContacts`:
  operations that say what happened or what truth changed, not generic CRUD.
- **Additive AI runtime.** `soul` for posture, `tools` for actions, `skills` for
  workflow guidance.
- **Colocated tests.** Every non-type module has a colocated `.test.ts` file.
  The documented behavior is backed by executable coverage.

## Package Surface

```ts
import {
  initAffinityTables,  // schema setup
  read,                // all query functions
  write,               // all mutation functions
  tools,               // LLM tool definitions + registry
  skills,              // LLM workflow skills + registry
  soul,                // thinking foundation for system prompts
} from "@ghostpaw/affinity";
```

All domain and runtime types are also available at the root for TypeScript
consumers:

```ts
import type {
  AffinityDb,
  ContactKind,
  LinkState,
  ContactProfileRecord,
  AffinityChartRecord,
  AffinityToolDefinition,
  AffinitySkill,
  AffinitySoul,
} from "@ghostpaw/affinity";
```

## Documentation

| Document | Audience |
|---|---|
| [HUMAN.md](docs/HUMAN.md) | Human developers using the low-level `read` / `write` API |
| [LLM.md](docs/LLM.md) | Agent builders wiring `soul`, `tools`, and `skills` into LLM systems |
| [docs/README.md](docs/README.md) | Architecture overview: model, invariants, mechanics, and source layout |
| [docs/entities/](docs/entities/) | Per-concept manuals with exact inlined public API listings |
| [docs/USECASES.md](docs/USECASES.md) | Long-form lifecycle narratives across personal, business, and AI-memory angles |

## Development

```bash
npm install
npm test            # node:test runner
npm run typecheck   # tsc --noEmit
npm run lint        # biome check
npm run build       # ESM + CJS + declarations via tsup
```

The repo is pinned to **Node 24.14.0** via `.nvmrc` / `.node-version` /
`.tool-versions` / `mise.toml` / Volta. Use whichever version manager you
prefer.

### Support

If this package helps your project, consider sponsoring its maintenance:

[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-EA4AAA?style=for-the-badge&logo=github&logoColor=white)](https://github.com/sponsors/Anonyfox)

---

**[Anonyfox](https://anonyfox.com) • [MIT License](LICENSE)**
