// GTA VI trophy tracker — plain ES module, no build step, no external requests.
// State lives in localStorage under one key; the trophy data is fetched from
// data/trophies.json on the same origin.

const STORE_KEY = "gta6-trophy-tracker-v1";
const DATA_URL = "data/trophies.json";

const listEl = document.getElementById("trophyList");
const roadmapEl = document.getElementById("roadmapList");
const notesEl = document.getElementById("notesList");
const searchEl = document.getElementById("searchBox");
const gradeEl = document.getElementById("gradeFilter");
const kindEl = document.getElementById("kindFilter");
const hiddenEl = document.getElementById("hiddenFilter");
const statusEl = document.getElementById("statusFilter");
const spoilerEl = document.getElementById("spoilerToggle");
const countEl = document.getElementById("progressCount");
const pctEl = document.getElementById("progressPct");
const fillEl = document.getElementById("progressFill");
const resultEl = document.getElementById("resultCount");

let catalogue = [];
let meta = null;
let earned = new Set();
let spoilersShown = false;

function loadStored() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((n) => Number.isInteger(n)));
  } catch {
    return new Set();
  }
}

function saveStored() {
  localStorage.setItem(STORE_KEY, JSON.stringify([...earned].sort((a, b) => a - b)));
}

function gradeLabel(t) {
  return t.grade.charAt(0).toUpperCase() + t.grade.slice(1);
}

function isHiddenSpoiler(t) {
  return t.hidden && !spoilersShown;
}

function renderProgress() {
  const total = catalogue.length || 55;
  const done = catalogue.filter((t) => earned.has(t.id)).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  countEl.textContent = `${done} / ${total}`;
  pctEl.textContent = `${pct}%`;
  fillEl.style.width = `${pct}%`;
}

function trophyMatches(t) {
  const q = searchEl.value.trim().toLowerCase();
  if (q) {
    const hay = `${t.name} ${t.description} ${t.guide || ""}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (gradeEl.value && t.grade !== gradeEl.value) return false;
  if (kindEl.value && t.kind !== kindEl.value) return false;
  if (hiddenEl.value === "hidden" && !t.hidden) return false;
  if (hiddenEl.value === "shown" && t.hidden) return false;
  if (statusEl.value === "checked" && !earned.has(t.id)) return false;
  if (statusEl.value === "unchecked" && earned.has(t.id)) return false;
  return true;
}

function buildCard(t) {
  const li = document.createElement("li");
  li.className = "trophy-card" + (earned.has(t.id) ? " earned" : "");
  li.id = `trophy-${t.id}`;

  const head = document.createElement("div");
  head.className = "trophy-head";

  const name = document.createElement("h3");
  name.className = "trophy-name";
  name.textContent = isHiddenSpoiler(t) ? "Hidden trophy" : t.name;
  head.appendChild(name);

  const num = document.createElement("span");
  num.className = "trophy-id";
  num.textContent = `#${t.id}`;
  head.appendChild(num);

  const badge = document.createElement("span");
  badge.className = `badge ${t.grade}`;
  badge.textContent = gradeLabel(t);
  head.appendChild(badge);

  const kind = document.createElement("span");
  kind.className = "kind-tag";
  kind.textContent = t.kind;
  head.appendChild(kind);

  if (t.missable) {
    const flag = document.createElement("span");
    flag.className = "missable-flag";
    flag.textContent = "Possibly missable";
    head.appendChild(flag);
  }
  li.appendChild(head);

  if (isHiddenSpoiler(t)) {
    const note = document.createElement("p");
    note.className = "spoiler-note";
    note.textContent = "Hidden trophy — turn on “Show spoilers” to reveal it.";
    li.appendChild(note);
  } else {
    const desc = document.createElement("p");
    desc.className = "trophy-desc";
    desc.textContent = t.description;
    li.appendChild(desc);
    if (t.chapter) {
      const chap = document.createElement("p");
      chap.className = "trophy-chapter";
      chap.textContent = t.chapter;
      li.appendChild(chap);
    }
  }

  const actions = document.createElement("div");
  actions.className = "trophy-actions";

  const check = document.createElement("button");
  check.type = "button";
  check.className = "check-btn";
  check.setAttribute("aria-pressed", earned.has(t.id) ? "true" : "false");
  check.textContent = earned.has(t.id) ? "✓ Earned" : "Mark earned";
  check.addEventListener("click", () => {
    if (earned.has(t.id)) earned.delete(t.id);
    else earned.add(t.id);
    saveStored();
    renderList();
  });
  actions.appendChild(check);

  const guideBtn = document.createElement("button");
  guideBtn.type = "button";
  guideBtn.className = "guide-btn";
  guideBtn.textContent = "Read guide";
  guideBtn.setAttribute("aria-expanded", "false");
  actions.appendChild(guideBtn);

  const guide = document.createElement("p");
  guide.className = "guide-text";
  guide.hidden = true;
  guide.textContent = t.guide || "No guide written for this trophy yet.";
  guideBtn.addEventListener("click", () => {
    const open = guide.hidden;
    guide.hidden = !open;
    guideBtn.setAttribute("aria-expanded", String(open));
    guideBtn.textContent = open ? "Hide guide" : "Read guide";
  });

  li.appendChild(actions);
  li.appendChild(guide);

  if (Array.isArray(t.sources) && t.sources.length) {
    const src = document.createElement("p");
    src.className = "guide-sources";
    src.textContent = "Sources: ";
    t.sources.forEach((s, i) => {
      if (i > 0) src.appendChild(document.createTextNode(" · "));
      const a = document.createElement("a");
      a.href = s.url;
      a.textContent = s.label;
      a.target = "_blank";
      a.rel = "noopener";
      src.appendChild(a);
    });
    li.appendChild(src);
  }

  return li;
}

function renderList() {
  listEl.innerHTML = "";
  const shown = catalogue.filter(trophyMatches);
  for (const t of shown) listEl.appendChild(buildCard(t));
  resultEl.textContent =
    shown.length === catalogue.length
      ? `Showing all ${catalogue.length} trophies.`
      : `Showing ${shown.length} of ${catalogue.length} trophies.`;
  renderProgress();
}

function renderRoadmap() {
  roadmapEl.innerHTML = "";
  if (!meta || !Array.isArray(meta.roadmap)) return;
  for (const stage of meta.roadmap) {
    const li = document.createElement("li");
    li.className = "roadmap-stage";
    const h = document.createElement("h3");
    const num = document.createElement("span");
    num.className = "stage-num";
    num.textContent = `Stage ${stage.stage}`;
    h.appendChild(num);
    h.appendChild(document.createTextNode(stage.title));
    li.appendChild(h);
    const p = document.createElement("p");
    p.textContent = stage.text;
    li.appendChild(p);
    if (Array.isArray(stage.trophy_ids) && stage.trophy_ids.length) {
      const links = document.createElement("p");
      links.className = "stage-trophies";
      links.textContent = "Trophies: ";
      stage.trophy_ids.forEach((id, i) => {
        if (i > 0) links.appendChild(document.createTextNode(", "));
        const a = document.createElement("a");
        a.href = `#trophy-${id}`;
        a.textContent = `#${id}`;
        links.appendChild(a);
      });
      li.appendChild(links);
    }
    roadmapEl.appendChild(li);
  }
}

function renderNotes() {
  notesEl.innerHTML = "";
  if (!meta || !meta.notes) return;
  const order = ["cheats", "missable", "online", "time", "sources_note"];
  for (const key of order) {
    if (!meta.notes[key]) continue;
    const li = document.createElement("li");
    li.textContent = meta.notes[key];
    notesEl.appendChild(li);
  }
}

function applySetupParam() {
  const params = new URLSearchParams(window.location.search);
  const setup = params.get("setup");
  if (!setup) return;
  if (setup === "checkSome") {
    for (const t of catalogue.slice(0, 5)) earned.add(t.id);
    saveStored();
  } else if (setup === "spoilersOn") {
    spoilersShown = true;
    spoilerEl.checked = true;
  } else if (setup === "spoilersOff") {
    spoilersShown = false;
    spoilerEl.checked = false;
  }
}

function jumpToHash() {
  const hash = window.location.hash;
  if (!hash) return;
  const target = document.querySelector(hash);
  if (target) {
    target.classList.add("flash");
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => target.classList.remove("flash"), 2500);
  }
}

function exportState() {
  const payload = {
    game: "Grand Theft Auto VI",
    exported_at: new Date().toISOString(),
    earned: [...earned].sort((a, b) => a - b),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "gta6-trophies-checked.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importState(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const ids = Array.isArray(parsed) ? parsed : parsed.earned;
      if (!Array.isArray(ids)) throw new Error("expected an array or {earned: [...]}");
      const valid = new Set(catalogue.map((t) => t.id));
      earned = new Set(ids.filter((n) => Number.isInteger(n) && valid.has(n)));
      saveStored();
      renderList();
    } catch (err) {
      window.alert(`Could not import that file: ${err.message}`);
    }
  };
  reader.readAsText(file);
}

async function init() {
  earned = loadStored();
  const res = await fetch(DATA_URL);
  if (!res.ok) throw new Error(`Failed to load ${DATA_URL}: ${res.status}`);
  meta = await res.json();
  catalogue = meta.trophies || [];

  applySetupParam();
  renderRoadmap();
  renderNotes();
  renderList();

  searchEl.addEventListener("input", renderList);
  gradeEl.addEventListener("change", renderList);
  kindEl.addEventListener("change", renderList);
  hiddenEl.addEventListener("change", renderList);
  statusEl.addEventListener("change", renderList);
  spoilerEl.addEventListener("change", () => {
    spoilersShown = spoilerEl.checked;
    renderList();
  });
  document.getElementById("exportBtn").addEventListener("click", exportState);
  document.getElementById("importFile").addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) importState(file);
    e.target.value = "";
  });
  document.getElementById("resetBtn").addEventListener("click", () => {
    if (window.confirm("Clear all checked trophies?")) {
      earned = new Set();
      saveStored();
      renderList();
    }
  });

  jumpToHash();
}

init().catch((err) => {
  listEl.innerHTML = "";
  const li = document.createElement("li");
  li.className = "trophy-card";
  li.textContent = `Could not load the trophy list: ${err.message}`;
  listEl.appendChild(li);
});
