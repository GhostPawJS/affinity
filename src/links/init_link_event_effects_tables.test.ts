import { strictEqual, throws } from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { describe, it } from "node:test";
import { initContactsTables } from "../contacts/init_contacts_tables.ts";
import { initEventsTables } from "../events/init_events_tables.ts";
import { initLinkEventEffectsTables } from "./init_link_event_effects_tables.ts";
import { initLinksTables } from "./init_links_tables.ts";

describe("initLinkEventEffectsTables", () => {
  it("is idempotent once links and events exist", () => {
    const db = new DatabaseSync(":memory:");
    initContactsTables(db);
    initLinksTables(db);
    initEventsTables(db);
    initLinkEventEffectsTables(db);
    initLinkEventEffectsTables(db);
    db.prepare(
      "INSERT INTO contacts (name, kind, is_owner, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    ).run("Owner", "human", 1, 1, 1);
    db.prepare(
      "INSERT INTO contacts (name, kind, created_at, updated_at) VALUES (?, ?, ?, ?)",
    ).run("Other", "human", 1, 1);
    db.prepare(
      `INSERT INTO links (
         from_contact_id, to_contact_id, kind, role, is_structural,
         rank, affinity, trust, state, cadence_days, bond, created_at, updated_at
       ) VALUES (?, ?, ?, NULL, 0, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(1, 2, "personal", 1, 0.25, 0.5, "active", 14, null, 1, 1);
    db.prepare(
      "INSERT INTO events (type, occurred_at, summary, significance, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run("conversation", 5, "hello", 5, 5, 5);
    db.prepare(
      `INSERT INTO link_event_effects (
         event_id, link_id, occurred_at, base_weight, impact_score, moment_kind, directness,
         affinity_delta, trust_delta, rank_delta, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(1, 1, 5, 0.7, 0.8, "milestone", 1, 0.1, 0.05, 1, 5, 5);
    const row = db
      .prepare(
        "SELECT base_weight, impact_score, moment_kind FROM link_event_effects WHERE event_id = ? AND link_id = ?",
      )
      .get(1, 1) as {
      base_weight: number;
      impact_score: number;
      moment_kind: string;
    };
    strictEqual(row.base_weight, 0.7);
    strictEqual(row.impact_score, 0.8);
    strictEqual(row.moment_kind, "milestone");
    throws(() => {
      db.prepare(
        `INSERT INTO link_event_effects (
           event_id, link_id, occurred_at, base_weight, impact_score, moment_kind, directness,
           affinity_delta, trust_delta, rank_delta, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(1, 1, 5, 0.3, 0.4, "milestone", 1, 0, 0, 0, 5, 5);
    });
    db.close();
  });
});
