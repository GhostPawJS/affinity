# Changelog

All notable changes to this project are documented here.

The format follows Keep a Changelog 1.1.0 and Semantic Versioning.

## [Unreleased]

### Added

- Add atomic identity-aware contact creation with an opt-in return-existing policy, normalized social handles and native DID locators compatible with legacy identities.
- Add JSONL batch writes with chunk transactions, per-line rollback, failure reporting and idempotent external references.
- Add a synthetic social import example and a repeat-import content audit.
- Add compact `skill --short` output and command-based workflow guide references.

- Support unique external event references with idempotent intake, exact event lookup, and event/all search scopes.
- Store verbatim event content up to 1 MB, derive bounded summaries when omitted, and include content in journal/review rows only on request.
- Add event attributes, channel filters, parent/root references and chronological thread reviews.
- Add event revision and confirmed deletion through the library, tool facade, MCP and CLI, with surviving link effects replayed and rollups refreshed.
- Upgrade existing databases in place for event metadata and effect replay baselines.

- Add `--version --short` for exact semver matching and `--version --json` for structured package and variant metadata, including `version` subcommand equivalents.

### Changed

- CLI values are literal by default. Only the JSON payload arguments (`--input`, the positional `<input>`, `--patch` and the `call` argument) read `@path` files and `@-` stdin, `@@text` passes a literal `@text`, and an empty or unreadable path exits 2. Other values, such as names, notes, attribute values and search queries, no longer load a file when they start with `@`. Callers that passed `@path` to other flags must inline the value.
- New database files are created with mode 0600, and a missing parent directory is created with mode 0700. Existing files and directories keep their modes.
- Slim tool review rows: compact named journal participants, one event/link id and summary, rounded radar scores, and upcoming link dates without radar metrics. Compact and default piped CLI mutation output retains ids and warnings rather than repeating full entities.
- Keep the skill entry focused on the CLI cheat sheet and tool index; move parameter details and examples to the embedded `tools` guide.
- Export whole-database events once at the top level, referenced by contact event/date ids; export stored flags as JSON booleans.

### Fixed

- Keep ambient observations and unanswered outbound activity from inflating bond strength or triggering routine radar prompts; avoid automatic moments for observations and follow-like milestones.
- Accept JSON arrays, comma lists and repeated array flags, JSON flag stdin, literal social handles and explicit `@@` escapes.
- Accept SQLite UTC timestamps, round sub-millisecond precision, explain missing event timestamps, and report list review pagination totals and continuation state.

- Reject unknown event/commitment fields and unsupported moment kinds with allowed-field/value diagnostics.
- Preserve NUL-containing event content when reading through node:sqlite and avoid duplicating content in review entity references.

- Match national phone queries by digit suffix, excluding short suffixes.
- Name profile top-link counterparties and exclude date anchors from recent journal events.
- Exclude dormant and lost counterparties from radar unless explicitly included; merged contacts remain excluded.
- Explain that attribute values must be strings or null for numeric and boolean input across CLI and MCP.
- Clarify latest-version installs and profile edits, and document pinned downloads without PATH changes.

- Warn on near-name contact creation using duplicate review similarity scores.
- Suggest CLI commands for bare verbs, plural nouns and misspellings; diagnose unknown leading flags.
- Classify non-commitment resolution as invalid input, and owner deletion and re-merging as conflicts across CLI and MCP.
- Correct merge guidance to name `merge_contacts` and `contact merge`.
- Accept plain text for string-compatible JSON flags and normalize prefixed tag filters.
- Show action-specific flags and requirements in command help.
- Prevent read commands from creating missing databases; writes and MCP startup continue to create them.

- Unify CLI and MCP date parsing, preserve calendar days in additive date fields, and upgrade existing databases in place.
- Exclude future events, commitments and commitment resolutions from contact recency; warn when recording future events.
- Explain radar reasons, identify cadence drift and prioritize entries with actionable reasons.

## [0.5.0] - 2026-10-28

### Added

- Search covers tags, attributes, link roles and event text, matches tokens in
  any order, folds umlauts and diacritics (`Fischbrötchen` = `fischbroetchen`),
  normalizes phone numbers and ranks an exact name first. Results carry
  `matchedOn`. `search` and `review contacts.list` accept `tag` and
  `attribute` (`name` or `name=value`) filters.
- Review rows carry counterparty names, ISO dates and structured fields;
  `events.contact_journal` includes `occurredAt`.
- Open commitments past their due date are flagged `overdue`, sorted first and
  raise the link on `links.radar`, which now lists `reasons`.
- Every time field accepts ISO 8601 with offset, `YYYY-MM-DD`, `today`,
  `tomorrow`, `yesterday` and day offsets such as `+3d`, besides epoch
  milliseconds. The CLI also accepts `DD.MM.YYYY` and uses local days; MCP and
  the tool facade use UTC days.
- `contact_profile` includes recent events, open commitments and structural
  ties; `recentEventsLimit` applies. Merged contacts point to `mergedInto`.
- `contact export` (one contact or the whole database as JSON) and
  `contact delete --confirm` (permanent erase; `lost` remains the soft delete).
  Library: `read.exportContact`, `read.exportAffinity`, `write.deleteContact`.
- Creating a contact warns about likely duplicates (`possible_duplicate`) and
  accepts `identities`. Writes return `data.changes`.
- `skill` opens with a CLI cheat sheet; `skill --list`, `skill <guide>` and
  `skill --help` print the embedded workflow guides. Tool tables inline nested
  parameters with one example per tool.
- `--version` names the variant: `affinity X (binary, linux-x64)`, `(npm)` or
  `(library)`.
- Terminal output is a readable summary with names and dates. Piped JSON adds
  ISO date siblings and drops `entities` when it repeats `data.items`;
  `--compact` omits empty receipt arrays. Unknown commands suggest the closest
  one. A new database is reported on stderr.
- README and site open with one verified install one-liner per platform; the
  install check runs them on every release. SHA256SUMS covers `server.mcpb`.

### Changed

- `[api-change-approved]` Identity `type` must be a documented type
  (`email`, `phone`, `url`, `website`, `handle`, social networks, `address`,
  `other`, `account_id`, `alias`) or `custom:<name>`; emails, phones and URLs are
  validated on add and revise. Stored identities are untouched.
- `[api-change-approved]` Tool handler input types accept time strings; tool
  results round floats to three decimals (stored values keep full precision).
- Unknown or immutable patch keys (`notes`, `kind`) are rejected as invalid
  input instead of returning no_op.
- Exit codes: invalid input exits 2, conflicts and already-resolved commitments
  exit 4 (`conflict` instead of `invalid_state`), internal errors exit 70.
- Search excludes dormant and lost contacts by default (`includeDormant`,
  `includeLost`); merged contacts never appear in lookups.
- A broken or cancelled promise no longer counts as recent contact.
- Error messages name CLI commands and tools instead of library functions, and
  identity conflicts name the owning contact.

### Fixed

- `echo '{...}' | ghostpaw-affinity contact create` reads the object from stdin.
  Stdin is only read implicitly when no other arguments are given.
- Array flags accept JSON objects and JSON arrays (`attribute replace --entries`).
- Relative `--db` and `GHOSTPAW_AFFINITY_DB` paths resolve against the current
  directory and show in `--help`.

## [0.4.1] - 2026-10-27

### Fixed

- Write tools summarize what changed by verb and kind (`Created 1 contact.`, `Created 1 event, 1 link.`) instead of `Found 1 contact change.`.
- `contact create` rejects `isOwner` with a pointer to `bootstrapOwner: true` instead of silently creating a non-owner contact, and a second `bootstrapOwner` names the existing owner contact.
- Flag values that start with dashes are accepted; only a following `--name` token counts as the next flag.

## [0.4.0] - 2026-10-27

### Added

- 27 schema-derived domain CLI commands: `search`, `review`, `show`,
  `contact create|revise|lifecycle|merge`, `identity add|revise|verify|remove`,
  `relationship add|bond|state|tie|untie`, `commitment record|resolve`,
  `attribute set|unset|replace`, `date add|revise|remove`, `event record`,
  `duplicate dismiss|undismiss`. Each has `--help`.
  `completions bash|zsh|fish` prints completion scripts. Nested payloads
  accept JSON or `@path`; all commands work offline.
- Standalone binaries (Node 26.12.1 single executable) for 5 targets:
  linux-x64, linux-arm64, darwin-arm64, darwin-x64 and windows-x64. Each
  release carries SHA256SUMS and a GitHub build provenance attestation per
  archive. Binaries are unsigned; macOS builds carry an ad-hoc signature.
- `install.sh` and `install.ps1` install the binary from the release and
  refuse an archive whose SHA-256 does not match SHA256SUMS.
- An install check workflow installs each published release on
  ubuntu-24.04, macos-15 and windows-2025 and runs `--version`, a write and
  an MCP `initialize` + `tools/list` exchange.

### Changed

- Noun-verb commands exit with 0 (success or no_op), 1 (tool error),
  2 (usage error), 3 (needs clarification or not found), 4 (conflict) or
  70 (internal error). The existing tool-name forms (`manage_contact --action`,
  `call`, `describe`, `tools`) keep their output and exit codes.
- `SurfaceTool` has an optional `cli` field for the command mapping. No other
  public type changed.


## [0.3.0] - 2026-10-24

### Added

- MCP stdio server and CLI generated from the existing tool registry.
- Agent Skill documents, client and directory manifests, Dockerfile, and MCP Bundle packaging.
- Size, API, packed-consumer, startup, and ratchet guards, with offline benchmarks.

- Behavioral coverage for read filters, date revisions, event mechanics, and tool target resolution.
- Contributor and usage guide, including caller-owned SQLite WAL and busy-timeout recommendations.
- Reconstructed release history.

### Changed

- README tool inventory includes duplicate dismissal.
- CI checks that the package has no runtime dependencies.

## [0.2.4] - 2026-04-06

### Fixed

- Package file-list formatting.

## [0.2.3] - 2026-04-06

### Changed

- Release publishing uses GitHub OIDC trusted publishing; corrected workflow configuration.

## [0.2.2] - 2026-03-30

### Added

- `read.getLinksBetween` for querying links between two contacts.

## [0.2.1] - 2026-03-30

### Fixed

- Self-referential links after contact merges.

## [0.2.0] - 2026-03-30

### Added

- Duplicate-pair dismissal and reversal to suppress false-positive duplicate suggestions.

## [0.1.6] - 2026-03-29

### Fixed

- Tool input schemas and handler ergonomics.

## [0.1.5] - 2026-03-29

### Fixed

- Relationship tool input handling; added contact-kind search filter coverage.

## [0.1.4] - 2026-03-29

### Changed

- Relationship guidance and schemas; added interactive demo scripts, documentation, and Pages workflow.

## [0.1.3] - 2026-03-23

### Changed

- Formatter and package configuration consistency.

## [0.1.2] - 2026-03-23

### Changed

- Package file-list readability and formatter exclusions.

## [0.1.1] - 2026-03-23

### Changed

- Distribution file-list configuration.

## [0.1.0] - 2026-03-23

### Added

- Initial SQLite relationship model with contacts, identities, links, events, attributes, recurring dates, graph queries, and safe merges.
- Public read and write namespaces, tool facade, skills, and relationship guidance.
- Validation, tests, API documentation, lifecycle examples, and release workflows.

[Unreleased]: https://github.com/GhostPawJS/affinity/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/GhostPawJS/affinity/compare/v0.4.1...v0.5.0
[0.4.1]: https://github.com/GhostPawJS/affinity/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/GhostPawJS/affinity/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/GhostPawJS/affinity/compare/v0.2.4...v0.3.0
[0.2.4]: https://github.com/GhostPawJS/affinity/compare/v0.2.3...v0.2.4
[0.2.3]: https://github.com/GhostPawJS/affinity/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/GhostPawJS/affinity/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/GhostPawJS/affinity/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/GhostPawJS/affinity/compare/v0.1.6...v0.2.0
[0.1.6]: https://github.com/GhostPawJS/affinity/compare/v0.1.5...v0.1.6
[0.1.5]: https://github.com/GhostPawJS/affinity/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/GhostPawJS/affinity/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/GhostPawJS/affinity/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/GhostPawJS/affinity/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/GhostPawJS/affinity/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/GhostPawJS/affinity/releases/tag/v0.1.0
