import { useState } from "preact/hooks";
import { inspectAffinityItemToolHandler } from "../tools/inspect_affinity_item_tool.ts";
import { manageAttributeToolHandler } from "../tools/manage_attribute_tool.ts";
import { manageRelationshipToolHandler } from "../tools/manage_relationship_tool.ts";
import { reviewAffinityToolHandler } from "../tools/review_affinity_tool.ts";
import { useAffinity } from "./context.ts";
import {
  Badge,
  ContactPicker,
  DataRow,
  EmptyState,
  Explainer,
  FormField,
  Panel,
  SignificanceDots,
} from "./ui.tsx";

export function RelationshipsPage() {
  const { db, revision, mutate, toast } = useAffinity();
  void revision;

  const [selectedLinkId, setSelectedLinkId] = useState("");
  const [seedFrom, setSeedFrom] = useState("");
  const [seedTo, setSeedTo] = useState("");
  const [seedKind, setSeedKind] = useState("personal");
  const [seedBond, setSeedBond] = useState("");
  const [seedCadence, setSeedCadence] = useState("");
  const [reviseBond, setReviseBond] = useState("");
  const [overrideState, setOverrideState] = useState("active");
  const [tieFrom, setTieFrom] = useState("");
  const [tieTo, setTieTo] = useState("");
  const [tieKind, setTieKind] = useState("works_at");
  const [tieRole, setTieRole] = useState("");
  const [linkAttrName, setLinkAttrName] = useState("");
  const [linkAttrValue, setLinkAttrValue] = useState("");

  const ownerLinks = reviewAffinityToolHandler(db, {
    view: "links.owner",
    includeArchived: true,
    limit: 50,
  });
  const observedLinks = reviewAffinityToolHandler(db, {
    view: "links.observed",
    limit: 50,
  });
  const progressionResult = reviewAffinityToolHandler(db, {
    view: "links.progression_readiness",
    limit: 50,
  });

  const links = ownerLinks.ok ? ownerLinks.data.items : [];
  const observed = observedLinks.ok ? observedLinks.data.items : [];
  const progression = progressionResult.ok ? progressionResult.data.items : [];

  const linkDetail = selectedLinkId
    ? inspectAffinityItemToolHandler(db, {
        kind: "link",
        link: { linkId: Number(selectedLinkId) },
      })
    : null;
  const detail =
    linkDetail?.ok && linkDetail.data.kind === "link"
      ? linkDetail.data.detail
      : null;

  function seedSocialLink(e: Event) {
    e.preventDefault();
    if (!seedFrom || !seedTo) return;
    const result = manageRelationshipToolHandler(db, {
      action: "seed_social_link",
      from: { contactId: Number(seedFrom) },
      to: { contactId: Number(seedTo) },
      input: {
        kind: seedKind as
          | "personal"
          | "family"
          | "professional"
          | "romantic"
          | "care"
          | "service"
          | "observed"
          | "other_relational",
        bond: seedBond.trim() || null,
        cadenceDays: seedCadence ? Number(seedCadence) : null,
      },
    });
    toast(result);
    if (result.ok) {
      mutate();
      setSelectedLinkId(String(result.data.primary.id));
      setSeedFrom("");
      setSeedTo("");
      setSeedBond("");
    }
  }

  function doReviseBond(e: Event) {
    e.preventDefault();
    if (!selectedLinkId) return;
    const result = manageRelationshipToolHandler(db, {
      action: "revise_bond",
      link: { linkId: Number(selectedLinkId) },
      bond: reviseBond.trim() || null,
    });
    toast(result);
    if (result.ok) {
      mutate();
      setReviseBond("");
    }
  }

  function doOverrideState() {
    if (!selectedLinkId) return;
    const result = manageRelationshipToolHandler(db, {
      action: "override_state",
      link: { linkId: Number(selectedLinkId) },
      state: overrideState as
        | "active"
        | "dormant"
        | "strained"
        | "broken"
        | "archived",
    });
    toast(result);
    if (result.ok) mutate();
  }

  function addTie(e: Event) {
    e.preventDefault();
    if (!tieFrom || !tieTo) return;
    const result = manageRelationshipToolHandler(db, {
      action: "set_structural_tie",
      from: { contactId: Number(tieFrom) },
      to: { contactId: Number(tieTo) },
      input: {
        kind: tieKind as
          | "works_at"
          | "manages"
          | "member_of"
          | "married_to"
          | "partner_of"
          | "parent_of"
          | "child_of"
          | "sibling_of"
          | "friend_of"
          | "client_of"
          | "vendor_of"
          | "reports_to"
          | "belongs_to"
          | "other_structural",
        role: tieRole.trim() || null,
      },
    });
    toast(result);
    if (result.ok) {
      mutate();
      setTieFrom("");
      setTieTo("");
      setTieRole("");
    }
  }

  function removeTie(linkId: number) {
    const result = manageRelationshipToolHandler(db, {
      action: "remove_structural_tie",
      link: { linkId },
    });
    toast(result);
    if (result.ok) mutate();
  }

  function setLinkAttribute(e: Event) {
    e.preventDefault();
    if (!selectedLinkId || !linkAttrName.trim()) return;
    const result = manageAttributeToolHandler(db, {
      action: "set",
      target: { kind: "link", link: { linkId: Number(selectedLinkId) } },
      name: linkAttrName.trim(),
      value: linkAttrValue.trim() || null,
    });
    toast(result);
    if (result.ok) {
      mutate();
      setLinkAttrName("");
      setLinkAttrValue("");
    }
  }

  return (
    <div class="page-grid two">
      {/* Owner social links */}
      <Panel
        title="Your Social Links"
        subtitle="Tracked relationships radiating from you. Each carries rank, affinity, trust, bond, and state &mdash; most derived automatically from evidence."
      >
        {links.length === 0 ? (
          <EmptyState message="No social links yet. Create one below to start tracking a relationship." />
        ) : (
          <div class="list">
            {links.map((item) => (
              <button
                key={item.id}
                class={`list-item ${String(item.id) === selectedLinkId ? "selected" : ""}`}
                onClick={() => setSelectedLinkId(String(item.id))}
                type="button"
              >
                <div class="list-item-body">
                  <strong>{item.title ?? `Link #${item.id}`}</strong>
                  <small>
                    <Badge label={item.kind} variant="kind" />
                    {item.subtitle ? ` ${item.subtitle}` : ""}
                  </small>
                </div>
              </button>
            ))}
          </div>
        )}
      </Panel>

      {/* Link detail */}
      <div class="stack">
        {detail ? (
          <Panel
            title="Link Detail"
            subtitle="Full detail for this relationship, including system-derived metrics and your bond narrative."
          >
            <DataRow label="Counterparty">{detail.counterparty.name}</DataRow>
            <DataRow label="Kind">
              <Badge label={detail.link.kind} variant="kind" />
            </DataRow>
            <DataRow label="State">
              <Badge label={detail.link.state ?? "active"} variant="state" />
            </DataRow>
            <DataRow
              label="Rank"
              hint="Visible progression level (derived from evidence)"
            >
              <Badge label={`Rank ${detail.link.rank ?? 0}`} variant="rank" />
            </DataRow>
            <DataRow
              label="Affinity"
              hint="Hidden progress toward the next rank threshold"
            >
              <div style={{ width: "120px" }}>
                <div class="progress-bar">
                  <div
                    class="progress-bar-fill"
                    style={{
                      width: `${Math.min(100, (detail.link.affinity ?? 0) * 100)}%`,
                    }}
                  />
                </div>
                <small class="muted-sm">
                  {(detail.link.affinity ?? 0).toFixed(2)}
                </small>
              </div>
            </DataRow>
            <DataRow
              label="Trust"
              hint="Reliability axis &mdash; separate from progress"
            >
              {(detail.link.trust ?? 0).toFixed(2)}
            </DataRow>
            {detail.link.bond ? (
              <div class="mt-sm">
                <small class="muted-sm">
                  Bond &mdash; your narrative reading of this relationship
                </small>
                <blockquote class="bond-quote">{detail.link.bond}</blockquote>
              </div>
            ) : null}
            {detail.link.cadenceDays ? (
              <DataRow label="Cadence" hint="Target contact frequency in days">
                {detail.link.cadenceDays} days
              </DataRow>
            ) : null}
          </Panel>
        ) : (
          <Panel
            title="Link Detail"
            subtitle="Select a social link to inspect its rank, affinity, trust, bond, and recent history."
          >
            <EmptyState message="Pick a link from the list to view its full detail." />
          </Panel>
        )}

        {/* Revise bond */}
        {selectedLinkId ? (
          <Panel
            title="Revise Bond"
            subtitle="The bond is your narrative reading of a relationship. Update it when the dynamic shifts &mdash; it's the human-authored counterpart to the system's computed rank and trust."
          >
            <form class="form-grid" onSubmit={doReviseBond}>
              <FormField
                label="New bond"
                htmlFor="revise-bond"
                hint="A short narrative, e.g. 'Trusted advisor since the early days.'"
              >
                <textarea
                  id="revise-bond"
                  value={reviseBond}
                  onInput={(e) =>
                    setReviseBond(
                      (e.currentTarget as HTMLTextAreaElement).value,
                    )
                  }
                />
              </FormField>
              <div class="inline-actions">
                <button class="button primary sm" type="submit">
                  Update bond
                </button>
              </div>
            </form>
          </Panel>
        ) : null}

        {/* Override state */}
        {selectedLinkId ? (
          <Panel
            title="Override State"
            subtitle="Normally the system manages link state from evidence. Override it when you know something the data doesn't."
          >
            <div class="form-grid two">
              <FormField label="State" htmlFor="override-st">
                <select
                  id="override-st"
                  value={overrideState}
                  onInput={(e) =>
                    setOverrideState(
                      (e.currentTarget as HTMLSelectElement).value,
                    )
                  }
                >
                  <option value="active">active</option>
                  <option value="dormant">dormant</option>
                  <option value="strained">strained</option>
                  <option value="broken">broken</option>
                  <option value="archived">archived</option>
                </select>
              </FormField>
              <div class="inline-actions">
                <button
                  class="button sm danger"
                  onClick={doOverrideState}
                  type="button"
                >
                  Override
                </button>
              </div>
            </div>
          </Panel>
        ) : null}

        {/* Link attribute */}
        {selectedLinkId ? (
          <Panel
            title="Link Attribute"
            subtitle="Attach custom metadata to this relationship."
          >
            <form class="form-grid two" onSubmit={setLinkAttribute}>
              <FormField label="Name" htmlFor="la-name" required>
                <input
                  id="la-name"
                  value={linkAttrName}
                  onInput={(e) =>
                    setLinkAttrName((e.currentTarget as HTMLInputElement).value)
                  }
                />
              </FormField>
              <FormField label="Value" htmlFor="la-value">
                <input
                  id="la-value"
                  value={linkAttrValue}
                  onInput={(e) =>
                    setLinkAttrValue(
                      (e.currentTarget as HTMLInputElement).value,
                    )
                  }
                />
              </FormField>
              <div class="inline-actions">
                <button class="button primary sm" type="submit">
                  Set
                </button>
              </div>
            </form>
          </Panel>
        ) : null}
      </div>

      {/* Seed social link */}
      <Panel
        title="Start a Social Link"
        subtitle="A Social Link is a tracked relationship between two contacts. It carries rank, affinity, trust, bond, and state &mdash; most derived automatically from recorded evidence."
      >
        <form class="form-grid" onSubmit={seedSocialLink}>
          <FormField label="From" htmlFor="seed-from" required>
            <ContactPicker
              id="seed-from"
              value={seedFrom}
              onChange={setSeedFrom}
              includeOwner
            />
          </FormField>
          <FormField label="To" htmlFor="seed-to" required>
            <ContactPicker
              id="seed-to"
              value={seedTo}
              onChange={setSeedTo}
              includeOwner
            />
          </FormField>
          <FormField
            label="Kind"
            htmlFor="seed-kind"
            hint="The nature of the relationship: personal, family, professional, romantic, care, service, or observed (a link you noticed between others)."
          >
            <select
              id="seed-kind"
              value={seedKind}
              onInput={(e) =>
                setSeedKind((e.currentTarget as HTMLSelectElement).value)
              }
            >
              {[
                "personal",
                "family",
                "professional",
                "romantic",
                "care",
                "service",
                "observed",
                "other_relational",
              ].map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            label="Bond"
            htmlFor="seed-bond"
            hint="Optional. A short narrative describing the current feel, e.g. 'Trusted advisor since the early days.'"
          >
            <input
              id="seed-bond"
              value={seedBond}
              onInput={(e) =>
                setSeedBond((e.currentTarget as HTMLInputElement).value)
              }
            />
          </FormField>
          <FormField
            label="Cadence (days)"
            htmlFor="seed-cadence"
            hint="Optional. How often you intend to stay in touch. Used by Radar to detect drift."
          >
            <input
              id="seed-cadence"
              type="number"
              value={seedCadence}
              onInput={(e) =>
                setSeedCadence((e.currentTarget as HTMLInputElement).value)
              }
            />
          </FormField>
          <div class="inline-actions">
            <button class="button primary" type="submit">
              Create link
            </button>
          </div>
        </form>
      </Panel>

      {/* Structural ties */}
      <Panel
        title="Structural Ties"
        subtitle="Ties are factual structural edges: employment, family, membership, hierarchy. Unlike social links, they don't carry rank or affinity &mdash; they just record that a relationship exists."
      >
        <form class="form-grid" onSubmit={addTie}>
          <FormField label="From" htmlFor="tie-from" required>
            <ContactPicker
              id="tie-from"
              value={tieFrom}
              onChange={setTieFrom}
              includeOwner
            />
          </FormField>
          <FormField label="To" htmlFor="tie-to" required>
            <ContactPicker
              id="tie-to"
              value={tieTo}
              onChange={setTieTo}
              includeOwner
            />
          </FormField>
          <FormField
            label="Kind"
            htmlFor="tie-kind"
            hint="The structural nature: works_at, manages, member_of, parent_of, client_of, etc."
          >
            <select
              id="tie-kind"
              value={tieKind}
              onInput={(e) =>
                setTieKind((e.currentTarget as HTMLSelectElement).value)
              }
            >
              {[
                "works_at",
                "manages",
                "member_of",
                "married_to",
                "partner_of",
                "parent_of",
                "child_of",
                "sibling_of",
                "friend_of",
                "client_of",
                "vendor_of",
                "reports_to",
                "belongs_to",
                "other_structural",
              ].map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            label="Role"
            htmlFor="tie-role"
            hint="Optional. Clarifies position, e.g. 'founding member' or 'CTO'."
          >
            <input
              id="tie-role"
              value={tieRole}
              onInput={(e) =>
                setTieRole((e.currentTarget as HTMLInputElement).value)
              }
            />
          </FormField>
          <div class="inline-actions">
            <button class="button primary" type="submit">
              Add tie
            </button>
          </div>
        </form>
      </Panel>

      {/* Observed links */}
      <Panel
        title="Observed Links"
        subtitle="Relationships you've noticed between other people in your network &mdash; not involving you directly. Useful for understanding group dynamics."
      >
        {observed.length === 0 ? (
          <EmptyState message="No observed links yet. Create a social link with kind 'observed' between two other contacts." />
        ) : (
          <div class="list">
            {observed.map((item) => (
              <div
                key={item.id}
                class="list-item"
                style={{ cursor: "default" }}
              >
                <div class="list-item-body">
                  <strong>{item.title ?? `Link #${item.id}`}</strong>
                  <small>{item.subtitle ?? ""}</small>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Progression readiness */}
      <Panel
        title="Progression Readiness"
        subtitle="Links approaching their next rank threshold. These relationships are close to leveling up based on accumulated evidence."
      >
        {progression.length === 0 ? (
          <EmptyState message="No links near a rank threshold yet. Record more interactions to build up affinity." />
        ) : (
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Link</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {progression.map((item) => (
                  <tr key={item.id}>
                    <td>{item.title ?? `#${item.id}`}</td>
                    <td>{item.subtitle ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Explainers */}
      <div class="stack">
        <Explainer title="Social Links vs Structural Ties">
          Social links are tracked, evolving relationships with rank, affinity,
          trust, bond, and state. They represent the emotional/relational
          dimension. Structural ties are factual edges: who works where, who is
          related to whom, membership and hierarchy. They don't evolve or carry
          rank &mdash; they just record structure.
        </Explainer>
        <Explainer title="How rank and affinity work">
          Rank is the visible progression level of a relationship. Affinity is
          the hidden progress toward the next rank threshold. Both are derived
          from evidence (interactions, observations, milestones) you record
          &mdash; you never set them manually. High-significance events
          contribute more. When affinity crosses a threshold, rank increases.
        </Explainer>
        <Explainer title="Bond and trust">
          Bond is your narrative reading of a relationship &mdash; the
          human-authored description of how things feel. Trust is a separate
          reliability axis computed from evidence. High rank doesn't imply high
          trust: someone can be a frequent contact (high rank) but unreliable
          (low trust). Bond is free-form; trust is derived.
        </Explainer>
      </div>
    </div>
  );
}
