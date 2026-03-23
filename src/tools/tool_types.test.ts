import { deepStrictEqual, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  toolFailure,
  toolNeedsClarification,
  toolNoOp,
  toolSuccess,
  toolWarning,
} from "./tool_types.ts";

describe("tool_types", () => {
  it("builds success and no-op results", () => {
    const success = toolSuccess("ok", { count: 1 }, { entities: [] });
    strictEqual(success.ok, true);
    strictEqual(success.outcome, "success");
    deepStrictEqual(success.data, { count: 1 });

    const noop = toolNoOp("noop", { count: 0 });
    strictEqual(noop.ok, true);
    strictEqual(noop.outcome, "no_op");
  });

  it("builds clarification and failure results", () => {
    const clarification = toolNeedsClarification(
      "missing_required_choice",
      "Need a target.",
      ["contact"],
      { options: [{ label: "Ada", value: 1 }] },
    );
    strictEqual(clarification.ok, false);
    strictEqual(clarification.outcome, "needs_clarification");
    strictEqual(clarification.clarification.missing[0], "contact");

    const failure = toolFailure(
      "domain",
      "not_found",
      "Missing.",
      "Contact not found.",
      { warnings: [toolWarning("empty_result", "Nothing there.")] },
    );
    strictEqual(failure.ok, false);
    strictEqual(failure.outcome, "error");
    strictEqual(failure.error.code, "not_found");
    strictEqual(failure.warnings?.length, 1);
  });
});
