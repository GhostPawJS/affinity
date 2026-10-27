import { defineAffinitySkill } from "./skill_types.ts";

export const reviewRadarProgressionAndGraphSkill = defineAffinitySkill({
  name: "review-radar-progression-and-graph",
  description:
    "Use the review surfaces to prioritize maintenance, understand progression readiness, and read the shape of the relationship graph without guessing from raw rows.",
  content: `# Review Radar, Progression, And Graph

CLI and MCP share epoch ms, ISO with Z/offset, YYYY-MM-DD, DD.MM.YYYY,
today/yesterday/tomorrow and signed day offsets (+3d/-2d).
Date-only values keep their day with UTC boundaries; keywords use the process
local date. Read occurredOn/dueOn and review occursOn for calendar dates;
*Iso fields stay UTC. Future events warn and count as contact only when their
time and day arrive. Commitments and resolutions never reset recency/cadence.
Radar explains overdue promises and drift (gap > 1.5 times cadence).

Primary tools:
- \`review_affinity\`
- \`inspect_affinity_item\`

Goal:
- Turn review surfaces into a disciplined operating loop for outreach, prioritization, and graph understanding.

When to use:
- You need a daily or weekly maintenance pass.
- You want to know who is drifting, who is ready for deeper investment, or how the network is structured.

When not to use:
- You already know the one exact item you need to inspect in depth.
- You are mutating state and only need confirmation of a single write result.

Step-by-step sequence:
1. Start with \`review_affinity\` on the highest-level view that matches the question: radar, owner links, progression readiness, graph, moments, or a timeline view.
2. Use radar when the question is who needs attention now.
3. Use progression readiness when the question is where additional positive investment is most likely to deepen a relationship.
4. Use graph review when the question is network shape, bridges, clusters, or hidden centrality.
5. Use journal or timeline views when a score needs narrative context before action.
6. Escalate to \`inspect_affinity_item\` only after the review surface identifies the exact target worth opening deeply.

Validation checks:
- The chosen review surface actually matches the decision you are trying to make.
- You inspected context before acting on a surprising score.
- Follow-up work targets the right contact or link rather than the loudest metric.

Pitfalls:
- Do not treat radar as a command to act blindly without context.
- Do not confuse progression readiness with relationship importance; they answer different questions.
- Do not rely on one score when a timeline or graph view would explain the situation better.

Tips and tricks:
- Review flows are strongest when used rhythmically rather than sporadically.
- Use graph review to understand bridges and clusters, then use timeline or profile inspection for the exact story behind them.
- Empty results can still be informative: they may confirm that maintenance debt is currently low.

Tool calls to prefer:
- \`review_affinity\` for all dashboard-style surfaces
- \`inspect_affinity_item\` for exact deep follow-up

Related skills:
- \`record-direct-evidence-well\`
- \`manage-recurring-dates-and-reminders\`
- \`reconcile-duplicates-and-merge-safely\``,
});
