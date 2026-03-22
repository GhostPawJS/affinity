/** Structural tie kinds — CONCEPT.md `links.kind` (structural). */
export type StructuralLinkKind =
  | "works_at"
  | "manages"
  | "member_of"
  | "married_to"
  | "partner_of"
  | "parent_of"
  | "child_of"
  | "sibling_of"
  | "friend_of"
  | "client_of"
  | "vendor_of"
  | "reports_to"
  | "belongs_to"
  | "other_structural";

/** Relational social-link kinds — CONCEPT.md `links.kind` (relational). */
export type RelationalLinkKind =
  | "personal"
  | "family"
  | "professional"
  | "romantic"
  | "care"
  | "service"
  | "observed"
  | "other_relational";

export type LinkKind = StructuralLinkKind | RelationalLinkKind;

/** Relational link state — structural ties leave this unset at rest in SQL. */
export type LinkState =
  | "active"
  | "dormant"
  | "strained"
  | "broken"
  | "archived";
