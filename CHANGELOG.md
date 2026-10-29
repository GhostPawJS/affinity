# Changelog

All notable changes to this project are documented here.

The format follows Keep a Changelog 1.1.0 and Semantic Versioning.

## [Unreleased]

## [0.6.1] - 2026-10-29

### Fixed

- CLI content reviews print each row once, omitting redundant entities.
- Event inspection and library event reads expose stored provenance.
- Attribute tools accept event external references; unchanged values return no_op without updating timestamps, including in batch counts.
- CLI/MCP startup installs the busy timeout before WAL setup and serializes schema initialization to avoid parallel-reader lock races.
- Thread reviews apply event-type filters before pagination.
- Contact and full exports resolve parent references consistently with event inspection.
- Review limits now accept 1..10000, with an explicit offset paging hint on invalid limits.
- Sub-millisecond timestamps truncate rather than round; tool/CLI/MCP intake retains raw high-precision occurredAt/dueAt strings in provenance.
- CLI nits: binary-first short skill instructions, batch in top-level help, clean input error paths, documented deprecated --include-content alias, and a 0.5 default duplicate review score (explicit 0 retains weak matches).

### Changed

- Like/follow/repost event labels default to affectsBond:false across event families. Explicit true remains supported; low-significance observations retain their ambient default.

## [0.6.0] - 2026-10-28

### Added

- Events take an optional `externalRef` (`{source, id}`), unique per source. Recording the same ref again returns `no_op` with the existing event id. Look an event up with `show event --ref-source <s> --ref-id <id>` or search event text with `search --scope events|all`.
- Events store verbatim `content` up to 1 MB. A summary is derived only when none is given. Journal and review rows include content only with `--with-content` (`includeContent`).
- Events take a `channel`, a `parentRef` or `parentEventId`, and a `threadRef`. Attributes can target an event. `review events.thread` lists a thread in order.
- `event revise` and `event delete --confirm` (tool `manage_event`, library `reviseEvent` and `deleteEvent`) take an event id or an external ref. Link effects of the remaining events are replayed and rollups refreshed.
- `contact create` accepts `identities`. An identity owned by another contact fails with exit 4 and `existingContactId`, and nothing is written. `--if-exists return` (`ifExists: "return"`) returns the existing contact as `no_op`.
- Native `did` identity type (alias `atproto_did`). Handles are normalized: a leading `@` is dropped and case is folded. Invalid handles fail with exit 2. Locators still find legacy `custom:atproto-did` rows.
- `batch` reads JSONL tool calls from stdin in one transaction, or in chunks with `--chunk N`. A failed line rolls back alone and is reported with its line number. `--stop-on-error` stops at the first failure.
- `scripts/examples/import_social_jsonl.mjs` converts a social export into batch lines. `scripts/examples/import_dry_run.mjs` imports a synthetic 12-account fixture twice and checks that the second run creates 0 contacts and 0 events.
- `skill --short` prints a 28-line cheat sheet.
- `--version --short` prints the bare semver. `--version --json` prints package, version and variant.
- Date-only values keep their calendar day in the new `occurredOn`, `dueOn` and `occursOn` fields. Existing databases are upgraded in place.

### Changed

- CLI values are literal by default. Only the JSON payload arguments (`--input`, the positional `<input>`, `--patch` and the `call` argument) read files: `@path` reads the file, `@-` reads stdin and `@@text` passes a literal `@text`. An empty or unreadable path exits 2. Other values such as names, notes, attribute values and search queries no longer load a file when they start with `@`. Callers that passed `@path` to those flags must inline the value.
- New database files are created with mode 0600. A missing parent directory is created with mode 0700. Existing files and directories keep their modes.
- Unknown event and commitment fields fail with exit 2 and list the allowed fields. `momentKind` accepts only `breakthrough`, `rupture`, `reconciliation`, `milestone` and `turning_point`.
- Smaller review output: a journal row went from 433 to 279 bytes, a radar row from 352 to 242 bytes, an upcoming-date row from 488 to 217 bytes and a compact receipt from 314 to 167 bytes.
- The printed skill went from 33,151 to 9,988 bytes. Parameter details moved to the `tools` guide (`skill tools`), and guides are named by command instead of `references/*.md` links.
- Whole-database export lists each event once (5,089 to 2,789 bytes on the test fixture) and stores flags as JSON booleans.
- Array flags such as `--event-types` accept a JSON array, a comma list or repeated flags. JSON flags accept `-` for stdin.
- `review links.owner` and other list views report `total` and `hasMore` for paging with `--limit` and `--offset`.

### Fixed

- Replies, likes and follows from one side no longer raise affinity or trigger radar check-ins. A follow is no longer recorded as a breakthrough.
- CLI and MCP share one date parser. A date-only value no longer shifts by a day in time zones west of UTC.
- Future events, commitments and resolutions no longer count as recent contact. Recording a future event returns a `future_event` warning.
- Radar entries explain their reason, flag cadence drift when the gap exceeds 1.5 times the cadence, and sort entries with a reason first. Dormant and lost contacts are hidden unless requested.
- A missing `occurredAt` explains the accepted formats. SQLite UTC timestamps such as `2026-10-27 17:51:33` are accepted.
- `search @handle` finds the contact. National phone numbers match by digit suffix.
- Creating a contact with a near-duplicate name (for example Brand and Brandt) returns a duplicate warning.
- Misspelled commands get a suggestion, and an unknown flag names itself (`Unknown flag: --bogus-flag`). Each command has its own `--help` with its flags.
- Resolving a non-commitment exits 2. Deleting the owner and re-merging a merged contact exit 4.
- Read commands on a missing database exit 3 and no longer create the file.
- Plain text is accepted for string-valued JSON flags, and a `tag:` prefix is stripped from tag filters.
- Numeric and boolean attribute values get a clear error naming the accepted types.
- Profile top links name the counterparty, and date anchors no longer appear in recent events.
- Writing to a closed pipe (`| head`) ends quietly instead of printing a stack trace.
- The README explains latest and pinned installs and when `~/.profile` is edited.

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

[Unreleased]: https://github.com/GhostPawJS/affinity/compare/v0.6.0...HEAD
[0.6.0]: https://github.com/GhostPawJS/affinity/compare/v0.5.0...v0.6.0
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
