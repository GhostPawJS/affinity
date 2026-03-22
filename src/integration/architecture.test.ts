import { ok, strictEqual } from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const SRC_DIR = new URL("..", import.meta.url).pathname;

function listTsFiles(root: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const full = join(root, entry.name);
    if (entry.isDirectory()) {
      out.push(...listTsFiles(full));
      continue;
    }
    if (!entry.name.endsWith(".ts")) {
      continue;
    }
    out.push(full);
  }
  return out;
}

function read(relativePath: string): string {
  return readFileSync(join(SRC_DIR, relativePath), "utf8");
}

describe("architecture guardrails", () => {
  it("removes the legacy impl directories", () => {
    strictEqual(existsSync(join(SRC_DIR, "read_impl")), false);
    strictEqual(existsSync(join(SRC_DIR, "write_impl")), false);
  });

  it("keeps root facades independent from impl barrels", () => {
    const readSource = read("read.ts");
    const writeSource = read("write.ts");
    ok(!readSource.includes("read_impl"));
    ok(!readSource.includes("write_impl"));
    ok(!writeSource.includes("read_impl"));
    ok(!writeSource.includes("write_impl"));
    ok(readSource.includes("./contacts/index.ts"));
    ok(readSource.includes("./links/index.ts"));
    ok(readSource.includes("./events/index.ts"));
    ok(readSource.includes("./graph/index.ts"));
    ok(readSource.includes("./dates/index.ts"));
    ok(readSource.includes("./merges/index.ts"));
    ok(writeSource.includes("./contacts/index.ts"));
    ok(writeSource.includes("./links/index.ts"));
    ok(writeSource.includes("./events/index.ts"));
    ok(writeSource.includes("./identities/index.ts"));
    ok(writeSource.includes("./attributes/index.ts"));
    ok(writeSource.includes("./dates/index.ts"));
    ok(writeSource.includes("./merges/index.ts"));
  });

  it("keeps domain barrels free of legacy impl imports", () => {
    for (const relativePath of [
      "contacts/index.ts",
      "links/index.ts",
      "events/index.ts",
      "identities/index.ts",
      "attributes/index.ts",
      "dates/index.ts",
      "merges/index.ts",
    ]) {
      const source = read(relativePath);
      ok(
        !source.includes("read_impl"),
        `${relativePath} should not mention read_impl`,
      );
      ok(
        !source.includes("write_impl"),
        `${relativePath} should not mention write_impl`,
      );
    }
  });

  it("keeps support-table-backed reads wired to their backing models", () => {
    const requiredSnippets = new Map<string, string[]>([
      ["links/get_link_timeline.ts", ["FROM link_event_effects"]],
      ["events/list_moments.ts", ["FROM link_event_effects"]],
      ["links/list_progression_readiness.ts", ["LEFT JOIN link_rollups lr"]],
      ["links/list_radar.ts", ["LEFT JOIN link_rollups lr"]],
      ["links/list_owner_social_links.ts", ["LEFT JOIN link_rollups lr"]],
      ["links/list_observed_links.ts", ["LEFT JOIN link_rollups lr"]],
      [
        "contacts/load_contact_profile_record.ts",
        ["loadContactRollup", "LEFT JOIN link_rollups lr"],
      ],
      ["links/get_link_detail.ts", ["loadLinkRollup", "listMoments"]],
    ]);
    for (const [relativePath, snippets] of requiredSnippets) {
      const source = read(relativePath);
      for (const snippet of snippets) {
        ok(
          source.includes(snippet),
          `${relativePath} should include ${snippet}`,
        );
      }
    }
  });

  it("keeps placeholder derivation stubs out of production reads", () => {
    const guardedFiles = new Map<string, string[]>([
      [
        "contacts/list_duplicate_candidates.ts",
        ["Returns an empty list until", "return [];"],
      ],
      ["links/get_link_detail.ts", ["rollups: null", "derivation: null"]],
      [
        "contacts/load_contact_profile_record.ts",
        ["warnings: []", "rollups: null"],
      ],
      ["events/list_moments.ts", ["inferLinkId("]],
    ]);
    for (const [relativePath, forbiddenSnippets] of guardedFiles) {
      const source = read(relativePath);
      for (const snippet of forbiddenSnippets) {
        ok(
          !source.includes(snippet),
          `${relativePath} should not contain ${snippet}`,
        );
      }
    }
  });

  it("keeps integration suites out of the src root", () => {
    for (const relativePath of [
      "integration/architecture.test.ts",
      "integration/concept_validation_scenarios.test.ts",
      "integration/support_tables_integration.test.ts",
    ]) {
      strictEqual(
        existsSync(join(SRC_DIR, relativePath)),
        true,
        `${relativePath} should exist`,
      );
    }
    strictEqual(existsSync(join(SRC_DIR, "architecture.test.ts")), false);
    strictEqual(
      existsSync(join(SRC_DIR, "concept_validation_scenarios.test.ts")),
      false,
    );
    strictEqual(
      existsSync(join(SRC_DIR, "support_tables_integration.test.ts")),
      false,
    );
  });

  it("keeps root infra files as real implementations (no shims)", () => {
    ok(
      read("database.ts").includes("export type AffinityDb"),
      "database.ts should define AffinityDb directly",
    );
    ok(
      read("resolve_now.ts").includes("export function resolveNow"),
      "resolve_now.ts should define resolveNow directly",
    );
    ok(
      read("with_transaction.ts").includes("export function withTransaction"),
      "with_transaction.ts should define withTransaction directly",
    );
    strictEqual(
      existsSync(join(SRC_DIR, "lib/core")),
      false,
      "lib/core/ should not exist",
    );
  });

  it("dates/ and merges/ concept folders exist", () => {
    ok(existsSync(join(SRC_DIR, "dates/index.ts")));
    ok(existsSync(join(SRC_DIR, "merges/index.ts")));
  });

  it("write.ts does not export rebuildUpcomingOccurrences", () => {
    ok(!read("write.ts").includes("rebuildUpcomingOccurrences"));
  });

  it("keeps filenames uniformly snake_case", () => {
    const offenders = listTsFiles(SRC_DIR)
      .map((path) => path.replace(`${SRC_DIR}/`, ""))
      .filter((relativePath) => {
        const fileName = relativePath.split("/").at(-1) ?? relativePath;
        return !/^[a-z0-9_]+(\.test)?\.ts$/.test(fileName);
      });
    strictEqual(offenders.length, 0, offenders.join(", "));
  });
});
