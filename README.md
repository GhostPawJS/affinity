<a href="https://affinity.ghostpaw.dev/"><img src="https://raw.githubusercontent.com/GhostPawJS/affinity/main/.github/social-preview.png" alt="GhostPaw affinity: Who have you been meaning to call?" width="100%"></a>

# @ghostpaw/affinity

[![npm](https://img.shields.io/npm/v/@ghostpaw/affinity?style=flat-square&labelColor=0a1119&color=62e6f2&label=npm)](https://www.npmjs.com/package/@ghostpaw/affinity) [![CI](https://img.shields.io/github/actions/workflow/status/GhostPawJS/affinity/ci.yml?branch=main&style=flat-square&labelColor=0a1119&label=CI)](https://github.com/GhostPawJS/affinity/actions/workflows/ci.yml) [![site](https://img.shields.io/badge/site-affinity.ghostpaw.dev-62e6f2?style=flat-square&labelColor=0a1119)](https://affinity.ghostpaw.dev/) [![runtime deps](https://img.shields.io/badge/runtime_deps-0-7af0b4?style=flat-square&labelColor=0a1119)](package.json) [![MCP Registry](https://img.shields.io/badge/MCP_Registry-io.github.GhostPawJS%2Faffinity-b39dff?style=flat-square&labelColor=0a1119)](https://registry.modelcontextprotocol.io/v0.1/servers/io.github.GhostPawJS%2Faffinity/versions/latest) [![node](https://img.shields.io/badge/node-%E2%89%A524-93a5b9?style=flat-square&labelColor=0a1119)](https://nodejs.org) [![license](https://img.shields.io/npm/l/@ghostpaw/affinity?style=flat-square&labelColor=0a1119&color=93a5b9)](LICENSE)

**Agent contacts: people, promises and yearly dates, with a radar for who is drifting.**

A local social CRM: contacts, identities, relationships, journal events,
commitments and recurring dates in one SQLite file. One self-contained binary
per platform, an MCP server, and a zero-dependency TypeScript library.

## Install

Each line downloads the latest release for one platform, checks it against
`SHA256SUMS`, puts `ghostpaw-affinity` on your `PATH` and prints the version.

**Linux x64**

```sh
cd "$(mktemp -d)" && T=linux-x64 && V=$(curl -fsSLI -o /dev/null -w '%{url_effective}' https://github.com/GhostPawJS/affinity/releases/latest | sed 's|.*/v||') && F=ghostpaw-affinity-$V-$T.tar.gz && U=https://github.com/GhostPawJS/affinity/releases/download/v$V && curl -fsSL -O "$U/$F" -O "$U/SHA256SUMS" && grep " $F\$" SHA256SUMS | sha256sum -c - && tar -xzf "$F" ghostpaw-affinity && mkdir -p ~/.local/bin && mv ghostpaw-affinity ~/.local/bin/ && { case ":$PATH:" in *":$HOME/.local/bin:"*) ;; *) echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.profile; export PATH="$HOME/.local/bin:$PATH";; esac; } && ghostpaw-affinity --version
```

**Linux arm64**

```sh
cd "$(mktemp -d)" && T=linux-arm64 && V=$(curl -fsSLI -o /dev/null -w '%{url_effective}' https://github.com/GhostPawJS/affinity/releases/latest | sed 's|.*/v||') && F=ghostpaw-affinity-$V-$T.tar.gz && U=https://github.com/GhostPawJS/affinity/releases/download/v$V && curl -fsSL -O "$U/$F" -O "$U/SHA256SUMS" && grep " $F\$" SHA256SUMS | sha256sum -c - && tar -xzf "$F" ghostpaw-affinity && mkdir -p ~/.local/bin && mv ghostpaw-affinity ~/.local/bin/ && { case ":$PATH:" in *":$HOME/.local/bin:"*) ;; *) echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.profile; export PATH="$HOME/.local/bin:$PATH";; esac; } && ghostpaw-affinity --version
```

**macOS Apple silicon**

```sh
cd "$(mktemp -d)" && T=darwin-arm64 && V=$(curl -fsSLI -o /dev/null -w '%{url_effective}' https://github.com/GhostPawJS/affinity/releases/latest | sed 's|.*/v||') && F=ghostpaw-affinity-$V-$T.tar.gz && U=https://github.com/GhostPawJS/affinity/releases/download/v$V && curl -fsSL -O "$U/$F" -O "$U/SHA256SUMS" && grep " $F\$" SHA256SUMS | shasum -a 256 -c - && tar -xzf "$F" ghostpaw-affinity && sudo mkdir -p /usr/local/bin && sudo mv ghostpaw-affinity /usr/local/bin/ && ghostpaw-affinity --version
```

**macOS Intel**

```sh
cd "$(mktemp -d)" && T=darwin-x64 && V=$(curl -fsSLI -o /dev/null -w '%{url_effective}' https://github.com/GhostPawJS/affinity/releases/latest | sed 's|.*/v||') && F=ghostpaw-affinity-$V-$T.tar.gz && U=https://github.com/GhostPawJS/affinity/releases/download/v$V && curl -fsSL -O "$U/$F" -O "$U/SHA256SUMS" && grep " $F\$" SHA256SUMS | shasum -a 256 -c - && tar -xzf "$F" ghostpaw-affinity && sudo mkdir -p /usr/local/bin && sudo mv ghostpaw-affinity /usr/local/bin/ && ghostpaw-affinity --version
```

**Windows x64 (PowerShell)**

```powershell
$r='GhostPawJS/affinity'; $v=(irm "https://api.github.com/repos/$r/releases/latest").tag_name; $f="ghostpaw-affinity-$($v.TrimStart('v'))-windows-x64.zip"; $u="https://github.com/$r/releases/download/$v"; $t=(New-Item -ItemType Directory (Join-Path $env:TEMP ([guid]::NewGuid()))).FullName; iwr "$u/$f" -OutFile "$t\$f" -UseBasicParsing; iwr "$u/SHA256SUMS" -OutFile "$t\SHA256SUMS" -UseBasicParsing; $want=((Get-Content "$t\SHA256SUMS" | Where-Object { $_ -like "* $f" }) -split '\s+')[0]; if (-not $want -or (Get-FileHash "$t\$f" -Algorithm SHA256).Hash -ne $want) { throw "checksum mismatch for $f" }; $d=Join-Path $env:LOCALAPPDATA 'Programs\ghostpaw\bin'; Expand-Archive "$t\$f" $t -Force; New-Item -ItemType Directory -Force $d | Out-Null; Copy-Item "$t\ghostpaw-affinity.exe" $d -Force; $p=[Environment]::GetEnvironmentVariable('Path','User'); if (";$p;" -notlike "*;$d;*") { [Environment]::SetEnvironmentVariable('Path',"$p;$d",'User') }; $env:Path="$d;$env:Path"; ghostpaw-affinity --version
```

These commands install the latest release in `~/.local/bin` on Linux, `/usr/local/bin` on macOS (asks for sudo), or `%LOCALAPPDATA%\Programs\ghostpaw\bin` on Windows; Linux adds it to PATH via `~/.profile` only if missing, and Windows adds it to the user PATH (open a new terminal afterwards). To pin a version, set `V=0.6.0` instead of resolving latest (`$v='v0.6.0'` in PowerShell).

For a pinned Linux/macOS download to the current directory with no profile or PATH edits, choose the matching `T` (`linux-x64`, `linux-arm64`, `darwin-arm64`, or `darwin-x64`):

```sh
V=0.6.0
T=linux-x64
F=ghostpaw-affinity-$V-$T.tar.gz
U=https://github.com/GhostPawJS/affinity/releases/download/v$V
curl -fsSL -O "$U/$F" -O "$U/SHA256SUMS" &&
  { case "$T" in darwin-*) grep " $F\$" SHA256SUMS | shasum -a 256 -c - ;; *) grep " $F\$" SHA256SUMS | sha256sum -c - ;; esac; } &&
  tar -xzf "$F" ghostpaw-affinity && ./ghostpaw-affinity --version
```

Then:

```sh
ghostpaw-affinity contact create '{"name":"Sam","kind":"human"}'
ghostpaw-affinity search sam
ghostpaw-affinity skill            # cheat sheet and tool reference
```

Contacts live in `~/.ghostpaw/affinity.db` unless `--db <path>` or the
`GHOSTPAW_AFFINITY_DB` environment variable says otherwise; relative paths
resolve against the current directory.

A session with the linux-x64 binary against a fresh database:

![ghostpaw-affinity session: version, contact create, a tag, an event and a promise with relative dates, search, an overdue promise in review commitments.open, and the radar](https://raw.githubusercontent.com/GhostPawJS/affinity/main/docs/assets/cli.png)

The same session as an [animated GIF](https://raw.githubusercontent.com/GhostPawJS/affinity/main/docs/assets/cli.gif).

### npx / npm (for npm-based environments)

The [npm package](https://www.npmjs.com/package/@ghostpaw/affinity) needs Node 24+
and has zero runtime dependencies:

```sh
npx -y @ghostpaw/affinity --help
npm install -g @ghostpaw/affinity   # provides ghostpaw-affinity
```

### Library (for harnesses)

```sh
npm install @ghostpaw/affinity
```

```ts
import { DatabaseSync } from "node:sqlite";
import { initAffinityTables, read, write, tools } from "@ghostpaw/affinity";
```

See [Quick Start](#quick-start) and [docs/LLM.md](docs/LLM.md) for the tool facade.

### Other installers and verification

Interactive installers (also verify `SHA256SUMS`):

```sh
curl -fsSL https://raw.githubusercontent.com/GhostPawJS/affinity/main/install.sh | sh
```

```powershell
irm https://raw.githubusercontent.com/GhostPawJS/affinity/main/install.ps1 | iex
```

```sh
mise use -g github:GhostPawJS/affinity
ubi --project GhostPawJS/affinity --exe ghostpaw-affinity --in ~/.local/bin
eget GhostPawJS/affinity
```

For [aqua](https://aquaproj.github.io/docs/reference/registry-config/), define a
`github_release` package in `aqua.yaml`:

```yaml
registries:
  - name: affinity
    type: local
    path: affinity-registry.yaml
packages:
  - name: GhostPawJS/affinity@v<VERSION>
    registry: affinity
```

`affinity-registry.yaml`:

```yaml
packages:
  - type: github_release
    repo_owner: GhostPawJS
    repo_name: affinity
    asset: ghostpaw-affinity-{{trimV .Version}}-{{.OS}}-{{.Arch}}.tar.gz
    format: tar.gz
    replacements: { amd64: x64 }
    overrides:
      - goos: windows
        asset: ghostpaw-affinity-{{trimV .Version}}-windows-{{.Arch}}.zip
        format: zip
    files:
      - name: ghostpaw-affinity
```

`SHA256SUMS` covers every archive and `server.mcpb`. To verify a downloaded
archive's [build attestation](https://cli.github.com/manual/gh_attestation_verify):

```sh
gh attestation verify <archive> -R GhostPawJS/affinity
```

Set `GHOSTPAW_VERIFY=attestation` for attestation verification in `install.sh`.
Binaries are unsigned; macOS binaries carry an ad-hoc signature. For a browser
download on macOS, remove quarantine with
`xattr -d com.apple.quarantine /path/to/ghostpaw-affinity`.
Linux binaries require glibc 2.28+; use npx on Alpine.
See the [binary build workflow](.github/workflows/release-binaries.yml).

Each archive is roughly 40-46 MB (the binary embeds the Node runtime, 105-150 MB
unpacked); the npm package is about 2 MB unpacked. Every release, including the
one-liners above, is installed and run on ubuntu-24.04, macos-15 and
windows-2025 by the [install check](.github/workflows/install-check.yml).

## MCP server

Every client below starts the same stdio server: `ghostpaw-affinity mcp`.
Without the binary, use `npx -y @ghostpaw/affinity mcp` as the command instead.

**Claude Code**

```bash
claude mcp add ghostpaw-affinity -- ghostpaw-affinity mcp
```

or as a plugin, which also installs the skill:

```bash
/plugin marketplace add GhostPawJS/affinity
/plugin install ghostpaw-affinity@ghostpaw-affinity
```

**Codex CLI** (`~/.codex/config.toml`)

```toml
[mcp_servers.ghostpaw-affinity]
command = "ghostpaw-affinity"
args = ["mcp"]
```

**Cursor** (`.cursor/mcp.json`), **Claude Desktop** (`claude_desktop_config.json`)
or a project `.mcp.json`:

```json
{
  "mcpServers": {
    "ghostpaw-affinity": {
      "command": "ghostpaw-affinity",
      "args": ["mcp"]
    }
  }
}
```

Claude Desktop users can also install `server.mcpb` from the
[latest GitHub release](https://github.com/GhostPawJS/affinity/releases/latest).
A Dockerfile is included for container hosts:
`docker build -t ghostpaw-affinity . && docker run -i --rm -v affinity:/data ghostpaw-affinity`.

The server speaks MCP 2026-07-28 (stateless, `server/discover`) and the
initialize-based revisions 2025-11-25, 2025-06-18, 2025-03-26 and 2024-11-05.

### Agent Skill

`SKILL.md` (repo root) and `skills/affinity/SKILL.md` follow the
[Agent Skills](https://agentskills.io) format and ship in the npm package.
Copy `skills/affinity/` into your agent's skills folder, or print it:

```bash
ghostpaw-affinity skill > SKILL.md
ghostpaw-affinity skill --list       # workflow guides
ghostpaw-affinity skill bootstrap-and-cold-start
```

## CLI

```sh
export GHOSTPAW_AFFINITY_DB=~/crm/affinity.db      # or --db <path>
ghostpaw-affinity contact create '{"name":"Fox","kind":"human","bootstrapOwner":true}'
ghostpaw-affinity search "jana"                     # names, identities, tags, attributes, roles, events
ghostpaw-affinity contact create '{"name":"Jana Petersen","kind":"human"}'
ghostpaw-affinity identity add --contact '{"contactId":2}' --input '{"type":"email","value":"jana@example.com"}'
ghostpaw-affinity event record --kind interaction --input '{"type":"conversation","occurredAt":"today","summary":"Call re pilot","significance":6,"participants":[{"contactId":2,"role":"recipient","directionality":"mutual"}]}'
ghostpaw-affinity commitment record --input '{"commitmentType":"promise","occurredAt":"today","dueAt":"+3d","summary":"Send proposal","significance":6,"participants":[{"contactId":2,"role":"recipient"}]}'
ghostpaw-affinity attribute set --target '{"kind":"contact","contact":{"contactId":2}}' --name tag:gastro --value null
ghostpaw-affinity review contacts.list --tag gastro
ghostpaw-affinity review contacts.list --attribute pipeline_stage=proposal
ghostpaw-affinity review commitments.open            # overdue promises are flagged
ghostpaw-affinity review links.radar                 # who is drifting, with reasons
ghostpaw-affinity show contact_profile --contact '{"contactId":2}'
ghostpaw-affinity contact export --contact '{"contactId":2}'   # omit --contact for the whole database
ghostpaw-affinity contact delete --contact '{"contactId":2}' --confirm
```

`ghostpaw-affinity skill` prints the full cheat sheet; `skill --list` and
`skill <guide>` print the workflow guides.

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
JSON with ISO date siblings and floats rounded to three decimals. Journal review rows
keep one summary and compact `{id,name,role}` participants. Radar rows keep one link
id, counterparty name, reasons and rounded scores; upcoming link dates omit radar
scores. Default piped writes and `--compact` keep primary and changed ids plus
warnings; explicit `--json` retains full mutation detail. `--compact`
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
`(npm)` or `(library)`. Use `--version --short` in scripts for exact semver
matching. `--version --json` returns `name`, `version`, `variant` and `target`
(the target is null outside a binary). `version --short` and `version --json`
are equivalent.

Read commands (search, show, review and contact export, including direct tool
calls) exit 3 on a missing database without creating files:
`Database not found: <path> (it is created by the first write)`.
The first write creates the database and reports `created <path>` on stderr.
The MCP server continues to create its database on startup.

String-valued flags such as `--value Hamburg`, `--bond 'Warm lead'` and
`--reason 'Different people'` accept plain strings or JSON strings/null.
Object and array flags still require JSON. Tag filters accept both
`--tag gastro-radar` and `--tag tag:gastro-radar`.
Per-command `--help` lists the fields used by that action.

Legacy `tools [--json]`, `describe <tool>`,
`call <tool> [JSON|-]` and `<tool_name> --parameter value` remain available.
`completions bash|zsh|fish` prints shell scripts.

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

## Docs

The live demo runs the library in your browser against an in-memory SQLite database. Each view below opens a different part of it:

- [Dashboard](https://affinity.ghostpaw.dev/docs/): overview and session
- [Contacts](https://affinity.ghostpaw.dev/docs/#/contacts): people, companies, groups and pets you track
- [Relationships](https://affinity.ghostpaw.dev/docs/#/relationships): links, rank and bonds
- [Timeline](https://affinity.ghostpaw.dev/docs/#/timeline): events, commitments and date anchors
- [Insights](https://affinity.ghostpaw.dev/docs/#/insights): radar and analytics

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

Twelve tools shaped around operator intent, not raw storage operations:

| Tool | What it does |
|---|---|
| `search_affinity` | Search contacts by natural key or name |
| `review_affinity` | Dashboard-style list and graph review views |
| `inspect_affinity_item` | Open one exact profile or link detail |
| `manage_contact` | Create, revise, or change contact lifecycle |
| `merge_contacts` | Merge duplicate contacts safely |
| `manage_duplicate_dismissal` | Dismiss or restore a suspected duplicate pair |
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
