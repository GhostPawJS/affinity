/**
 * Stable handle for anything that can appear in mutation receipts — CONCEPT.md Common refs.
 */
export type EntityRef =
  | { kind: "contact"; id: number }
  | { kind: "identity"; id: number }
  | { kind: "link"; id: number }
  | { kind: "event"; id: number }
  | { kind: "attribute"; id: number };
