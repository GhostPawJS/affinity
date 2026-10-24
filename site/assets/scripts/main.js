// Replays a recorded run of @ghostpaw/affinity 0.3.0 (2026-10-24, fixed clock). Without this script every step and result stays visible.
const STATES = [{"rows": [{"k": "Jun", "v": "0.347 · drifting", "w": 0.8674999999999999, "t": "violet"}, {"k": "Ada", "v": "0.124 · routine", "w": 0.31}, {"k": "Ren", "v": "0.000 · routine", "w": 0}, {"k": "Open promises", "v": "none"}, {"k": "Next 60 days", "v": "nothing"}], "foot": "read.listRadar(db), highest drift first"}, {"rows": [{"k": "Ada", "v": "0.124 · routine", "w": 0.31}, {"k": "Ren", "v": "0.000 · routine", "w": 0}, {"k": "Jun", "v": "0.000 · seen today", "w": 0, "t": "cyan"}, {"k": "Open promises", "v": "none"}, {"k": "Next 60 days", "v": "nothing"}], "foot": "Jun's cadence is now 17 days instead of 14."}, {"rows": [{"k": "Ada", "v": "0.124 · routine", "w": 0.31}, {"k": "Ren", "v": "0.000 · routine", "w": 0}, {"k": "Jun", "v": "0.000 · seen today", "w": 0, "t": "cyan"}, {"k": "Open promises", "v": "1 · notes for Ren", "t": "violet"}, {"k": "Next 60 days", "v": "nothing"}], "foot": "Ren's trust: 0.713 before the promise, 0.669 after."}, {"rows": [{"k": "Ada", "v": "0.124 · routine", "w": 0.31}, {"k": "Ren", "v": "0.000 · routine", "w": 0}, {"k": "Jun", "v": "0.000 · seen today", "w": 0, "t": "cyan"}, {"k": "Open promises", "v": "1 · notes for Ren", "t": "alarm"}, {"k": "Next 60 days", "v": "nothing"}], "foot": "Refused. The promise is still open."}, {"rows": [{"k": "Ada", "v": "0.124 · routine", "w": 0.31}, {"k": "Ren", "v": "0.000 · routine", "w": 0}, {"k": "Jun", "v": "0.000 · seen today", "w": 0, "t": "cyan"}, {"k": "Open promises", "v": "none · kept", "t": "ward"}, {"k": "Next 60 days", "v": "nothing"}], "foot": "Ren's trust stays at 0.669."}, {"rows": [{"k": "Ada", "v": "0.124 · routine", "w": 0.31}, {"k": "Ren", "v": "0.000 · routine", "w": 0}, {"k": "Jun", "v": "0.000 · seen today", "w": 0, "t": "cyan"}, {"k": "Open promises", "v": "none · kept", "t": "ward"}, {"k": "Next 60 days", "v": "Jun's birthday, 12 Nov", "t": "cyan"}], "foot": "read.listUpcomingDates(db, { horizonDays: 60 })"}];
(() => {
  const list = document.getElementById("state-list");
  const foot = document.getElementById("state-foot");
  const steps = Array.from(document.querySelectorAll(".step"));
  const reset = document.getElementById("reset");
  const status = document.getElementById("run-status");
  if (!list || !steps.length) return;
  const motion = !matchMedia("(prefers-reduced-motion: reduce)").matches;
  let at = 0;

  function paint(i) {
    const s = STATES[i];
    list.textContent = "";
    for (const r of s.rows) {
      const li = document.createElement("li");
      if (r.t) li.className = "t-" + r.t;
      const k = document.createElement("span"); k.className = "k"; k.textContent = r.k;
      const v = document.createElement("span"); v.className = "v"; v.textContent = r.v;
      li.append(k, v);
      if (r.w != null) {
        const bar = document.createElement("span"); bar.className = "bar";
        const fill = document.createElement("i");
        bar.append(fill); li.append(bar);
        const w = Math.max(0, Math.min(1, r.w)) * 100 + "%";
        const from = list.dataset.prev && JSON.parse(list.dataset.prev)[r.k];
        fill.style.width = motion && from != null ? from : w;
        if (motion && from != null) requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.width = w; }));
      }
      list.append(li);
    }
    const prev = {};
    for (const r of s.rows) if (r.w != null) prev[r.k] = Math.max(0, Math.min(1, r.w)) * 100 + "%";
    list.dataset.prev = JSON.stringify(prev);
    if (foot) foot.textContent = s.foot || "";
  }

  function mark() {
    steps.forEach((el, i) => {
      el.classList.toggle("done", i < at);
      el.classList.toggle("next", i === at);
    });
    if (status) status.textContent = at < steps.length ? "Step " + (at + 1) + " of " + steps.length + " is next." : "All " + steps.length + " steps replayed.";
  }

  steps.forEach((el, i) => {
    const btn = el.querySelector(".run-btn");
    btn.addEventListener("click", () => {
      if (i !== at) return;
      at = i + 1;
      paint(at);
      mark();
      if (el.classList.contains("refused") && motion) {
        el.classList.add("flash");
        el.addEventListener("animationend", () => el.classList.remove("flash"), { once: true });
      }
      const next = steps[at] && steps[at].querySelector(".run-btn");
      const res = el.querySelector(".result");
      if (res) { res.setAttribute("tabindex", "-1"); res.focus({ preventScroll: true }); }
      if (next) next.setAttribute("aria-describedby", "run-status");
    });
  });
  if (reset) reset.addEventListener("click", () => { at = 0; list.dataset.prev = ""; paint(0); mark(); steps[0].querySelector(".run-btn").focus(); });
  paint(0);
  mark();

  document.querySelectorAll(".copy").forEach((b) => {
    b.addEventListener("click", async () => {
      const input = document.getElementById(b.dataset.copy);
      try { await navigator.clipboard.writeText(input.value); } catch { input.select(); document.execCommand("copy"); }
      const label = b.textContent;
      b.textContent = "Copied";
      setTimeout(() => { b.textContent = label; }, 1400);
    });
  });
})();
