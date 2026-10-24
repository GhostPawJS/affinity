# Concept: GhostPaw Affinity

## Voices
- Birthdays live in Facebook, phone contacts or recurring calendar entries, not in any relationship tool. V028 V029 V030 V031 V032 V046
- The cost people name is the forgotten follow-up: clients, leads and old friends lost to silence. V026 V056 V058 V059
- Monica is the reference personal CRM, and people drift off it because logging every contact by hand is work. V013 V014 V016 V012
- An agent that profiles everyone you mention reads as surveillance: the Muse coverage calls it a dossier on people who never opted in. V034 V035 V036 V038 V039
- People want relationship data local, in a database they own. V009 V011 V015
- A relationship is its own thing, not an attribute on a contact card. V002
- Agent memory treats every fact alike; relationships need salience and decay. V021 V020 V019
- Some people keep notes on what friends like next to the birthday, by hand. V033 V045 V048
- Developers ask how a contacts store handles notes and custom attributes. V008 V045

## Buyer
A Node.js developer building an assistant or agent that talks to people for them, who keeps contacts in a phone address book or a notes app and birthdays in a calendar (V029 V043). They arrive from a thread about personal CRMs or about agent memory (V002 V021), compare against Monica, Dex and the hosted ppl MCP (P001 P003 P004), and need to see that the library tracks who is drifting and what was promised without logging chores, while the data stays in their own SQLite file (V009 V015). The hesitation most likely to stop them: an agent with a people database sounds like the dossier they just read about (V034 V039).

## Decision path
1. Is this about forgotten people and promises? → hero names drift and the unkept promise; a radar of three people is visible at once.
2. Does it do more than store contacts? → the run: one interaction moves Jun off the top of the radar, one promise lowers trust until it is kept, a birthday shows up in the next 60 days.
3. Who owns the data? → a SQLite file you open, MCP server on your machine, no hosted service.
4. Is it small and tested? → 0 runtime dependencies, 459 tests, 56.1 KB gzip.
5. How do I start? → install line, MCP line, quick start, GitHub, live demo.

## Mechanism
Chosen: a replayed real run. Five steps against affinity 0.3.0 on 2026-10-24 with a fixed clock: record a climbing evening with Jun, promise Ren the notes, try to resolve the promise as "done" (refused) and then as "kept", add Jun's birthday. A radar panel shows the three people and their drift score; each step shows the exact call and what came back, and the radar updates from the recorded results. Speed: the radar is on screen at load; proof: values are the library's own output; effort: five presses; honesty: labelled as a replay, and the note says rollups are recomputed on writes so the clock never moves; share value: the refusal line is quotable.
Rejected: a contact form that saves to the browser: it would imply a hosted product and proves nothing about drift.
Rejected: a relationship graph animation: pretty, but the graph is a dashboard every peer has (P002 P007) and carries no rule.
Rejected: a feature table against Monica and Dex: claims about other projects instead of our own numbers.

## Offer
Product: @ghostpaw/affinity, an open-source relationship and social CRM engine for Node.js on SQLite
Price: free, MIT licence
Delivery: `npm install @ghostpaw/affinity` into a Node.js 24+ project, or `npx -y @ghostpaw/affinity mcp` as a local MCP server with the database at ~/.ghostpaw/affinity.db

## Facts
- affinity 0.3.0 is on npm with zero runtime dependencies and requires Node.js 24+ for node:sqlite. https://www.npmjs.com/package/@ghostpaw/affinity
- The README calls it a standalone social CRM core for Node.js, built on SQLite. https://github.com/GhostPawJS/affinity
- Eight concepts: contact, identity, social link, tie, journal entry, date anchor, attribute, affinity chart. https://github.com/GhostPawJS/affinity
- State is derived, not hand-toggled: rank, affinity, trust, cadence and drift come from recorded events. https://github.com/GhostPawJS/affinity
- The MCP server runs with `npx -y @ghostpaw/affinity mcp` and keeps its database at ~/.ghostpaw/affinity.db, overridable with GHOSTPAW_AFFINITY_DB or --db. https://github.com/GhostPawJS/affinity
- Twelve tools, among them search_affinity, review_affinity, record_event, manage_commitment and manage_date_anchor; each returns success, no_op, needs_clarification or error. https://github.com/GhostPawJS/affinity
- In the recorded run, one activity with Jun raised affinity by 0.245 and trust by 0.025, set the cadence from 14 to 17 days and moved Jun from the top of the radar to the bottom. https://github.com/GhostPawJS/affinity#quick-start
- In the recorded run, an open promise to Ren lowered trust by 0.044 and resolving it as "done" threw "resolution must be kept, cancelled, or broken". https://github.com/GhostPawJS/affinity
- Radar and drift rollups are refreshed when events are written, not at read time (links/rollups.ts). https://github.com/GhostPawJS/affinity
- 459 tests with 95.34% line, 85.76% branch and 96.98% function coverage, measured 2026-10-24. https://github.com/GhostPawJS/affinity
- dist is 56.1 KB gzip and imports in about 5.7 ms on the maintainer box, measured 2026-10-24. https://github.com/GhostPawJS/affinity
- Birthdays are commonly kept as recurring calendar entries or left to Facebook. V029 V028

## Axes
| Axis | Market | Voices | Chosen |
| --- | --- | --- | --- |
| Opening | "never forget a friend", "AI-first personal CRM" P003 P004 P011 | forgot to follow up; Facebook remembers birthdays V026 V028 V059 | open on the person drifting and the promise not kept |
| Proof | screenshots, testimonials, app store badges P003 P009 P012 | wants local data and no dossier V009 V034 | a replayed run with the library's own numbers and refusal |
| Mechanism | hosted app or hosted MCP with OAuth P002 P004 P008 | Monica dropped because logging is work V013 V016 | a radar recomputed from recorded events; promises carry trust |
| Palette | white SaaS with a pastel accent P002 P003 P009 | developers who self-host and run local databases V014 V009 V057 | near-black void, spectral cyan for close, wraith violet for drifting, alarm rose for refusals and overdue, ward green for kept |
| Imagery | product screenshots and smiling faces P003 P009 P012 | dossier fear V036 V039 | generated line art: a radar scope with a paw at its centre and one violet node drifting outward; no faces |
| Tone | warm and promotional P004 P011 | wary of profiling V038 V039 | plain, states what is stored and where |

## Sparks
- The birthday Facebook remembers for you. V028 V032
- The client lost to a follow-up nobody sent. V026 V059
- Monica on a Raspberry Pi nobody opens. V014 V016 V013
- A page on every person you ever mentioned. V036 V039

## Directions
1. Never forget a friend: hero promises an AI that remembers everyone for you. V058 → struck: first direction; it is the market opening (P003 P011) and sounds like the dossier voices fear.
  pushed: an assistant face that greets you with birthdays.
2. Contact cards: a grid of contact cards with notes. V043 → struck: second direction; every personal CRM opens on cards (P001 P009).
  pushed: cards with glowing edges; still the same cards.
3. Drift radar: three people on a scope; recorded events move them. V026 V002 V021 → chosen
  pushed: the radar is the replay's state panel; each step's returned numbers update the scope, and the refusal shows in alarm rose.
4. Birthday calendar: a month view with anniversaries. V029 V046 → struck: calendars already do this; it is the habit people have.
  pushed: kept as step four, one date anchor in the next 60 days.
5. Promise ledger: a list of commitments with kept and broken. V056 → struck: too narrow alone.
  pushed: the promise step keeps trust visible.
6. Dossier warning: open on the Muse coverage and contrast. V034 V035 → struck: builds the page on someone else's product.
  pushed: one plain paragraph on where the data lives.
7. Relationship graph: an animated network of ties. V002 → struck: dashboard look of P007; no rule shown.
  pushed: the section art is a quiet graph of weighted threads.
8. Plain README page. V017 → struck: matches the market baseline of repo pages (P001 P010).
  pushed: the README stays one click away.

## Concept
Who is drifting, on a dark scope. The page centres on a radar with three people from a recorded run: Jun, a climbing partner not seen in 27 days, sits at the top as drifting; Ada, a conference contact, is routine; Ren, an old roommate seen last week, is fine. Each step replays a real call and its result: one evening out moves Jun to the bottom (V026 V059), a promise to Ren lowers trust until it is kept, the word "done" is refused in alarm rose because a promise is kept, cancelled or broken, and Jun's birthday appears in the next 60 days (V028 V029). The relationship is its own record, not a field on a card (V002). The data stays in a SQLite file on the developer's machine (V009 V015), which is said plainly beside the run.

## Spine
1. Hero: "Who have you been meaning to call?" Subline: affinity keeps people, promises and dates in your SQLite file and works out who is drifting; install and MCP lines; 0 runtime dependencies readout; radar art. V026 V002 V009
2. The run: radar of three people, five replayed steps with call and result. V059 V028
3. What it keeps: contacts, identities, links, ties, events, dates, attributes; derived state. V002 V021
4. Worry: where the data lives and what affinity does not do. V034 V039 V015
5. Numbers: 0 deps, Node 24+, 459 tests, 95.3% lines, 56.1 KB gzip, about 5.7 ms import, 12 tools.
6. Start: install, quick start, GitHub, README, live demo, back to GhostPaw home and sibling pages.
7. Footer: Impressum, Datenschutz.

## Palette
| Role | Color | Source |
| --- | --- | --- |
| void | #04070b | the shared GhostPaw night; peers are white SaaS pages P002 P003 P009 |
| panel | #0a1119 | the radar pane and step panes |
| rule | #1d2c3c | pane borders and the faint HUD grid |
| ghost | #e3edf5 | body text |
| haze | #93a5b9 | secondary text |
| spectral | #62e6f2 | close people, primary actions, measured values |
| wraith | #b39dff | drifting people, structure lines |
| alarm | #ff7aa6 | refusals and the overdue band |
| ward | #7af0b4 | kept promises |

## Type
| Role | Family | Source |
| --- | --- | --- |
| display | Tektur, Bahnschrift, Arial Narrow, sans-serif | the shared GhostPaw HUD face for headlines and readouts |
| body | system-ui, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif | the reader's own sans for long text on dark, no download |
| code and numbers | Martian Mono, Cascadia Mono, Consolas, monospace | calls, returned values and file paths like ~/.ghostpaw/affinity.db |

## Form
Panes on the void: panel ground, 1px rule border, a 14px chamfer top right, a 3px top bar lit by state. The radar is a list of people with a drift bar each, sorted the way listRadar returns them. Steps are an ordered list: each step a pane with the call in code and the result below. One column on phones; on desktop the radar sits beside the steps and stays in view. Shared faint 48px grid.

## Imagery
| Image | Job | Art direction | Source |
| --- | --- | --- | --- |
| hero radar | protagonist | a circular radar scope in thin cyan light with a sweep wedge, a ghost paw print at its centre, three nodes, the farthest violet and drifting outward; no text, no faces V026 V036 | generated |
| ties graph | explanation | hexagon nodes joined by cyan threads of different weight, one thin violet thread fading; ties and their strength V002 | generated |
| share card | share preview | the hero art with the headline at 1200×630 | generated art, rendered from HTML |

## Motion
Moment: on first load a single cyan scan line sweeps down over the hero art once (900 ms).
Feedback: when a step runs, its result appears and the radar bars ease to their new length (300 ms); the refused step flashes its border in alarm rose once.
Reduced motion: no sweep; bars and results change in place.

## Copy
- Use: "drifting", "forgot to follow up", "promise", "kept" V026 V059 V056
- Use: "in your SQLite file", "on your machine" V009 V015
- Avoid: "never forget a friend", "AI-first", "supercharge your network" P003 P011 P004
- Avoid: "remembers everyone for you" V036 V039
- Plain second person; say what is stored and where; say the run is a replay and the clock does not move. V034
- Never present voices as customers. V044

## Changelog
- 2026-10-24: first concept from the 2026-10-24 research batch (60 voices, 12 peers); drift radar chosen; replay of a real affinity 0.3.0 run.
