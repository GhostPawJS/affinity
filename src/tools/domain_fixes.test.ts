import assert from "node:assert/strict";
import { test } from "node:test";
import { createContact } from "../contacts/create_contact.ts";
import { addIdentity } from "../identities/add_identity.ts";
import { createInitializedAffinityDb } from "../lib/testing/create_initialized_affinity_db.ts";
import { seedSocialLink } from "../links/seed_social_link.ts";
import { inspectAffinityItemToolHandler } from "./inspect_affinity_item_tool.ts";
import { manageCommitmentToolHandler } from "./manage_commitment_tool.ts";
import { manageContactToolHandler } from "./manage_contact_tool.ts";
import { manageDateAnchorToolHandler } from "./manage_date_anchor_tool.ts";
import { manageDuplicateDismissalToolHandler } from "./manage_duplicate_dismissal_tool.ts";
import { manageIdentityToolHandler } from "./manage_identity_tool.ts";
import { reviewAffinityToolHandler } from "./review_affinity_tool.ts";
import { toolSuccess } from "./tool_types.ts";
import type { ToolResult } from "./tool_types.ts";

function error(
  result: ToolResult<unknown>,
  pattern: RegExp,
  code = "invalid_input",
) {
  assert.equal(result.outcome, "error");
  if (result.outcome !== "error") assert.fail(JSON.stringify(result));
  assert.equal(result.error.code, code);
  assert.match(result.error.message, pattern);
}

test("create warns for folded names and shared identities while keeping identity ownership", async () => {
  const db = await createInitializedAffinityDb();
  try {
    const jana = createContact(db, {
      name: "Jana Petersen",
      kind: "human",
    }).primary;
    addIdentity(db, jana.id, { type: "email", value: "jana@x.de" });
    const duplicate = manageContactToolHandler(db, {
      action: "create",
      input: { name: " JANA  Petersen ", kind: "human" },
    });
    assert.ok(duplicate.ok);
    assert.deepEqual(duplicate.warnings, [
      {
        code: "possible_duplicate",
        message: `Possible duplicate of #${jana.id} Jana Petersen (score 0.92)`,
        contactId: jana.id,
        score: 0.92,
      },
    ]);
    const shared = manageContactToolHandler(db, {
      action: "create",
      input: {
        name: "Different Name",
        kind: "human",
        identities: [
          { type: "email", value: "jana@x.de" },
          { type: "phone", value: "12345" },
        ],
      },
    });
    assert.ok(shared.ok);
    assert.equal(shared.warnings?.[0]?.contactId, jana.id);
    assert.equal(shared.warnings?.[0]?.score, 1);
    assert.equal(
      db
        .prepare("SELECT contact_id FROM identities WHERE value = 'jana@x.de'")
        .get()?.contact_id,
      jana.id,
    );
    assert.equal(
      shared.data.created.filter((ref) => ref.kind === "identity").length,
      1,
    );
    error(
      manageIdentityToolHandler(db, {
        action: "add",
        contact: { contactId: shared.data.primary.id },
        input: { type: "email", value: "jana@x.de" },
      }),
      new RegExp(
        `email jana@x.de already belongs to #${jana.id} Jana Petersen`,
      ),
      "conflict",
    );
    const before = db.prepare("SELECT COUNT(*) AS n FROM contacts").get()?.n;
    error(
      manageContactToolHandler(db, {
        action: "create",
        input: {
          name: "Rollback",
          kind: "human",
          identities: [{ type: "email", value: "bad" }],
        },
      }),
      /email/,
    );
    assert.equal(
      db.prepare("SELECT COUNT(*) AS n FROM contacts").get()?.n,
      before,
    );
  } finally {
    db.close();
  }
});

test("patches reject forbidden and unknown keys and describe successful field changes", async () => {
  const db = await createInitializedAffinityDb();
  try {
    const jana = createContact(db, { name: "Jana", kind: "human" }).primary;
    const identity = addIdentity(db, jana.id, {
      type: "email",
      value: "jana@x.de",
    }).primary;
    for (const [patch, pattern] of [
      [{ kind: "company" }, /kind cannot be changed after creation/],
      [{ notes: "x" }, /allowed keys: name/],
    ] as const)
      error(
        manageContactToolHandler(db, {
          action: "revise",
          contact: { contactId: jana.id },
          patch,
        } as never),
        pattern,
      );
    error(
      manageIdentityToolHandler(db, {
        action: "revise",
        identityId: identity.id,
        patch: { extra: true },
      } as never),
      /allowed keys: type, value, label/,
    );
    error(
      manageDateAnchorToolHandler(db, {
        action: "revise",
        anchorEventId: 99,
        patch: { extra: true },
      } as never),
      /allowed keys: recurrenceKind, anchorMonth, anchorDay, summary, significance/,
    );
    const revised = manageContactToolHandler(db, {
      action: "revise",
      contact: { contactId: jana.id },
      patch: { name: "New Jana" },
    });
    assert.ok(revised.ok);
    assert.deepEqual(revised.data.changes, [
      { entity: "contact", id: jana.id, action: "updated", fields: ["name"] },
    ]);
    assert.ok(Array.isArray(revised.data.created));
  } finally {
    db.close();
  }
});

test("timestamp strings are normalized with injected now and errors use actionable domain codes", async () => {
  const db = await createInitializedAffinityDb();
  try {
    createContact(db, { name: "Owner", kind: "human", bootstrapOwner: true });
    const jana = createContact(db, { name: "Jana", kind: "human" }).primary;
    const input = {
      action: "record" as const,
      input: {
        commitmentType: "promise" as const,
        summary: "Send notes",
        significance: 6,
        occurredAt: "yesterday",
        dueAt: "+3d",
        now: "2026-10-27T12:00:00Z",
        participants: [{ contactId: jana.id, role: "recipient" as const }],
      },
    };
    const recorded = manageCommitmentToolHandler(db, input);
    assert.ok(recorded.ok);
    assert.equal(input.input.occurredAt, "yesterday");
    assert.equal(
      recorded.data.primary.occurredAt,
      Date.parse("2026-10-26T00:00:00Z"),
    );
    assert.equal(
      db
        .prepare("SELECT due_at FROM open_commitments WHERE event_id = ?")
        .get(recorded.data.primary.id)?.due_at,
      Date.parse("2026-10-30T23:59:59.999Z"),
    );
    const resolved = manageCommitmentToolHandler(db, {
      action: "resolve",
      commitmentEventId: recorded.data.primary.id,
      resolution: "kept",
      options: { now: "2026-10-28" },
    });
    assert.ok(resolved.ok);
    error(
      manageCommitmentToolHandler(db, {
        action: "resolve",
        commitmentEventId: recorded.data.primary.id,
        resolution: "kept",
      }),
      new RegExp(
        `Commitment #${recorded.data.primary.id} is already resolved \\(kept\\)`,
      ),
      "conflict",
    );
    error(
      manageCommitmentToolHandler(db, {
        ...input,
        input: { ...input.input, occurredAt: "2026-02-30" },
      }),
      /occurredAt: expected epoch milliseconds/,
    );
    error(
      manageContactToolHandler(db, {
        action: "create",
        input: { name: "", kind: "human" },
      }),
      /name/,
    );
    error(
      manageContactToolHandler(db, {
        action: "create",
        input: { name: "Bad", kind: "bad" },
      } as never),
      /kind/,
    );
    error(
      manageDateAnchorToolHandler(db, {
        action: "add",
        input: {
          target: { kind: "contact", contact: { contactId: jana.id } },
          recurrenceKind: "birthday",
          anchorMonth: 2,
          anchorDay: 30,
          summary: "Impossible",
          significance: 4,
        },
      }),
      /anchorDay/,
    );
    const review = reviewAffinityToolHandler(db, {
      view: "commitments.open",
      now: "today",
    });
    assert.ok(review.ok);
    assert.ok(
      reviewAffinityToolHandler(db, {
        view: "events.contact_journal",
        contact: { contactId: jana.id },
        since: "2026-10-01",
        until: "2026-11-01",
      }).ok,
    );
    error(
      reviewAffinityToolHandler(db, {
        view: "events.contact_journal",
        contact: { contactId: jana.id },
        since: "bad",
      }),
      /since: expected epoch milliseconds/,
    );
  } finally {
    db.close();
  }
});

test("export/delete handle empty and partial locators without system errors", async () => {
  const db = await createInitializedAffinityDb();
  try {
    const owner = createContact(db, {
      name: "Owner",
      kind: "human",
      bootstrapOwner: true,
    }).primary;
    const jana = createContact(db, { name: "Jana", kind: "human" }).primary;
    const all = manageContactToolHandler(db, { action: "export" });
    assert.ok(all.ok && "export" in all.data);
    assert.ok("contacts" in all.data.export);
    assert.equal(all.data.export.contacts.length, 2);
    const single = manageContactToolHandler(db, {
      action: "export",
      contact: { contactId: jana.id },
    });
    assert.ok(single.ok && "export" in single.data);
    assert.ok("contact" in single.data.export);
    assert.equal(single.data.export.contact.name, "Jana");
    for (const input of [
      { action: "delete" },
      { action: "delete", confirm: true },
      { action: "export", contact: {} },
      { action: "delete", confirm: true, contact: {} },
    ]) {
      const result = manageContactToolHandler(db, input as never);
      assert.equal(result.ok, false);
      if (result.outcome === "error")
        assert.notEqual(result.error.code, "system_error");
    }
    error(
      manageContactToolHandler(db, {
        action: "delete",
        contact: { contactId: jana.id },
      }),
      /delete is permanent; pass confirm: true/,
    );
    error(
      manageContactToolHandler(db, {
        action: "delete",
        contact: { contactId: owner.id },
        confirm: true,
      }),
      /owner/,
      "invalid_state",
    );
    assert.ok(db.prepare("SELECT id FROM contacts WHERE id = ?").get(jana.id));
    const removed = manageContactToolHandler(db, {
      action: "delete",
      contact: { contactId: jana.id },
      confirm: true,
    });
    assert.ok(removed.ok && "deletion" in removed.data);
    assert.ok(
      removed.data.changes.some(
        (change) => change.id === jana.id && change.entity === "contacts",
      ),
    );
    assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
  } finally {
    db.close();
  }
});

test("tool result rounding includes nested scores and entity fields without changing source values", () => {
  const data = {
    affinity: 0.7388696874999999,
    nested: [
      {
        trust: 0.123456,
        recencyScore: 0.99999,
        driftPriority: 0.765432,
        bridge: 0.456789,
        score: 0.123456,
      },
    ],
    occurredAt: 1793100000000,
  };
  const result = toolSuccess("Scores", data);
  assert.equal(result.data.affinity, 0.739);
  assert.equal(result.data.nested[0]?.trust, 0.123);
  assert.equal(result.data.nested[0]?.recencyScore, 1);
  assert.equal(result.data.nested[0]?.driftPriority, 0.765);
  assert.equal(result.data.nested[0]?.bridge, 0.457);
  assert.equal(result.data.nested[0]?.score, 0.123);
  assert.equal(result.data.occurredAt, data.occurredAt);
  assert.equal(data.affinity, 0.7388696874999999);
});

test("duplicate warnings use the search folding and exclude lost and merged contacts", async () => {
  const db = await createInitializedAffinityDb();
  try {
    const first = createContact(db, {
      name: "Jörg Müller",
      kind: "human",
    }).primary;
    const result = manageContactToolHandler(db, {
      action: "create",
      input: { name: "Joerg Mueller", kind: "human" },
    });
    assert.ok(result.ok);
    assert.equal(result.warnings?.[0]?.contactId, first.id);
    db.prepare("UPDATE contacts SET lifecycle_state = 'lost' WHERE id = ?").run(
      first.id,
    );
    db.prepare(
      "UPDATE contacts SET lifecycle_state = 'merged', merged_into_contact_id = ? WHERE id = ?",
    ).run(first.id, result.data.primary.id);
    const next = manageContactToolHandler(db, {
      action: "create",
      input: { name: "Jorg Muller", kind: "human" },
    });
    assert.ok(next.ok);
    assert.equal(next.warnings, undefined);
  } finally {
    db.close();
  }
});

test("inspection rounds scores while stored mechanics retain their precision", async () => {
  const db = await createInitializedAffinityDb();
  try {
    const owner = createContact(db, {
      name: "Owner",
      kind: "human",
      bootstrapOwner: true,
    }).primary;
    const jana = createContact(db, { name: "Jana", kind: "human" }).primary;
    const link = seedSocialLink(db, {
      fromContactId: owner.id,
      toContactId: jana.id,
      kind: "personal",
      affinity: 0.7388696874999999,
      trust: 0.123456,
    }).primary;
    const result = inspectAffinityItemToolHandler(db, {
      kind: "link",
      link: { linkId: link.id },
    });
    assert.ok(result.ok && result.data.kind === "link");
    assert.equal(result.data.detail.link.affinity, 0.739);
    assert.equal(result.data.detail.link.trust, 0.123);
    assert.equal(
      db.prepare("SELECT affinity FROM links WHERE id = ?").get(link.id)
        ?.affinity,
      0.7388696874999999,
    );
    const dismiss = manageDuplicateDismissalToolHandler(db, {
      action: "dismiss",
      left: { contactId: owner.id },
      right: { contactId: jana.id },
    });
    assert.ok(dismiss.ok);
    assert.deepEqual(dismiss.data.changes, [
      {
        entity: "duplicate_dismissal",
        leftContactId: owner.id,
        rightContactId: jana.id,
        action: "created",
      },
    ]);
    const undismiss = manageDuplicateDismissalToolHandler(db, {
      action: "undismiss",
      left: { contactId: owner.id },
      right: { contactId: jana.id },
    });
    assert.ok(undismiss.ok);
    assert.equal(undismiss.data.changes[0]?.action, "removed");
  } finally {
    db.close();
  }
});
