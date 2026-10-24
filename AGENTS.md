# Affinity

Affinity is a synchronous SQLite relationship model and social CRM for Node.js.

## Use

Install with `npm install @ghostpaw/affinity` in a consuming project.
Use Node 24 or newer. Callers open and own the database connection:

```js
import { DatabaseSync } from "node:sqlite";
import { initAffinityTables, read, write } from "@ghostpaw/affinity";

const db = new DatabaseSync("contacts.sqlite");
db.exec("PRAGMA journal_mode=WAL");
db.exec("PRAGMA busy_timeout=5000");
db.exec("PRAGMA foreign_keys=ON");
initAffinityTables(db);
const receipt = write.createContact(db, { name: "Sam", kind: "human" });
console.log(receipt.primary.id, read.listContacts(db));
db.close();
```

Recommend WAL and a 5000 ms busy timeout for caller-owned file databases.
The library accepts a DatabaseSync and does not open SQLite files itself.
Mutation receipts contain `primary`, `created`, `updated`, `archived`,
`removed`, `affectedLinks`, and `derivedEffects`.

The `tools` namespace exports the tool facade implemented in `src/tools/`.
For example, `tools.searchAffinityToolHandler(db, { query: "Sam" })` returns
`ok`, `outcome`, `summary`, and `entities`, with `data` on success,
`clarification` when a choice is needed, or `error` on failure.
Optional `warnings` and `next` fields provide additional context.

## Layout

- `src/index.ts`: public namespaces and initialization.
- `src/read.ts`, `src/write.ts`: public read and mutation operations.
- `src/contacts/`, `identities/`, `links/`, `events/`, `dates/`,
  `attributes/`, `merges/`, `graph/`: domain operations and persistence.
- `src/lib/`: shared types, errors, read helpers, and test database helpers.
- `src/tools/`, `src/skills/`, `src/soul.ts`: facade and usage guidance.
- `docs/`, `README.md`, `CONCEPT.md`: documentation and model contracts.
- `scripts/`, `.github/workflows/`: checks, demo, and release workflows.

## Contribute

Use Node 24 and the existing dependency installation. Keep runtime dependencies
at zero; `npm run check:deps` verifies this rule.
Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.
All four commands must pass before review. Follow the existing Biome config.
Place `*.test.ts` beside source files, using `node:test` and `node:assert/strict`.
Use real behavioral assertions, including validation failures and edge cases.
Do not weaken assertions, skip tests, or exclude code from coverage.

Keep changes additive and non-breaking. Preserve exported names, signatures,
behavior, tool names and input fields, CLI flags, and database schema.
Synchronous functions must remain synchronous. Do not add library WAL setup.
Record changes under `Unreleased` in CHANGELOG.md.

Maintainers release with `npm run release:patch` or `npm run release:minor`;
these commands update the version, create a tag, and push it. The tag triggers
CI verification and publication with npm provenance. Contributors leave changes
uncommitted for maintainer review and do not run release commands.
