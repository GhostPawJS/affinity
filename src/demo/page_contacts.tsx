import { useState } from "preact/hooks";
import { inspectAffinityItemToolHandler } from "../tools/inspect_affinity_item_tool.ts";
import { manageAttributeToolHandler } from "../tools/manage_attribute_tool.ts";
import { manageContactToolHandler } from "../tools/manage_contact_tool.ts";
import { manageIdentityToolHandler } from "../tools/manage_identity_tool.ts";
import { mergeContactsToolHandler } from "../tools/merge_contacts_tool.ts";
import { reviewAffinityToolHandler } from "../tools/review_affinity_tool.ts";
import { searchAffinityToolHandler } from "../tools/search_affinity_tool.ts";
import { useAffinity } from "./context.ts";
import {
  Avatar,
  Badge,
  ContactPicker,
  DataRow,
  EmptyState,
  Explainer,
  FormField,
  Panel,
} from "./ui.tsx";

export function ContactsPage() {
  const { db, revision, mutate, toast } = useAffinity();
  void revision;

  const [selectedId, setSelectedId] = useState("");
  const [createName, setCreateName] = useState("");
  const [createKind, setCreateKind] = useState("human");
  const [createEmail, setCreateEmail] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchItems, setSearchItems] = useState<
    Array<{
      id: number;
      title: string | null;
      subtitle: string | null;
      kind: string;
    }>
  >([]);
  const [addIdType, setAddIdType] = useState("email");
  const [addIdValue, setAddIdValue] = useState("");
  const [attrName, setAttrName] = useState("");
  const [attrValue, setAttrValue] = useState("");
  const [mergeWinner, setMergeWinner] = useState("");
  const [mergeLoser, setMergeLoser] = useState("");
  const [mergeReason, setMergeReason] = useState("");

  const contactsResult = reviewAffinityToolHandler(db, {
    view: "contacts.list",
    includeOwner: true,
    includeDormant: true,
    limit: 100,
  });
  const contacts = contactsResult.ok ? contactsResult.data.items : [];

  const profile = selectedId
    ? inspectAffinityItemToolHandler(db, {
        kind: "contact_profile",
        contact: { contactId: Number(selectedId) },
      })
    : null;

  const duplicatesResult = reviewAffinityToolHandler(db, {
    view: "contacts.duplicates",
    limit: 20,
  });
  const duplicates = duplicatesResult.ok ? duplicatesResult.data.items : [];

  const mergeHistoryResult = selectedId
    ? reviewAffinityToolHandler(db, {
        view: "merges.history",
        contact: { contactId: Number(selectedId) },
        limit: 20,
      })
    : null;

  function createContact(e: Event) {
    e.preventDefault();
    if (!createName.trim()) return;
    const result = manageContactToolHandler(db, {
      action: "create",
      input: {
        kind: createKind as
          | "human"
          | "company"
          | "group"
          | "team"
          | "pet"
          | "service"
          | "other",
        name: createName.trim(),
      },
    });
    toast(result);
    if (!result.ok) return;
    mutate();
    const newId = result.data.primary.id;
    setSelectedId(String(newId));
    if (createEmail.trim()) {
      const idResult = manageIdentityToolHandler(db, {
        action: "add",
        contact: { contactId: newId },
        input: { type: "email", value: createEmail.trim() },
      });
      toast(idResult);
      if (idResult.ok) mutate();
    }
    setCreateName("");
    setCreateEmail("");
  }

  function runSearch(e: Event) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const result = searchAffinityToolHandler(db, {
      query: searchQuery,
      includeOwner: true,
      includeDormant: true,
      limit: 20,
    });
    if (result.ok) {
      setSearchItems(
        result.data.items as Array<{
          id: number;
          title: string | null;
          subtitle: string | null;
          kind: string;
        }>,
      );
    }
  }

  function addIdentity(e: Event) {
    e.preventDefault();
    if (!selectedId || !addIdValue.trim()) return;
    const result = manageIdentityToolHandler(db, {
      action: "add",
      contact: { contactId: Number(selectedId) },
      input: { type: addIdType, value: addIdValue.trim() },
    });
    toast(result);
    if (result.ok) {
      mutate();
      setAddIdValue("");
    }
  }

  function removeIdentity(identityId: number) {
    const result = manageIdentityToolHandler(db, {
      action: "remove",
      identityId,
    });
    toast(result);
    if (result.ok) mutate();
  }

  function verifyIdentity(identityId: number) {
    const result = manageIdentityToolHandler(db, {
      action: "verify",
      identityId,
    });
    toast(result);
    if (result.ok) mutate();
  }

  function setAttribute(e: Event) {
    e.preventDefault();
    if (!selectedId || !attrName.trim()) return;
    const result = manageAttributeToolHandler(db, {
      action: "set",
      target: { kind: "contact", contact: { contactId: Number(selectedId) } },
      name: attrName.trim(),
      value: attrValue.trim() || null,
    });
    toast(result);
    if (result.ok) {
      mutate();
      setAttrName("");
      setAttrValue("");
    }
  }

  function executeMerge(e: Event) {
    e.preventDefault();
    if (!mergeWinner || !mergeLoser || mergeWinner === mergeLoser) return;
    const result = mergeContactsToolHandler(db, {
      winner: { contactId: Number(mergeWinner) },
      loser: { contactId: Number(mergeLoser) },
      reasonSummary: mergeReason.trim() || null,
    });
    toast(result);
    if (result.ok) {
      mutate();
      setMergeWinner("");
      setMergeLoser("");
      setMergeReason("");
    }
  }

  const profileData =
    profile?.ok && profile.data.kind === "contact_profile"
      ? profile.data.detail
      : null;

  return (
    <div class="page-grid two">
      {/* Contact list */}
      <Panel
        title="Contacts"
        subtitle="Everyone in your network. Click a contact to inspect their full profile."
      >
        {contacts.length === 0 ? (
          <EmptyState message="No contacts yet. Create your first contact to get started." />
        ) : (
          <div class="list">
            {contacts.map((item) => (
              <button
                key={item.id}
                class={`list-item ${String(item.id) === selectedId ? "selected" : ""}`}
                onClick={() => setSelectedId(String(item.id))}
                type="button"
              >
                <Avatar name={item.title ?? "?"} id={item.id} />
                <div class="list-item-body">
                  <strong>{item.title ?? `Contact #${item.id}`}</strong>
                  <small>
                    {item.subtitle ? (
                      <Badge label={item.subtitle} variant="kind" />
                    ) : null}{" "}
                    {item.state ? (
                      <Badge label={String(item.state)} variant="state" />
                    ) : null}
                  </small>
                </div>
              </button>
            ))}
          </div>
        )}
      </Panel>

      {/* Profile detail */}
      <div class="stack">
        {profileData ? (
          <Panel
            title={profileData.contact.name}
            subtitle="Full profile for this contact, including identities, attributes, and top relationships."
          >
            <DataRow label="Kind">
              <Badge label={profileData.contact.kind} variant="kind" />
            </DataRow>
            <DataRow label="Lifecycle">
              <Badge
                label={profileData.contact.lifecycleState ?? "active"}
                variant="state"
              />
            </DataRow>
            {profileData.identities.length > 0 ? (
              <DataRow label="Identities">
                <div class="stack gap-sm">
                  {profileData.identities.map((id) => (
                    <div key={id.id} class="flex-row">
                      <Badge label={`${id.type}: ${id.value}`} variant="info" />
                      {id.verified ? (
                        <Badge label="verified" variant="success" />
                      ) : (
                        <button
                          class="button sm ghost"
                          onClick={() => verifyIdentity(id.id)}
                          type="button"
                        >
                          verify
                        </button>
                      )}
                      <button
                        class="button sm ghost"
                        onClick={() => removeIdentity(id.id)}
                        type="button"
                        style={{ color: "var(--danger)" }}
                      >
                        remove
                      </button>
                    </div>
                  ))}
                </div>
              </DataRow>
            ) : null}
            {profileData.attributes && profileData.attributes.length > 0 ? (
              <DataRow label="Attributes">
                <div class="flex-row" style={{ flexWrap: "wrap", gap: "4px" }}>
                  {profileData.attributes.map((a) => (
                    <Badge
                      key={a.name}
                      label={`${a.name}=${a.value ?? "true"}`}
                      variant="info"
                    />
                  ))}
                </div>
              </DataRow>
            ) : null}
            {profileData.topLinks && profileData.topLinks.length > 0 ? (
              <DataRow label="Top Links">
                {profileData.topLinks.map((l) => (
                  <Badge
                    key={l.id}
                    label={`Link #${l.id} (rank ${l.rank ?? 0})`}
                    variant="rank"
                  />
                ))}
              </DataRow>
            ) : null}
          </Panel>
        ) : (
          <Panel
            title="Contact Profile"
            subtitle="Select a contact from the list to inspect their full profile."
          >
            <EmptyState message="Pick a contact to view details, manage identities, and set attributes." />
          </Panel>
        )}

        {/* Identity management */}
        {selectedId ? (
          <Panel
            title="Add Identity"
            subtitle="Identities are how the system resolves 'who is who.' A contact can have many: emails, phones, handles, aliases."
          >
            <form class="form-grid two" onSubmit={addIdentity}>
              <FormField
                label="Type"
                htmlFor="id-type"
                hint="The kind of identifier: email, phone, handle, website, alias, or account_id."
              >
                <select
                  id="id-type"
                  value={addIdType}
                  onInput={(e) =>
                    setAddIdType((e.currentTarget as HTMLSelectElement).value)
                  }
                >
                  <option value="email">email</option>
                  <option value="phone">phone</option>
                  <option value="handle">handle</option>
                  <option value="website">website</option>
                  <option value="alias">alias</option>
                  <option value="account_id">account_id</option>
                </select>
              </FormField>
              <FormField
                label="Value"
                htmlFor="id-value"
                hint="The actual identifier, e.g. 'ada@example.com' or '@ada_advisor'."
                required
              >
                <input
                  id="id-value"
                  value={addIdValue}
                  onInput={(e) =>
                    setAddIdValue((e.currentTarget as HTMLInputElement).value)
                  }
                />
              </FormField>
              <div class="inline-actions">
                <button class="button primary sm" type="submit">
                  Add identity
                </button>
              </div>
            </form>
          </Panel>
        ) : null}

        {/* Attributes */}
        {selectedId ? (
          <Panel
            title="Set Attribute"
            subtitle="Custom metadata you attach to a contact &mdash; tags, categories, freeform fields."
          >
            <form class="form-grid two" onSubmit={setAttribute}>
              <FormField
                label="Name"
                htmlFor="attr-name"
                hint="Attribute key, e.g. 'tag', 'industry', 'priority'."
                required
              >
                <input
                  id="attr-name"
                  value={attrName}
                  onInput={(e) =>
                    setAttrName((e.currentTarget as HTMLInputElement).value)
                  }
                />
              </FormField>
              <FormField
                label="Value"
                htmlFor="attr-value"
                hint="Attribute value. Leave empty to set a boolean flag."
              >
                <input
                  id="attr-value"
                  value={attrValue}
                  onInput={(e) =>
                    setAttrValue((e.currentTarget as HTMLInputElement).value)
                  }
                />
              </FormField>
              <div class="inline-actions">
                <button class="button primary sm" type="submit">
                  Set attribute
                </button>
              </div>
            </form>
          </Panel>
        ) : null}
      </div>

      {/* Create Contact */}
      <Panel
        title="Create Contact"
        subtitle="A contact is any entity you want to track &mdash; a person, company, group, even a pet."
      >
        <form class="form-grid two" onSubmit={createContact}>
          <FormField
            label="Name"
            htmlFor="create-name"
            hint="The primary display name for this contact."
            required
          >
            <input
              id="create-name"
              value={createName}
              onInput={(e) =>
                setCreateName((e.currentTarget as HTMLInputElement).value)
              }
            />
          </FormField>
          <FormField
            label="Kind"
            htmlFor="create-kind"
            hint="What type of entity is this? Determines how the system interprets interactions."
          >
            <select
              id="create-kind"
              value={createKind}
              onInput={(e) =>
                setCreateKind((e.currentTarget as HTMLSelectElement).value)
              }
            >
              <option value="human">human</option>
              <option value="company">company</option>
              <option value="group">group</option>
              <option value="team">team</option>
              <option value="pet">pet</option>
              <option value="service">service</option>
              <option value="other">other</option>
            </select>
          </FormField>
          <FormField
            label="Email"
            htmlFor="create-email"
            hint="Optional. Adding an identity lets the system resolve this contact by email later."
          >
            <input
              id="create-email"
              value={createEmail}
              placeholder="name@example.com"
              onInput={(e) =>
                setCreateEmail((e.currentTarget as HTMLInputElement).value)
              }
            />
          </FormField>
          <div class="inline-actions">
            <button class="button primary" type="submit">
              Create contact
            </button>
          </div>
        </form>
      </Panel>

      {/* Search */}
      <Panel
        title="Search"
        subtitle="Search across names, identities, and attributes. Fuzzy matching is built in."
      >
        <form class="form-grid two" onSubmit={runSearch}>
          <FormField
            label="Query"
            htmlFor="search-q"
            hint="Try a name, email, tag value, or partial match."
          >
            <input
              id="search-q"
              value={searchQuery}
              onInput={(e) =>
                setSearchQuery((e.currentTarget as HTMLInputElement).value)
              }
            />
          </FormField>
          <div class="inline-actions">
            <button class="button primary sm" type="submit">
              Search
            </button>
          </div>
        </form>
        {searchItems.length > 0 ? (
          <div class="list mt-md">
            {searchItems.map((item) => (
              <button
                key={item.id}
                class="list-item"
                onClick={() => setSelectedId(String(item.id))}
                type="button"
              >
                <Avatar name={item.title ?? "?"} id={item.id} />
                <div class="list-item-body">
                  <strong>{item.title ?? `#${item.id}`}</strong>
                  <small>{item.subtitle ?? ""}</small>
                </div>
              </button>
            ))}
          </div>
        ) : null}
      </Panel>

      {/* Merge */}
      <Panel
        title="Merge Contacts"
        subtitle="When two contacts turn out to be the same entity, merge them. The winner keeps all data; the loser's history is folded in. This is deterministic and auditable."
      >
        <form class="form-grid" onSubmit={executeMerge}>
          <FormField
            label="Winner"
            htmlFor="merge-winner"
            hint="The contact that survives after the merge."
            required
          >
            <ContactPicker
              id="merge-winner"
              value={mergeWinner}
              onChange={setMergeWinner}
              includeOwner
            />
          </FormField>
          <FormField
            label="Loser"
            htmlFor="merge-loser"
            hint="The contact that gets absorbed. Its events, identities, and links transfer to the winner."
            required
          >
            <ContactPicker
              id="merge-loser"
              value={mergeLoser}
              onChange={setMergeLoser}
              includeOwner
            />
          </FormField>
          <FormField
            label="Reason"
            htmlFor="merge-reason"
            hint="Optional. A short note explaining why these are the same entity."
          >
            <input
              id="merge-reason"
              value={mergeReason}
              onInput={(e) =>
                setMergeReason((e.currentTarget as HTMLInputElement).value)
              }
            />
          </FormField>
          <div class="inline-actions">
            <button class="button danger sm" type="submit">
              Merge
            </button>
          </div>
        </form>
      </Panel>

      {/* Duplicates */}
      <Panel
        title="Duplicate Suggestions"
        subtitle="The system scores contact pairs by name similarity and shared identities. High-scoring pairs are likely duplicates."
      >
        {duplicates.length === 0 ? (
          <EmptyState message="No duplicate candidates found. Create contacts with similar names to see suggestions." />
        ) : (
          <div class="list">
            {duplicates.map((item) => (
              <div
                key={item.id}
                class="list-item"
                style={{ cursor: "default" }}
              >
                <div class="list-item-body">
                  <strong>{item.title ?? `Pair #${item.id}`}</strong>
                  <small>{item.subtitle ?? ""}</small>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Merge history */}
      {mergeHistoryResult?.ok && mergeHistoryResult.data.items.length > 0 ? (
        <Panel
          title="Merge History"
          subtitle="Past merges involving the selected contact."
        >
          <div class="list">
            {mergeHistoryResult.data.items.map((item) => (
              <div
                key={item.id}
                class="list-item"
                style={{ cursor: "default" }}
              >
                <div class="list-item-body">
                  <strong>{item.title ?? `Merge #${item.id}`}</strong>
                  <small>{item.subtitle ?? ""}</small>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {/* Explainers */}
      <div class="stack">
        <Explainer title="What is a Contact?">
          A contact is any entity you track in Affinity: a person, company,
          group, team, service, or even a pet. Contacts have a kind, a lifecycle
          state (active, dormant, archived), and can hold identities (emails,
          phones, handles) and custom attributes (tags, categories). They are
          the atoms of the relationship graph.
        </Explainer>
        <Explainer title="How identity resolution works">
          Identities tie external identifiers to a contact. When the system
          encounters an email address or phone number, it resolves it to a
          contact through identity matching. Verified identities take priority.
          Multiple identity types let one contact be reachable across different
          systems.
        </Explainer>
        <Explainer title="How merging works">
          When two contacts are the same entity, merge them. Choose a winner
          (who survives) and a loser (who is absorbed). All events, identities,
          attributes, and links from the loser transfer to the winner. The
          operation is deterministic and recorded in merge history for
          auditability.
        </Explainer>
      </div>
    </div>
  );
}
