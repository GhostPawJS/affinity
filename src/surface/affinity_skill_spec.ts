import { affinitySkills } from "../skills/skill_registry.ts";
import { affinitySoulTraits } from "../soul.ts";
import { affinityMcpInstructions } from "./affinity_mcp_instructions.ts";
import { affinitySurfaceTools } from "./affinity_surface_tools.ts";

export const affinityCliExamples: Record<string, string> = {
  search_affinity: 'ghostpaw-affinity search "Jana"',
  review_affinity:
    "ghostpaw-affinity review events.contact_journal --with-content --channel bluesky --contact '{\"contactId\":2}'",
  inspect_affinity_item:
    "ghostpaw-affinity show contact_profile --contact '{\"contactId\":2}'",
  manage_contact:
    'ghostpaw-affinity contact create \'{"name":"Fox","kind":"human","bootstrapOwner":true}\'',
  merge_contacts:
    'ghostpaw-affinity contact merge --winner \'{"contactId":2}\' --loser \'{"contactId":8}\' --reason-summary "same person"',
  manage_duplicate_dismissal:
    "ghostpaw-affinity duplicate dismiss --left '{\"contactId\":5}' --right '{\"contactId\":10}' --reason '\"different people\"'",
  manage_identity:
    'ghostpaw-affinity identity add --contact \'{"contactId":2}\' --input \'{"type":"email","value":"jana@x.de"}\'',
  manage_relationship:
    "ghostpaw-affinity relationship tie --from '{\"contactId\":2}' --to '{\"contactId\":3}' --kind works_at --role Founder",
  manage_event: `ghostpaw-affinity event revise --event-id 1 --patch '{"summary":"Corrected"}'`,
  record_event:
    'ghostpaw-affinity event record --kind interaction --input \'{"type":"conversation","occurredAt":"today","summary":"Call re pilot","significance":6,"participants":[{"contactId":2,"role":"recipient","directionality":"mutual"}]}\'',
  manage_commitment:
    'ghostpaw-affinity commitment record --input \'{"commitmentType":"promise","occurredAt":"today","dueAt":"+3d","summary":"Send proposal","significance":6,"participants":[{"contactId":2,"role":"recipient"}]}\'',
  manage_date_anchor:
    'ghostpaw-affinity date add --input \'{"target":{"kind":"contact","contact":{"contactId":2}},"recurrenceKind":"birthday","anchorMonth":11,"anchorDay":3,"summary":"Jana bday","significance":4}\'',
  manage_attribute:
    'ghostpaw-affinity attribute set --target \'{"kind":"contact","contact":{"contactId":2}}\' --name pipeline_stage --value \'"proposal"\'',
};

export const affinityCheatSheet =
  '## CLI cheat sheet\n\nInstall: `curl -fsSL https://raw.githubusercontent.com/GhostPawJS/affinity/main/install.sh | sh`\nWindows: `irm https://raw.githubusercontent.com/GhostPawJS/affinity/main/install.ps1 | iex`\n\n```sh\nexport GHOSTPAW_AFFINITY_DB=/abs/path/affinity.db\n# Or --db; default ~/.ghostpaw/affinity.db. Piped output is JSON; --compact omits empty receipt arrays.\n# Version: --version includes variant; scripts should use --version --short for exact semver matching.\n# --version --json (or version --json) returns name, version, variant, target (null outside a binary).\n# Missing DB reads exit 3 and create nothing; the first write creates it. MCP creates on startup.\n# JSON: --input - reads stdin; @existing-file loads a value, @@x escapes @x. Use stdin/@file for E2BIG.\n# Arrays accept JSON, comma lists or repeats. Tag filters accept gastro-radar or tag:gastro-radar. Use per-command --help for action flags.\n# Exit: 0 ok/no_op, 1 tool error, 2 usage/invalid input, 3 not found/clarification, 4 conflict, 70 internal.\n# Dates: epoch ms, ISO with offset/Z, YYYY-MM-DD, DD.MM.YYYY, today, tomorrow, +3d, -2d.\n# CLI and MCP use the same grammar, including yesterday. Keywords use the local date.\n# Date-only occurredAt uses UTC midnight; dueAt uses UTC end of day; calendar days are preserved.\n# Read occurredOn/dueOn/occursOn for days; *Iso stays UTC. Future events warn and do not count yet.\n# Commitments and resolutions do not reset recency; radar drift means gap > 1.5 times cadence.\nghostpaw-affinity contact create \'{"name":"Fox","kind":"human","bootstrapOwner":true}\'\nghostpaw-affinity search "Jana" # Search names, identities, tags, attributes, roles and events before creating.\nghostpaw-affinity contact create \'{"name":"Jana Petersen","kind":"human"}\' --if-exists return\nghostpaw-affinity identity add --contact \'{"contactId":2}\' --input \'{"type":"email","value":"jana@x.de"}\'\nghostpaw-affinity relationship tie --from \'{"contactId":2}\' --to \'{"contactId":3}\' --kind works_at --role Founder\nghostpaw-affinity relationship add --from \'{"contactId":1}\' --to \'{"contactId":2}\' --kind professional --role lead\nghostpaw-affinity event record --kind interaction --input \'{"type":"conversation","occurredAt":"today","summary":"Call re pilot","significance":6,"participants":[{"contactId":2,"role":"recipient","directionality":"mutual"}]}\'\nghostpaw-affinity commitment record --input \'{"commitmentType":"promise","occurredAt":"today","dueAt":"+3d","summary":"Send proposal","significance":6,"participants":[{"contactId":2,"role":"recipient"}]}\'\nghostpaw-affinity commitment resolve --commitment-event-id 6 --resolution kept\nghostpaw-affinity date add --input \'{"target":{"kind":"contact","contact":{"contactId":2}},"recurrenceKind":"birthday","anchorMonth":11,"anchorDay":3,"summary":"Jana bday","significance":4}\'\nghostpaw-affinity attribute set --target \'{"kind":"contact","contact":{"contactId":2}}\' --name pipeline_stage --value \'"proposal"\'\nghostpaw-affinity attribute set --target \'{"kind":"contact","contact":{"contactId":2}}\' --name tag:gastro-radar --value null\nghostpaw-affinity show contact_profile --contact \'{"contactId":2}\'\nghostpaw-affinity review events.contact_journal --with-content --channel bluesky --contact \'{"contactId":2}\'\nghostpaw-affinity search --scope events "record id"\nghostpaw-affinity review links.radar\nghostpaw-affinity review commitments.open\nghostpaw-affinity review dates.upcoming --horizon-days 14\nghostpaw-affinity review contacts.list --tag gastro-radar\nghostpaw-affinity review contacts.list --attribute pipeline_stage=proposal\nghostpaw-affinity review contacts.duplicates\nghostpaw-affinity contact merge --winner \'{"contactId":2}\' --loser \'{"contactId":8}\' --reason-summary "same person"\nghostpaw-affinity duplicate dismiss --left \'{"contactId":5}\' --right \'{"contactId":10}\' --reason \'"different people"\'\nghostpaw-affinity contact revise \'{"contactId":3}\' --patch \'{"name":"New Name"}\'\nghostpaw-affinity contact lifecycle \'{"contactId":9}\' dormant\nghostpaw-affinity relationship state --link \'{"linkId":7}\' --state dormant\nghostpaw-affinity event revise --event-id 12 --patch \'{"summary":"Corrected"}\'\nghostpaw-affinity event delete --event-id 12 --confirm\nghostpaw-affinity contact export --contact \'{"contactId":2}\'\nghostpaw-affinity contact delete --contact \'{"contactId":2}\' --confirm\n```\n\nBatch imports: use `ghostpaw-affinity batch --chunk 500 < import.jsonl` with {tool,args} lines. See `ghostpaw-affinity skill import-history-without-faking-evidence`.\n\nFor bots and agents: run `ghostpaw-affinity mcp` for MCP stdio, or use this CLI with `--json`. Read a guide with `ghostpaw-affinity skill <guide>`.\n';

export const affinityShortCheatSheet = [
  "## CLI cheat sheet",
  "",
  "Install binary: curl -fsSL https://raw.githubusercontent.com/GhostPawJS/affinity/main/install.sh | sh (npm alternative: npm install -g @ghostpaw/affinity; Node 24+)",
  "DB: --db <path>, GHOSTPAW_AFFINITY_DB, ~/.ghostpaw/affinity.db (in order).",
  "Dates: epoch ms, ISO Z/offset, SQLite UTC, YYYY-MM-DD, DD.MM.YYYY, today, yesterday, tomorrow, +3d, -2d.",
  "Exit: 0 success/no_op, 1 failure, 2 invalid input, 3 missing/clarification, 4 conflict, 70 internal.",
  "JSON payloads (--input, --patch, call): - or @- reads stdin, @path reads a file, @@x is a literal @x; all other values are literal.",
  "ghostpaw-affinity --version --short",
  "ghostpaw-affinity skill --list # skill <guide> reads a guide",
  "ghostpaw-affinity search @sasha.bsky.social",
  `ghostpaw-affinity contact create '{"name":"Owner","kind":"human","bootstrapOwner":true}'`,
  `ghostpaw-affinity contact create '{"name":"Sasha","kind":"human","identities":[{"type":"did","value":"did:plc:sasha"}]}' --if-exists return`,
  `ghostpaw-affinity identity add --contact '{"contactId":2}' --input '{"type":"bluesky","value":"sasha.bsky.social"}'`,
  `ghostpaw-affinity relationship add --from '{"contactId":1}' --to '{"contactId":2}' --kind professional`,
  `ghostpaw-affinity event record --kind interaction --input '{"type":"conversation","occurredAt":"today","content":"Hello!","externalRef":{"source":"bluesky","id":"at://example/reply/1"},"channel":"bluesky","significance":4,"participants":[{"contactId":2,"role":"actor","directionality":"other_initiated"}]}'`,
  "ghostpaw-affinity batch --chunk 500 < events.jsonl",
  "ghostpaw-affinity event record --kind observation --input - < observation.json",
  `ghostpaw-affinity show contact_profile --contact '{"contactId":2}'`,
  `ghostpaw-affinity review events.contact_journal --contact '{"contactId":2}' --with-content`,
  "ghostpaw-affinity review links.owner --limit 50 --offset 50",
  "ghostpaw-affinity review links.radar",
  "ghostpaw-affinity review commitments.open",
  "ghostpaw-affinity review dates.upcoming --horizon-days 14",
  "ghostpaw-affinity review contacts.duplicates",
  "ghostpaw-affinity search --scope events 'record id'",
  `ghostpaw-affinity event revise --event-id 1 --patch '{"summary":"Corrected"}'`,
  `ghostpaw-affinity contact revise '{"contactId":2}' --patch '{"name":"New name"}'`,
  "ghostpaw-affinity contact export > export.json",
  "ghostpaw-affinity describe record_event",
  "ghostpaw-affinity mcp",
].join("\n");

export const affinitySkillSpec = {
  cheatSheet: affinityCheatSheet,
  examples: affinityCliExamples,
  name: "affinity",
  description:
    "Search and maintain local contacts, identities, relationships, events, commitments, and recurring dates. Use when recording relationship evidence or reviewing a social CRM.",
  license: "MIT",
  compatibility:
    "The release binary needs no runtime. MCP stdio or ghostpaw-affinity CLI.",
  bin: "ghostpaw-affinity",
  packageName: "@ghostpaw/affinity",
  server: "ghostpaw-affinity",
  about: affinityMcpInstructions,
  tools: affinitySurfaceTools,
  workflows: [
    ...affinitySkills,
    {
      name: "tools",
      description: "Tool parameters, nested fields, and examples.",
    },
  ],
  principles: affinitySoulTraits.map((trait) => trait.principle),
};
