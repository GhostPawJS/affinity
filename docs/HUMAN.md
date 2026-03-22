# Affinity — direct-code usage

Contracts and vocabulary live in [`CONCEPT.md`](../CONCEPT.md). The implementation checklist is [`API_SURFACES.md`](API_SURFACES.md).

## Minimal session

```ts
import { DatabaseSync } from "node:sqlite";
import { initAffinityTables, read, write } from "@ghostpaw/affinity";

const db = new DatabaseSync(":memory:");
db.exec("PRAGMA foreign_keys = ON");
initAffinityTables(db);

const { primary: contact } = write.createContact(db, {
  name: "Ada",
  kind: "human",
});

write.addIdentity(db, contact.id, {
  type: "email",
  value: "ada@example.com",
});

const list = read.listContacts(db);
const profile = read.getContactProfile(db, contact.id);
```

## Imports

| Symbol | Role |
|--------|------|
| `initAffinityTables` | One-shot DDL for the canonical schema |
| `read` | Read namespace (`getOwnerProfile`, `listContacts`, …) |
| `write` | Write namespace (`createContact`, `recordInteraction`, …) |
| `types` | Shared TypeScript types (`import { types } from "@ghostpaw/affinity"`) |
| `errors` | Optional namespace mirroring root error exports (`errors.AffinityNotFoundError`, …) |
| `AffinityDb` | Type alias for `DatabaseSync` |
| `resolveNow`, `withTransaction` | Plumbing hooks |

Root re-exports also surface concrete error classes and `isAffinityError` without the `errors.` prefix.
