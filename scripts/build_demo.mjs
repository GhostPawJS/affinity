import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { build, context } from "esbuild";

const rootDir = process.cwd();
const outDir = path.join(rootDir, "demo");
const entryPoint = path.join(rootDir, "src/demo/main.tsx");
const watchMode = process.argv.includes("--watch");

const buildOptions = {
  absWorkingDir: rootDir,
  assetNames: "assets/[name]-[hash]",
  bundle: true,
  entryNames: "app",
  entryPoints: [entryPoint],
  format: "esm",
  jsx: "automatic",
  jsxImportSource: "preact",
  loader: {
    ".wasm": "file",
  },
  outdir: outDir,
  platform: "browser",
  sourcemap: true,
  target: ["es2022"],
};

async function ensureOutputFolder() {
  await rm(outDir, { force: true, recursive: true });
  await mkdir(outDir, { recursive: true });
}

async function writeHtmlShell() {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>Affinity Demo</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><polygon points='16,2 28,10 28,22 16,30 4,22 4,10' fill='%233b82f6'/></svg>" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <style>
      :root {
        color-scheme: dark;
        --font: "Plus Jakarta Sans", ui-sans-serif, system-ui, -apple-system, sans-serif;
        --bg-base: #060c1a;
        --bg-surface: rgba(12, 20, 40, 0.78);
        --bg-elevated: rgba(30, 41, 59, 0.6);
        --bg-input: rgba(10, 16, 32, 0.95);
        --border-subtle: rgba(148, 163, 184, 0.14);
        --border-hover: rgba(148, 163, 184, 0.28);
        --accent: #3b82f6;
        --accent-dim: rgba(59, 130, 246, 0.15);
        --accent-glow: rgba(59, 130, 246, 0.25);
        --text-primary: #f1f5f9;
        --text-secondary: #94a3b8;
        --text-tertiary: #64748b;
        --success: #22c55e;
        --danger: #ef4444;
        --warning: #f59e0b;
        --radius-sm: 8px;
        --radius-md: 14px;
        --radius-lg: 18px;
        --radius-pill: 999px;
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        min-height: 100vh;
        font-family: var(--font);
        font-size: 15px;
        line-height: 1.6;
        color: var(--text-primary);
        background: var(--bg-base);
        background-image:
          radial-gradient(ellipse at 20% 0%, rgba(59,130,246,0.12), transparent 50%),
          radial-gradient(ellipse at 80% 100%, rgba(59,130,246,0.06), transparent 50%);
        background-attachment: fixed;
      }

      a { color: inherit; }
      button, input, select, textarea { font: inherit; color: inherit; }

      :focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
      }

      #app { min-height: 100vh; }

      /* ---- Layout ---- */
      .demo-layout {
        display: grid;
        grid-template-columns: 260px 1fr;
        min-height: 100vh;
      }

      .demo-sidebar {
        position: sticky;
        top: 0;
        height: 100vh;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        padding: 24px 16px 16px;
        border-right: 1px solid var(--border-subtle);
        background: rgba(6, 12, 26, 0.92);
        backdrop-filter: blur(12px);
      }

      .demo-main {
        padding: 28px 32px 48px;
        max-width: 1100px;
        width: 100%;
      }

      @media (max-width: 768px) {
        .demo-layout {
          grid-template-columns: 1fr;
        }
        .demo-sidebar {
          position: static;
          height: auto;
          flex-direction: row;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          border-right: none;
          border-bottom: 1px solid var(--border-subtle);
        }
        .sidebar-brand { flex: 1 1 100%; }
        .sidebar-banner { display: none; }
        .sidebar-nav { flex-direction: row; gap: 4px; }
        .sidebar-footer { flex-direction: row; margin-top: 0; }
        .demo-main { padding: 20px 16px 40px; }
      }

      /* ---- Sidebar parts ---- */
      .sidebar-brand {
        margin-bottom: 8px;
      }
      .sidebar-brand h1 {
        margin: 0;
        font-size: 1.35rem;
        font-weight: 700;
        letter-spacing: -0.02em;
      }
      .sidebar-brand small {
        display: block;
        margin-top: 2px;
        font-size: 0.78rem;
        color: var(--text-tertiary);
        font-weight: 400;
      }

      .sidebar-banner {
        margin: 12px 0 16px;
        padding: 10px 12px;
        border-radius: var(--radius-sm);
        border: 1px dashed var(--border-hover);
        font-size: 0.78rem;
        line-height: 1.45;
        color: var(--text-tertiary);
      }

      .sidebar-nav {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex: 1;
      }

      .nav-item {
        display: flex;
        flex-direction: column;
        gap: 0;
        padding: 10px 14px;
        border-radius: var(--radius-sm);
        border: none;
        background: transparent;
        color: var(--text-secondary);
        cursor: pointer;
        text-align: left;
        transition: background 0.15s, color 0.15s;
        text-decoration: none;
      }
      .nav-item:hover {
        background: var(--accent-dim);
        color: var(--text-primary);
      }
      .nav-item.active {
        background: var(--accent-dim);
        color: var(--text-primary);
        box-shadow: inset 3px 0 0 var(--accent);
      }
      .nav-item-label {
        font-size: 0.92rem;
        font-weight: 600;
      }
      .nav-item-sub {
        font-size: 0.72rem;
        color: var(--text-tertiary);
        margin-top: 1px;
      }

      .sidebar-footer {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-top: 16px;
        padding-top: 14px;
        border-top: 1px solid var(--border-subtle);
      }

      .sidebar-status {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.78rem;
        color: var(--text-tertiary);
      }
      .sidebar-status .dot {
        width: 7px; height: 7px;
        border-radius: 50%;
        background: var(--success);
        flex-shrink: 0;
      }
      .sidebar-status .dot.loading { background: var(--warning); }

      /* ---- Buttons ---- */
      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        min-height: 38px;
        padding: 0 16px;
        border-radius: var(--radius-pill);
        border: 1px solid var(--border-hover);
        background: var(--bg-elevated);
        color: var(--text-primary);
        cursor: pointer;
        font-size: 0.88rem;
        font-weight: 500;
        transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
        white-space: nowrap;
      }
      .button:hover { border-color: var(--text-tertiary); }
      .button.primary {
        background: var(--accent);
        border-color: var(--accent);
        color: #fff;
      }
      .button.primary:hover {
        background: #2563eb;
        box-shadow: 0 0 16px var(--accent-glow);
      }
      .button.secondary { background: var(--bg-elevated); }
      .button.danger {
        background: rgba(153, 27, 27, 0.85);
        border-color: rgba(248, 113, 113, 0.4);
        color: #fecaca;
      }
      .button.danger:hover { background: rgba(185, 28, 28, 0.9); }
      .button.sm {
        min-height: 30px;
        padding: 0 10px;
        font-size: 0.8rem;
      }
      .button.ghost {
        background: transparent;
        border-color: transparent;
        color: var(--text-secondary);
      }
      .button.ghost:hover {
        background: var(--accent-dim);
        color: var(--text-primary);
      }

      .actions, .inline-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
      }

      /* ---- Panel ---- */
      .panel {
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-lg);
        padding: 20px;
        background: var(--bg-surface);
        backdrop-filter: blur(12px);
        box-shadow: 0 12px 40px rgba(2, 6, 23, 0.3);
        transition: box-shadow 0.25s;
        animation: fadeSlideIn 0.3s ease-out both;
      }
      .panel:hover {
        box-shadow: 0 12px 40px rgba(2, 6, 23, 0.3), 0 0 0 1px var(--accent-dim);
      }
      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 14px;
      }
      .panel-header h2, .panel-header h3 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 700;
        letter-spacing: -0.01em;
      }
      .panel-subtitle {
        margin: -8px 0 14px;
        font-size: 0.85rem;
        line-height: 1.5;
        color: var(--text-secondary);
      }

      /* ---- Page grid ---- */
      .page-grid {
        display: grid;
        gap: 18px;
      }
      .page-grid.two {
        grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
      }
      @media (max-width: 768px) {
        .page-grid.two { grid-template-columns: 1fr; }
      }

      /* ---- Forms ---- */
      .form-grid {
        display: grid;
        gap: 14px;
      }
      .form-grid.two {
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      }

      .field {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .field label {
        font-size: 0.85rem;
        font-weight: 500;
        color: var(--text-secondary);
      }
      .field label .required {
        color: var(--danger);
        margin-left: 2px;
      }
      .field input, .field select, .field textarea {
        width: 100%;
        border-radius: var(--radius-sm);
        border: 1px solid var(--border-subtle);
        background: var(--bg-input);
        color: var(--text-primary);
        padding: 9px 12px;
        transition: border-color 0.15s;
      }
      .field input:focus, .field select:focus, .field textarea:focus {
        border-color: var(--accent);
        outline: none;
      }
      .field textarea {
        min-height: 80px;
        resize: vertical;
      }
      .field-hint {
        font-size: 0.78rem;
        color: var(--text-tertiary);
        line-height: 1.4;
      }
      .field-error {
        font-size: 0.78rem;
        color: var(--danger);
      }

      /* ---- Summary cards ---- */
      .summary-grid {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      }
      .summary-card {
        border-radius: var(--radius-md);
        border: 1px solid var(--border-subtle);
        background: var(--bg-elevated);
        padding: 14px;
      }
      .summary-label {
        font-size: 0.82rem;
        color: var(--text-secondary);
        font-weight: 500;
      }
      .summary-value {
        display: block;
        margin-top: 4px;
        font-size: 1.6rem;
        font-weight: 700;
        letter-spacing: -0.02em;
      }
      .summary-sublabel {
        display: block;
        margin-top: 4px;
        font-size: 0.72rem;
        color: var(--text-tertiary);
        line-height: 1.3;
      }

      /* ---- Data rows ---- */
      .data-row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 12px;
        padding: 8px 0;
        border-bottom: 1px solid var(--border-subtle);
      }
      .data-row:last-child { border-bottom: none; }
      .data-row-label {
        font-size: 0.82rem;
        color: var(--text-secondary);
        font-weight: 500;
        flex-shrink: 0;
      }
      .data-row-hint {
        display: block;
        font-size: 0.72rem;
        color: var(--text-tertiary);
        font-weight: 400;
        margin-top: 1px;
      }
      .data-row-value {
        text-align: right;
        font-size: 0.9rem;
        word-break: break-word;
      }

      /* ---- Lists ---- */
      .list, .stack { display: grid; gap: 8px; }

      .list-item {
        display: flex;
        align-items: center;
        gap: 12px;
        border-radius: var(--radius-md);
        border: 1px solid var(--border-subtle);
        background: var(--bg-elevated);
        padding: 12px 14px;
        cursor: pointer;
        transition: border-color 0.15s, background 0.15s;
        text-align: left;
        width: 100%;
      }
      .list-item:hover {
        border-color: var(--border-hover);
        background: rgba(30, 41, 59, 0.8);
      }
      .list-item.selected {
        border-color: var(--accent);
        box-shadow: 0 0 0 1px var(--accent-dim);
      }
      .list-item-body { flex: 1; min-width: 0; }
      .list-item-body strong {
        display: block;
        font-size: 0.92rem;
        font-weight: 600;
      }
      .list-item-body small {
        display: block;
        margin-top: 2px;
        font-size: 0.78rem;
        color: var(--text-secondary);
      }

      /* ---- Avatar ---- */
      .avatar {
        width: 36px; height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.78rem;
        font-weight: 700;
        color: #fff;
        flex-shrink: 0;
        letter-spacing: 0.02em;
      }

      /* ---- Badge ---- */
      .badge {
        display: inline-flex;
        align-items: center;
        padding: 2px 8px;
        border-radius: var(--radius-pill);
        font-size: 0.72rem;
        font-weight: 600;
        letter-spacing: 0.02em;
        text-transform: uppercase;
        white-space: nowrap;
      }
      .badge.kind      { background: rgba(99,102,241,0.2); color: #a5b4fc; }
      .badge.rank      { background: rgba(234,179,8,0.2);  color: #fde047; }
      .badge.state     { background: rgba(148,163,184,0.15); color: var(--text-secondary); }
      .badge.moment    { background: rgba(168,85,247,0.2); color: #c084fc; }
      .badge.success   { background: rgba(34,197,94,0.18); color: #86efac; }
      .badge.danger    { background: rgba(239,68,68,0.18); color: #fca5a5; }
      .badge.warning   { background: rgba(245,158,11,0.18); color: #fcd34d; }
      .badge.info      { background: var(--accent-dim);     color: #93c5fd; }

      /* ---- Progress bar ---- */
      .progress-bar {
        height: 6px;
        border-radius: 3px;
        background: var(--border-subtle);
        overflow: hidden;
      }
      .progress-bar-fill {
        height: 100%;
        border-radius: 3px;
        background: var(--accent);
        transition: width 0.4s ease;
      }

      /* ---- Significance dots ---- */
      .sig-dots {
        display: inline-flex;
        gap: 3px;
        align-items: center;
      }
      .sig-dot {
        width: 7px; height: 7px;
        border-radius: 50%;
        background: var(--border-subtle);
      }
      .sig-dot.filled { background: var(--accent); }

      /* ---- Drift indicator ---- */
      .drift-dot {
        width: 9px; height: 9px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .drift-dot.green  { background: var(--success); }
      .drift-dot.amber  { background: var(--warning); }
      .drift-dot.red    { background: var(--danger); }

      /* ---- Timeline ---- */
      .timeline { display: grid; gap: 0; }
      .timeline-item {
        display: grid;
        grid-template-columns: 24px 1fr;
        gap: 12px;
        padding: 12px 0;
      }
      .timeline-pipe {
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .timeline-dot {
        width: 10px; height: 10px;
        border-radius: 50%;
        background: var(--accent);
        border: 2px solid var(--bg-base);
        flex-shrink: 0;
        margin-top: 4px;
      }
      .timeline-line {
        width: 2px;
        flex: 1;
        background: var(--border-subtle);
        margin-top: 4px;
      }
      .timeline-content {
        padding-bottom: 4px;
      }
      .timeline-content strong {
        display: block;
        font-size: 0.9rem;
        font-weight: 600;
      }
      .timeline-content small {
        display: block;
        margin-top: 3px;
        font-size: 0.78rem;
        color: var(--text-secondary);
      }
      .timeline-meta {
        display: flex;
        gap: 8px;
        align-items: center;
        margin-top: 6px;
      }

      /* ---- Tabs ---- */
      .tab-bar {
        display: flex;
        gap: 2px;
        border-radius: var(--radius-sm);
        background: rgba(15,23,42,0.5);
        padding: 3px;
        margin-bottom: 14px;
      }
      .tab-btn {
        flex: 1;
        padding: 8px 12px;
        border: none;
        border-radius: 6px;
        background: transparent;
        color: var(--text-secondary);
        font-size: 0.82rem;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.15s, color 0.15s;
      }
      .tab-btn:hover { color: var(--text-primary); }
      .tab-btn.active {
        background: var(--accent-dim);
        color: var(--text-primary);
      }

      /* ---- Explainer ---- */
      details.explainer {
        margin-top: 14px;
        border: 1px dashed var(--border-hover);
        border-radius: var(--radius-sm);
        padding: 0;
      }
      details.explainer summary {
        padding: 10px 14px;
        cursor: pointer;
        font-size: 0.82rem;
        font-weight: 600;
        color: var(--text-secondary);
        list-style: none;
      }
      details.explainer summary::-webkit-details-marker { display: none; }
      details.explainer summary::before {
        content: "? ";
        opacity: 0.5;
      }
      details.explainer[open] summary {
        border-bottom: 1px dashed var(--border-subtle);
        color: var(--text-primary);
      }
      details.explainer .explainer-body {
        padding: 12px 14px;
        font-size: 0.82rem;
        color: var(--text-secondary);
        line-height: 1.6;
      }

      /* ---- Bond quote ---- */
      .bond-quote {
        margin: 0;
        padding: 8px 14px;
        border-left: 3px solid var(--accent);
        font-style: italic;
        color: var(--text-secondary);
        background: var(--accent-dim);
        border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
      }

      /* ---- Empty state ---- */
      .empty-state {
        border-radius: var(--radius-md);
        border: 1px dashed var(--border-hover);
        padding: 20px;
        color: var(--text-secondary);
        text-align: center;
        font-size: 0.88rem;
        line-height: 1.5;
      }
      .empty-state .button { margin-top: 10px; }

      /* ---- Toast ---- */
      .toast-stack {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 200;
        display: flex;
        flex-direction: column-reverse;
        gap: 8px;
        max-width: 380px;
        pointer-events: none;
      }
      .toast {
        pointer-events: auto;
        padding: 12px 16px;
        border-radius: var(--radius-sm);
        border-left: 4px solid var(--text-tertiary);
        background: rgba(15, 23, 42, 0.95);
        backdrop-filter: blur(10px);
        box-shadow: 0 8px 30px rgba(0,0,0,0.4);
        font-size: 0.84rem;
        line-height: 1.45;
        animation: toastSlideIn 0.25s ease-out;
      }
      .toast.ok   { border-left-color: var(--success); }
      .toast.fail { border-left-color: var(--danger); }
      .toast.warn { border-left-color: var(--warning); }
      .toast-title {
        font-weight: 600;
        margin-bottom: 2px;
      }
      .toast-body {
        color: var(--text-secondary);
        font-size: 0.8rem;
      }

      /* ---- Tables ---- */
      .table-wrap { overflow-x: auto; }
      table { width: 100%; border-collapse: collapse; }
      th, td {
        text-align: left;
        padding: 9px 10px;
        border-bottom: 1px solid var(--border-subtle);
        vertical-align: top;
        font-size: 0.88rem;
      }
      th {
        color: var(--text-secondary);
        font-weight: 600;
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      /* ---- Code block ---- */
      .code-block {
        margin: 0;
        overflow: auto;
        border-radius: var(--radius-sm);
        padding: 12px 14px;
        background: rgba(2, 6, 23, 0.8);
        border: 1px solid var(--border-subtle);
        font-size: 0.78rem;
        line-height: 1.5;
        font-family: ui-monospace, "SF Mono", "Cascadia Code", Menlo, monospace;
      }

      /* ---- Status pill (sidebar) ---- */
      .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border-radius: var(--radius-pill);
        padding: 4px 10px;
        background: var(--bg-elevated);
        font-size: 0.78rem;
        color: var(--text-secondary);
      }

      /* ---- Muted text ---- */
      .muted { color: var(--text-secondary); }
      .muted-sm { color: var(--text-tertiary); font-size: 0.82rem; }

      /* ---- Animations ---- */
      @keyframes fadeSlideIn {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes toastSlideIn {
        from { opacity: 0; transform: translateX(30px); }
        to   { opacity: 1; transform: translateX(0); }
      }

      /* ---- Utilities ---- */
      .gap-sm  { gap: 6px; }
      .gap-md  { gap: 12px; }
      .mt-sm   { margin-top: 8px; }
      .mt-md   { margin-top: 14px; }
      .mb-md   { margin-bottom: 14px; }
      .flex-row { display: flex; align-items: center; gap: 8px; }
      .flex-col { display: flex; flex-direction: column; }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="./app.js"></script>
  </body>
</html>
`;

  await writeFile(path.join(outDir, "index.html"), html);
}

async function buildDemo() {
  await ensureOutputFolder();
  await writeHtmlShell();

  if (watchMode) {
    const buildContext = await context(buildOptions);
    await buildContext.watch();
    console.log("Watching demo sources. Output available in ./demo");
    return;
  }

  await build(buildOptions);
}

await buildDemo();
