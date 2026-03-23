import { deepStrictEqual, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  arraySchema,
  enumSchema,
  integerSchema,
  objectSchema,
  stringSchema,
} from "./tool_metadata.ts";

describe("tool_metadata", () => {
  it("builds object schemas with additionalProperties disabled", () => {
    const schema = objectSchema(
      {
        id: integerSchema("id"),
        name: stringSchema("name"),
      },
      ["id"],
      "object",
    );
    strictEqual(schema.type, "object");
    strictEqual(schema.additionalProperties, false);
    deepStrictEqual(schema.required, ["id"]);
  });

  it("builds enum and array schemas", () => {
    const status = enumSchema("status", ["a", "b"]);
    strictEqual(status.type, "string");
    deepStrictEqual(status.enum, ["a", "b"]);

    const list = arraySchema(stringSchema("item"), "items");
    strictEqual(list.type, "array");
    strictEqual(list.items?.type, "string");
  });
});
