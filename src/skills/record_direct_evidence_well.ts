import { defineAffinitySkill } from "./skill_types.ts";

export const recordDirectEvidenceWellSkill = defineAffinitySkill({
  name: "record-direct-evidence-well",
  description:
    "Record direct owner-facing social evidence in a way that produces truthful mechanics, good moments, and useful future review surfaces.",
  content: `# Record Direct Evidence Well

Primary tools:
- \`record_event\`
- \`inspect_affinity_item\`
- \`review_affinity\`
- \`manage_relationship\`

Goal:
- Capture what really happened between the owner and other contacts so Affinity can derive progression, trust, cadence, and moments cleanly.

When to use:
- A conversation, activity, support exchange, conflict, correction, milestone, or direct operational interaction just happened.
- You want future radar, progression, journal, and chart views to reflect the event truthfully.

When not to use:
- You are importing pre-system history.
- You only observed third parties and were not directly part of the relationship evidence.

Step-by-step sequence:
1. Confirm the participants first. Use exact contacts whenever possible.
2. Use \`record_event\` with the smallest honest event family: \`interaction\` for ordinary direct evidence, \`milestone\` when the event is truly milestone-shaped, or another event family only when it better matches reality.
3. Set significance conservatively. Use high significance only when the event genuinely changed the relationship.
4. Let the system auto-create owner-facing links when appropriate instead of manually seeding a link just because a direct event happened.
5. Review the receipt or inspect the resulting profile when you need to understand the effect.
6. Use \`review_affinity\` on journal, timeline, moments, or readiness views when you need context after a sequence of events.

Validation checks:
- The right contacts were involved.
- The event family matches what really happened.
- The resulting mechanics feel plausible when reviewed.

Pitfalls:
- Do not inflate significance to force a rank-up.
- Do not turn ordinary direct evidence into a milestone just to get a dramatic moment.
- Do not use bond text as evidence. If the bond changed but no event happened, revise the bond separately.
- Do not guess through ambiguity; clarify the target first.

Tips and tricks:
- Conflict and correction are both first-class direct evidence. Use them honestly rather than hiding them inside generic summaries.
- Multi-participant owner events can refresh multiple links at once. That is a feature, not a bug.
- If you need to label the current narrative reading without changing mechanics, use \`manage_relationship\` with \`revise_bond\` after the evidence is recorded.

Tool calls to prefer:
- \`record_event\` for the evidence itself
- \`inspect_affinity_item\` for exact read-back
- \`review_affinity\` for journals, timelines, moments, and readiness
- \`manage_relationship\` only for bond interpretation after the fact

Related skills:
- \`record-observations-and-referrals\`
- \`review-radar-progression-and-graph\``,
});
