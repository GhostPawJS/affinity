import type { AffinityDb } from "../database.ts";
import { AffinityNotFoundError } from "../lib/errors/affinity_not_found_error.ts";

/** Export all stored records belonging to a contact, including archived history. */
export function exportContact(db: AffinityDb, id: number) {
  const query = (sql: string, ...params: number[]) =>
    db
      .prepare(sql)
      .all(...params)
      .map((row) => {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(row)) {
          const name = key.replace(/_([a-z])/g, (_, letter: string) =>
            letter.toUpperCase(),
          );
          result[name] = value;
          if (
            (name.endsWith("At") || name === "dueAt") &&
            typeof value === "number"
          )
            result[`${name}Iso`] = new Date(value).toISOString();
          if (key.endsWith("_json") && typeof value === "string")
            result[name] = JSON.parse(value);
        }
        return result;
      });
  const contact = query("SELECT * FROM contacts WHERE id = ?", id)[0];
  if (!contact) throw new AffinityNotFoundError("contact not found");
  const events: Array<
    Record<string, unknown> & { participants: Record<string, unknown>[] }
  > = query(
    "SELECT DISTINCT e.* FROM events e JOIN event_participants p ON p.event_id = e.id WHERE p.contact_id = ? ORDER BY e.id",
    id,
  ).map((event) => ({
    ...event,
    participants: query(
      "SELECT p.*, c.name AS contact_name FROM event_participants p JOIN contacts c ON c.id = p.contact_id WHERE event_id = ? ORDER BY p.contact_id",
      event.id as number,
    ),
  }));
  return {
    contact,
    identities: query(
      "SELECT * FROM identities WHERE contact_id = ? ORDER BY id",
      id,
    ),
    attributes: query(
      "SELECT * FROM attributes WHERE contact_id = ? OR link_id IN (SELECT id FROM links WHERE from_contact_id = ? OR to_contact_id = ?) ORDER BY id",
      id,
      id,
      id,
    ),
    links: query(
      "SELECT l.*, f.name AS from_contact_name, t.name AS to_contact_name FROM links l JOIN contacts f ON f.id = l.from_contact_id JOIN contacts t ON t.id = l.to_contact_id WHERE from_contact_id = ? OR to_contact_id = ? ORDER BY l.id",
      id,
      id,
    ),
    events,
    commitments: query(
      "SELECT o.* FROM open_commitments o JOIN event_participants p ON p.event_id = o.event_id WHERE p.contact_id = ? ORDER BY o.event_id",
      id,
    ),
    dates: query(
      "SELECT * FROM events WHERE anchor_contact_id = ? OR anchor_link_id IN (SELECT id FROM links WHERE from_contact_id = ? OR to_contact_id = ?) ORDER BY id",
      id,
      id,
      id,
    ),
    mergeHistory: query(
      "SELECT * FROM contact_merges WHERE winner_contact_id = ? OR loser_contact_id = ? ORDER BY id",
      id,
      id,
    ),
  };
}
