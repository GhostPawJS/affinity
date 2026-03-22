/** Visible contact kind — see CONCEPT.md `contacts.kind`. */
export type ContactKind =
  | "human"
  | "group"
  | "company"
  | "team"
  | "pet"
  | "service"
  | "other";

/** Lifecycle for a contact row — see CONCEPT.md `contacts.lifecycle_state`. */
export type ContactLifecycleState = "active" | "dormant" | "merged" | "lost";
