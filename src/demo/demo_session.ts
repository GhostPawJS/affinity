import type { AffinityDb } from "../database.ts";
import { initAffinityTables } from "../init_affinity_tables.ts";
import { manageAttributeToolHandler } from "../tools/manage_attribute_tool.ts";
import { manageCommitmentToolHandler } from "../tools/manage_commitment_tool.ts";
import { manageContactToolHandler } from "../tools/manage_contact_tool.ts";
import { manageDateAnchorToolHandler } from "../tools/manage_date_anchor_tool.ts";
import { manageIdentityToolHandler } from "../tools/manage_identity_tool.ts";
import { manageRelationshipToolHandler } from "../tools/manage_relationship_tool.ts";
import { recordEventToolHandler } from "../tools/record_event_tool.ts";
import type { ToolResult, ToolSuccess } from "../tools/tool_types.ts";
import { openBrowserAffinityDb } from "./browser_affinity_db.ts";

type DemoSeedMode = "blank" | "seeded";

function requireSuccess<TData>(
  label: string,
  result: ToolResult<TData>,
): ToolSuccess<TData> {
  if (!result.ok) {
    throw new Error(`${label}: ${result.summary}`);
  }
  return result;
}

function seedDemoSession(db: AffinityDb): void {
  const t = 1_710_000_000_000;

  const owner = requireSuccess(
    "Create owner",
    manageContactToolHandler(db, {
      action: "create",
      input: {
        bootstrapOwner: true,
        kind: "human",
        name: "Demo Operator",
        now: t,
      },
    }),
  );
  const ownerId = owner.data.primary.id;

  requireSuccess(
    "Owner email",
    manageIdentityToolHandler(db, {
      action: "add",
      contact: { contactId: ownerId },
      input: { type: "email", value: "operator@example.com", verified: true },
    }),
  );
  requireSuccess(
    "Owner phone",
    manageIdentityToolHandler(db, {
      action: "add",
      contact: { contactId: ownerId },
      input: { type: "phone", value: "+1-555-0100" },
    }),
  );

  const ada = requireSuccess(
    "Create Ada",
    manageContactToolHandler(db, {
      action: "create",
      input: { kind: "human", name: "Ada Advisor", now: t + 100 },
    }),
  );
  requireSuccess(
    "Ada email",
    manageIdentityToolHandler(db, {
      action: "add",
      contact: { contactId: ada.data.primary.id },
      input: { type: "email", value: "ada@example.com", verified: true },
    }),
  );
  requireSuccess(
    "Tag Ada",
    manageAttributeToolHandler(db, {
      action: "set",
      target: { kind: "contact", contact: { contactId: ada.data.primary.id } },
      name: "tag",
      value: "advisor",
    }),
  );
  requireSuccess(
    "Ada expertise",
    manageAttributeToolHandler(db, {
      action: "set",
      target: { kind: "contact", contact: { contactId: ada.data.primary.id } },
      name: "expertise",
      value: "strategy",
    }),
  );

  const ben = requireSuccess(
    "Create Ben",
    manageContactToolHandler(db, {
      action: "create",
      input: { kind: "human", name: "Ben Builder", now: t + 200 },
    }),
  );
  requireSuccess(
    "Ben email",
    manageIdentityToolHandler(db, {
      action: "add",
      contact: { contactId: ben.data.primary.id },
      input: { type: "email", value: "ben@example.com" },
    }),
  );
  requireSuccess(
    "Tag Ben",
    manageAttributeToolHandler(db, {
      action: "set",
      target: { kind: "contact", contact: { contactId: ben.data.primary.id } },
      name: "tag",
      value: "collaborator",
    }),
  );

  const benny = requireSuccess(
    "Create Benjamin (near-duplicate)",
    manageContactToolHandler(db, {
      action: "create",
      input: { kind: "human", name: "Benjamin B.", now: t + 250 },
    }),
  );
  requireSuccess(
    "Benny email",
    manageIdentityToolHandler(db, {
      action: "add",
      contact: { contactId: benny.data.primary.id },
      input: { type: "email", value: "benny@example.com" },
    }),
  );

  const cloudline = requireSuccess(
    "Create Cloudline Corp",
    manageContactToolHandler(db, {
      action: "create",
      input: { kind: "company", name: "Cloudline Corp", now: t + 300 },
    }),
  );
  requireSuccess(
    "Cloudline email",
    manageIdentityToolHandler(db, {
      action: "add",
      contact: { contactId: cloudline.data.primary.id },
      input: { type: "email", value: "info@cloudline.io" },
    }),
  );
  requireSuccess(
    "Cloudline industry",
    manageAttributeToolHandler(db, {
      action: "set",
      target: {
        kind: "contact",
        contact: { contactId: cloudline.data.primary.id },
      },
      name: "industry",
      value: "cloud infrastructure",
    }),
  );

  const guild = requireSuccess(
    "Create Design Guild",
    manageContactToolHandler(db, {
      action: "create",
      input: { kind: "group", name: "Design Guild", now: t + 400 },
    }),
  );

  requireSuccess(
    "Create Pixel",
    manageContactToolHandler(db, {
      action: "create",
      input: { kind: "pet", name: "Pixel", now: t + 500 },
    }),
  );

  // --- Social Links ---
  const adaLink = requireSuccess(
    "Link Owner -> Ada",
    manageRelationshipToolHandler(db, {
      action: "seed_social_link",
      from: { contactId: ownerId },
      to: { contactId: ada.data.primary.id },
      input: {
        kind: "personal",
        bond: "Trusted advisor since the early days",
        cadenceDays: 14,
        now: t + 600,
      },
    }),
  );

  requireSuccess(
    "Link Owner -> Ben",
    manageRelationshipToolHandler(db, {
      action: "seed_social_link",
      from: { contactId: ownerId },
      to: { contactId: ben.data.primary.id },
      input: {
        kind: "professional",
        bond: "Active collaborator on the rebuild",
        now: t + 700,
      },
    }),
  );

  requireSuccess(
    "Link Ada -> Ben (observed)",
    manageRelationshipToolHandler(db, {
      action: "seed_social_link",
      from: { contactId: ada.data.primary.id },
      to: { contactId: ben.data.primary.id },
      input: { kind: "observed", now: t + 750 },
    }),
  );

  // Link attribute
  requireSuccess(
    "Ada link priority",
    manageAttributeToolHandler(db, {
      action: "set",
      target: { kind: "link", link: { linkId: adaLink.data.primary.id } },
      name: "priority",
      value: "high",
    }),
  );

  // --- Structural Tie ---
  requireSuccess(
    "Tie Owner -> Design Guild",
    manageRelationshipToolHandler(db, {
      action: "set_structural_tie",
      from: { contactId: ownerId },
      to: { contactId: guild.data.primary.id },
      input: { kind: "member_of", role: "founding member", now: t + 800 },
    }),
  );

  // --- Events ---
  requireSuccess(
    "Conversation with Ada",
    recordEventToolHandler(db, {
      kind: "interaction",
      input: {
        type: "conversation",
        occurredAt: t + 1000,
        participants: [
          {
            contactId: ownerId,
            directionality: "owner_initiated",
            role: "actor",
          },
          { contactId: ada.data.primary.id, role: "recipient" },
        ],
        significance: 8,
        summary:
          "Mapped the current relationship network and prioritized outreach.",
      },
    }),
  );

  requireSuccess(
    "Support Ben",
    recordEventToolHandler(db, {
      kind: "interaction",
      input: {
        type: "support",
        occurredAt: t + 2000,
        participants: [
          {
            contactId: ownerId,
            directionality: "owner_initiated",
            role: "actor",
          },
          { contactId: ben.data.primary.id, role: "recipient" },
        ],
        significance: 6,
        summary: "Helped Ben unblock a client handoff with the API team.",
      },
    }),
  );

  requireSuccess(
    "Observe Cloudline",
    recordEventToolHandler(db, {
      kind: "observation",
      input: {
        occurredAt: t + 3000,
        participants: [
          { contactId: cloudline.data.primary.id, role: "subject" },
        ],
        significance: 5,
        summary: "Noticed they launched a new developer API platform.",
      },
    }),
  );

  requireSuccess(
    "Ada milestone",
    recordEventToolHandler(db, {
      kind: "milestone",
      input: {
        occurredAt: t + 4000,
        participants: [
          { contactId: ownerId, role: "actor" },
          { contactId: ada.data.primary.id, role: "recipient" },
        ],
        significance: 9,
        summary: "First anniversary of the advisory partnership.",
      },
    }),
  );

  requireSuccess(
    "Ben transaction",
    recordEventToolHandler(db, {
      kind: "transaction",
      input: {
        occurredAt: t + 5000,
        participants: [
          {
            contactId: ownerId,
            directionality: "owner_initiated",
            role: "actor",
          },
          { contactId: ben.data.primary.id, role: "recipient" },
        ],
        significance: 4,
        summary: "Settled the Q3 contractor invoice ($2,400 USD).",
      },
    }),
  );

  // --- Commitments ---
  requireSuccess(
    "Promise to Ben",
    manageCommitmentToolHandler(db, {
      action: "record",
      input: {
        commitmentType: "promise",
        dueAt: t + 100_000,
        occurredAt: t + 6000,
        participants: [
          {
            contactId: ownerId,
            directionality: "owner_initiated",
            role: "actor",
          },
          { contactId: ben.data.primary.id, role: "recipient" },
        ],
        significance: 7,
        summary: "Send the revised partnership notes.",
      },
    }),
  );

  const keptPromise = requireSuccess(
    "Promise to Ada (will resolve)",
    manageCommitmentToolHandler(db, {
      action: "record",
      input: {
        commitmentType: "promise",
        occurredAt: t + 6500,
        participants: [
          {
            contactId: ownerId,
            directionality: "owner_initiated",
            role: "actor",
          },
          { contactId: ada.data.primary.id, role: "recipient" },
        ],
        significance: 6,
        summary: "Share the market research deck.",
      },
    }),
  );
  requireSuccess(
    "Resolve Ada promise",
    manageCommitmentToolHandler(db, {
      action: "resolve",
      commitmentEventId: keptPromise.data.primary.id,
      resolution: "kept",
    }),
  );

  // --- Date Anchors ---
  requireSuccess(
    "Ada birthday",
    manageDateAnchorToolHandler(db, {
      action: "add",
      input: {
        target: {
          kind: "contact",
          contact: { contactId: ada.data.primary.id },
        },
        recurrenceKind: "birthday",
        anchorMonth: 3,
        anchorDay: 15,
        summary: "Ada's birthday",
        significance: 7,
        now: t + 7000,
      },
    }),
  );

  requireSuccess(
    "Guild anniversary",
    manageDateAnchorToolHandler(db, {
      action: "add",
      input: {
        target: {
          kind: "contact",
          contact: { contactId: guild.data.primary.id },
        },
        recurrenceKind: "anniversary",
        anchorMonth: 7,
        anchorDay: 1,
        summary: "Design Guild founding day",
        significance: 5,
        now: t + 7500,
      },
    }),
  );
}

export async function createDemoSession(
  mode: DemoSeedMode,
): Promise<AffinityDb> {
  const db = await openBrowserAffinityDb();
  db.exec("PRAGMA foreign_keys = ON");
  initAffinityTables(db);
  if (mode === "seeded") {
    seedDemoSession(db);
  }
  return db;
}
