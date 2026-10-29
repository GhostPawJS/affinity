import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable, Writable } from "node:stream";
import { test } from "node:test";
import { runToolCli } from "../surfaces/cli.ts";
import { affinityCliOptions } from "./affinity_cli_options.ts";

test("event intake, discovery, content, metadata, thread, revise and delete round trip through CLI", async () => {
  const dir = mkdtempSync(join(tmpdir(), "affinity-events-"));
  const invoke = async (args: string[], payload?: unknown) => {
    let out = "";
    let err = "";
    const sink = (append: (value: string) => void) =>
      new Writable({
        write(chunk, _encoding, cb) {
          append(String(chunk));
          cb();
        },
      });
    const code = await runToolCli(
      [...args, "--db", join(dir, "test.db"), "--json"],
      {
        ...affinityCliOptions,
        stdin: Readable.from(
          payload === undefined ? [] : [JSON.stringify(payload)],
        ),
        stdout: sink((s) => {
          out += s;
        }),
        stderr: sink((s) => {
          err += s;
        }),
      },
    );
    return { code, result: out ? JSON.parse(out) : undefined, err };
  };
  try {
    assert.equal(
      (
        await invoke([
          "contact",
          "create",
          JSON.stringify({
            name: "Owner",
            kind: "human",
            bootstrapOwner: true,
          }),
        ])
      ).code,
      0,
    );
    assert.equal(
      (
        await invoke([
          "contact",
          "create",
          JSON.stringify({ name: "Sam", kind: "human" }),
        ])
      ).code,
      0,
    );
    const input = {
      type: "conversation",
      occurredAt: "2026-10-25",
      content: "  Für Sam\r\nexact\ttext \n\u0000tail",
      significance: 4,
      participants: [{ contactId: 2, role: "recipient" }],
      externalRef: { source: " Bluesky ", id: "at://root" },
      channel: " Bluesky ",
    };
    const first = await invoke(["event", "record"], {
      kind: "interaction",
      input,
    });
    assert.equal(first.code, 0, first.err);
    const id = first.result.data.primary.id;
    const duplicate = await invoke(["call", "record_event", "-"], {
      kind: "interaction",
      input,
    });
    assert.equal(duplicate.code, 0);
    assert.equal(duplicate.result.outcome, "no_op");
    assert.equal(duplicate.result.data.primary.id, id);
    for (const args of [
      ["event", "record"],
      ["call", "record_event", "-"],
    ]) {
      const invalid = await invoke(args, {
        kind: "interaction",
        input: { ...input, externalId: "bad" },
      });
      assert.equal(invalid.code, 2, invalid.err);
      assert.match(invalid.err, /allowed keys/);
      assert.match(invalid.err, /input\.externalId/);
      assert.doesNotMatch(invalid.err, /input\.input\./);
      const moment = await invoke(args, {
        kind: "interaction",
        input: { ...input, momentKind: "follow" },
      });
      assert.equal(moment.code, 2);
      assert.match(moment.err, /breakthrough.*turning_point/);
    }
    const inspect = await invoke([
      "show",
      "event",
      "--ref-source",
      "bluesky",
      "--ref-id",
      "at://root",
    ]);
    assert.equal(inspect.code, 0, inspect.err);
    assert.equal(inspect.result.data.detail.content, input.content);
    const byId = await invoke(["show", "event", "--event-id", String(id)]);
    assert.equal(byId.result.data.detail.id, id);
    const search = await invoke(["search", "--scope", "events", "FUER"]);
    assert.equal(search.code, 0, search.err);
    assert.equal(search.result.data.items[0].id, id);
    const journal = [
      "review",
      "events.contact_journal",
      "--contact",
      '{"contactId":2}',
    ];
    const compact = await invoke(journal);
    assert.equal(compact.result.data.items[0].content, undefined);
    const full = await invoke([
      ...journal,
      "--with-content",
      "--channel",
      "bluesky",
    ]);
    assert.equal(full.code, 0, full.err);
    assert.equal(full.result.data.items[0].content, input.content);
    assert.equal(Object.hasOwn(full.result, "entities"), false);
    const legacyContent = await invoke([
      ...journal,
      "--include-content",
      "--compact",
    ]);
    assert.equal(legacyContent.code, 0, legacyContent.err);
    assert.equal(legacyContent.result.data.items[0].content, input.content);
    assert.equal(Object.hasOwn(legacyContent.result, "entities"), false);
    assert.equal(
      (await invoke([...journal, "--channel", "phone"])).result.data.count,
      0,
    );
    const target = JSON.stringify({ kind: "event", eventId: id });
    const attr = await invoke([
      "attribute",
      "set",
      "--target",
      target,
      "--name",
      "cid",
      "--value",
      "bafy",
    ]);
    assert.equal(attr.code, 0, attr.err);
    assert.equal(
      (await invoke(["show", "event", "--event-id", String(id)])).result.data
        .detail.attributes[0].value,
      "bafy",
    );
    assert.equal(
      (
        await invoke(["event", "record"], {
          kind: "interaction",
          input: {
            ...input,
            externalRef: { source: "bluesky", id: "at://child" },
            parentRef: { source: "bluesky", id: "at://root" },
          },
        })
      ).code,
      0,
    );
    const thread = await invoke([
      "review",
      "events.thread",
      "--ref-source",
      "bluesky",
      "--ref-id",
      "at://root",
    ]);
    assert.equal(thread.code, 0, thread.err);
    assert.equal(thread.result.data.count, 2);
    assert.equal(thread.result.data.items[1].parentEventId, id);
    const revised = await invoke([
      "event",
      "revise",
      "--event-id",
      String(id),
      "--patch",
      JSON.stringify({
        summary: "Edited",
        content: " exact ",
        occurredAt: "2026-10-24",
        channel: "email",
      }),
    ]);
    assert.equal(revised.code, 0, revised.err);
    assert.equal(revised.result.data.primary.content, " exact ");
    const badPatch = await invoke([
      "event",
      "revise",
      "--event-id",
      String(id),
      "--patch",
      '{"wat":true}',
    ]);
    assert.equal(badPatch.code, 2);
    assert.match(badPatch.err, /allowed keys/);
    assert.equal(
      (await invoke(["event", "delete", "--event-id", String(id)])).code,
      2,
    );
    const deleted = await invoke([
      "event",
      "delete",
      "--ref-source",
      "bluesky",
      "--ref-id",
      "at://root",
      "--confirm",
    ]);
    assert.equal(deleted.code, 0, deleted.err);
    assert.equal(
      (await invoke(["show", "event", "--event-id", String(id)])).code,
      3,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
