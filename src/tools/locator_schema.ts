import {
  booleanSchema,
  integerSchema,
  objectSchema,
  stringSchema,
} from "./tool_metadata.ts";

export function contactLocatorSchema(description: string) {
  return {
    type: "object" as const,
    properties: {
      contactId: integerSchema("Exact contact id."),
      identity: objectSchema(
        {
          type: stringSchema("Identity type."),
          value: stringSchema("Identity value."),
        },
        ["type", "value"],
        "Contact identity locator.",
      ),
    },
    description,
  };
}

export function linkLocatorSchema(description: string, discriminated = false) {
  return {
    type: "object" as const,
    properties: {
      linkId: integerSchema("Exact link id."),
      endpoints: objectSchema(
        {
          fromContactId: integerSchema("From contact id."),
          toContactId: integerSchema("To contact id."),
          ...(discriminated
            ? {
                kind: stringSchema("Optional link kind."),
                role: stringSchema("Optional link role."),
                isStructural: booleanSchema(
                  "Optional structural discriminator.",
                ),
              }
            : {}),
        },
        ["fromContactId", "toContactId"],
        "Endpoint-based link locator.",
      ),
    },
    description,
  };
}

export function discriminatedLinkLocatorSchema(description: string) {
  return linkLocatorSchema(description, true);
}
