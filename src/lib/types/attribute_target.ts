/**
 * Write target for attributes — exactly one of contact or link (CONCEPT.md).
 */
export type AttributeTarget =
  | { kind: "contact"; id: number }
  | { kind: "link"; id: number };
