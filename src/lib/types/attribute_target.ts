/**
 * Write target for attributes — exactly one of contact, link or event (CONCEPT.md).
 */
export type AttributeTarget =
  | { kind: "contact"; id: number }
  | { kind: "link"; id: number }
  | { kind: "event"; eventId: number };
