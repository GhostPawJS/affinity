# Affinity — Use-Case Lifecycle Narratives

Ten nontrivial scenarios showing how Affinity handles real use cases from
bootstrap to mature scale. Each angle exercises a different slice of the API,
mechanics, and entity model. The angles are independent — read any one on its
own.

All code references use the public package surface:

```ts
import { initAffinityTables, read, write, tools } from "@ghostpaw/affinity";
```

---

## 1. Personal Relationship Keeper — "The Gardener"

### Persona

Mika wants to be intentional about friendships. Tired of letting months slip by
without talking to the people who matter, Mika decides to track interactions,
watch how relationships grow, and get nudged when someone is drifting.

### Why This Angle Is Distinct

This angle is pure personal-life RPG: rank progression, breakthrough moments,
trust repair after a falling-out, bond narratives as interpretive labels, the
Affinity Chart as an emotional map, and radar-driven outreach cadence. No
companies, no transactions, no structural org charts.

### Day by Day

**Day 0 — Bootstrap.**
Mika opens a fresh database and creates an owner contact.

```ts
initAffinityTables(db);
const owner = write.createContact(db, {
  name: "Mika",
  kind: "human",
  bootstrapOwner: true,
});
write.addIdentity(db, owner.primary.id, {
  type: "email",
  value: "mika@example.com",
});
```

**Day 1 — Seed existing close friends.**
Five people Mika already has deep history with. Using `seedSocialLink` because
these relationships predate the system — they're imports, not new evidence.

```ts
const ren = write.createContact(db, { name: "Ren", kind: "human" });
write.addIdentity(db, ren.primary.id, { type: "phone", value: "+15551234567" });
write.seedSocialLink(db, {
  fromContactId: owner.primary.id,
  toContactId: ren.primary.id,
  kind: "personal",
  rank: 3,
  affinity: 0.6,
  trust: 0.7,
  cadenceDays: 14,
  bond: "college roommate, still close",
});
```

Repeat for four more friends — each with different kinds (`personal`, `family`,
`romantic`) and cadences reflecting how often Mika actually talks to them.

**Days 2–7 — Record the first week.**
Mika logs real interactions as they happen. Each call to `recordInteraction`
runs the full mechanics pipeline — affinity moves, trust moves, cadence adapts.

```ts
write.recordInteraction(db, {
  type: "conversation",
  occurredAt: Date.now(),
  summary: "Caught up over coffee about Ren's new job.",
  significance: 5,
  participants: [
    { contactId: owner.primary.id, role: "actor", directionality: "mutual" },
    { contactId: ren.primary.id, role: "actor", directionality: "mutual" },
  ],
});
```

The receipt's `derivedEffects` shows affinity gain, trust gain, and cadence
refresh on the Mika → Ren link. An activity with another friend shows higher
intimacy depth than a conversation.

**Day 14 — Add birthday date anchors.**
Mika knows three friends' birthdays.

```ts
write.addDateAnchor(db, {
  target: { kind: "contact", contactId: ren.primary.id },
  recurrenceKind: "birthday",
  anchorMonth: 8,
  anchorDay: 22,
  summary: "Ren's birthday",
  significance: 7,
});
```

`read.listUpcomingDates(db, { horizonDays: 60 })` now surfaces any birthday
within the next two months.

**Day 30 — First radar check.**
Mika checks the maintenance view for the first time.

```ts
const radar = read.listRadar(db);
```

Two friends appear with high drift priority — Mika hasn't interacted with them
since seeding the links, so `drift_ratio` has crossed their cadence. One friend
with a short cadence and several recent conversations shows low drift. Radar
ranking works: the people Mika is most overdue with appear first.

**Day 45 — First breakthrough.**
Repeated quality interactions with Ren — coffee, a hike, a supportive
conversation after a bad week — accumulate affinity past the 1.0 threshold. The
receipt comes back with `momentKind: "breakthrough"` and `rankAfter: 4`.

```ts
const receipt = write.recordInteraction(db, {
  type: "support",
  occurredAt: Date.now(),
  summary: "Helped Ren move apartments. Long day, good conversations.",
  significance: 8,
  participants: [
    { contactId: owner.primary.id, role: "actor", directionality: "mutual" },
    { contactId: ren.primary.id, role: "recipient", directionality: "mutual" },
  ],
});
// receipt.derivedEffects[0].momentKind === "breakthrough"
// receipt.derivedEffects[0].rankAfter === 4
```

**Day 60 — A conflict.**
A disagreement with another friend, Jun.

```ts
write.recordInteraction(db, {
  type: "conflict",
  occurredAt: Date.now(),
  summary: "Argument about the group trip plans. Things got heated.",
  significance: 7,
  participants: [
    { contactId: owner.primary.id, role: "actor", directionality: "mutual" },
    { contactId: jun.primary.id, role: "actor", directionality: "mutual" },
  ],
});
```

Trust drops sharply. Link state may shift to `strained`. The receipt's
`derivedEffects` shows negative trust delta and `momentKind: "rupture"`.

**Day 75 — Repair.**
Mika reaches out. A correction event, then a positive activity together. After
two qualifying repair events within 30 days and no new negative events, the
trust repair bonus kicks in.

```ts
write.recordInteraction(db, {
  type: "correction",
  occurredAt: Date.now(),
  summary: "Apologized for the trip argument. Cleared the air.",
  significance: 6,
  participants: [
    { contactId: owner.primary.id, role: "actor", directionality: "owner_initiated" },
    { contactId: jun.primary.id, role: "recipient" },
  ],
});
```

A week later, a follow-up activity. The receipt shows `momentKind:
"reconciliation"` — the link returns to `active`.

**Day 90 — Review the graph.**

```ts
const chart = read.getAffinityChart(db);
const ready = read.listProgressionReadiness(db);
```

The chart shows Mika's social world as nodes and weighted edges. Progression
readiness identifies which links are closest to a rank-up, so Mika can
prioritize deepening those.

**Day 120 — Bond narratives.**
Mika writes interpretive labels on key relationships.

```ts
write.reviseBond(db, renLinkId, "closer than ever since the move");
write.reviseBond(db, junLinkId, "back on track after the trip argument");
```

Bond is interpretation, not evidence — revising it doesn't change rank, trust,
or affinity.

**Day 180 — Mature garden.**
80 contacts. Varied ranks from 0 (acquaintances) to 5 (closest friends).
Moments mark the turning points — breakthroughs, ruptures, reconciliations.
Birthday date anchors fire reminders. Radar reliably surfaces who to call. The
Affinity Chart is a living emotional map.

### What the System Proves

Rank progression works mechanically from accumulated evidence. Trust heals
through explicit repair sequences, not time alone. Moments derive from real
threshold events. Radar produces actionable drift signals. Bond remains
interpretation-only.

---

## 2. Hybrid Life Graph — "The Whole Map"

### Persona

Jordan is a startup founder. Their co-founder is their sibling. Their college
friend is now a client. Their mentor is also their neighbor. The accountant is
also a family friend. Jordan refuses to use separate tools for "work contacts"
and "personal contacts" because the worlds are the same world.

### Why This Angle Is Distinct

Multiple link kinds between the same pair, every entity kind coexisting, the
Affinity Chart as the unifying view across all domains, preference attributes
tuning mechanics, and bridge scores surfacing connectors across clusters.

### Day by Day

**Days 0–3 — Seed the three worlds.**
Jordan creates contacts across personal, family, and professional.

```ts
const jordan = write.createContact(db, { name: "Jordan", kind: "human", bootstrapOwner: true });
const sam = write.createContact(db, { name: "Sam", kind: "human" }); // sibling + co-founder
const acme = write.createContact(db, { name: "Acme Corp", kind: "company" });
const barkley = write.createContact(db, { name: "Barkley", kind: "pet" });
const household = write.createContact(db, { name: "The Jordan-Sam household", kind: "group" });
```

Structural ties for family and org relationships:

```ts
write.setStructuralTie(db, { fromContactId: jordan.primary.id, toContactId: sam.primary.id, kind: "sibling_of" });
write.setStructuralTie(db, { fromContactId: barkley.primary.id, toContactId: household.primary.id, kind: "belongs_to" });
write.setStructuralTie(db, { fromContactId: sam.primary.id, toContactId: acme.primary.id, kind: "works_at", role: "CTO" });
```

Relational links for the live relationships:

```ts
write.seedSocialLink(db, {
  fromContactId: jordan.primary.id,
  toContactId: sam.primary.id,
  kind: "family",
  rank: 5, affinity: 0.8, trust: 0.9,
  cadenceDays: 3,
  bond: "sibling and co-founder",
});
write.seedSocialLink(db, {
  fromContactId: jordan.primary.id,
  toContactId: sam.primary.id,
  kind: "professional",
  rank: 4, affinity: 0.7, trust: 0.85,
  cadenceDays: 1,
});
```

Sam now has both a `sibling_of` structural tie and two relational links —
`family` and `professional` — to Jordan. They progress independently.

**Day 7 — A dinner that's both personal and professional.**
Jordan has dinner with Sam and a client contact, Lee.

```ts
write.recordInteraction(db, {
  type: "activity",
  occurredAt: Date.now(),
  summary: "Dinner with Sam and Lee. Discussed the product roadmap, also caught up on life.",
  significance: 6,
  participants: [
    { contactId: jordan.primary.id, role: "actor", directionality: "mutual" },
    { contactId: sam.primary.id, role: "actor", directionality: "mutual" },
    { contactId: lee.primary.id, role: "actor", directionality: "mutual" },
  ],
});
```

The system resolves this to two affected links: Jordan → Sam (both `family` and
`professional` get effects) and Jordan → Lee. No peer link is inferred between
Sam and Lee from a multi-participant owner event.

**Day 14 — Barkley the pet.**
Already registered with a structural `belongs_to` tie to the household. Barkley
doesn't get relational links — structural ties model the real-world
relationship without pretending the dog has a rank or trust score.

**Day 21 — Service contacts.**
Vet, accountant, and lawyer — each as `service` kind with long cadences.

```ts
const vet = write.createContact(db, { name: "City Vet", kind: "service" });
write.seedSocialLink(db, {
  fromContactId: jordan.primary.id,
  toContactId: vet.primary.id,
  kind: "service",
  cadenceDays: 90,
});
```

**Day 30 — Preference attributes.**

```ts
write.setAttribute(db, { kind: "contact", id: sam.primary.id }, "pref.channel.text", "true");
write.setAttribute(db, { kind: "contact", id: lee.primary.id }, "pref.channel.email", "true");
```

When Jordan records an interaction with Sam via text, the `preferenceMatch`
feature gives a small bonus because the channel matches the preference.

**Day 45 — The chart shows clusters.**

```ts
const chart = read.getAffinityChart(db);
```

Three visible clusters: family/personal, professional/clients, and services.
Jordan is the hub connecting them. Sam appears as a strong bridge between the
family and professional clusters.

**Day 60 — A friend becomes a client.**
Dana, an old college friend, hires Jordan's startup. Dana already has a
`personal` link. Now professional interactions begin — the system auto-creates a
second `professional` relational link on the first business interaction.

```ts
write.recordTransaction(db, {
  occurredAt: Date.now(),
  summary: "Signed service agreement with Dana for Q3 project.",
  significance: 7,
  participants: [
    { contactId: jordan.primary.id, role: "actor", directionality: "owner_initiated" },
    { contactId: dana.primary.id, role: "recipient" },
  ],
});
```

Both links progress independently — the personal link from personal
interactions, the professional link from business transactions.

**Day 90 — Observed third-party links.**
Jordan notices that two clients, Lee and Priya, know each other from a
conference.

```ts
write.recordObservation(db, {
  occurredAt: Date.now(),
  summary: "Lee mentioned that Priya introduced them to the supplier.",
  significance: 3,
  participants: [
    { contactId: lee.primary.id, role: "subject" },
    { contactId: priya.primary.id, role: "subject" },
  ],
});
```

An `observed` link forms between Lee and Priya. It appears in the chart but
carries lower weight — observational trust is capped at 0.35.

**Day 120 — Bridge contacts emerge.**
Radar's `bridge_score` component surfaces contacts who connect otherwise-disjoint
clusters. The mentor who knows both family friends and investors ranks high.

**Day 270 — Mature map.**
300 contacts across all kinds. The Affinity Chart is a living map of Jordan's
entire world — family, friends, clients, services, observed third-party
connections — with cluster topology and bridge scores revealing the structure
that no flat contact list could show.

### What the System Proves

Multiple link kinds between the same pair work without conflict. Structural and
relational links coexist. Every entity kind (`human`, `company`, `team`,
`group`, `pet`, `service`) fits one unified model. The chart unifies what would
otherwise require three separate apps.

---

## 3. Personal Trainer — "The Coach"

### Persona

Vic is a fitness coach with 40 active clients. Vic runs one-on-one sessions,
group classes, and remote programming. Clients have goals, programs, and
competition schedules. Vic needs to know when someone has been skipping, when
someone is making real progress, and when a commitment has been dropped.

### Why This Angle Is Distinct

Tight weekly cadence mechanics, milestone events marking client progress,
commitment tracking for training programs, group contacts for classes, and trust
as the consistency axis — kept promises (followed programs) raise trust, broken
ones (abandoned programs) damage it.

### Day by Day

**Day 0 — Bootstrap.**

```ts
const vic = write.createContact(db, { name: "Vic", kind: "human", bootstrapOwner: true });
const gym = write.createContact(db, { name: "Iron Path Gym", kind: "company" });
write.setStructuralTie(db, { fromContactId: vic.primary.id, toContactId: gym.primary.id, kind: "works_at", role: "Head Coach" });
```

**Days 1–3 — Import existing clients.**
Each client gets a contact, a verified phone identity, and a seeded `service`
link with a short cadence reflecting weekly sessions.

```ts
const client = write.createContact(db, { name: "Noor", kind: "human" });
write.addIdentity(db, client.primary.id, { type: "phone", value: "+15559876543", verified: true });
write.seedSocialLink(db, {
  fromContactId: vic.primary.id,
  toContactId: client.primary.id,
  kind: "service",
  cadenceDays: 7,
  trust: 0.5,
  bond: "training for first marathon",
});
```

**Day 4 — Group class contacts.**

```ts
const morningClass = write.createContact(db, { name: "6 AM Strength Class", kind: "group" });
write.setStructuralTie(db, { fromContactId: morningClass.primary.id, toContactId: gym.primary.id, kind: "belongs_to" });
```

Individual class members are linked to the group via structural ties, while
their one-on-one coaching links to Vic remain relational.

**Day 7 — Log a session.**

```ts
write.recordInteraction(db, {
  type: "activity",
  occurredAt: Date.now(),
  summary: "1-on-1 session. Noor hit a 200lb deadlift PR.",
  significance: 7,
  participants: [
    { contactId: vic.primary.id, role: "actor", directionality: "owner_initiated" },
    { contactId: noor.primary.id, role: "recipient" },
  ],
});
```

The short 7-day cadence means the link stays fresh as long as sessions happen
weekly. Miss a week and drift starts.

**Day 10 — Record a training program commitment.**

```ts
write.recordCommitment(db, {
  commitmentType: "agreement",
  occurredAt: Date.now(),
  summary: "12-week marathon prep program for Noor.",
  significance: 6,
  dueAt: Date.now() + 12 * 7 * 86_400_000,
  participants: [
    { contactId: vic.primary.id, role: "actor" },
    { contactId: noor.primary.id, role: "recipient" },
  ],
});
```

**Day 14 — Add competition date anchors.**

```ts
write.addDateAnchor(db, {
  target: { kind: "contact", contactId: noor.primary.id },
  recurrenceKind: "custom_yearly",
  anchorMonth: 10,
  anchorDay: 15,
  summary: "City Marathon",
  significance: 8,
});
```

**Day 30 — Radar surfaces skipping clients.**

```ts
const radar = read.listRadar(db);
```

Three clients have missed their weekly cadence. They appear at the top of radar
with high drift priority. Vic texts them — and logs those conversations.

**Day 45 — A client breakthrough.**
Noor's consistent attendance and strong sessions accumulate enough affinity for
a rank-up. The receipt returns `momentKind: "breakthrough"`.

**Day 60 — A program abandoned.**
Another client, Kai, stops showing up. After three weeks of silence, Vic
resolves the training commitment as `broken`.

```ts
write.resolveCommitment(db, kaiCommitmentEventId, "broken");
```

Trust on the Vic → Kai link drops. The `violation_factor` for a broken agreement
applies damage. The link may drift toward `dormant`.

**Day 90 — Attributes for programming.**

```ts
write.setAttribute(db, { kind: "contact", id: noor.primary.id }, "pref.activity.running", "true");
write.setAttribute(db, { kind: "contact", id: noor.primary.id }, "goal", "sub-4hr marathon");
```

**Day 365 — Mature practice.**
120 clients. Cadence is fine-tuned per client — weekly for active one-on-one,
biweekly for remote, monthly for alumni check-ins. Milestone history tells each
client's progress arc. Commitment tracking catches abandoned programs early.
Radar eliminates "forgot to follow up with that client."

### What the System Proves

Short cadences produce meaningful drift signals within days. Commitment
lifecycle maps cleanly to real coaching programs. Milestone events capture
client progress as system-level moments. Group contacts model class structures
without forcing fake relational links to groups.

---

## 4. Web Agency — "The Studio"

### Persona

Fran runs a boutique web agency with five employees and fifteen active client
accounts. Each client is a company with multiple stakeholders — a CEO who signs
checks, a marketing director who approves designs, a developer who handles
integrations. Fran needs to track who works where, log multi-party meetings,
and never miss a deliverable deadline.

### Why This Angle Is Distinct

Structural ties forming org charts, team and company contacts, multi-participant
events, transactions for invoices and deliverables, commitments for project
milestones, and duplicate detection when the same person appears through
different client introductions.

### Day by Day

**Day 0 — Bootstrap.**

```ts
const fran = write.createContact(db, { name: "Fran", kind: "human", bootstrapOwner: true });
const agency = write.createContact(db, { name: "Pixel Forge", kind: "company" });
write.setStructuralTie(db, { fromContactId: fran.primary.id, toContactId: agency.primary.id, kind: "works_at", role: "Founder" });
```

**Days 1–3 — Import first client org.**
Create the company, then each stakeholder, then wire the org chart.

```ts
const clientCo = write.createContact(db, { name: "Greenfield Inc.", kind: "company" });
const ceo = write.createContact(db, { name: "Ava Chen", kind: "human" });
const mktg = write.createContact(db, { name: "Derek Osei", kind: "human" });
const devLead = write.createContact(db, { name: "Lina Petrov", kind: "human" });

write.addIdentity(db, ceo.primary.id, { type: "email", value: "ava@greenfield.com" });
write.addIdentity(db, mktg.primary.id, { type: "email", value: "derek@greenfield.com" });

write.setStructuralTie(db, { fromContactId: ceo.primary.id, toContactId: clientCo.primary.id, kind: "works_at", role: "CEO" });
write.setStructuralTie(db, { fromContactId: mktg.primary.id, toContactId: clientCo.primary.id, kind: "works_at", role: "Marketing Director" });
write.setStructuralTie(db, { fromContactId: devLead.primary.id, toContactId: clientCo.primary.id, kind: "works_at", role: "Dev Lead" });
write.setStructuralTie(db, { fromContactId: mktg.primary.id, toContactId: ceo.primary.id, kind: "reports_to" });
```

Fran seeds a `professional` relational link to the CEO (the primary
relationship) and lets the others auto-create from events.

**Day 7 — Kickoff meeting.**
Three stakeholders plus Fran in one event.

```ts
write.recordInteraction(db, {
  type: "activity",
  occurredAt: Date.now(),
  summary: "Greenfield website redesign kickoff. Discussed timeline, brand guidelines, and technical constraints.",
  significance: 7,
  participants: [
    { contactId: fran.primary.id, role: "actor", directionality: "owner_initiated" },
    { contactId: ceo.primary.id, role: "actor", directionality: "mutual" },
    { contactId: mktg.primary.id, role: "actor", directionality: "mutual" },
    { contactId: devLead.primary.id, role: "actor", directionality: "mutual" },
  ],
});
```

The system creates relational links from Fran to each non-owner participant who
didn't already have one. Ava's existing link gets an effect; Derek and Lina get
auto-created `professional` links.

**Day 10 — Transaction for signed contract.**

```ts
write.recordTransaction(db, {
  occurredAt: Date.now(),
  summary: "Signed $45k website redesign contract with Greenfield.",
  significance: 8,
  participants: [
    { contactId: fran.primary.id, role: "actor" },
    { contactId: ceo.primary.id, role: "recipient" },
  ],
});
```

**Day 14 — Commitments for deliverable deadlines.**

```ts
write.recordCommitment(db, {
  commitmentType: "agreement",
  occurredAt: Date.now(),
  summary: "Wireframes delivery for Greenfield redesign.",
  significance: 6,
  dueAt: Date.now() + 21 * 86_400_000,
  participants: [
    { contactId: fran.primary.id, role: "actor" },
    { contactId: mktg.primary.id, role: "recipient" },
  ],
});
```

`read.listOpenCommitments(db)` now shows the pending wireframe delivery.

**Day 21 — Subcontractors.**

```ts
const illustrator = write.createContact(db, { name: "Sketchy Studio", kind: "service" });
write.setStructuralTie(db, { fromContactId: illustrator.primary.id, toContactId: agency.primary.id, kind: "vendor_of" });
```

**Day 35 — Resolve the wireframe commitment.**

```ts
write.resolveCommitment(db, wireframeCommitmentId, "kept");
```

Trust on the Fran → Derek link increases — delivered on time.

**Day 60 — Project tagging via attributes.**

```ts
write.setAttribute(db, { kind: "contact", id: clientCo.primary.id }, "project:greenfield-redesign", "active");
write.setAttribute(db, { kind: "contact", id: clientCo.primary.id }, "tier", "enterprise");
```

**Day 90 — Second client, same-name contact.**
Another client org has a "Lina Petrov" as well. Fran imports the contact.
Later, `read.listDuplicateCandidates(db)` catches the fuzzy name match. Fran
confirms they're different people — no merge needed, but the system surfaced the
question.

**Day 365 — Mature agency.**
250 contacts across 15 client orgs. Structural ties map every reporting chain.
Transactions track revenue per relationship. Commitments ensure no deliverable
slips. The Affinity Chart shows which client relationships are deep (high rank)
and which are transactional (low rank, frequent transactions).

### What the System Proves

Structural ties model org charts without polluting relational progression.
Multi-participant events correctly resolve to per-link effects. Transactions and
commitments handle the commercial side naturally. Duplicate detection works
across orgs.

---

## 5. Real Estate Agent — "The Dealmaker"

### Persona

Rosa is an independent real estate agent. Deals take months. Referrals drive
everything. Rosa needs to remember who referred whom, track purchase
anniversaries for annual check-ins, detect when the same person shows up from
different listing sources, and never let a past client drift so long they list
with someone else.

### Why This Angle Is Distinct

Long-cycle relationship progression with months between meaningful events,
observed links modeling referral chains, `custom_yearly` date anchors for
purchase anniversaries, duplicate detection from multiple import sources,
transactions for closings, and attributes for property preferences.

### Day by Day

**Day 0 — Bootstrap.**

```ts
const rosa = write.createContact(db, { name: "Rosa Delgado", kind: "human", bootstrapOwner: true });
write.addIdentity(db, rosa.primary.id, { type: "email", value: "rosa@realtor-rosa.com" });
```

**Days 1–5 — Import client book.**
Past clients, active prospects, and industry contacts.

```ts
const buyer = write.createContact(db, { name: "Tomás Herrera", kind: "human" });
write.addIdentity(db, buyer.primary.id, { type: "email", value: "tomas@email.com" });
write.seedSocialLink(db, {
  fromContactId: rosa.primary.id,
  toContactId: buyer.primary.id,
  kind: "professional",
  rank: 2,
  trust: 0.6,
  cadenceDays: 60,
  bond: "helped find first home in 2024",
});
```

Service contacts for inspectors, lenders, and title companies:

```ts
const lender = write.createContact(db, { name: "Pacific Mortgage", kind: "company" });
write.seedSocialLink(db, {
  fromContactId: rosa.primary.id,
  toContactId: lender.primary.id,
  kind: "service",
  cadenceDays: 90,
});
```

**Day 7 — Purchase anniversary dates.**

```ts
write.addDateAnchor(db, {
  target: { kind: "contact", contactId: buyer.primary.id },
  recurrenceKind: "custom_yearly",
  anchorMonth: 3,
  anchorDay: 15,
  summary: "Home purchase anniversary — Tomás",
  significance: 6,
});
```

`read.listUpcomingDates(db, { horizonDays: 30 })` becomes Rosa's weekly
check-in list.

**Day 14 — Record a showing.**

```ts
write.recordInteraction(db, {
  type: "activity",
  occurredAt: Date.now(),
  summary: "Showed three properties to Nadia. She liked the bungalow on Oak St.",
  significance: 5,
  participants: [
    { contactId: rosa.primary.id, role: "actor", directionality: "owner_initiated" },
    { contactId: nadia.primary.id, role: "recipient" },
  ],
});
```

**Day 30 — A referral chain.**
Tomás refers his colleague Marco to Rosa. Rosa captures the referral as an
observation.

```ts
write.recordObservation(db, {
  occurredAt: Date.now(),
  summary: "Tomás referred Marco to me for his condo search.",
  significance: 4,
  participants: [
    { contactId: tomas.primary.id, role: "subject" },
    { contactId: marco.primary.id, role: "subject" },
  ],
});
```

An `observed` link forms between Tomás and Marco. Rosa now has a referral graph
— who sends business to whom.

**Day 60 — Property preference attributes.**

```ts
write.setAttribute(db, { kind: "contact", id: nadia.primary.id }, "pref.property.type", "condo");
write.setAttribute(db, { kind: "contact", id: nadia.primary.id }, "budget", "450k");
write.setAttribute(db, { kind: "contact", id: nadia.primary.id }, "neighborhood", "downtown");
```

**Day 90 — A closing.**

```ts
write.recordTransaction(db, {
  occurredAt: Date.now(),
  summary: "Closed on Oak St bungalow for Nadia. $425k.",
  significance: 9,
  participants: [
    { contactId: rosa.primary.id, role: "actor" },
    { contactId: nadia.primary.id, role: "recipient" },
  ],
});
```

This is a major transaction — high significance triggers a strong trust bump
and potentially a milestone moment.

**Day 120 — Duplicate detection.**
Rosa imports leads from a new listing platform. One lead, "Tom Herrera," matches
the existing "Tomás Herrera" via fuzzy name scoring.

```ts
const dupes = read.listDuplicateCandidates(db);
// { leftContactId: tomas.primary.id, rightContactId: newTom.primary.id, matchReason: "fuzzy_name", matchScore: 0.82 }
write.mergeContacts(db, {
  winnerContactId: tomas.primary.id,
  loserContactId: newTom.primary.id,
  reasonSummary: "Same person imported from two listing sources.",
});
```

**Day 365 — Mature portfolio.**
400 contacts. Purchase anniversaries drive annual calls that feel personal, not
salesy. Referral observed links show which past clients are Rosa's best referral
sources. Radar prevents any client from drifting long enough to forget Rosa
exists. Duplicate detection catches cross-platform duplicates before they cause
confusion.

### What the System Proves

Long cadences produce meaningful drift signals over months. Observed links model
referral chains that a flat CRM would miss entirely. Date anchors turn purchase
anniversaries into a retention engine. Duplicate detection handles fuzzy
real-world name variation.

---

## 6. Therapist / Life Coach — "The Practitioner"

### Persona

Dr. Amal runs a private therapy practice. Each client relationship is deep,
session-based, and tracked over months or years. Trust is the core axis — it
reflects the strength of the therapeutic alliance, not commercial reliability.
Goals and homework become commitments. Breakthrough sessions become moments.

### Why This Angle Is Distinct

`care` link kind, trust as therapeutic alliance quality, the repair bonus
modeling real alliance rupture-repair cycles, session logging as detailed
journal entries, commitments for therapeutic goals and homework, and moments
marking the pivotal sessions in a client's treatment arc.

### Day by Day

**Day 0 — Bootstrap.**

```ts
const amal = write.createContact(db, { name: "Dr. Amal Okafor", kind: "human", bootstrapOwner: true });
write.addIdentity(db, amal.primary.id, { type: "email", value: "amal@mindwell.com" });
```

**Day 1 — First client intake.**

```ts
const client = write.createContact(db, { name: "Riley Park", kind: "human" });
write.addIdentity(db, client.primary.id, { type: "email", value: "riley.park@email.com", verified: true });
write.seedSocialLink(db, {
  fromContactId: amal.primary.id,
  toContactId: client.primary.id,
  kind: "care",
  cadenceDays: 7,
  trust: 0.3,
  bond: "initial assessment — anxiety and work stress",
});
```

The `care` link kind carries the same mechanics as other relational links but
signals the nature of the relationship to the operator.

**Day 7 — First session.**

```ts
write.recordInteraction(db, {
  type: "conversation",
  occurredAt: Date.now(),
  summary: "Session 1. Explored work stressors and sleep patterns. Riley is guarded but engaged.",
  significance: 5,
  participants: [
    { contactId: amal.primary.id, role: "actor", directionality: "mutual" },
    { contactId: riley.primary.id, role: "actor", directionality: "mutual" },
  ],
});
```

Each session is a journal entry. Over time, `read.getContactJournal(db,
riley.primary.id)` becomes a chronological treatment record.

**Day 10 — Therapeutic goal as commitment.**

```ts
write.recordCommitment(db, {
  commitmentType: "agreement",
  occurredAt: Date.now(),
  summary: "Riley will keep a daily mood journal for two weeks.",
  significance: 4,
  dueAt: Date.now() + 14 * 86_400_000,
  participants: [
    { contactId: amal.primary.id, role: "actor" },
    { contactId: riley.primary.id, role: "recipient" },
  ],
});
```

**Day 14 — Session 2.**
Riley followed through on the mood journal.

```ts
write.resolveCommitment(db, moodJournalCommitmentId, "kept");
```

Trust increases. Kept commitments build the alliance.

**Day 42 — Therapeutic breakthrough.**
Session 6. Riley connects childhood patterns to current anxiety for the first
time. Dr. Amal records this as a milestone event with high significance.

```ts
write.recordMilestone(db, {
  occurredAt: Date.now(),
  summary: "Session 6. Riley identified the link between early family dynamics and workplace anxiety. Major insight.",
  significance: 9,
  participants: [
    { contactId: amal.primary.id, role: "actor", directionality: "mutual" },
    { contactId: riley.primary.id, role: "actor", directionality: "mutual" },
  ],
});
```

Significance 9 with accumulated affinity likely triggers `momentKind:
"breakthrough"`. The rank increases.

**Day 56 — Alliance rupture.**
Session 8. A confrontational interpretation lands badly. Riley pushes back.

```ts
write.recordInteraction(db, {
  type: "conflict",
  occurredAt: Date.now(),
  summary: "Session 8. Interpretation about avoidance patterns felt premature to Riley. Session ended tense.",
  significance: 6,
  participants: [
    { contactId: amal.primary.id, role: "actor", directionality: "owner_initiated" },
    { contactId: riley.primary.id, role: "recipient" },
  ],
});
```

Trust drops. The link state may shift to `strained`. `momentKind: "rupture"`.

**Day 63 — Repair.**
Session 9. Dr. Amal acknowledges the misstep and processes the rupture with
Riley.

```ts
write.recordInteraction(db, {
  type: "correction",
  occurredAt: Date.now(),
  summary: "Session 9. Processed last week's rupture. Riley appreciated the repair attempt. Alliance feels stronger.",
  significance: 7,
  participants: [
    { contactId: amal.primary.id, role: "actor", directionality: "owner_initiated" },
    { contactId: riley.primary.id, role: "recipient", directionality: "mutual" },
  ],
});
```

With qualifying repair events and no new negative events, the trust repair
bonus applies. If the link was `strained`, it returns to `active` —
`momentKind: "reconciliation"`.

**Day 90 — Intake anniversary and attributes.**

```ts
write.addDateAnchor(db, {
  target: { kind: "contact", contactId: riley.primary.id },
  recurrenceKind: "anniversary",
  anchorMonth: 1,
  anchorDay: 8,
  summary: "Therapy intake anniversary — Riley",
  significance: 4,
});
write.setAttribute(db, { kind: "contact", id: riley.primary.id }, "modality", "CBT");
write.setAttribute(db, { kind: "contact", id: riley.primary.id }, "pref.channel.text", "false");
```

**Day 120 — Couples therapy.**

```ts
const couple = write.createContact(db, { name: "Riley & Alex", kind: "group" });
```

Dr. Amal creates a group contact for the couple and tracks couples sessions
as events with both individual contacts as participants.

**Day 365 — Mature practice.**
80 clients. Trust scores reflect real alliance quality — clients who've been
through rupture-repair cycles show higher trust than those with only smooth
sessions, because repair builds deeper alliance. Moments mark the pivotal
sessions. The journal is a chronological treatment narrative. Commitments
catch overdue homework.

### What the System Proves

The `care` link kind models therapeutic relationships naturally. Trust repair
mechanics mirror real rupture-repair cycles in therapy. Milestones capture
therapeutic breakthroughs as system-level moments. Commitments track homework
and goals without a separate task system.

---

## 7. Content Creator — "The Creator"

### Persona

Zara is a tech YouTuber and podcaster. She manages sponsor relationships
(brands that pay for ad reads), collaborator contacts (fellow creators she
co-produces with), an editing service, and key audience members who've become
direct contacts. Her business runs on renewals, deliverable deadlines, and
knowing which brands compete with which.

### Why This Angle Is Distinct

`service` links for brand sponsors, transactions for sponsorship deals,
structural ties mapping brand org charts, commitments for content deliverable
deadlines, date anchors for annual contract renewals, observed links revealing
competitive relationships between brands, and attributes for content niche
tagging.

### Day by Day

**Day 0 — Bootstrap.**

```ts
const zara = write.createContact(db, { name: "Zara Nguyen", kind: "human", bootstrapOwner: true });
write.addIdentity(db, zara.primary.id, { type: "url", value: "https://youtube.com/@zaratech" });
```

**Days 1–3 — Add sponsors as companies with key contacts.**

```ts
const brandA = write.createContact(db, { name: "NovaTech", kind: "company" });
const sarah = write.createContact(db, { name: "Sarah Kim", kind: "human" });
write.addIdentity(db, sarah.primary.id, { type: "email", value: "sarah@novatech.com" });
write.setStructuralTie(db, { fromContactId: sarah.primary.id, toContactId: brandA.primary.id, kind: "works_at", role: "Partnerships Manager" });

write.seedSocialLink(db, {
  fromContactId: zara.primary.id,
  toContactId: sarah.primary.id,
  kind: "professional",
  cadenceDays: 30,
  bond: "main sponsor contact at NovaTech",
});
```

**Day 7 — Transaction for a sponsorship deal.**

```ts
write.recordTransaction(db, {
  occurredAt: Date.now(),
  summary: "Q2 sponsorship deal with NovaTech — 4 video integrations for $12k.",
  significance: 8,
  participants: [
    { contactId: zara.primary.id, role: "actor" },
    { contactId: sarah.primary.id, role: "recipient" },
  ],
});
```

**Day 10 — Commitment for deliverable.**

```ts
write.recordCommitment(db, {
  commitmentType: "agreement",
  occurredAt: Date.now(),
  summary: "First NovaTech integration video due for review.",
  significance: 6,
  dueAt: Date.now() + 14 * 86_400_000,
  participants: [
    { contactId: zara.primary.id, role: "actor" },
    { contactId: sarah.primary.id, role: "recipient" },
  ],
});
```

**Day 14 — Collaboration with another creator.**

```ts
const kai = write.createContact(db, { name: "Kai Müller", kind: "human" });
write.addIdentity(db, kai.primary.id, { type: "url", value: "https://youtube.com/@kaireviews" });
write.recordInteraction(db, {
  type: "activity",
  occurredAt: Date.now(),
  summary: "Recorded collab video with Kai — tech gadget showdown.",
  significance: 6,
  participants: [
    { contactId: zara.primary.id, role: "actor", directionality: "mutual" },
    { contactId: kai.primary.id, role: "actor", directionality: "mutual" },
  ],
});
```

**Day 30 — Observe brand competition.**
Zara learns that NovaTech and RivalCorp are direct competitors.

```ts
write.recordObservation(db, {
  occurredAt: Date.now(),
  summary: "NovaTech and RivalCorp are competing for the same product category.",
  significance: 3,
  participants: [
    { contactId: brandA.primary.id, role: "subject" },
    { contactId: rivalCorp.primary.id, role: "subject" },
  ],
});
```

The `observed` link between the two brands now appears in the chart — a
reminder that Zara can't run both sponsors in the same video.

**Day 45 — Renewal date anchor.**

```ts
write.addDateAnchor(db, {
  target: { kind: "contact", contactId: brandA.primary.id },
  recurrenceKind: "renewal",
  anchorMonth: 12,
  anchorDay: 1,
  summary: "NovaTech annual contract renewal discussion",
  significance: 7,
});
```

**Day 60 — Content niche attributes.**

```ts
write.setAttribute(db, { kind: "contact", id: brandA.primary.id }, "niche", "consumer-tech");
write.setAttribute(db, { kind: "contact", id: brandA.primary.id }, "format", "video-integration");
write.setAttribute(db, { kind: "contact", id: kai.primary.id }, "niche", "consumer-tech");
write.setAttribute(db, { kind: "contact", id: kai.primary.id }, "collab-format", "joint-video");
```

**Day 365 — Mature creator business.**
200 contacts across brands, creator collaborators, and services. Renewal dates
prevent missed re-up conversations. Commitment tracking ensures no deliverable
is late (trust stays high with kept agreements). Observed links between
competing brands prevent exclusivity violations. The chart shows Zara's
professional universe.

### What the System Proves

Transactions model commercial deals naturally. Observed links capture
competitive relationships that inform business decisions. Structural ties map
brand org charts so Zara knows who to call. Renewal date anchors turn annual
contract cycles into a proactive workflow.

---

## 8. Solo Recruiter — "The Matchmaker"

### Persona

Dev is an independent recruiter specializing in engineering roles. Dev manages
candidates, hiring managers at client companies, and referral relationships
between them. The business is placements — each successful hire is the revenue
event. Structural ties track where candidates work now and where they end up.
Identities (LinkedIn, email) are the primary lookup keys.

### Why This Angle Is Distinct

Structural tie lifecycle (a candidate's `works_at` changes after placement),
transactions for placements as revenue events, identity-based search (LinkedIn
URLs), commitments for interview follow-ups and offer deadlines, duplicate
detection from resume imports across sources, and observed links between
candidates who know each other.

### Day by Day

**Day 0 — Bootstrap.**

```ts
const dev = write.createContact(db, { name: "Dev Patel", kind: "human", bootstrapOwner: true });
write.addIdentity(db, dev.primary.id, { type: "url", value: "https://linkedin.com/in/devpatel-recruiter" });
```

**Days 1–5 — Import candidate pipeline.**
Each candidate gets a contact, LinkedIn identity, and structural tie to their
current employer.

```ts
const candidate = write.createContact(db, { name: "Yuki Tanaka", kind: "human" });
write.addIdentity(db, candidate.primary.id, { type: "url", value: "https://linkedin.com/in/yukitanaka" });
write.addIdentity(db, candidate.primary.id, { type: "email", value: "yuki@currentco.com" });

const currentCo = write.createContact(db, { name: "CurrentCo", kind: "company" });
write.setStructuralTie(db, {
  fromContactId: candidate.primary.id,
  toContactId: currentCo.primary.id,
  kind: "works_at",
  role: "Senior Engineer",
});
```

**Day 3 — Import client companies with hiring managers.**

```ts
const hiringCo = write.createContact(db, { name: "ScaleUp Inc.", kind: "company" });
const hm = write.createContact(db, { name: "Priya Sharma", kind: "human" });
write.setStructuralTie(db, { fromContactId: hm.primary.id, toContactId: hiringCo.primary.id, kind: "works_at", role: "VP Engineering" });
write.seedSocialLink(db, {
  fromContactId: dev.primary.id,
  toContactId: hm.primary.id,
  kind: "professional",
  cadenceDays: 14,
  bond: "primary hiring contact at ScaleUp",
});
```

**Day 7 — Candidate intake call.**

```ts
write.recordInteraction(db, {
  type: "conversation",
  occurredAt: Date.now(),
  summary: "Intake call with Yuki. Interested in senior roles, prefers remote, open to relocation for the right fit.",
  significance: 5,
  participants: [
    { contactId: dev.primary.id, role: "actor", directionality: "owner_initiated" },
    { contactId: yuki.primary.id, role: "recipient" },
  ],
});
```

**Day 10 — Candidate preference attributes.**

```ts
write.setAttribute(db, { kind: "contact", id: yuki.primary.id }, "seniority", "senior");
write.setAttribute(db, { kind: "contact", id: yuki.primary.id }, "pref.work.remote", "true");
write.setAttribute(db, { kind: "contact", id: yuki.primary.id }, "tech", "go,rust,distributed-systems");
```

**Day 14 — Commitment for interview prep.**

```ts
write.recordCommitment(db, {
  commitmentType: "promise",
  occurredAt: Date.now(),
  summary: "Send Yuki the ScaleUp interview prep packet by Monday.",
  significance: 5,
  dueAt: Date.now() + 3 * 86_400_000,
  participants: [
    { contactId: dev.primary.id, role: "actor" },
    { contactId: yuki.primary.id, role: "recipient" },
  ],
});
```

**Day 17 — Resolve the commitment.**

```ts
write.resolveCommitment(db, prepPacketCommitmentId, "kept");
```

**Day 45 — Successful placement.**
Yuki gets the offer and accepts.

```ts
write.recordTransaction(db, {
  occurredAt: Date.now(),
  summary: "Placed Yuki Tanaka at ScaleUp Inc. as Senior Engineer. $28k placement fee.",
  significance: 9,
  participants: [
    { contactId: dev.primary.id, role: "actor" },
    { contactId: yuki.primary.id, role: "recipient" },
    { contactId: hm.primary.id, role: "recipient" },
  ],
});
```

Now update the structural tie — Yuki no longer works at CurrentCo.

```ts
write.removeStructuralTie(db, yukiCurrentCoTieId);
write.setStructuralTie(db, {
  fromContactId: yuki.primary.id,
  toContactId: hiringCo.primary.id,
  kind: "works_at",
  role: "Senior Engineer",
});
```

The structural `works_at` now points to ScaleUp. The professional relational
link to Dev remains and continues progressing.

**Day 60 — Duplicate detection from resume source.**
Dev imports candidates from a new sourcing platform. A "Y. Tanaka" appears.

```ts
const dupes = read.listDuplicateCandidates(db);
```

The system catches the fuzzy match. Dev confirms it's the same person — no
merge needed this time because Yuki is already placed, but the duplicate is
resolved before it causes confusion.

**Day 90 — Identity-based search.**
Dev gets an email from an unknown sender asking about roles.

```ts
const results = read.searchContacts(db, "sender@email.com");
```

If that email is already an identity in the system, the existing contact
surfaces immediately — no manual hunting.

**Day 120 — Observed referral links.**
Yuki recommends a former colleague, Aisha, to Dev.

```ts
write.recordObservation(db, {
  occurredAt: Date.now(),
  summary: "Yuki recommended Aisha from their previous team at CurrentCo.",
  significance: 4,
  participants: [
    { contactId: yuki.primary.id, role: "subject" },
    { contactId: aisha.primary.id, role: "subject" },
  ],
});
```

The observed link captures the referral relationship.

**Day 365 — Mature practice.**
500 contacts. Structural ties track every candidate's career trajectory.
Placement transactions mark revenue milestones. Commitments prevent missed
follow-ups. LinkedIn identity search finds anyone instantly. Observed links map
referral chains.

### What the System Proves

Structural ties have a lifecycle — they're removed and recreated when someone
changes jobs. Transactions model placement revenue naturally. Identity search by
LinkedIn URL makes lookup instant. Duplicate detection catches cross-source
imports.

---

## 9. Network Intelligence — "The Connector"

### Persona

Aya is a tech community organizer who runs conferences and meetups. Aya's
network is broad and shallow — hundreds of people met briefly at events, a few
dozen deepened through collaboration. The goal is to surface duplicates, map
who's connected to whom, identify bridge contacts who link different
communities, and prioritize which shallow connections to invest in.

### Why This Angle Is Distinct

Cold-start from sparse mentions, bulk import followed by dedup cycles, bridge
score and graph centrality as prioritization signals, observed links from group
events, progression readiness surfacing rank-up candidates, and pagination at
scale.

### Day by Day

**Day 0 — Bootstrap.**

```ts
const aya = write.createContact(db, { name: "Aya Ibrahim", kind: "human", bootstrapOwner: true });
write.addIdentity(db, aya.primary.id, { type: "email", value: "aya@techconf.org" });
```

**Day 1 — Bulk import from a conference.**
100 attendees from a CSV, each with name and email.

```ts
for (const attendee of attendeeList) {
  const c = write.createContact(db, { name: attendee.name, kind: "human" });
  write.addIdentity(db, c.primary.id, { type: "email", value: attendee.email });
}
```

No relational links yet — just contacts with identities.

**Day 2 — Group observations from the event.**
Aya recorded which attendees were on which panel together.

```ts
write.recordObservation(db, {
  occurredAt: Date.now(),
  summary: "Panel on distributed systems: Yuki, Raj, and Elif presented together.",
  significance: 4,
  participants: [
    { contactId: yuki.primary.id, role: "subject" },
    { contactId: raj.primary.id, role: "subject" },
  ],
});
```

With exactly two non-owner participants and event type `observation`, an
`observed` link forms between them. Aya doesn't need to know these people
personally — the system captures that they know each other.

**Day 7 — Record direct conversations.**
Aya had meaningful conversations with 10 attendees. These create owner →
contact relational links.

```ts
write.recordInteraction(db, {
  type: "conversation",
  occurredAt: Date.now(),
  summary: "Long chat with Raj about open-source community building.",
  significance: 6,
  participants: [
    { contactId: aya.primary.id, role: "actor", directionality: "mutual" },
    { contactId: raj.primary.id, role: "actor", directionality: "mutual" },
  ],
});
```

**Day 14 — Duplicate detection.**
Some attendees registered with different emails or name spellings.

```ts
const dupes = read.listDuplicateCandidates(db);
```

Exact identity matches (same email, different contact) surface first. Fuzzy
name matches follow. Aya reviews each candidate pair:

```ts
write.mergeContacts(db, {
  winnerContactId: original.primary.id,
  loserContactId: duplicate.primary.id,
  reasonSummary: "Same person registered with different email.",
});
```

Identities, participant references, and links all rewire in one transaction.

**Day 30 — Deepen select relationships.**
Aya schedules follow-up calls with the 10 most promising contacts. Each call
is an `activity` or `conversation` that moves the relational link forward.

**Day 60 — Progression readiness.**

```ts
const ready = read.listProgressionReadiness(db);
```

Among the 10 deepened contacts, three have accumulated enough affinity to be
near rank-up. These are Aya's best candidates for formal collaboration.

**Day 90 — Second conference.**
Another 80 attendees imported. Same dedup cycle. New observed links from panels
and workshops.

**Day 120 — Bridge contacts emerge.**

```ts
const chart = read.getAffinityChart(db);
const radar = read.listRadar(db);
```

The chart shows two conference communities with a few contacts appearing in
both. These bridge contacts have high betweenness centrality — the `bridge_score`
component in radar elevates them. If a bridge contact is drifting, radar
surfaces them prominently.

**Day 180 — Portfolio review at scale.**

```ts
const page1 = read.listOwnerSocialLinks(db, {}, { limit: 50, offset: 0 });
const page2 = read.listOwnerSocialLinks(db, {}, { limit: 50, offset: 50 });
```

Pagination handles the growing portfolio. Observed links use:

```ts
const observed = read.listObservedLinks(db, {}, { limit: 50 });
```

**Day 365 — Mature network graph.**
1000+ contacts. Most are shallow (rank 0–1) with a few dozen deep
relationships (rank 3+). Duplicates are resolved. Bridge contacts are
maintained. The graph is real intelligence — who knows whom, which communities
overlap, where the structural holes are.

### What the System Proves

Cold-start from sparse data works — contacts and identities are cheap to
create, observed links form automatically from observations. Duplicate detection
and merge scale to large contact sets. Bridge score surfaces genuinely valuable
network positions. Progression readiness identifies where investment will pay
off.

---

## 10. AI Agent Memory — "The Copilot"

### Persona

A developer building a personal AI assistant that uses Affinity as its
relationship memory. The AI never calls `read.*` or `write.*` directly — it
works entirely through the 11 LLM tools. Every conversation turn produces
structured tool calls with structured results.

### Why This Angle Is Distinct

The entire `tools.*` facade, natural-key identity resolution via
`ContactLocator` (email/URL lookup instead of requiring integer IDs),
structured outcomes (`success`, `no_op`, `needs_clarification`, `error`), and
the `search → inspect → record → review` loop as the AI's primary interaction
pattern.

### Turn by Turn

**Turn 1 — "I'm Alex."**
The AI bootstraps the owner contact.

```ts
tools.manageContactToolHandler(db, {
  action: "create",
  input: { name: "Alex", kind: "human", bootstrapOwner: true },
});
tools.manageIdentityToolHandler(db, {
  action: "add",
  contact: { identity: { type: "email", value: "alex@example.com" } },
  input: { type: "email", value: "alex@example.com" },
});
```

Wait — the identity locator resolves the just-created contact via its email.
The tool returns `outcome: "success"`.

**Turn 2 — "I had coffee with Sarah today."**
The AI searches for Sarah first.

```ts
const search = tools.searchAffinityToolHandler(db, { query: "Sarah" });
// search.outcome === "success", search.data.count === 0
```

Sarah doesn't exist yet. The AI creates her, then records the event.

```ts
tools.manageContactToolHandler(db, {
  action: "create",
  input: { name: "Sarah", kind: "human" },
});
tools.recordEventToolHandler(db, {
  kind: "interaction",
  input: {
    type: "activity",
    occurredAt: Date.now(),
    summary: "Had coffee with Sarah. Discussed her startup idea.",
    significance: 5,
    participants: [
      { contactId: alexId, role: "actor", directionality: "mutual" },
      { contactId: sarahId, role: "actor", directionality: "mutual" },
    ],
  },
});
```

The system auto-creates a relational link between Alex and Sarah.

**Turn 3 — "How's my relationship with Sarah?"**
The AI inspects via natural-key identity.

```ts
const profile = tools.inspectAffinityItemToolHandler(db, {
  kind: "contact_profile",
  contact: { identity: { type: "email", value: "sarah@example.com" } },
});
```

If Sarah has an email identity, this resolves directly. The result contains
the full `ContactProfileRecord` — identities, top links, attributes, rollups.

**Turn 4 — "I promised Sarah I'd review her resume by Friday."**

```ts
tools.manageCommitmentToolHandler(db, {
  action: "record",
  input: {
    commitmentType: "promise",
    occurredAt: Date.now(),
    summary: "Review Sarah's resume by Friday.",
    significance: 5,
    dueAt: fridayTimestamp,
    participants: [
      { contactId: alexId, role: "actor" },
      { contactId: sarahId, role: "recipient" },
    ],
  },
});
```

**Turn 5 — "Who am I neglecting?"**

```ts
const radar = tools.reviewAffinityToolHandler(db, { view: "links.radar" });
```

Returns a ranked list of drifting contacts with `recommendedReason` explaining
why each was surfaced.

**Turn 6 — "Sarah works at Acme now."**
The AI creates the company and sets a structural tie.

```ts
tools.manageContactToolHandler(db, {
  action: "create",
  input: { name: "Acme Corp", kind: "company" },
});
tools.manageRelationshipToolHandler(db, {
  action: "set_structural_tie",
  from: { identity: { type: "email", value: "sarah@example.com" } },
  to: { contactId: acmeId },
  input: { kind: "works_at", role: "Founder" },
});
```

**Turn 7 — "I finished Sarah's resume review."**

```ts
tools.manageCommitmentToolHandler(db, {
  action: "resolve",
  commitmentEventId: resumeCommitmentEventId,
  resolution: "kept",
});
```

Trust on the Alex → Sarah link increases.

**Turn 8 — Ambiguous identity.**
The user says "Tell me about Mike."

```ts
const search = tools.searchAffinityToolHandler(db, { query: "Mike" });
// search.data.count === 2: Mike Chen (#12) and Mike Torres (#37)
```

The AI presents both options to the user: "I found two Mikes — Mike Chen and
Mike Torres. Which one?" The user says "Mike Chen."

```ts
tools.inspectAffinityItemToolHandler(db, {
  kind: "contact_profile",
  contact: { contactId: 12 },
});
```

**Turn 9 — Proactive birthday reminder.**
The AI periodically checks upcoming dates.

```ts
const dates = tools.reviewAffinityToolHandler(db, {
  view: "dates.upcoming",
  horizonDays: 7,
});
```

If there's a birthday in the next week, the AI proactively mentions it:
"Sarah's birthday is in 3 days — want me to set a reminder?"

**Turn 10 — "Show me my network."**

```ts
const chart = tools.reviewAffinityToolHandler(db, { view: "graph.chart" });
```

Returns the full `AffinityChartRecord` — nodes, edges, weights. The AI
can describe the topology: "You have 45 contacts in 3 clusters. Your
strongest relationships are with Sarah (rank 3) and Mike Chen (rank 2)."

### What the System Proves

The 11 tools cover 100% of the system's functionality. Natural-key identity
resolution means the AI never needs to remember integer IDs — it can work with
emails and names. Structured outcomes make error handling deterministic. The
`needs_clarification` flow handles ambiguity without crashing.

---

## Coverage Matrix

Which API functions each angle exercises:

| Function | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| `write.createContact` | x | x | x | x | x | x | x | x | x | x |
| `write.reviseContact` | | | | | | | | | | |
| `write.setContactLifecycle` | | | | | | | | | | |
| `write.addIdentity` | x | x | x | x | x | x | x | x | x | x |
| `write.reviseIdentity` | | | | | | | | | | |
| `write.verifyIdentity` | | | | | | x | | | | |
| `write.removeIdentity` | | | | | | | | | | |
| `write.setStructuralTie` | | x | x | x | | | x | x | | x |
| `write.removeStructuralTie` | | | | | | | | x | | |
| `write.seedSocialLink` | x | x | x | x | x | x | x | x | | |
| `write.overrideLinkState` | | | | | | | | | | |
| `write.reviseBond` | x | | | | | | | | | |
| `write.recordInteraction` | x | x | x | x | x | x | x | x | x | x |
| `write.recordObservation` | | x | | | x | | x | x | x | |
| `write.recordMilestone` | x | | | | | x | | | | |
| `write.recordTransaction` | | | | x | x | | x | x | | |
| `write.recordCommitment` | | | x | x | | x | x | x | | x |
| `write.resolveCommitment` | | | x | x | | x | x | x | | x |
| `write.addDateAnchor` | x | | x | | x | x | x | | | |
| `write.reviseDateAnchor` | | | | | | | | | | |
| `write.removeDateAnchor` | | | | | | | | | | |
| `write.setAttribute` | | x | x | x | x | x | x | x | | |
| `write.unsetAttribute` | | | | | | | | | | |
| `write.replaceAttributes` | | | | | | | | | | |
| `write.mergeContacts` | | | | | x | | | | x | |
| `read.getOwnerProfile` | | | | | | | | | | |
| `read.getContactProfile` | | | | | | | | | | x |
| `read.listContacts` | | | | | | | | | | |
| `read.searchContacts` | | | | | | | | x | | x |
| `read.getContactJournal` | | | | | | x | | | | |
| `read.getLinkTimeline` | | | | | | | | | | |
| `read.listMoments` | | | | | | | | | | |
| `read.getLinkDetail` | | | | | | | | | | |
| `read.listOwnerSocialLinks` | | | | x | | | | | x | |
| `read.listObservedLinks` | | | | | | | | | x | |
| `read.listProgressionReadiness` | x | | | | | | | | x | |
| `read.listRadar` | x | | x | | x | | | | x | x |
| `read.listUpcomingDates` | x | | | | x | | | | | x |
| `read.listOpenCommitments` | | | | x | | | | | | |
| `read.getAffinityChart` | x | x | | | | | | | x | x |
| `read.listDuplicateCandidates` | | | | x | x | | | x | x | |
| `read.getMergeHistory` | | | | | | | | | | |

Every write function appears in at least one angle. Read functions without a
mark (`reviseContact`, `setContactLifecycle`, `overrideLinkState`, etc.) are
exercised implicitly through other narratives or are intentionally left for the
operator to discover — they are documented in the entity docs.
