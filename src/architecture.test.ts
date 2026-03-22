import { ok, strictEqual } from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const SRC_DIR = new URL(".", import.meta.url).pathname;

function listProductionTsFiles(root: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const full = join(root, entry.name);
    if (entry.isDirectory()) {
      out.push(...listProductionTsFiles(full));
      continue;
    }
    if (!entry.name.endsWith(".ts") || entry.name.endsWith(".test.ts")) {
      continue;
    }
    out.push(full);
  }
  return out;
}

describe("architecture guardrails", () => {
  it("keeps read_impl production files independent from write_impl", () => {
    const readImplDir = join(SRC_DIR, "read_impl");
    const offenders = listProductionTsFiles(readImplDir).filter((path) =>
      readFileSync(path, "utf8").includes("../write_impl/"),
    );
    strictEqual(offenders.length, 0);
  });

  it("removes legacy misplaced helper files", () => {
    const removedPaths = [
      "read_impl/get_owner_contact_id_or_null.ts",
      "read_impl/map_contact_row_to_contact_core.ts",
      "read_impl/find_relational_link_id.ts",
      "read_impl/load_active_dates_for_contact.ts",
      "read_impl/map_upcoming_row_to_upcoming_date_record.ts",
      "write_impl/get_contact_row_by_id.ts",
      "write_impl/map_contact_row_to_contact_list_item.ts",
      "write_impl/assert_valid_lifecycle_transition.ts",
      "write_impl/get_identity_row_by_id.ts",
      "write_impl/map_identity_row_to_identity_record.ts",
      "write_impl/normalize_identity_key.ts",
      "write_impl/assert_no_identity_collision.ts",
      "write_impl/get_link_row_by_id.ts",
      "write_impl/find_live_relational_link_any_direction.ts",
      "write_impl/find_live_structural_tie.ts",
      "write_impl/require_relational_link.ts",
      "write_impl/map_link_row_to_link_list_item.ts",
      "write_impl/relational_link_kinds.ts",
      "write_impl/structural_link_kinds.ts",
      "write_impl/validate_relational_mechanics.ts",
      "write_impl/assert_link_endpoints_not_merged.ts",
      "write_impl/get_event_row_by_id.ts",
      "write_impl/find_duplicate_date_anchor.ts",
      "write_impl/load_event_participant_views.ts",
      "write_impl/load_event_record.ts",
      "write_impl/require_date_anchor_event.ts",
      "write_impl/map_event_row_to_event_record.ts",
      "write_impl/assert_owner_participates.ts",
      "write_impl/assert_participant_contacts_live.ts",
      "write_impl/validate_social_event_input.ts",
      "write_impl/validate_anchor_calendar.ts",
      "write_impl/compute_next_anchor_occurs_on.ts",
      "write_impl/insert_journal_event.ts",
      "write_impl/insert_date_anchor_event.ts",
      "write_impl/upsert_upcoming_occurrence.ts",
      "write_impl/delete_upcoming_occurrence.ts",
      "write_impl/get_attribute_row_by_id.ts",
      "write_impl/get_live_attribute_row.ts",
      "write_impl/list_live_attribute_ids_for_target.ts",
      "write_impl/map_attribute_row_to_attribute_record.ts",
      "write_impl/normalize_attribute_value.ts",
      "write_impl/cleared_attribute_primary.ts",
      "write_impl/validate_attribute_name.ts",
      "write_impl/validate_attribute_entries.ts",
      "write_impl/assert_attribute_target_writable.ts",
      "write_impl/build_contact_mutation_receipt.ts",
      "write_impl/build_merge_mutation_receipt.ts",
      "write_impl/build_event_mutation_receipt.ts",
      "write_impl/build_identity_mutation_receipt.ts",
      "write_impl/build_link_mutation_receipt.ts",
      "write_impl/build_attribute_mutation_receipt.ts",
    ];
    for (const relativePath of removedPaths) {
      ok(
        !existsSync(join(SRC_DIR, relativePath)),
        `${relativePath} should be removed`,
      );
    }
  });
});
