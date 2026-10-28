import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Readable, Writable } from "node:stream";
import { test } from "node:test";
import { initAffinityTables } from "../init_affinity_tables.ts";
import * as read from "../read.ts";
import { runToolCli } from "../surfaces/cli.ts";
import { manageContactToolHandler } from "../tools/manage_contact_tool.ts";
import { parseTimeInput } from "../tools/parse_time_input.ts";
import { recordEventToolHandler } from "../tools/record_event_tool.ts";
import { reviewAffinityToolHandler } from "../tools/review_affinity_tool.ts";
import { searchAffinityToolHandler } from "../tools/search_affinity_tool.ts";
import { resolveContactLocator } from "../tools/tool_resolvers.ts";
import * as write from "../write.ts";
import { affinityCliOptions } from "./affinity_cli_options.ts";
import { affinitySkillCommand } from "./affinity_skill_command.ts";

function fixture() {
  const db = new DatabaseSync(":memory:");
  initAffinityTables(db);
  write.createContact(db, {
    name: "Owner",
    kind: "human",
    bootstrapOwner: true,
  });
  return db;
}
async function cli(args: string[], input = "") {
  let out = "";
  let err = "";
  const sink = (append: (s: string) => void) =>
    new Writable({
      write(chunk, _enc, done) {
        append(String(chunk));
        done();
      },
    });
  const code = await runToolCli(args, {
    ...affinityCliOptions,
    stdin: Readable.from([input]),
    stdout: sink((s) => {
      out += s;
    }),
    stderr: sink((s) => {
      err += s;
    }),
  });
  return { code, out, err };
}
test("identity conflict is atomic; return matches existing without attaching free identities", () => {
  const db = fixture();
  try {
    const first = write.createContact(db, {
      name: "Sasha",
      kind: "human",
      identities: [{ type: "bluesky", value: "@Sasha.bsky.social" }],
    }).primary;
    const input = {
      name: "Duplicate",
      kind: "human" as const,
      identities: [
        { type: "bluesky", value: "sasha.bsky.social" },
        { type: "email", value: "free@example.com" },
      ],
    };
    const conflict = manageContactToolHandler(db, { action: "create", input });
    assert.equal(conflict.ok, false);
    if (conflict.ok || conflict.outcome !== "error")
      throw new Error("expected conflict");
    assert.equal(
      conflict.error.message,
      `identity bluesky sasha.bsky.social already belongs to #${first.id} Sasha`,
    );
    assert.equal(conflict.data?.existingContactId, first.id);
    assert.equal(conflict.error.details?.existingContactId, first.id);
    assert.throws(() => write.createContact(db, input), { code: "CONFLICT" });
    const returned = manageContactToolHandler(db, {
      action: "create",
      input: { ...input, ifExists: "return" },
    });
    assert.ok(returned.ok);
    assert.equal(returned.outcome, "no_op");
    assert.equal(returned.data.primary.id, first.id);
    assert.deepEqual(returned.data.created, []);
    assert.equal(
      db.prepare("SELECT COUNT(*) AS n FROM identities").get()?.n,
      1,
    );
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM contacts").get()?.n, 2);
    assert.ok(
      resolveContactLocator(db, {
        identity: { type: "bluesky", value: "@SASHA.bsky.social" },
      }).ok,
    );
    assert.equal(
      read.searchContacts(db, "@Sasha.bsky.social")[0]?.id,
      first.id,
    );
    db.prepare(
      "UPDATE identities SET normalized_key='bluesky:@sasha.bsky.social', value='@Sasha.bsky.social' WHERE contact_id=?",
    ).run(first.id);
    assert.ok(
      resolveContactLocator(db, {
        identity: { type: "bluesky", value: "sasha.bsky.social" },
      }).ok,
    );
    assert.throws(() => write.createContact(db, input), { code: "CONFLICT" });
    assert.throws(
      () =>
        write.addIdentity(db, 1, {
          type: "bluesky",
          value: "@sasha.bsky.social",
        }),
      { code: "CONFLICT" },
    );
    assert.deepEqual(
      write.addIdentity(db, first.id, {
        type: "bluesky",
        value: "sasha.bsky.social",
        ifExists: "return",
      }).created,
      [],
    );
  } finally {
    db.close();
  }
});
test("social handles validate on add and revise; DID aliases locate legacy rows", () => {
  const db = fixture();
  try {
    for (const type of [
      "bluesky",
      "x",
      "twitter",
      "mastodon",
      "github",
      "instagram",
    ]) {
      const valid =
        type === "bluesky"
          ? "User.bsky.social"
          : type === "mastodon"
            ? "User@host.social"
            : "User";
      const id = write.addIdentity(db, 1, { type, value: `@${valid}` }).primary;
      assert.equal(id.value, valid.toLowerCase());
      const existing = write.addIdentity(db, 1, {
        type,
        value: `@${valid}`,
        ifExists: "return",
      });
      assert.equal(existing.primary.id, id.id);
      assert.deepEqual(existing.created, []);
      for (const value of ["bad handle", "at://did:plc:abc/like/1"])
        assert.throws(() => write.reviseIdentity(db, id.id, { value }), {
          code: "VALIDATION",
        });
    }
    assert.throws(
      () => write.addIdentity(db, 1, { type: "x", value: "a".repeat(16) }),
      { code: "VALIDATION" },
    );
    const did = write.addIdentity(db, 1, {
      type: "custom:atproto-did",
      value: "did:plc:abc",
    }).primary;
    db.prepare(
      "UPDATE identities SET normalized_key='custom:atproto-did:did:plc:abc' WHERE id=?",
    ).run(did.id);
    for (const type of ["did", "atproto_did", "custom:atproto-did"])
      assert.ok(
        resolveContactLocator(db, { identity: { type, value: "did:plc:abc" } })
          .ok,
      );
    assert.throws(
      () => write.addIdentity(db, 1, { type: "did", value: "did:plc:abc" }),
      { code: "CONFLICT" },
    );
    assert.throws(
      () => write.addIdentity(db, 1, { type: "did", value: "did:wrong" }),
      { code: "VALIDATION" },
    );
  } finally {
    db.close();
  }
});
test("Sam: two unanswered replies, two likes and a follow keep affinity low and never prompt a check-in", () => {
  const db = fixture();
  try {
    const now = Date.UTC(2026, 9, 27, 12);
    write.createContact(db, { name: "Sam Example", kind: "human" });
    const link = write.seedSocialLink(db, {
      fromContactId: 1,
      toContactId: 2,
      kind: "professional",
      affinity: 0.15,
      now,
    }).primary;
    const participants = [
      {
        contactId: 1,
        role: "actor" as const,
        directionality: "owner_initiated" as const,
      },
      { contactId: 2, role: "recipient" as const },
    ];
    const base = {
      occurredAt: now - 86400000,
      significance: 4,
      participants,
      now,
    };
    for (let i = 0; i < 2; i++)
      write.recordInteraction(db, {
        ...base,
        type: "conversation",
        summary: "Unanswered reply",
      });
    for (const summary of ["like", "like", "follow"]) {
      const event = write.recordObservation(db, {
        ...base,
        summary,
        significance: summary === "follow" ? 2 : 1,
      });
      assert.equal(event.primary.affectsBond, false);
      assert.deepEqual(event.derivedEffects, []);
      assert.equal(event.primary.momentKind, null);
    }
    assert.ok(
      Number(
        db.prepare("SELECT affinity FROM links WHERE id=?").get(link.id)
          ?.affinity,
      ) < 0.2,
    );
    const radar = read.listRadar(db, undefined, { now: now + 60 * 86400000 });
    assert.ok(radar.every((r) => !r.reasons?.includes("drift")));
    assert.doesNotMatch(JSON.stringify(radar), /Routine check-in recommended/);
    assert.equal(
      db
        .prepare("SELECT SUM(counts_for_recency) AS n FROM link_event_effects")
        .get()?.n,
      0,
    );
    const follow = write.recordMilestone(db, {
      ...base,
      summary: "Follow on Bluesky",
      significance: 8,
    });
    assert.equal(follow.primary.momentKind, null);
    const inbound = write.recordInteraction(db, {
      ...base,
      type: "conversation",
      summary: "Reply received",
      participants: [
        { contactId: 1, role: "recipient" },
        { contactId: 2, role: "actor", directionality: "other_initiated" },
      ],
    });
    assert.ok(inbound.derivedEffects[0]?.affinityDelta);
    assert.equal(
      db
        .prepare(
          "SELECT counts_for_recency FROM link_event_effects WHERE event_id=?",
        )
        .get(inbound.primary.id)?.counts_for_recency,
      1,
    );
  } finally {
    db.close();
  }
});
test("outbound automatic links start conservatively and ambient-only links stay off radar", () => {
  const db = fixture();
  try {
    write.createContact(db, { name: "Other", kind: "human" });
    const now = Date.UTC(2026, 9, 27);
    const input = {
      occurredAt: now,
      content: "Hello",
      significance: 4,
      now,
      participants: [
        {
          contactId: 1,
          role: "actor" as const,
          directionality: "owner_initiated" as const,
        },
        { contactId: 2, role: "recipient" as const },
      ],
    };
    write.recordInteraction(db, { ...input, type: "conversation" });
    assert.ok(
      Number(db.prepare("SELECT affinity FROM links").get()?.affinity) < 0.2,
    );
    assert.deepEqual(read.listRadar(db, undefined, { now }), []);
    write.createContact(db, { name: "Liker", kind: "human" });
    write.seedSocialLink(db, {
      fromContactId: 1,
      toContactId: 3,
      kind: "professional",
    });
    const ambient = write.recordObservation(db, {
      ...input,
      significance: 1,
      participants: [
        { contactId: 1, role: "observer" },
        { contactId: 3, role: "actor", directionality: "other_initiated" },
      ],
    });
    assert.equal(ambient.primary.affectsBond, false);
    assert.deepEqual(read.listRadar(db, undefined, { now }), []);
  } finally {
    db.close();
  }
});
test("social channel infers outbound and inbound direction from explicit owner roles", () => {
  const db = fixture();
  try {
    write.createContact(db, { name: "Other", kind: "human" });
    const now = Date.UTC(2026, 9, 27);
    const base = {
      occurredAt: now,
      channel: "bluesky",
      significance: 4,
      content: "reply",
      type: "conversation" as const,
      now,
    };
    const outbound = write.recordInteraction(db, {
      ...base,
      participants: [
        { contactId: 1, role: "actor" },
        { contactId: 2, role: "recipient" },
      ],
    });
    assert.equal(
      outbound.primary.participants[1]?.directionality,
      "owner_initiated",
    );
    assert.deepEqual(read.listRadar(db, undefined, { now }), []);
    const inbound = write.recordInteraction(db, {
      ...base,
      participants: [
        { contactId: 1, role: "recipient" },
        { contactId: 2, role: "actor" },
      ],
    });
    assert.equal(
      inbound.primary.participants[1]?.directionality,
      "other_initiated",
    );
    assert.ok(
      (inbound.derivedEffects[0]?.affinityDelta ?? 0) >
        (outbound.derivedEffects[0]?.affinityDelta ?? 0),
    );
    assert.equal(
      db
        .prepare(
          "SELECT counts_for_recency FROM link_event_effects WHERE event_id=?",
        )
        .get(inbound.primary.id)?.counts_for_recency,
      1,
    );
  } finally {
    db.close();
  }
});
test("review pages expose total and hasMore across the default cap", () => {
  const db = fixture();
  try {
    for (let i = 0; i < 76; i++) {
      const contact = write.createContact(db, {
        name: `Person ${i}`,
        kind: "human",
      }).primary;
      write.seedSocialLink(db, {
        fromContactId: 1,
        toContactId: contact.id,
        kind: "professional",
      });
    }
    const first = reviewAffinityToolHandler(db, { view: "links.owner" });
    const second = reviewAffinityToolHandler(db, {
      view: "links.owner",
      offset: 50,
    });
    assert.ok(first.ok && second.ok);
    const search = searchAffinityToolHandler(db, {
      query: "Person",
      limit: 10,
      offset: 70,
    });
    assert.ok(search.ok);
    assert.equal(search.data.total, 76);
    assert.equal(search.data.count, 6);
    assert.equal(search.data.hasMore, false);
    assert.equal(first.data.total, 76);
    assert.equal(first.data.count, 50);
    assert.equal(first.data.hasMore, true);
    assert.equal(second.data.total, 76);
    assert.equal(second.data.count, 26);
    assert.equal(second.data.hasMore, false);
    assert.equal(
      new Set([...first.data.items, ...second.data.items].map((i) => i.id))
        .size,
      76,
    );
  } finally {
    db.close();
  }
});
test("SQLite timestamps are UTC, offsets apply, fractions round including carry and null has a clear error", () => {
  assert.equal(
    parseTimeInput("2026-10-27 17:51:33"),
    Date.parse("2026-10-27T17:51:33Z"),
  );
  assert.equal(
    parseTimeInput("2026-10-27 17:51:33.477800+02:00"),
    Date.parse("2026-10-27T15:51:33.478Z"),
  );
  assert.equal(
    parseTimeInput("2026-10-27T17:51:33.999600Z"),
    Date.parse("2026-10-27T17:51:34Z"),
  );
  const db = fixture();
  try {
    const bad = recordEventToolHandler(db, {
      kind: "observation",
      input: {
        occurredAt: null,
        content: "",
        significance: 1,
        participants: [{ contactId: 1, role: "actor" }],
      },
    } as never);
    assert.ok(!bad.ok && bad.outcome === "error");
    assert.match(bad.error.message, /occurredAt is required/);
  } finally {
    db.close();
  }
});
test("CLI: literal @handles, @@ escape, value files, JSON stdin, array formats and conflict exit codes", async () => {
  const dir = mkdtempSync(join(tmpdir(), "affinity-cli-social-"));
  const db = join(dir, "test.db");
  const invoke = (args: string[], input = "") =>
    cli(["--db", db, ...args], input);
  try {
    const payload = {
      name: "Sasha",
      kind: "human",
      bootstrapOwner: true,
      identities: [{ type: "bluesky", value: "sasha.bsky.social" }],
    };
    assert.equal(
      (await invoke(["contact", "create", JSON.stringify(payload)])).code,
      0,
    );
    assert.equal(
      (await invoke(["contact", "create", JSON.stringify(payload)])).code,
      4,
    );
    const returned = await invoke([
      "contact",
      "create",
      JSON.stringify(payload),
      "--if-exists",
      "return",
    ]);
    assert.equal(
      (
        await invoke([
          "contact",
          "create",
          JSON.stringify(payload),
          "--if-exists=return",
        ])
      ).code,
      0,
    );
    assert.equal(returned.code, 0);
    assert.equal(JSON.parse(returned.out).outcome, "no_op");
    for (const q of ["@Sasha.bsky.social"]) {
      const found = await invoke(["search", q]);
      assert.equal(found.code, 0);
      assert.match(found.out, /Sasha/);
    }
    const file = join(dir, "query.txt");
    writeFileSync(file, "Sasha");
    const literal = await invoke(["search", `@${file}`]);
    assert.equal(literal.code, 0);
    assert.doesNotMatch(literal.out, /Sasha/);
    const event = {
      occurredAt: "2026-10-27 17:51:33",
      content: "  Grüße 👩🏽‍💻\r\n ",
      significance: 1,
      participants: [{ contactId: 1, role: "actor" }],
    };
    assert.equal(
      (
        await invoke(
          ["event", "record", "--kind", "observation", "--input", "-"],
          JSON.stringify(event),
        )
      ).code,
      0,
    );
    for (const flags of [
      ["--event-types", '["conversation","observation"]'],
      ["--event-types", "conversation,observation"],
      ["--event-types", "conversation", "--event-types", "observation"],
    ]) {
      const page = await invoke([
        "review",
        "events.contact_journal",
        "--contact",
        '{"contactId":1}',
        ...flags,
      ]);
      assert.equal(page.code, 0, page.err);
      assert.equal(JSON.parse(page.out).data.count, 1);
    }
    const bad = await invoke([
      "review",
      "events.contact_journal",
      "--contact",
      '{"contactId":1}',
      "--event-types",
      "bogus",
    ]);
    assert.equal(bad.code, 2);
    assert.match(bad.err, /conversation/);
    const invalid = await invoke([
      "event",
      "record",
      "--kind",
      "observation",
      "--input",
      JSON.stringify({ ...event, occurredAt: null }),
    ]);
    assert.equal(invalid.code, 2);
    assert.match(invalid.err, /occurredAt is required/);
    const invalidHandle = await invoke([
      "identity",
      "add",
      "--contact",
      '{"contactId":1}',
      "--input",
      '{"type":"bluesky","value":"at://bad"}',
    ]);
    assert.equal(invalidHandle.code, 2);
    assert.match(invalidHandle.err, /handle/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("batch supports chunking, failure isolation, invalid JSON, stop, and idempotent external refs", async () => {
  const dir = mkdtempSync(join(tmpdir(), "affinity-batch-"));
  try {
    const db = join(dir, "test.db");
    const contact = {
      tool: "manage_contact",
      args: {
        action: "create",
        input: {
          name: "Owner",
          kind: "human",
          bootstrapOwner: true,
          ifExists: "return",
          identities: [{ type: "did", value: "did:plc:owner" }],
        },
      },
    };
    const event = {
      op: "event",
      kind: "observation",
      input: {
        occurredAt: "2026-10-27",
        content: "",
        externalRef: { source: "bluesky", id: "at://one" },
        significance: 1,
        participants: [{ contactId: 1, role: "actor" }],
      },
    };
    const input = [contact, event].map((l) => JSON.stringify(l)).join("\n");
    for (let run = 0; run < 2; run++) {
      const result = await cli(["--db", db, "batch", "--chunk", "1"], input);
      assert.equal(result.code, 0, result.err);
      const rows = result.out
        .trim()
        .split("\n")
        .map((l) => JSON.parse(l));
      assert.deepEqual(rows.at(-1), {
        done: 2,
        created: run ? 0 : 2,
        noOp: run ? 2 : 0,
        failed: 0,
      });
      assert.equal(rows[1].id, 1);
    }
    const failed = await cli(
      ["--db", db, "batch"],
      `oops\n${JSON.stringify(event)}\n{"tool":"bogus","args":{}}`,
    );
    assert.equal(failed.code, 2);
    assert.deepEqual(JSON.parse(failed.out.trim().split("\n").at(-1) ?? ""), {
      done: 3,
      created: 0,
      noOp: 1,
      failed: 2,
    });
    const invalidEvent = await cli(
      ["--db", db, "batch"],
      JSON.stringify({ ...event, input: { ...event.input, significance: 0 } }),
    );
    assert.equal(invalidEvent.code, 1);
    assert.match(
      JSON.parse(invalidEvent.out.split("\n")[0] ?? "").error.message,
      /significance/,
    );
    const stopped = await cli(
      ["--db", db, "batch", "--stop-on-error"],
      `{"tool":"bogus","args":{}}\n${JSON.stringify(event)}`,
    );
    assert.equal(stopped.code, 1);
    assert.equal(
      JSON.parse(stopped.out.trim().split("\n").at(-1) ?? "").done,
      1,
    );
    assert.match((await cli(["batch", "--help"])).out, /--chunk/);
    assert.equal((await cli(["batch", "--chunk", "0"])).code, 2);
    assert.ok(readFileSync(db).length);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("short skill is compact and full skill names guides without filesystem links", () => {
  const short = affinitySkillCommand(["--short"]);
  assert.ok(short.split("\n").length <= 32);
  assert.doesNotMatch(short, /^---|Appendix|references\//m);
  for (const token of [
    "batch",
    "externalRef",
    "content",
    "--version --short",
    "skill --list",
    "Exit:",
    "Dates:",
  ])
    assert.ok(short.includes(token), token);
  assert.doesNotMatch(affinitySkillCommand([]), /references\/[^\s)]+\.md/);
  assert.match(
    affinitySkillCommand([]),
    /ghostpaw-affinity skill record-direct-evidence-well/,
  );
  assert.match(affinitySkillCommand(["--help"]), /--short/);
  assert.throws(() => affinitySkillCommand(["a", "b"]), /--short/);
});
