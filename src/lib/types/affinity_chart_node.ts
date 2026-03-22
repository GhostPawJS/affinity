import type { ContactKind } from "../../contacts/types.ts";

export interface AffinityChartNode {
  contactId: number;
  label: string;
  kind: ContactKind;
}
