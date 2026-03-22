# Affinity

Standalone singleplayer social CRM core: SQL-grounded mechanics with RPG-native ergonomics. This package is the programmatic surface for personal contact management, solo-business CRM, hybrid life CRM, and future Ghostpaw integration.

## Requirements

- **Node.js 24+** (see [Node version pins](#node-version-pins))

## Install

```bash
npm install @ghostpaw/affinity
```

## Quick start

```ts
import { DatabaseSync } from "node:sqlite";
import { initAffinityTables, read, write } from "@ghostpaw/affinity";

const db = new DatabaseSync(":memory:");
db.exec("PRAGMA foreign_keys = ON");
initAffinityTables(db);

write.createContact(db, {
  name: "Ada",
  kind: "human",
  bootstrapOwner: true,
});

const owner = read.getOwnerProfile(db);
console.log(owner?.contact.name);
```

`initAffinityTables` installs the public schema; `write` covers contacts, identities, links, journal, anchors, attributes, and merge; `read` covers portfolio, journal, links, maintenance, graph, and merge history. Import `types` for shared domain types. Error classes are available at the package root or under the `errors` namespace. See `CONCEPT.md`, `docs/API_SURFACES.md`, and `docs/HUMAN.md`.

## Docs

- [Architecture & mechanics](docs/README.md)
- [Direct-code usage](docs/HUMAN.md)
- [Entity manuals](docs/entities/)

## Node version pins

The canonical runtime is **24.14.0**. Tooling picks it up from the usual version files:

| Tool / ecosystem | File or field |
|------------------|---------------|
| nvm | [`.nvmrc`](.nvmrc) |
| fnm, some CI | [`.node-version`](.node-version) |
| asdf | [`.tool-versions`](.tool-versions) |
| mise | [`mise.toml`](mise.toml) |
| Volta | `volta` in [`package.json`](package.json) |
| npm | `engines.node` in [`package.json`](package.json) (with [`engine-strict`](.npmrc)) |

## License

MIT — see [LICENSE](LICENSE).
