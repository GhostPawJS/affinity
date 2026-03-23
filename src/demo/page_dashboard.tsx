import { useState } from "preact/hooks";
import { inspectAffinityItemToolHandler } from "../tools/inspect_affinity_item_tool.ts";
import { manageContactToolHandler } from "../tools/manage_contact_tool.ts";
import { manageIdentityToolHandler } from "../tools/manage_identity_tool.ts";
import { reviewAffinityToolHandler } from "../tools/review_affinity_tool.ts";
import { navigate } from "./app.tsx";
import { useAffinity } from "./context.ts";
import {
  Badge,
  DataRow,
  Explainer,
  FormField,
  Panel,
  SummaryCard,
} from "./ui.tsx";

export function DashboardPage(props: {
  onReset: (mode: "blank" | "seeded") => Promise<void>;
}) {
  const { db, revision, mutate, toast } = useAffinity();
  void revision;

  const [ownerName, setOwnerName] = useState("Demo Operator");
  const [ownerEmail, setOwnerEmail] = useState("operator@example.com");

  const ownerResult = inspectAffinityItemToolHandler(db, {
    kind: "owner_profile",
  });
  const contactsResult = reviewAffinityToolHandler(db, {
    view: "contacts.list",
    includeOwner: true,
    includeDormant: true,
    limit: 100,
  });
  const linksResult = reviewAffinityToolHandler(db, {
    view: "links.owner",
    limit: 100,
  });
  const commitmentsResult = reviewAffinityToolHandler(db, {
    view: "commitments.open",
    limit: 100,
  });
  const datesResult = reviewAffinityToolHandler(db, {
    view: "dates.upcoming",
    limit: 100,
  });
  const chartResult = reviewAffinityToolHandler(db, {
    view: "graph.chart",
    includeObserved: true,
  });

  const contactCount = contactsResult.ok ? contactsResult.data.count : 0;
  const linkCount = linksResult.ok ? linksResult.data.count : 0;
  const commitmentCount = commitmentsResult.ok
    ? commitmentsResult.data.count
    : 0;
  const dateCount = datesResult.ok ? datesResult.data.count : 0;
  const chartNodes =
    chartResult.ok && chartResult.data.chart
      ? chartResult.data.chart.nodes.length
      : 0;
  const chartEdges =
    chartResult.ok && chartResult.data.chart
      ? chartResult.data.chart.edges.length
      : 0;
  const hasOwner = ownerResult.ok && ownerResult.data.kind === "owner_profile";

  function bootstrapOwner(e: Event) {
    e.preventDefault();
    const created = manageContactToolHandler(db, {
      action: "create",
      input: { bootstrapOwner: true, kind: "human", name: ownerName },
    });
    toast(created);
    if (!created.ok) return;
    mutate();
    if (ownerEmail.trim()) {
      const identity = manageIdentityToolHandler(db, {
        action: "add",
        contact: { contactId: created.data.primary.id },
        input: { type: "email", value: ownerEmail.trim(), verified: true },
      });
      toast(identity);
      if (identity.ok) mutate();
    }
  }

  return (
    <div class="page-grid">
      {/* Hero */}
      <Panel title="Welcome to Affinity">
        <p
          class="muted"
          style={{ fontSize: "0.95rem", lineHeight: "1.65", marginTop: 0 }}
        >
          Affinity is a relationship engine that combines the emotional
          legibility of an RPG with the operational rigor of a real CRM. You
          tell it what happened &mdash; it owns the math. Rank, affinity, trust,
          and moments are all derived from evidence you record, never set
          manually.
        </p>
        <div class="summary-grid">
          <SummaryCard
            label="Contacts"
            value={contactCount}
            sublabel="People, companies, groups, and pets you track"
          />
          <SummaryCard
            label="Social Links"
            value={linkCount}
            sublabel="Tracked relationships with rank and bond"
          />
          <SummaryCard
            label="Open Commitments"
            value={commitmentCount}
            sublabel="Promises and agreements still pending"
          />
          <SummaryCard
            label="Upcoming Dates"
            value={dateCount}
            sublabel="Birthdays, anniversaries, and reminders"
          />
          <SummaryCard
            label="Chart Nodes"
            value={chartNodes}
            sublabel="Contacts in the relationship graph"
          />
          <SummaryCard
            label="Chart Edges"
            value={chartEdges}
            sublabel="Links connecting them"
          />
        </div>
      </Panel>

      {/* Owner or bootstrap */}
      {hasOwner ? (
        <Panel
          title="Owner Profile"
          subtitle="The owner is the first-class 'you' in the system. All social links radiate from the owner."
        >
          {ownerResult.ok && ownerResult.data.kind === "owner_profile" ? (
            <div>
              <DataRow label="Name">
                {ownerResult.data.detail.contact.name}
              </DataRow>
              <DataRow label="Kind">
                <Badge
                  label={ownerResult.data.detail.contact.kind}
                  variant="kind"
                />
              </DataRow>
              {ownerResult.data.detail.identities.length > 0 ? (
                <DataRow label="Identities">
                  <div
                    class="flex-row"
                    style={{ flexWrap: "wrap", gap: "4px" }}
                  >
                    {ownerResult.data.detail.identities.map((id) => (
                      <Badge
                        key={id.id}
                        label={`${id.type}: ${id.value}`}
                        variant="info"
                      />
                    ))}
                  </div>
                </DataRow>
              ) : null}
            </div>
          ) : null}
        </Panel>
      ) : (
        <Panel
          title="Bootstrap Owner"
          subtitle="Every Affinity instance begins with an owner &mdash; that's you. Create your owner contact to start recording interactions."
        >
          <form class="form-grid two" onSubmit={bootstrapOwner}>
            <FormField
              label="Owner name"
              htmlFor="owner-name"
              hint="Your name as it appears in the system."
              required
            >
              <input
                id="owner-name"
                value={ownerName}
                onInput={(e) =>
                  setOwnerName((e.currentTarget as HTMLInputElement).value)
                }
              />
            </FormField>
            <FormField
              label="Email"
              htmlFor="owner-email"
              hint="Optional. Identities help resolve 'who is who' across systems."
            >
              <input
                id="owner-email"
                value={ownerEmail}
                onInput={(e) =>
                  setOwnerEmail((e.currentTarget as HTMLInputElement).value)
                }
              />
            </FormField>
            <div class="inline-actions">
              <button class="button primary" type="submit">
                Create owner
              </button>
            </div>
          </form>

          <Explainer title="Getting started with Affinity">
            <ol style={{ margin: 0, paddingLeft: "1.2em" }}>
              <li>Create your owner contact above.</li>
              <li>
                Head to <strong>Contacts</strong> to add people, companies, or
                groups you know.
              </li>
              <li>
                Visit <strong>Relationships</strong> to create social links and
                structural ties between contacts.
              </li>
              <li>
                Record interactions, observations, and milestones on the{" "}
                <strong>Timeline</strong>.
              </li>
              <li>
                Check <strong>Insights</strong> to see your relationship radar
                and network chart take shape.
              </li>
            </ol>
          </Explainer>
        </Panel>
      )}

      {/* Session controls */}
      <Panel
        title="Session Controls"
        subtitle="Reset the in-memory database to start fresh or load pre-populated demo data."
      >
        <div class="inline-actions">
          <button
            class="button secondary"
            onClick={() => void props.onReset("blank")}
            type="button"
          >
            Reset Blank
          </button>
          <button
            class="button primary"
            onClick={() => void props.onReset("seeded")}
            type="button"
          >
            Reset Seeded
          </button>
        </div>
        <p class="muted-sm mt-sm">
          <strong>Blank</strong> starts empty &mdash; you build everything from
          scratch. <strong>Seeded</strong> loads 7 contacts, social links,
          events, commitments, and date anchors so every feature has data.
        </p>
      </Panel>

      {/* Navigation hints if blank */}
      {!hasOwner ? null : (
        <Panel
          title="Explore"
          subtitle="Jump to any section to start working with the engine."
        >
          <div class="inline-actions" style={{ flexWrap: "wrap" }}>
            <button
              class="button ghost"
              onClick={() => navigate("/contacts")}
              type="button"
            >
              Contacts &rarr;
            </button>
            <button
              class="button ghost"
              onClick={() => navigate("/relationships")}
              type="button"
            >
              Relationships &rarr;
            </button>
            <button
              class="button ghost"
              onClick={() => navigate("/timeline")}
              type="button"
            >
              Timeline &rarr;
            </button>
            <button
              class="button ghost"
              onClick={() => navigate("/insights")}
              type="button"
            >
              Insights &rarr;
            </button>
          </div>
        </Panel>
      )}
    </div>
  );
}
