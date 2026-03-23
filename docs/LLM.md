# Affinity LLM Building Blocks

This document is for harness builders using Affinity’s additive agent-facing
runtime.

If you are a human operator using the direct package surface in ordinary code,
read [`HUMAN.md`](HUMAN.md) instead. That document covers `initAffinityTables`,
`read`, `write`, `types`, and `errors`. This document is only about:

- `soul`
- `tools`
- `skills`

Typical harness-facing usage:

```ts
import { skills, soul, tools } from "@ghostpaw/affinity";
```

## Runtime Stack

Affinity’s additive runtime is intentionally layered:

1. `soul`
2. `tools`
3. `skills`

The layers work together like this:

- `soul` shapes posture and judgment
- `tools` are the executable action surface
- `skills` teach recurring workflows built from tools

## Soul

The soul is the thinking foundation.

It does not define what the model can do. It defines how the model should see
the domain, which boundaries it should protect, and what kind of judgment it
should apply before touching state.

Affinity exports this through the root `soul` namespace:

- `soul.affinitySoul`
- `soul.affinitySoulEssence`
- `soul.affinitySoulTraits`
- `soul.renderAffinitySoulPromptFoundation()`

The runtime soul shape is:

```ts
interface AffinitySoul {
  slug: string;
  name: string;
  description: string;
  essence: string;
  traits: readonly {
    principle: string;
    provenance: string;
  }[];
}
```

Use the soul layer for:

- system or role-prompt foundation
- reminding the model to protect evidence truth
- reinforcing clarification over guessing
- keeping structural, relational, observational, commitment, and recurring-date
  truths separate

Do not use the soul layer as an execution surface.

## Tools

The direct library surface is intentionally explicit. That is good for humans,
but too many choices for reliable LLM selection. The `tools` facade reconciles
the public direct surface into a smaller set of intent-shaped tools with:

- fewer top-level choices
- strict JSON-schema-compatible inputs
- explicit action and view discriminators
- structured machine-readable outcomes
- clarification paths for ambiguous targets

The current `tools` namespace exports exactly these 11 tools:

- `search_affinity`
- `review_affinity`
- `inspect_affinity_item`
- `manage_contact`
- `merge_contacts`
- `manage_identity`
- `manage_relationship`
- `record_event`
- `manage_commitment`
- `manage_date_anchor`
- `manage_attribute`

### Tool outcomes

Every tool returns one of four outcomes:

- `success`
- `no_op`
- `needs_clarification`
- `error`

Failures are also categorized explicitly:

- `protocol`
- `domain`
- `system`

That means a harness does not need to infer intent from vague prose or thrown
exceptions.

### Locator discipline

To keep tool inputs explicit and low-ambiguity:

- contacts can be addressed by `contactId`
- contacts can also be addressed by an exact identity locator: `{ type, value }`
- links can be addressed by `linkId`
- links can also be addressed by explicit endpoints

When an endpoint-based link locator matches multiple live links, the tool
returns `needs_clarification` instead of guessing.

### Output conventions

Read-oriented tools prefer compact, review-friendly outputs:

- `items`
- `count`
- `appliedFilters`
- `chart` for graph review

Write-oriented tools preserve the mutation receipt shape in a denser wrapper:

- `primary`
- `created`
- `updated`
- `archived`
- `removed`
- `affectedLinks`
- `derivedEffects`

All tools may also return:

- `entities`
- `warnings`
- `next`

Canonical reconciliation is tracked in `src/tools/tool_mapping.ts`.

## Skills

The tool layer makes action selection smaller and clearer, but recurring CRM
workflows still benefit from reusable guidance.

The `skills` layer sits above `tools` and packages the main operating patterns
into prompt-ready blocks that a harness can inject into model context or
retrieve by name.

Each skill exports:

- `name`
- `description`
- `content`

The runtime shape is:

```ts
interface AffinitySkill {
  name: string;
  description: string;
  content: string;
}
```

Skills are not handlers. They are reusable guidance objects that teach:

- which tools to prefer
- how to sequence them
- how to validate the outcome
- which pitfalls to avoid

The canonical registry is surfaced at the package root through `skills`:

- `skills.affinitySkills`
- `skills.listAffinitySkills()`
- `skills.getAffinitySkillByName()`

The current `skills` namespace exports these 11 workflow blocks:

- `bootstrap-and-cold-start`
- `identify-and-locate-contacts`
- `import-history-without-faking-evidence`
- `model-structure-orgs-and-households`
- `record-direct-evidence-well`
- `record-observations-and-referrals`
- `capture-transactions-and-commercial-events`
- `manage-promises-and-agreements`
- `manage-recurring-dates-and-reminders`
- `review-radar-progression-and-graph`
- `reconcile-duplicates-and-merge-safely`

## Design Boundary

`soul`, `tools`, and `skills` are additive. They do not replace the direct
library surface.

Humans still get the precise direct-code API. Harnesses get a smaller, clearer
runtime stack on top of the same truthful core:

- `soul` for behavioral foundation
- `tools` for actions
- `skills` for workflow guidance
