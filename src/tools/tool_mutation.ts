import type { MutationReceipt } from "../lib/types/mutation_receipt.ts";
import { toReceiptEntityRefs } from "./tool_ref.ts";
import { summarizeCount } from "./tool_summary.ts";
import { type ToolResult, toolNoOp, toolSuccess } from "./tool_types.ts";

export interface MutationToolData<TPrimary> {
  action: string;
  primary: TPrimary;
  created: MutationReceipt<TPrimary>["created"];
  updated: MutationReceipt<TPrimary>["updated"];
  archived: MutationReceipt<TPrimary>["archived"];
  removed: MutationReceipt<TPrimary>["removed"];
  affectedLinks: number[];
  derivedEffects: MutationReceipt<TPrimary>["derivedEffects"];
}

export function mutationToolResult<TPrimary>(
  action: string,
  receipt: MutationReceipt<TPrimary>,
  entitySummary: string,
): ToolResult<MutationToolData<TPrimary>> {
  const changedCount =
    receipt.created.length +
    receipt.updated.length +
    receipt.archived.length +
    receipt.removed.length;
  const data: MutationToolData<TPrimary> = {
    action,
    primary: receipt.primary,
    created: receipt.created,
    updated: receipt.updated,
    archived: receipt.archived,
    removed: receipt.removed,
    affectedLinks: receipt.affectedLinks,
    derivedEffects: receipt.derivedEffects,
  };
  const summary =
    changedCount === 0
      ? `No ${entitySummary} changes were needed.`
      : summarizeCount(changedCount, `${entitySummary} change`);
  if (changedCount === 0) {
    return toolNoOp(summary, data, {
      entities: toReceiptEntityRefs(receipt),
    });
  }
  return toolSuccess(summary, data, {
    entities: toReceiptEntityRefs(receipt),
  });
}
