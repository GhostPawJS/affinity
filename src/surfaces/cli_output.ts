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
  const normalize = (text: string) =>
    text
      .toLowerCase()
      .replace(/identities/g, "identity")
      .replace(/\b([a-z]+)s\b/g, "$1")
      .replace(/[_-]/g, " ");
  const distance = (left: string, right: string) => {
    let row = Array.from({ length: right.length + 1 }, (_, i) => i);
    for (let i = 0; i < left.length; i++) {
      const next = [i + 1];
      for (let j = 0; j < right.length; j++)
        next.push(
          Math.min(
            (next[j] ?? 0) + 1,
            (row[j + 1] ?? 0) + 1,
            (row[j] ?? 0) + (left[i] === right[j] ? 0 : 1),
          ),
        );
      row = next;
    }
    return row[right.length] ?? Number.POSITIVE_INFINITY;
  };
  let best: string | undefined;
  let bestScore = Number.POSITIVE_INFINITY;
  const words = normalize(input).split(" ");
  for (const name of names) {
    const path = normalize(name);
    const alternatives = [path];
    if (words.length === 1) alternatives.push(path.split(" ").at(-1) ?? path);
    for (const alternative of alternatives) {
      const candidateInput =
        !path.includes(" ") && words.length > 1
          ? (words[0] ?? "")
          : words.join(" ");
      const current = distance(candidateInput, alternative);
      const threshold = Math.max(
        1,
        Math.floor(Math.max(candidateInput.length, alternative.length) * 0.25),
      );
      const score =
        current / Math.max(candidateInput.length, alternative.length, 1) +
        (!path.includes(" ") && words.length > 1 ? 0.05 : 0);
      if (current <= threshold && score < bestScore) {
        best = name;
        bestScore = score;
      }
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
    (JSON.stringify(result.entities) === JSON.stringify(data.items) ||
      JSON.stringify(result.entities) ===
        JSON.stringify(
          (data.items as Record<string, unknown>[]).map(
            ({ content: _content, ...item }) => item,
          ),
        ))
  )
    result.entities = undefined;
  if (compact && data?.primary) {
    result.entities = undefined;
    const ids = (value: unknown): unknown =>
      Array.isArray(value)
        ? value.map(ids)
        : value && typeof value === "object"
          ? "id" in value
            ? { id: (value as { id: unknown }).id }
            : Object.fromEntries(
                Object.entries(value).map(([key, entry]) => [key, ids(entry)]),
              )
          : value;
    for (const key of [
      "primary",
      "created",
      "updated",
      "archived",
      "removed",
      "affectedLinks",
    ])
      if (data[key] !== undefined) data[key] = ids(data[key]);
  }
  if (compact && data?.primary && Array.isArray(data.changes)) {
    for (const key of ["created", "updated", "archived", "removed"])
      data[key] = undefined;
  }
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
                typeof item[k.replace(/At$/, "On")] === "string"
                  ? item[k.replace(/At$/, "On")]
                  : k === "occursAt"
                    ? new Date(v as number).toISOString().slice(0, 10)
                    : formatLocalTime(v as number)
              }`,
          );
        if (Array.isArray(item.reasons) && item.reasons.length)
          dates.push(item.reasons.join(", ").replaceAll("_", " "));
        const subtitle = item.subtitle ? ` — ${item.subtitle}` : "";
        const tail = dates.length ? ` · ${dates.join(" · ")}` : "";
        return `#${item.id ?? item.entityId ?? "?"} ${item.title ?? item.name ?? item.summary ?? ""}${subtitle}${tail}${item.overdue ? " · OVERDUE" : ""}`.trim();
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
