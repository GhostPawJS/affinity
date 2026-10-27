import assert from "node:assert/strict";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { resolveAffinityDbPath } from "./resolve_affinity_db_path.ts";

test("database path precedence is flag, environment, home default", () => {
  assert.equal(
    resolveAffinityDbPath({
      flag: ":memory:",
      env: { GHOSTPAW_AFFINITY_DB: "env" },
    }),
    ":memory:",
  );
  assert.equal(
    resolveAffinityDbPath({ env: { GHOSTPAW_AFFINITY_DB: "env" } }),
    resolve("env"),
  );
  assert.equal(
    resolveAffinityDbPath({ env: {} }),
    join(homedir(), ".ghostpaw", "affinity.db"),
  );
});

test("empty environment path uses the default", () => {
  assert.equal(
    resolveAffinityDbPath({ env: { GHOSTPAW_AFFINITY_DB: "" } }),
    resolveAffinityDbPath({ env: {} }),
  );
});
