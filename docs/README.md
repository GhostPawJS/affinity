# Affinity — architecture

This document will describe package architecture, invariants, lifecycle, and mechanics summary. See the repository `CONCEPT.md` for the full authoritative specification until this guide is expanded.

## Invariants (preview)

- Entity, identity, evidence, participation, relationships, and metadata stay in separate concerns.
- Relationship state is derived from evidence plus explicit overrides where allowed.
- Writes are intention-shaped; callers do not set progression fields directly.

## Layout

Source and docs layout follow the top-level `CONCEPT.md` “Package layout” and “Human-facing docs layout” sections.
