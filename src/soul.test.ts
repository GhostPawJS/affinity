import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  affinitySoul,
  affinitySoulEssence,
  affinitySoulTraits,
  renderAffinitySoulPromptFoundation,
} from "./soul.ts";

describe("affinity soul", () => {
  it("exports the canonical soul shape and selected traits", () => {
    strictEqual(affinitySoul.slug, "gardener");
    strictEqual(affinitySoul.name, "Gardener");
    strictEqual(affinitySoul.essence, affinitySoulEssence);
    strictEqual(affinitySoul.traits, affinitySoulTraits);
    strictEqual(affinitySoul.traits.length, 6);

    for (const trait of affinitySoulTraits) {
      strictEqual(trait.principle.trim().length > 0, true);
      strictEqual(trait.provenance.trim().length > 0, true);
    }
  });

  it("renders a prompt foundation that includes the essence and every trait", () => {
    const prompt = renderAffinitySoulPromptFoundation();

    ok(prompt.includes("Gardener (gardener)"));
    ok(prompt.includes(affinitySoul.description));
    ok(prompt.includes(affinitySoulEssence.slice(0, 80)));
    for (const trait of affinitySoulTraits) {
      ok(prompt.includes(trait.principle));
      ok(prompt.includes(trait.provenance));
    }
  });
});
