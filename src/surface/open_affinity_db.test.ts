import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";
import { openAffinityDb } from "./open_affinity_db.ts";

const runFile = promisify(execFile);

test("opens nested paths, initializes schema and configures WAL and timeout", async () => {
  const directory = mkdtempSync(join(tmpdir(), "affinity-db-"));
  try {
    const db = await openAffinityDb(join(directory, "nested", "affinity.db"));
    try {
      assert.equal(
        db.prepare("PRAGMA journal_mode").get<{ journal_mode: string }>()
          ?.journal_mode,
        "wal",
      );
      assert.equal(
        db.prepare("PRAGMA busy_timeout").get<{ timeout: number }>()?.timeout,
        5000,
      );
      assert.ok(
        db
          .prepare("SELECT name FROM sqlite_master WHERE name = 'contacts'")
          .get(),
      );
    } finally {
      db.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
  const db = await openAffinityDb(":memory:");
  db.close();
});

test("parallel readers can initialize and read the same WAL database", async () => {
  const directory = mkdtempSync(join(tmpdir(), "affinity-readers-"));
  const path = join(directory, "db.sqlite");
  const db = await openAffinityDb(path);
  db.close();
  const module = new URL("./open_affinity_db.ts", import.meta.url).href;
  try {
    await Promise.all(
      Array.from({ length: 12 }, () =>
        runFile(process.execPath, [
          "--experimental-strip-types",
          "--input-type=module",
          "-e",
          `import {openAffinityDb} from ${JSON.stringify(module)};
       for(let i=0;i<20;i++) {
         const db=await openAffinityDb(${JSON.stringify(path)});
         db.prepare('SELECT count(*) FROM events').get();
         db.close();
       }`,
        ]),
      ),
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
