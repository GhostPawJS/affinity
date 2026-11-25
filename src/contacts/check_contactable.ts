import type { AffinityDb } from "../database.ts";
import { AffinityNotFoundError } from "../lib/errors/affinity_not_found_error.ts";

import { getContactRowById } from "./queries.ts";

type Via = "self" | "works_at" | "member_of";
export interface ContactabilityBlocker {
  contactId: number;
  name: string;
  via: Via;
  path: number[];
}

export function checkContactable(db: AffinityDb, contactId: number) {
  // A deferred savepoint keeps the entire walk in one read snapshot, including
  // when the caller already has a transaction open.
  db.exec("SAVEPOINT contactability");
  try {
    let root = getContactRowById(db, contactId);
    while (root?.lifecycle_state === "merged") {
      root =
        root.merged_into_contact_id === null
          ? null
          : getContactRowById(db, root.merged_into_contact_id);
    }
    if (!root) throw new AffinityNotFoundError("contact not found");
    const targets =
      db.prepare(`SELECT c.id,c.name,c.do_not_contact,l.kind AS via FROM links l
      JOIN contacts c ON c.id=l.to_contact_id WHERE l.from_contact_id=?
      AND l.removed_at IS NULL AND c.deleted_at IS NULL AND l.is_structural=1
      AND l.kind IN ('works_at','member_of') ORDER BY c.id,l.kind`);
    type Step = { id: number; name: string; do_not_contact?: number; via: Via };
    const queue: Step[] = [{ ...root, via: "self" }];
    const parents = new Map<number, number | null>([[root.id, null]]);
    const blockedBy: ContactabilityBlocker[] = [];
    for (const row of queue) {
      if (row.do_not_contact) {
        const path: number[] = [];
        for (
          let id: number | null | undefined = row.id;
          id != null;
          id = parents.get(id)
        )
          path.push(id);
        blockedBy.push({
          contactId: row.id,
          name: row.name,
          via: row.via,
          path: path.reverse(),
        });
      }
      for (const child of targets.all<Step>(row.id)) {
        if (parents.has(child.id)) continue;
        parents.set(child.id, row.id);
        queue.push(child);
      }
    }
    return {
      contactId: root.id,
      name: root.name,
      contactable: blockedBy.length === 0,
      blockedBy,
    };
  } finally {
    db.exec("RELEASE contactability");
  }
}
