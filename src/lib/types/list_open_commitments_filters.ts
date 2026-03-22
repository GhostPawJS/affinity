/** Filters for `read.listOpenCommitments` — CONCEPT.md. */
export interface ListOpenCommitmentsFilters {
  commitmentType?: "promise" | "agreement";
  contactId?: number;
  linkId?: number;
  horizonDays?: number;
}
