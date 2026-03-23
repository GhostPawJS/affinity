import { bootstrapAndColdStartSkill } from "./bootstrap_and_cold_start.ts";
import { captureTransactionsAndCommercialEventsSkill } from "./capture_transactions_and_commercial_events.ts";
import { identifyAndLocateContactsSkill } from "./identify_and_locate_contacts.ts";
import { importHistoryWithoutFakingEvidenceSkill } from "./import_history_without_faking_evidence.ts";
import { managePromisesAndAgreementsSkill } from "./manage_promises_and_agreements.ts";
import { manageRecurringDatesAndRemindersSkill } from "./manage_recurring_dates_and_reminders.ts";
import { modelStructureOrgsAndHouseholdsSkill } from "./model_structure_orgs_and_households.ts";
import { recordDirectEvidenceWellSkill } from "./record_direct_evidence_well.ts";
import { recordObservationsAndReferralsSkill } from "./record_observations_and_referrals.ts";
import { reconcileDuplicatesAndMergeSafelySkill } from "./reconcile_duplicates_and_merge_safely.ts";
import { reviewRadarProgressionAndGraphSkill } from "./review_radar_progression_and_graph.ts";
import type { AffinitySkillRegistry } from "./skill_types.ts";

export const affinitySkills = [
  bootstrapAndColdStartSkill,
  identifyAndLocateContactsSkill,
  importHistoryWithoutFakingEvidenceSkill,
  modelStructureOrgsAndHouseholdsSkill,
  recordDirectEvidenceWellSkill,
  recordObservationsAndReferralsSkill,
  captureTransactionsAndCommercialEventsSkill,
  managePromisesAndAgreementsSkill,
  manageRecurringDatesAndRemindersSkill,
  reviewRadarProgressionAndGraphSkill,
  reconcileDuplicatesAndMergeSafelySkill,
] satisfies AffinitySkillRegistry;

export function listAffinitySkills(): AffinitySkillRegistry {
  return [...affinitySkills];
}

export function getAffinitySkillByName(name: string) {
  return affinitySkills.find((skill) => skill.name === name) ?? null;
}
