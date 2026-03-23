import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import type { ToolResult } from "../tools/tool_types.ts";

interface ToastEntry {
  id: number;
  ok: boolean;
  title: string;
  body: string;
}

const MAX_VISIBLE = 3;
const DISMISS_MS = 4500;

export function useToastState() {
  const nextId = useRef(0);
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const push = useCallback((result: ToolResult<unknown>) => {
    const id = nextId.current++;
    const title = result.ok ? "Success" : "Error";
    const body =
      result.summary ??
      (result.ok ? "Operation completed." : "Something went wrong.");
    setToasts((prev) => [
      ...prev.slice(-(MAX_VISIBLE - 1)),
      { id, ok: result.ok, title, body },
    ]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, DISMISS_MS);
  }, []);

  return { toasts, push };
}

export function ToastStack(props: { toasts: ToastEntry[] }) {
  return (
    <div class="toast-stack">
      {props.toasts.map((t) => (
        <Toast key={t.id} entry={t} />
      ))}
    </div>
  );
}

function Toast(props: { entry: ToastEntry }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), DISMISS_MS - 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      class={`toast ${props.entry.ok ? "ok" : "fail"}`}
      style={{ opacity: visible ? 1 : 0, transition: "opacity 0.3s" }}
    >
      <div class="toast-title">{props.entry.title}</div>
      <div class="toast-body">{props.entry.body}</div>
    </div>
  );
}
