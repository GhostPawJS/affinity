import type { ComponentChildren } from "preact";
import { reviewAffinityToolHandler } from "../tools/review_affinity_tool.ts";
import type { ToolListItem } from "../tools/tool_types.ts";
import { useAffinity } from "./context.ts";

/* ---------- Panel ---------- */

export function Panel(props: {
  title: string;
  subtitle?: string;
  actions?: ComponentChildren;
  children: ComponentChildren;
}) {
  return (
    <section class="panel">
      <div class="panel-header">
        <h2>{props.title}</h2>
        {props.actions}
      </div>
      {props.subtitle ? <p class="panel-subtitle">{props.subtitle}</p> : null}
      {props.children}
    </section>
  );
}

/* ---------- Badge ---------- */

export function Badge(props: {
  label: string;
  variant?:
    | "kind"
    | "rank"
    | "state"
    | "moment"
    | "success"
    | "danger"
    | "warning"
    | "info";
  title?: string;
}) {
  return (
    <span class={`badge ${props.variant ?? "info"}`} title={props.title}>
      {props.label}
    </span>
  );
}

/* ---------- EmptyState ---------- */

export function EmptyState(props: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div class="empty-state">
      {props.message}
      {props.actionLabel && props.onAction ? (
        <div>
          <button
            class="button sm primary"
            onClick={props.onAction}
            type="button"
          >
            {props.actionLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/* ---------- SummaryCard ---------- */

export function SummaryCard(props: {
  label: string;
  value: string | number;
  sublabel?: string;
}) {
  return (
    <div class="summary-card">
      <span class="summary-label">{props.label}</span>
      <span class="summary-value">{props.value}</span>
      {props.sublabel ? (
        <span class="summary-sublabel">{props.sublabel}</span>
      ) : null}
    </div>
  );
}

/* ---------- Avatar ---------- */

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    const first = parts[0]?.[0] ?? "";
    const last = parts[parts.length - 1]?.[0] ?? "";
    return (first + last).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function Avatar(props: { name: string; id: number }) {
  const hue = (props.id * 47) % 360;
  return (
    <div
      class="avatar"
      style={{ background: `hsl(${hue}, 55%, 45%)` }}
      title={props.name}
    >
      {initials(props.name)}
    </div>
  );
}

/* ---------- FormField ---------- */

export function FormField(props: {
  label: string;
  htmlFor?: string;
  hint?: string;
  required?: boolean;
  error?: string;
  children: ComponentChildren;
}) {
  return (
    <div class="field">
      <label for={props.htmlFor}>
        {props.label}
        {props.required ? <span class="required">*</span> : null}
      </label>
      {props.children}
      {props.hint ? <small class="field-hint">{props.hint}</small> : null}
      {props.error ? <small class="field-error">{props.error}</small> : null}
    </div>
  );
}

/* ---------- DataRow ---------- */

export function DataRow(props: {
  label: string;
  hint?: string;
  children: ComponentChildren;
}) {
  return (
    <div class="data-row">
      <div class="data-row-label">
        {props.label}
        {props.hint ? <span class="data-row-hint">{props.hint}</span> : null}
      </div>
      <div class="data-row-value">{props.children}</div>
    </div>
  );
}

/* ---------- SignificanceDots ---------- */

export function SignificanceDots(props: { value: number }) {
  const dots = [];
  for (let i = 1; i <= 10; i++) {
    dots.push(
      <span key={i} class={`sig-dot ${i <= props.value ? "filled" : ""}`} />,
    );
  }
  return <span class="sig-dots">{dots}</span>;
}

/* ---------- Explainer ---------- */

export function Explainer(props: {
  title: string;
  children: ComponentChildren;
}) {
  return (
    <details class="explainer">
      <summary>{props.title}</summary>
      <div class="explainer-body">{props.children}</div>
    </details>
  );
}

/* ---------- ContactPicker ---------- */

export function ContactPicker(props: {
  value: string;
  onChange: (id: string) => void;
  includeOwner?: boolean;
  placeholder?: string;
  id?: string;
}) {
  const { db, revision } = useAffinity();
  void revision;
  const result = reviewAffinityToolHandler(db, {
    view: "contacts.list",
    includeOwner: props.includeOwner ?? false,
    includeDormant: true,
    limit: 100,
  });
  const items: ToolListItem[] = result.ok ? result.data.items : [];

  return (
    <select
      id={props.id}
      value={props.value}
      onInput={(e) =>
        props.onChange((e.currentTarget as HTMLSelectElement).value)
      }
    >
      <option value="">{props.placeholder ?? "Select a contact"}</option>
      {items.map((item) => (
        <option key={item.id} value={String(item.id)}>
          {item.title ?? `Contact #${item.id}`}
        </option>
      ))}
    </select>
  );
}

/* ---------- LinkPicker ---------- */

export function LinkPicker(props: {
  value: string;
  onChange: (id: string) => void;
  id?: string;
}) {
  const { db, revision } = useAffinity();
  void revision;
  const result = reviewAffinityToolHandler(db, {
    view: "links.owner",
    includeArchived: true,
    limit: 100,
  });
  const items: ToolListItem[] = result.ok ? result.data.items : [];

  return (
    <select
      id={props.id}
      value={props.value}
      onInput={(e) =>
        props.onChange((e.currentTarget as HTMLSelectElement).value)
      }
    >
      <option value="">Select a link</option>
      {items.map((item) => (
        <option key={item.id} value={String(item.id)}>
          {item.title ?? `Link #${item.id}`}
        </option>
      ))}
    </select>
  );
}

/* ---------- Format helpers ---------- */

export function formatTime(ts: number | null | undefined): string {
  if (ts === null || ts === undefined) return "—";
  if (ts < 1000) return "seed data";
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return String(ts);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
