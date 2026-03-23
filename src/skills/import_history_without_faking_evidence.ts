import { defineAffinitySkill } from "./skill_types.ts";

export const importHistoryWithoutFakingEvidenceSkill = defineAffinitySkill({
  name: "import-history-without-faking-evidence",
  description:
    "Import pre-existing relationship state honestly, using seeded links for known history instead of inventing fake journal evidence.",
  content: `# Import History Without Faking Evidence

Primary tools:
- \`manage_contact\`
- \`manage_identity\`
- \`manage_relationship\`
- \`inspect_affinity_item\`

Goal:
- Represent real pre-system relationship state without fabricating a timeline of events that never existed inside Affinity.

When to use:
- You are migrating from another CRM, notes system, or memory set.
- You already know a relationship exists and roughly how strong or active it is, but you do not want to reconstruct every past interaction.

When not to use:
- A new event just happened and should affect mechanics now.
- You are recording a specific conversation, milestone, transaction, or observation.

Step-by-step sequence:
1. Create or locate the relevant contacts first.
2. Add the strongest identities you know so the imported graph stays addressable later.
3. Use \`manage_relationship\` with \`action: "seed_social_link"\` to establish a relational link that already existed before the system.
4. Set only the fields you can justify: kind, rough rank, trust, cadence, state, and optional bond.
5. Inspect the result with \`inspect_affinity_item\` if you need to verify the exact post-import state.
6. From that point forward, switch to evidence tools for all new real-world activity.

Validation checks:
- The imported contact pair now has the expected relational link.
- The seeded state looks plausible when inspected.
- Later direct events continue progression from the seeded baseline rather than from zero.

Pitfalls:
- Do not backfill dozens of fake conversations just to reach a desired rank.
- Do not use import seeding for ordinary day-to-day relationship maintenance.
- Do not overstate confidence on rank or trust when the historical truth is actually vague.

Tips and tricks:
- Seed conservatively if you are unsure. It is safer to underclaim and let real future evidence move the link.
- Use bond text sparingly as a narrative reminder of why the imported state is what it is.
- Prefer one honest seed over many synthetic event reconstructions.

Tool calls to prefer:
- \`manage_relationship\` with \`seed_social_link\`
- \`manage_contact\` and \`manage_identity\` before seeding
- \`inspect_affinity_item\` for post-import verification

Related skills:
- \`bootstrap-and-cold-start\`
- \`record-direct-evidence-well\``,
});
