#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  closeSync,
  mkdtempSync,
  openSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import * as read from "../../src/read.ts";
import { socialBatch } from "./import_social_jsonl.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const fixture = JSON.parse(
  readFileSync(
    new URL("./fixtures/social_sample.json", import.meta.url),
    "utf8",
  ),
);
const { lines, skipped } = socialBatch(fixture);
const dir = mkdtempSync(join(tmpdir(), "affinity-social-"));
const path = join(dir, "contacts.db");
try {
  writeFileSync(
    join(dir, "batch.jsonl"),
    `${lines.map((l) => JSON.stringify(l)).join("\n")}\n`,
  );
  const runs = [];
  for (let run = 0; run < 2; run++) {
    // File-backed stdio also works in runners that restrict subprocess pipes.
    const input = openSync(join(dir, "batch.jsonl"), "r");
    const output = openSync(join(dir, `result${run}.jsonl`), "w");
    try {
      const child = spawnSync(
        process.execPath,
        ["--experimental-strip-types", "src/cli.ts", "--db", path, "batch"],
        { cwd: root, stdio: [input, output, "inherit"] },
      );
      assert.equal(child.status, 0, String(child.error ?? "batch failed"));
    } finally {
      closeSync(input);
      closeSync(output);
    }
    runs.push(
      readFileSync(join(dir, `result${run}.jsonl`), "utf8")
        .trim()
        .split("\n")
        .map((l) => JSON.parse(l)),
    );
  }
  const second = runs[1].at(-1);
  assert.equal(second.created, 0);
  assert.equal(second.failed, 0);
  assert.equal(second.noOp, lines.length);
  const db = new DatabaseSync(path);
  try {
    const duplicates = Number(
      db
        .prepare(
          "SELECT COUNT(*) AS n FROM (SELECT value FROM identities WHERE type='did' AND removed_at IS NULL GROUP BY value HAVING COUNT(*)>1)",
        )
        .get().n,
    );
    assert.equal(duplicates, 0);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM contacts").get().n, 12);
    const expected = lines.filter((l) => l.tool === "record_event");
    assert.equal(
      db.prepare("SELECT COUNT(*) AS n FROM events").get().n,
      expected.length,
    );
    let rawBytes = 0;
    for (const line of expected) {
      const input = line.args.input;
      const actual = read.getEventByExternalRef(
        db,
        "bluesky",
        input.externalRef.id,
      );
      assert.deepEqual(Buffer.from(actual.content), Buffer.from(input.content));
      rawBytes += Buffer.byteLength(input.content);
    }
    const ownerId = Number(
      db.prepare("SELECT id FROM contacts WHERE is_owner=1").get().id,
    );
    const journal = read.getContactJournal(db, ownerId, {
      includeContent: true,
      limit: 250,
    });
    assert.equal(journal.length, expected.length);
    console.log(
      JSON.stringify({
        contacts: 12,
        events: expected.length,
        secondRun: second,
        duplicates,
        rawTextBytes: rawBytes,
        storedTextBytes: Number(
          db
            .prepare(
              "SELECT COALESCE(SUM(length(CAST(content AS BLOB))),0) + COALESCE(SUM(CASE WHEN summary = content THEN 0 ELSE length(CAST(summary AS BLOB)) END),0) AS n FROM events",
            )
            .get().n,
        ),
        dbBytes: statSync(path).size,
        journalJsonBytes: Buffer.byteLength(JSON.stringify(journal)),
        skipped,
      }),
    );
  } finally {
    db.close();
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
