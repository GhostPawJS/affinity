# Interactive Demo

Affinity ships a fully interactive demo app that runs entirely in the browser — no backend, no persistence, no setup required. It is hosted on GitHub Pages:

**[https://ghostpawjs.github.io/affinity/](https://ghostpawjs.github.io/affinity/)**

The demo exposes every tool and review view the library offers, populated with rich seed data so you can explore the full feature surface immediately. It is the fastest way to understand what Affinity does without writing a single line of code.

## What the demo covers

- **Dashboard** — owner profile bootstrap, summary statistics, session management.
- **Contacts** — full lifecycle: create, inspect, add/remove/verify identities, set attributes, merge duplicates.
- **Relationships** — social links (seed, revise bond, override state), structural ties, link attributes, observed links, progression readiness.
- **Timeline** — record interactions/observations/milestones/transactions, manage commitments, set date anchors.
- **Insights** — maintenance radar with drift detection, affinity chart (nodes and edges), duplicate detection.

Every panel includes inline explanations so you can understand the engine without reading the reference docs first.

## How it works

The library is a pure Node.js/SQLite package. Making it run in the browser required a few deliberate choices that are all confined to `src/demo/` and never leak into the published bundle.

### SQLite in the browser via sql.js

Affinity's core depends on the `AffinityDb` interface — a thin abstraction over SQLite that expects `exec`, `prepare`, and `close`. On Node.js, you'd typically back this with `better-sqlite3`. In the browser there is no native SQLite, so the demo uses [sql.js](https://github.com/sql-js/sql.js): a WebAssembly build of SQLite compiled from the same C source.

The bridge lives in two files:

- `src/demo/load_sqljs.ts` — loads the sql.js WASM binary (the `.wasm` file is bundled as a static asset by esbuild) and caches the module promise so it is initialized once.
- `src/demo/browser_affinity_db.ts` — implements `AffinityDb` on top of a sql.js `Database`. This is the only file that knows about sql.js internals; everything else in the library talks through the `AffinityDb` interface unchanged.

The result is a fully in-memory SQLite database in the browser that supports every SQL feature the library uses, with no backend round-trips.

### Preact SPA with hash routing

The UI is a single-page app built with [Preact](https://preactjs.com/) (3 KB alternative to React). Routing uses a simple hash-based scheme (`#/contacts`, `#/timeline`, etc.) so it works on any static file host — including GitHub Pages — without server-side route rewrites. The entire router is about 15 lines in `app.tsx`, listening for `hashchange` events and rendering the matching page component.

Page components live in `src/demo/page_*.tsx` and shared presentational elements in `src/demo/ui.tsx`. State is managed through a Preact context that holds the `AffinityDb` instance, a revision counter for reactivity, and a toast notification dispatcher.

### esbuild toolchain

The build is handled by a single script at `scripts/build_demo.mjs` using [esbuild](https://esbuild.github.io/). It:

1. Bundles `src/demo/main.tsx` into a single ESM file (`demo/app.js`).
2. Emits the sql.js `.wasm` file as a hashed asset under `demo/assets/`.
3. Writes a static `demo/index.html` shell that includes all CSS inline and loads the bundle.

The entire output lands in `demo/`, which is gitignored and not part of the published npm package. Build time is well under a second.

### Seed data

On load, the demo creates a fresh in-memory database and populates it with representative seed data: seven contacts (including a near-duplicate for merge testing), social links, structural ties, events of every type, open and resolved commitments, date anchors, and attributes. This ensures every view has meaningful content from the start. You can reset to a blank or re-seeded session at any time from the sidebar.

## Running locally

```bash
npm run demo:build   # build into demo/
npm run demo:serve   # build + start local file server on port 4173
npm run demo:watch   # rebuild on file changes (use with serve in another terminal)
```

## GitHub Pages deployment

The demo is deployed automatically on every push to `main` via `.github/workflows/pages.yml`. The workflow builds the demo and uploads the `demo/` directory using the official `actions/deploy-pages` action.

To enable this on a fresh fork, go to **Settings → Pages → Build and deployment** and set the source to **GitHub Actions**.
