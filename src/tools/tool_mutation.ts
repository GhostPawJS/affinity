import type { MutationReceipt } from "../lib/types/mutation_receipt.ts";
import { toReceiptEntityRefs } from "./tool_ref.ts";
import { type ToolResult, toolNoOp, toolSuccess } from "./tool_types.ts";

export interface MutationToolData<TPrimary> {
  changes: { entity: string; id: number; action: string; fields?: string[] }[];
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
  fields?: string[],
): ToolResult<MutationToolData<TPrimary>> {
  const changedCount =
    receipt.created.length +
    receipt.updated.length +
    receipt.archived.length +
    receipt.removed.length;
  const data: MutationToolData<TPrimary> = {
    changes: (["created", "updated", "archived", "removed"] as const).flatMap(
      (verb) =>
        receipt[verb].map((ref) => ({
          entity: ref.kind,
          id: ref.id,
          action: verb,
          ...(verb === "updated" && fields ? { fields } : {}),
        })),
    ),
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
      : describeChanges(receipt);
  if (changedCount === 0) {
    return toolNoOp(summary, data, {
      entities: toReceiptEntityRefs(receipt),
    });
  }
  return toolSuccess(summary, data, {
    entities: toReceiptEntityRefs(receipt),
    warnings: receipt.warnings,
  });
}

const PLURALS: Record<string, string> = { identity: "identities" };

function describeChanges(receipt: MutationReceipt<unknown>): string {
  const parts: string[] = [];
  for (const verb of ["created", "updated", "archived", "removed"] as const) {
    const counts = new Map<string, number>();
    for (const ref of receipt[verb]) {
      counts.set(ref.kind, (counts.get(ref.kind) ?? 0) + 1);
    }
    if (counts.size === 0) continue;
    const items = [...counts].map(
      ([kind, n]) => `${n} ${n === 1 ? kind : (PLURALS[kind] ?? `${kind}s`)}`,
    );
    parts.push(`${verb} ${items.join(", ")}`);
  }
  const text = parts.join("; ");
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}
