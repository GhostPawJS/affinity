import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import type { AffinityDb } from "../database.ts";
import { AffinityContext } from "./context.ts";
import { createDemoSession } from "./demo_session.ts";
import { ContactsPage } from "./page_contacts.tsx";
import { DashboardPage } from "./page_dashboard.tsx";
import { InsightsPage } from "./page_insights.tsx";
import { RelationshipsPage } from "./page_relationships.tsx";
import { TimelinePage } from "./page_timeline.tsx";
import { ToastStack, useToastState } from "./result_toast.tsx";

type SeedMode = "blank" | "seeded";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", sub: "Overview and session" },
  { href: "/contacts", label: "Contacts", sub: "People you track" },
  { href: "/relationships", label: "Relationships", sub: "Links and bonds" },
  { href: "/timeline", label: "Timeline", sub: "Events and promises" },
  { href: "/insights", label: "Insights", sub: "Radar and analytics" },
] as const;

const PAGE_TITLES: Record<string, string> = {
  "/": "Affinity",
  "/contacts": "Affinity \u2014 Contacts",
  "/relationships": "Affinity \u2014 Relationships",
  "/timeline": "Affinity \u2014 Timeline",
  "/insights": "Affinity \u2014 Insights",
};

function readHash(): string {
  const raw = globalThis.location?.hash ?? "";
  const path = raw.replace(/^#/, "") || "/";
  return path.startsWith("/") ? path : `/${path}`;
}

/** Navigate by setting the hash — the hashchange listener picks it up. */
export function navigate(path: string): void {
  globalThis.location.hash = path;
}

function toError(e: unknown): string {
  return e instanceof Error ? e.message : "Unknown error";
}

export function App() {
  const dbRef = useRef<AffinityDb | null>(null);
  const [db, setDb] = useState<AffinityDb | null>(null);
  const [currentUrl, setCurrentUrl] = useState(readHash);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [sessionMode, setSessionMode] = useState<SeedMode>("seeded");
  const [sessionError, setSessionError] = useState<string | null>(null);

  const { toasts, push: pushToast } = useToastState();

  useEffect(() => {
    const onHash = () => {
      const url = readHash();
      setCurrentUrl(url);
      document.title = PAGE_TITLES[url] ?? "Affinity Demo";
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const replaceDb = useCallback((next: AffinityDb | null) => {
    const prev = dbRef.current;
    dbRef.current = next;
    setDb(next);
    prev?.close();
  }, []);

  const resetSession = useCallback(
    async (mode: SeedMode) => {
      setLoading(true);
      setSessionError(null);
      try {
        const next = await createDemoSession(mode);
        replaceDb(next);
        setSessionMode(mode);
        setRevision(0);
      } catch (e) {
        replaceDb(null);
        setSessionError(toError(e));
      } finally {
        setLoading(false);
      }
    },
    [replaceDb],
  );

  useEffect(() => {
    void resetSession("seeded");
    return () => {
      dbRef.current?.close();
      dbRef.current = null;
    };
  }, [resetSession]);

  const mutate = useCallback(() => setRevision((n) => n + 1), []);

  const isActive = (href: string) =>
    href === "/" ? currentUrl === "/" : currentUrl.startsWith(href);

  function renderPage() {
    switch (currentUrl) {
      case "/contacts":
        return <ContactsPage />;
      case "/relationships":
        return <RelationshipsPage />;
      case "/timeline":
        return <TimelinePage />;
      case "/insights":
        return <InsightsPage />;
      default:
        return <DashboardPage onReset={resetSession} />;
    }
  }

  return (
    <div class="demo-layout">
      {/* ---- Sidebar ---- */}
      <aside class="demo-sidebar">
        <div class="sidebar-brand">
          <h1>Affinity</h1>
          <small>Interactive Demo</small>
        </div>

        <div class="sidebar-banner">
          This is a live demo running entirely in your browser against an
          in-memory database. Nothing is saved &mdash; refresh to reset.
        </div>

        <nav class="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.href}
              class={`nav-item ${isActive(item.href) ? "active" : ""}`}
              onClick={() => navigate(item.href)}
              type="button"
            >
              <span class="nav-item-label">{item.label}</span>
              <span class="nav-item-sub">{item.sub}</span>
            </button>
          ))}
        </nav>

        <div class="sidebar-footer">
          <div class="sidebar-status">
            <span class={`dot ${loading ? "loading" : ""}`} />
            {loading ? "Loading..." : "Ready"}
          </div>
          <div class="sidebar-status">Session: {sessionMode}</div>
          <div class="inline-actions mt-sm">
            <button
              class="button sm secondary"
              onClick={() => void resetSession("blank")}
              type="button"
            >
              Blank
            </button>
            <button
              class="button sm primary"
              onClick={() => void resetSession("seeded")}
              type="button"
            >
              Seeded
            </button>
          </div>
        </div>
      </aside>

      {/* ---- Main content ---- */}
      <main class="demo-main">
        {sessionError !== null ? (
          <div class="panel" style={{ borderColor: "var(--danger)" }}>
            <div class="panel-header">
              <h2>Session Error</h2>
            </div>
            <pre class="code-block">{sessionError}</pre>
          </div>
        ) : null}

        {db !== null ? (
          <AffinityContext.Provider
            value={{ db, revision, mutate, toast: pushToast }}
          >
            {renderPage()}
          </AffinityContext.Provider>
        ) : loading ? (
          <div class="empty-state">Initializing the in-memory database...</div>
        ) : null}
      </main>

      <ToastStack toasts={toasts} />
    </div>
  );
}
