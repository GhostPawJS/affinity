# Changelog

All notable changes to this project are documented here.

The format follows Keep a Changelog 1.1.0 and Semantic Versioning.

## [Unreleased]

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

[Unreleased]: https://github.com/GhostPawJS/affinity/compare/v0.3.0...HEAD
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
