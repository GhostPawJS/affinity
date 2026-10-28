#!/usr/bin/env node
// Read a source export, never a live social database. Emit tool-compatible JSONL.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function socialBatch(source) {
  const lines = [];
  const skipped = {};
  const skip = (reason) => {
    skipped[reason] = (skipped[reason] ?? 0) + 1;
  };
  const emit = (tool, args) => lines.push({ tool, args });
  const locator = (did) => ({ identity: { type: "did", value: did } });
  const aliases = new Map();
  for (const a of source.accounts) {
    aliases.set(a.did, a.did);
    aliases.set(a.handle.toLowerCase().replace(/^@/, ""), a.did);
    for (const old of a.former_handles ?? [])
      aliases.set(old.toLowerCase(), a.did);
  }
  const canonical = (value) =>
    aliases.get(value?.replace(/^@/, "").toLowerCase()) ?? aliases.get(value);
  const owner = source.owner_did ?? source.accounts[0].did;
  const accounts = new Map(source.accounts.map((a) => [a.did, a]));
  const ordered = [...accounts.values()].sort(
    (a, b) => Number(b.did === owner) - Number(a.did === owner),
  );
  for (const a of ordered) {
    emit("manage_contact", {
      action: "create",
      input: {
        name: a.display_name || a.handle,
        kind: "human",
        ifExists: "return",
        ...(a.did === owner ? { bootstrapOwner: true } : {}),
        identities: [
          { type: "did", value: a.did },
          { type: "bluesky", value: a.handle },
          { type: "url", value: `https://bsky.app/profile/${a.did}` },
          ...(a.former_handles ?? []).map((value) => ({
            type: "bluesky",
            value,
            label: "former handle",
          })),
        ],
      },
    });
    // A DID match intentionally attaches nothing during contact creation.
    // Add current/former handles separately so subsequent handle changes are imported.
    for (const value of [a.handle, ...(a.former_handles ?? [])])
      emit("manage_identity", {
        action: "add",
        contact: locator(a.did),
        input: {
          type: "bluesky",
          value,
          ifExists: "return",
          label: value === a.handle ? "current handle" : "former handle",
        },
      });
    if (a.did !== owner)
      emit("manage_relationship", {
        action: "seed_social_link",
        from: locator(owner),
        to: locator(a.did),
        input: {
          kind: "professional",
          role: "bluesky",
          ifExists: "return",
          affinity: 0.15,
        },
      });
  }
  const seen = new Set();
  const posts = new Map(source.posts.map((p) => [p.uri, p]));
  const record = ({
    id,
    other,
    inbound,
    content = "",
    kind,
    at,
    parent,
    observation = false,
    significance = 4,
  }) => {
    if (!id) {
      skip("missing_record_uri");
      return;
    }
    if (seen.has(id)) {
      skip("duplicate_record_uri");
      return;
    }
    if (!at) {
      skip("missing_timestamp");
      return;
    }
    if (!other || other === owner || !accounts.has(other)) {
      skip("missing_other_account");
      return;
    }
    seen.add(id);
    const directionality = inbound ? "other_initiated" : "owner_initiated";
    emit("record_event", {
      kind: observation ? "observation" : "interaction",
      input: {
        ...(observation ? { affectsBond: false } : { type: "conversation" }),
        occurredAt: at,
        summary: `Bluesky ${kind}`,
        content,
        significance,
        externalRef: { source: "bluesky", id },
        channel: "bluesky",
        ...(parent ? { parentRef: { source: "bluesky", id: parent } } : {}),
        participants: [
          {
            contact: locator(owner),
            role: inbound ? (observation ? "observer" : "recipient") : "actor",
            directionality,
          },
          {
            contact: locator(other),
            role: inbound ? "actor" : observation ? "subject" : "recipient",
            directionality,
          },
        ],
      },
    });
  };
  for (const p of source.posts) {
    const inbound = !p.is_own;
    const parent = posts.get(p.reply_parent_uri ?? p.quote_uri);
    const other = inbound
      ? canonical(p.author_did)
      : canonical(p.subject_did ?? parent?.author_did);
    record({
      id: p.uri,
      other,
      inbound,
      content: p.text,
      kind: p.kind,
      at: p.created_at,
      parent: p.reply_parent_uri ?? p.quote_uri,
      observation: inbound && !p.reply_parent_uri && !p.quote_uri,
      significance: inbound && !p.reply_parent_uri && !p.quote_uri ? 2 : 4,
    });
  }
  for (const i of source.interactions) {
    record({
      id: i.record_uri,
      other: canonical(
        i.dir === "in"
          ? i.actor_did
          : (i.subject_did ?? posts.get(i.subject_uri)?.author_did),
      ),
      inbound: i.dir === "in",
      content:
        i.kind === "reply"
          ? (posts.get(i.record_uri)?.text ?? i.text ?? "")
          : "",
      kind: i.kind,
      at: i.created_at,
      parent: i.kind === "reply" ? i.subject_uri : undefined,
      observation: i.kind !== "reply",
      significance: i.kind === "follow" ? 2 : i.kind === "reply" ? 4 : 1,
    });
  }
  for (const f of source.follows) {
    record({
      id: f.record_uri,
      other: canonical(f.did),
      inbound: f.dir === "in",
      content: f.reason ?? "",
      kind: "follow",
      at: f.created_at ?? f.first_seen,
      observation: true,
      significance: 2,
    });
  }
  return { lines, skipped };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const path =
    process.argv[2] ??
    fileURLToPath(new URL("./fixtures/social_sample.json", import.meta.url));
  const { lines, skipped } = socialBatch(
    JSON.parse(readFileSync(path, "utf8")),
  );
  for (const line of lines) process.stdout.write(`${JSON.stringify(line)}\n`);
  process.stderr.write(
    `${JSON.stringify({ emitted: lines.length, skipped })}\n`,
  );
}
