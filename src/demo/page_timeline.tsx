import { useState } from "preact/hooks";
import { inspectAffinityItemToolHandler } from "../tools/inspect_affinity_item_tool.ts";
import { manageCommitmentToolHandler } from "../tools/manage_commitment_tool.ts";
import { manageDateAnchorToolHandler } from "../tools/manage_date_anchor_tool.ts";
import { recordEventToolHandler } from "../tools/record_event_tool.ts";
import { reviewAffinityToolHandler } from "../tools/review_affinity_tool.ts";
import { useAffinity } from "./context.ts";
import {
  Badge,
  ContactPicker,
  EmptyState,
  Explainer,
  FormField,
  LinkPicker,
  Panel,
  SignificanceDots,
  formatTime,
} from "./ui.tsx";

export function TimelinePage() {
  const { db, revision, mutate, toast } = useAffinity();
  void revision;

  const [journalContact, setJournalContact] = useState("");
  const [timelineLink, setTimelineLink] = useState("");
  const [eventTab, setEventTab] = useState<
    "interaction" | "observation" | "milestone" | "transaction"
  >("interaction");
  const [evtContact, setEvtContact] = useState("");
  const [evtType, setEvtType] = useState("conversation");
  const [evtSummary, setEvtSummary] = useState("");
  const [evtSig, setEvtSig] = useState("6");
  const [cmtContact, setCmtContact] = useState("");
  const [cmtType, setCmtType] = useState("promise");
  const [cmtSummary, setCmtSummary] = useState("");
  const [cmtDue, setCmtDue] = useState("");
  const [dateContact, setDateContact] = useState("");
  const [dateKind, setDateKind] = useState("birthday");
  const [dateMonth, setDateMonth] = useState("1");
  const [dateDay, setDateDay] = useState("1");
  const [dateSummary, setDateSummary] = useState("");

  const ownerId = (() => {
    const r = inspectAffinityItemToolHandler(db, { kind: "owner_profile" });
    return r.ok && r.data.kind === "owner_profile"
      ? r.data.detail.contact.id
      : null;
  })();

  const journal = journalContact
    ? reviewAffinityToolHandler(db, {
        view: "events.contact_journal",
        contact: { contactId: Number(journalContact) },
        limit: 50,
      })
    : null;
  const linkTimeline = timelineLink
    ? reviewAffinityToolHandler(db, {
        view: "events.link_timeline",
        link: { linkId: Number(timelineLink) },
        limit: 50,
      })
    : null;
  const momentsResult = reviewAffinityToolHandler(db, {
    view: "events.moments",
    limit: 50,
  });
  const commitmentsResult = reviewAffinityToolHandler(db, {
    view: "commitments.open",
    limit: 50,
  });
  const datesResult = reviewAffinityToolHandler(db, {
    view: "dates.upcoming",
    limit: 50,
  });

  const journalItems = journal?.ok ? journal.data.items : [];
  const linkItems = linkTimeline?.ok ? linkTimeline.data.items : [];
  const moments = momentsResult.ok ? momentsResult.data.items : [];
  const commitments = commitmentsResult.ok ? commitmentsResult.data.items : [];
  const dates = datesResult.ok ? datesResult.data.items : [];

  function recordEvent(e: Event) {
    e.preventDefault();
    if (!evtContact || !evtSummary.trim()) return;
    const contactId = Number(evtContact);
    const significance = Number(evtSig);

    if (eventTab === "interaction") {
      if (ownerId === null) return;
      const result = recordEventToolHandler(db, {
        kind: "interaction",
        input: {
          type: evtType as
            | "conversation"
            | "activity"
            | "support"
            | "gift"
            | "conflict"
            | "correction",
          occurredAt: Date.now(),
          participants: [
            {
              contactId: ownerId,
              directionality: "owner_initiated",
              role: "actor",
            },
            { contactId, role: "recipient" },
          ],
          significance,
          summary: evtSummary.trim(),
        },
      });
      toast(result);
      if (result.ok) mutate();
    } else if (eventTab === "observation") {
      const result = recordEventToolHandler(db, {
        kind: "observation",
        input: {
          occurredAt: Date.now(),
          participants: [{ contactId, role: "subject" }],
          significance,
          summary: evtSummary.trim(),
        },
      });
      toast(result);
      if (result.ok) mutate();
    } else if (eventTab === "milestone") {
      const participants = ownerId
        ? [
            { contactId: ownerId, role: "actor" as const },
            { contactId, role: "recipient" as const },
          ]
        : [{ contactId, role: "subject" as const }];
      const result = recordEventToolHandler(db, {
        kind: "milestone",
        input: {
          occurredAt: Date.now(),
          participants,
          significance,
          summary: evtSummary.trim(),
        },
      });
      toast(result);
      if (result.ok) mutate();
    } else {
      if (ownerId === null) return;
      const result = recordEventToolHandler(db, {
        kind: "transaction",
        input: {
          occurredAt: Date.now(),
          participants: [
            {
              contactId: ownerId,
              directionality: "owner_initiated",
              role: "actor",
            },
            { contactId, role: "recipient" },
          ],
          significance,
          summary: evtSummary.trim(),
        },
      });
      toast(result);
      if (result.ok) mutate();
    }
    setEvtSummary("");
  }

  function recordCommitment(e: Event) {
    e.preventDefault();
    if (!cmtContact || !cmtSummary.trim() || ownerId === null) return;
    const result = manageCommitmentToolHandler(db, {
      action: "record",
      input: {
        commitmentType: cmtType as "promise" | "agreement",
        occurredAt: Date.now(),
        participants: [
          {
            contactId: ownerId,
            directionality: "owner_initiated",
            role: "actor",
          },
          { contactId: Number(cmtContact), role: "recipient" },
        ],
        significance: 7,
        summary: cmtSummary.trim(),
        dueAt: cmtDue ? Number(cmtDue) : null,
      },
    });
    toast(result);
    if (result.ok) {
      mutate();
      setCmtSummary("");
    }
  }

  function resolveCommitment(
    eventId: number,
    resolution: "kept" | "cancelled" | "broken",
  ) {
    const result = manageCommitmentToolHandler(db, {
      action: "resolve",
      commitmentEventId: eventId,
      resolution,
    });
    toast(result);
    if (result.ok) mutate();
  }

  function addDateAnchor(e: Event) {
    e.preventDefault();
    if (!dateContact || !dateSummary.trim()) return;
    const result = manageDateAnchorToolHandler(db, {
      action: "add",
      input: {
        target: {
          kind: "contact",
          contact: { contactId: Number(dateContact) },
        },
        recurrenceKind: dateKind as
          | "birthday"
          | "anniversary"
          | "renewal"
          | "memorial"
          | "custom_yearly",
        anchorMonth: Number(dateMonth),
        anchorDay: Number(dateDay),
        summary: dateSummary.trim(),
        significance: 5,
      },
    });
    toast(result);
    if (result.ok) {
      mutate();
      setDateSummary("");
    }
  }

  function removeDateAnchor(eventId: number) {
    const result = manageDateAnchorToolHandler(db, {
      action: "remove",
      anchorEventId: eventId,
    });
    toast(result);
    if (result.ok) mutate();
  }

  function renderTimeline(
    items: Array<{
      id: number;
      title: string | null;
      subtitle: string | null;
      kind: string;
    }>,
  ) {
    return (
      <div class="timeline">
        {items.map((item, i) => (
          <div class="timeline-item" key={item.id}>
            <div class="timeline-pipe">
              <div class="timeline-dot" />
              {i < items.length - 1 ? <div class="timeline-line" /> : null}
            </div>
            <div class="timeline-content">
              <strong>{item.title ?? `Event #${item.id}`}</strong>
              <small>{item.subtitle ?? ""}</small>
              <div class="timeline-meta">
                <Badge label={item.kind} variant="kind" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const tabDescriptions: Record<string, string> = {
    interaction:
      "A direct exchange: conversation, shared activity, gift, support, conflict, or correction.",
    observation:
      "Something you noticed about a contact but weren't directly involved in.",
    milestone:
      "A significant life event: promotion, move, anniversary, achievement.",
    transaction:
      "A financial exchange: invoice, payment, gift with monetary value.",
  };

  return (
    <div class="page-grid two">
      {/* Contact Journal */}
      <Panel
        title="Contact Journal"
        subtitle="Select a contact to see their full event history."
      >
        <div class="mb-md">
          <ContactPicker
            value={journalContact}
            onChange={setJournalContact}
            includeOwner
            placeholder="Choose a contact..."
          />
        </div>
        {journalContact && journalItems.length > 0 ? (
          renderTimeline(
            journalItems as Array<{
              id: number;
              title: string | null;
              subtitle: string | null;
              kind: string;
            }>,
          )
        ) : journalContact ? (
          <EmptyState message="No journal entries yet. Record an interaction, observation, milestone, or transaction to build this contact's history." />
        ) : (
          <EmptyState message="Pick a contact to view their journal." />
        )}
      </Panel>

      {/* Link Timeline */}
      <Panel
        title="Link Timeline"
        subtitle="Select a relationship to see its shared history."
      >
        <div class="mb-md">
          <LinkPicker value={timelineLink} onChange={setTimelineLink} />
        </div>
        {timelineLink && linkItems.length > 0 ? (
          renderTimeline(
            linkItems as Array<{
              id: number;
              title: string | null;
              subtitle: string | null;
              kind: string;
            }>,
          )
        ) : timelineLink ? (
          <EmptyState message="No events for this link yet." />
        ) : (
          <EmptyState message="Pick a link to view its timeline." />
        )}
      </Panel>

      {/* Record Event */}
      <Panel
        title="Record Event"
        subtitle="The journal is the evidence layer. Record what happened &mdash; the system derives rank changes, moments, and maintenance signals from your entries."
      >
        <div class="tab-bar">
          {(
            ["interaction", "observation", "milestone", "transaction"] as const
          ).map((tab) => (
            <button
              key={tab}
              class={`tab-btn ${eventTab === tab ? "active" : ""}`}
              onClick={() => setEventTab(tab)}
              type="button"
            >
              {tab}
            </button>
          ))}
        </div>
        <p class="muted-sm" style={{ margin: "0 0 12px" }}>
          {tabDescriptions[eventTab]}
        </p>
        <form class="form-grid" onSubmit={recordEvent}>
          <FormField label="Contact" htmlFor="evt-contact" required>
            <ContactPicker
              id="evt-contact"
              value={evtContact}
              onChange={setEvtContact}
            />
          </FormField>
          {eventTab === "interaction" ? (
            <FormField
              label="Interaction type"
              htmlFor="evt-type"
              hint="The nature of the exchange. Affects how the system weights the event."
            >
              <select
                id="evt-type"
                value={evtType}
                onInput={(e) =>
                  setEvtType((e.currentTarget as HTMLSelectElement).value)
                }
              >
                {[
                  "conversation",
                  "activity",
                  "support",
                  "gift",
                  "conflict",
                  "correction",
                ].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </FormField>
          ) : null}
          <FormField
            label="Summary"
            htmlFor="evt-summary"
            hint="What happened, in a sentence or two."
            required
          >
            <textarea
              id="evt-summary"
              value={evtSummary}
              onInput={(e) =>
                setEvtSummary((e.currentTarget as HTMLTextAreaElement).value)
              }
            />
          </FormField>
          <FormField
            label="Significance (1-10)"
            htmlFor="evt-sig"
            hint="How important was this? 1 = trivial, 10 = life-changing. High significance events may trigger Moments."
          >
            <input
              id="evt-sig"
              type="number"
              min="1"
              max="10"
              value={evtSig}
              onInput={(e) =>
                setEvtSig((e.currentTarget as HTMLInputElement).value)
              }
            />
          </FormField>
          <div class="inline-actions">
            <button class="button primary" type="submit">
              Record {eventTab}
            </button>
          </div>
        </form>
      </Panel>

      {/* Commitments */}
      <Panel
        title="Commitments"
        subtitle="Promises and agreements you've made or received. Track them here so nothing falls through the cracks."
      >
        <form class="form-grid" onSubmit={recordCommitment}>
          <FormField
            label="Type"
            htmlFor="cmt-type"
            hint="Promise = something you committed to. Agreement = a mutual commitment."
          >
            <select
              id="cmt-type"
              value={cmtType}
              onInput={(e) =>
                setCmtType((e.currentTarget as HTMLSelectElement).value)
              }
            >
              <option value="promise">promise</option>
              <option value="agreement">agreement</option>
            </select>
          </FormField>
          <FormField label="Counterparty" htmlFor="cmt-contact" required>
            <ContactPicker
              id="cmt-contact"
              value={cmtContact}
              onChange={setCmtContact}
            />
          </FormField>
          <FormField
            label="Summary"
            htmlFor="cmt-summary"
            hint="What was promised or agreed upon."
            required
          >
            <input
              id="cmt-summary"
              value={cmtSummary}
              onInput={(e) =>
                setCmtSummary((e.currentTarget as HTMLInputElement).value)
              }
            />
          </FormField>
          <FormField
            label="Due (timestamp)"
            htmlFor="cmt-due"
            hint="Optional. When this should be fulfilled."
          >
            <input
              id="cmt-due"
              type="number"
              value={cmtDue}
              onInput={(e) =>
                setCmtDue((e.currentTarget as HTMLInputElement).value)
              }
            />
          </FormField>
          <div class="inline-actions">
            <button class="button primary" type="submit">
              Record commitment
            </button>
          </div>
        </form>

        <h3 class="mt-md" style={{ fontSize: "0.95rem" }}>
          Open Commitments
        </h3>
        {commitments.length === 0 ? (
          <EmptyState message="No open commitments. Record a promise or agreement above." />
        ) : (
          <div class="list">
            {commitments.map((item) => (
              <div
                key={item.id}
                class="list-item"
                style={{ cursor: "default" }}
              >
                <div class="list-item-body">
                  <strong>{item.title ?? `#${item.id}`}</strong>
                  <small>{item.subtitle ?? "Open"}</small>
                  <div class="inline-actions mt-sm">
                    <button
                      class="button sm primary"
                      onClick={() => resolveCommitment(item.id, "kept")}
                      type="button"
                    >
                      Mark kept
                    </button>
                    <button
                      class="button sm secondary"
                      onClick={() => resolveCommitment(item.id, "cancelled")}
                      type="button"
                    >
                      Cancel
                    </button>
                    <button
                      class="button sm danger"
                      onClick={() => resolveCommitment(item.id, "broken")}
                      type="button"
                    >
                      Mark broken
                    </button>
                  </div>
                  <small class="muted-sm mt-sm">
                    "Mark Kept" = fulfilled. "Cancel" = no longer relevant.
                    "Mark Broken" = not fulfilled. All permanent.
                  </small>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Date Anchors */}
      <Panel
        title="Date Anchors"
        subtitle="Recurring calendar anchors: birthdays, anniversaries, memorials, renewals. The system surfaces upcoming dates in Radar."
      >
        <form class="form-grid" onSubmit={addDateAnchor}>
          <FormField label="Contact" htmlFor="da-contact" required>
            <ContactPicker
              id="da-contact"
              value={dateContact}
              onChange={setDateContact}
              includeOwner
            />
          </FormField>
          <FormField
            label="Recurrence"
            htmlFor="da-kind"
            hint="What kind of annual recurrence: birthday, anniversary, renewal, memorial, or custom_yearly."
          >
            <select
              id="da-kind"
              value={dateKind}
              onInput={(e) =>
                setDateKind((e.currentTarget as HTMLSelectElement).value)
              }
            >
              {[
                "birthday",
                "anniversary",
                "renewal",
                "memorial",
                "custom_yearly",
              ].map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </FormField>
          <div class="form-grid two">
            <FormField
              label="Month (1-12)"
              htmlFor="da-month"
              hint="The calendar month."
            >
              <input
                id="da-month"
                type="number"
                min="1"
                max="12"
                value={dateMonth}
                onInput={(e) =>
                  setDateMonth((e.currentTarget as HTMLInputElement).value)
                }
              />
            </FormField>
            <FormField
              label="Day (1-31)"
              htmlFor="da-day"
              hint="The calendar day."
            >
              <input
                id="da-day"
                type="number"
                min="1"
                max="31"
                value={dateDay}
                onInput={(e) =>
                  setDateDay((e.currentTarget as HTMLInputElement).value)
                }
              />
            </FormField>
          </div>
          <FormField label="Summary" htmlFor="da-summary" required>
            <input
              id="da-summary"
              value={dateSummary}
              onInput={(e) =>
                setDateSummary((e.currentTarget as HTMLInputElement).value)
              }
            />
          </FormField>
          <div class="inline-actions">
            <button class="button primary" type="submit">
              Add date anchor
            </button>
          </div>
        </form>

        <h3 class="mt-md" style={{ fontSize: "0.95rem" }}>
          Upcoming Dates
        </h3>
        {dates.length === 0 ? (
          <EmptyState message="No upcoming dates. Add a birthday, anniversary, or other recurring date above." />
        ) : (
          <div class="list">
            {dates.map((item) => (
              <div
                key={item.id}
                class="list-item"
                style={{ cursor: "default" }}
              >
                <div class="list-item-body">
                  <strong>{item.title ?? `Date #${item.id}`}</strong>
                  <small>{item.subtitle ?? ""}</small>
                </div>
                <button
                  class="button sm danger"
                  onClick={() => removeDateAnchor(item.id)}
                  type="button"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Moments */}
      <Panel
        title="Moments"
        subtitle="Moments are relationship-defining beats the system derives automatically from significant events. You don't create them &mdash; they emerge from the evidence. A breakthrough, rupture, reconciliation, or turning point."
      >
        {moments.length === 0 ? (
          <EmptyState message="No moments yet. Record high-significance events to see moments emerge automatically." />
        ) : (
          <div class="list">
            {moments.map((item) => (
              <div
                key={item.id}
                class="list-item"
                style={{ cursor: "default" }}
              >
                <div class="list-item-body">
                  <strong>{item.title ?? `Moment #${item.id}`}</strong>
                  <small>{item.subtitle ?? ""}</small>
                  <Badge label={item.kind} variant="moment" />
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Explainers */}
      <div class="stack">
        <Explainer title="Evidence vs interpretation">
          The journal stores evidence: what happened, who was involved, how
          significant it was. The system interprets this evidence to derive rank
          changes, moment kinds, and maintenance signals. You never tell the
          system what a moment is or what rank to assign &mdash; it figures that
          out from the accumulated evidence.
        </Explainer>
        <Explainer title="How moments emerge">
          When an event's significance crosses certain thresholds relative to
          the relationship's history, the system may classify it as a Moment: a
          breakthrough, rupture, reconciliation, milestone, or turning point.
          These are derived markers, not user-created labels.
        </Explainer>
        <Explainer title="Commitment resolution">
          Every commitment (promise or agreement) starts open. It can be
          resolved exactly once: kept (fulfilled), cancelled (no longer
          relevant), or broken (unfulfilled). Resolution is permanent and
          affects trust computation.
        </Explainer>
        <Explainer title="Date anchor recurrence">
          Date anchors are annual recurrences tied to a contact or link. They
          surface in the Radar view as upcoming dates and help the system
          generate maintenance reminders. Each anchor has a month, day, and
          recurrence kind.
        </Explainer>
      </div>
    </div>
  );
}
