export function enrichPlainJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(enrichPlainJson);
  if (value === null || typeof value !== "object")
    return typeof value === "number" && !Number.isInteger(value)
      ? Math.round(value * 1000) / 1000
      : value;
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    result[key] = enrichPlainJson(entry);
    if (
      key.endsWith("At") &&
      typeof entry === "number" &&
      Number.isFinite(new Date(entry).getTime())
    )
      result[`${key}Iso`] = new Date(entry).toISOString();
  }
  return result;
}

export function suggestCommand(
  input: string,
  names: string[],
): string | undefined {
  let best: string | undefined;
  let distance = 3;
  for (const name of names) {
    let row = Array.from({ length: name.length + 1 }, (_, i) => i);
    for (let i = 0; i < input.length; i++) {
      const next = [i + 1];
      for (let j = 0; j < name.length; j++)
        next.push(
          Math.min(
            (next[j] ?? 0) + 1,
            (row[j + 1] ?? 0) + 1,
            (row[j] ?? 0) + (input[i] === name[j] ? 0 : 1),
          ),
        );
      row = next;
    }
    const current = row[name.length] ?? 3;
    if (current < distance) {
      best = name;
      distance = current;
    }
  }
  return best;
}

export function cliExitCode(value: unknown): number {
  const r = value as {
    ok?: boolean;
    outcome?: string;
    error?: { code?: string; message?: string };
  };
  const code = r.error?.code ?? "";
  if (r.outcome === "needs_clarification" || code === "not_found") return 3;
  if (
    [
      "conflict",
      "version_mismatch",
      "already_resolved",
      "already_in_state",
    ].includes(code) ||
    /already resolved/i.test(r.error?.message ?? "")
  )
    return 4;
  if (["invalid_input", "validation_error"].includes(code)) return 2;
  if (["system_error", "internal_error"].includes(code)) return 70;
  return r.ok === false ? 1 : 0;
}
export function plainJson(
  value: unknown,
  compact = false,
  formatError?: (message: string) => string,
): unknown {
  const result = enrichPlainJson(value) as Record<string, unknown>;
  if (!result || typeof result !== "object") return result;
  if (formatError && result.error && typeof result.error === "object") {
    result.error = Object.fromEntries(
      Object.entries(result.error).map(([key, value]) => [
        key,
        typeof value === "string" && ["message", "recovery"].includes(key)
          ? formatError(value)
          : value,
      ]),
    );
  }
  const data = result.data as Record<string, unknown> | undefined;
  if (
    data?.items &&
    JSON.stringify(result.entities) === JSON.stringify(data.items)
  )
    result.entities = undefined;
  const trim = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(trim);
    if (!v || typeof v !== "object") return v;
    return Object.fromEntries(
      Object.entries(v)
        .filter(
          ([k, x]) =>
            !(
              [
                "created",
                "updated",
                "archived",
                "removed",
                "affectedLinks",
                "derivedEffects",
              ].includes(k) &&
              Array.isArray(x) &&
              !x.length
            ),
        )
        .map(([k, x]) => [k, trim(x)]),
    );
  };
  return compact ? trim(result) : result;
}
/** Local calendar date, plus HH:MM unless the time is a day boundary. */
export function formatLocalTime(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return hm === "00:00" || hm === "23:59" ? day : `${day} ${hm}`;
}
const DATE_LABELS: Record<string, string> = {
  occurredAt: "on",
  dueAt: "due",
  occursAt: "next",
  resolvedAt: "resolved",
  lastMeaningfulInteractionAt: "last",
};
export function humanResult(value: unknown): string {
  const r = value as { summary?: string; data?: Record<string, unknown> };
  const items = r.data?.items;
  if (Array.isArray(items)) {
    if (!items.length) return `${r.summary ?? "No results."}\n`;
    return `${items
      .map((item) => {
        const dates = Object.entries(item)
          .filter(([k, v]) => k in DATE_LABELS && typeof v === "number")
          .map(
            ([k, v]) =>
              `${DATE_LABELS[k]} ${
                // Recurring dates are stored as UTC calendar days.
                k === "occursAt"
                  ? new Date(v as number).toISOString().slice(0, 10)
                  : formatLocalTime(v as number)
              }`,
          );
        if (Array.isArray(item.reasons) && item.reasons.length)
          dates.push(item.reasons.join(", ").replaceAll("_", " "));
        const subtitle = item.subtitle ? ` — ${item.subtitle}` : "";
        const tail = dates.length ? ` · ${dates.join(" · ")}` : "";
        return `#${item.id ?? item.entityId ?? "?"} ${item.title ?? item.name ?? ""}${subtitle}${tail}${item.overdue ? " · OVERDUE" : ""}`.trim();
      })
      .join("\n")}\n`;
  }
  const primary = r.data?.primary as { id?: number } | undefined;
  if (primary)
    return `${r.summary ?? "Done"}${primary.id === undefined ? "" : ` (id ${primary.id})`}\n`;
  if (r.data) {
    const fields: [string, string][] = [];
    const display = (entry: unknown): string => {
      if (entry === null) return "—";
      if (Array.isArray(entry)) return entry.map(display).join(", ") || "—";
      if (typeof entry === "object") {
        const item = entry as Record<string, unknown>;
        return String(
          item.title ??
            item.name ??
            item.summary ??
            item.value ??
            (item.id === undefined ? JSON.stringify(item) : `#${item.id}`),
        );
      }
      return String(entry);
    };
    const flatten = (value: unknown, prefix = "") => {
      if (!value || typeof value !== "object") return;
      for (const [key, entry] of Object.entries(value)) {
        const label = `${prefix}${key}`;
        if (entry && typeof entry === "object" && !Array.isArray(entry))
          flatten(entry, `${label}.`);
        else fields.push([label, display(entry)]);
      }
    };
    flatten(enrichPlainJson(r.data.detail ?? r.data));
    const width = Math.max(0, ...fields.map(([label]) => label.length));
    return `${fields.map(([label, value]) => `${label.padEnd(width)}: ${value}`).join("\n")}\n`;
  }
  return `${r.summary ?? ""}\n`;
}
