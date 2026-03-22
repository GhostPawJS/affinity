import type { RelationalLinkKind, StructuralLinkKind } from "./types.ts";

const RELATIONAL = new Set<string>([
  "personal",
  "family",
  "professional",
  "romantic",
  "care",
  "service",
  "observed",
  "other_relational",
]);

const STRUCTURAL = new Set<string>([
  "works_at",
  "manages",
  "member_of",
  "married_to",
  "partner_of",
  "parent_of",
  "child_of",
  "sibling_of",
  "friend_of",
  "client_of",
  "vendor_of",
  "reports_to",
  "belongs_to",
  "other_structural",
]);

export function isRelationalLinkKind(kind: string): kind is RelationalLinkKind {
  return RELATIONAL.has(kind);
}

export function isStructuralLinkKind(kind: string): kind is StructuralLinkKind {
  return STRUCTURAL.has(kind);
}
