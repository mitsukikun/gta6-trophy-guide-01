// Leonida Trophy Guide — checklist tracker (localStorage), filters, spoiler
// setting, export/import, roadmap. Static, offline: the only fetch is the
// guide's own data/trophies.json; source links open only when followed.
const KEY = 'gta6-trophy-guide-v1';

const els = {
  list: document.getElementById('trophyList'),
  progressText: document.getElementById('progressText'),
  progressPct: document.getElementById('progressPct'),
  progressFill: document.getElementById('progressFill'),
  progressSub: document.getElementById('progressSub'),
  roadmapList: document.getElementById('roadmapList'),
  search: document.getElementById('search'),
  grade: document.getElementById('grade'),
  spoiler: document.getElementById('spoiler'),
  chips: document.getElementById('kindChips'),
  filterCount: document.getElementById('filterCount'),
  emptyState: document.getElementById('emptyState'),
  exportBtn: document.getElementById('export'),
  importInput: document.getElementById('import'),
  resetBtn: document.getElementById('reset'),
};

const KIND_LABELS = {
  all: 'All trophies',
  story: 'Story',
  missable: 'Missable',
  collectibles: 'Collectibles',
  activities: 'Activities',
  side: 'Side & strangers',
  robbery: 'Robberies',
  money: 'Money',
  world: 'World & exploration',
  misc: 'Moments & secrets',
  online: 'Online',
};
const KIND_ORDER = ['all', 'story', 'missable', 'collectibles', 'activities', 'side', 'robbery', 'money', 'world', 'misc', 'online'];

let doc = null;
let state = loadState();
let activeKind = 'all';

function loadState() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (raw && typeof raw === 'object') {
      return {
        earned: new Set(Array.isArray(raw.earned) ? raw.earned : []),
        counts: raw.counts && typeof raw.counts === 'object' ? raw.counts : {},
        spoiler: raw.spoiler !== false,
      };
    }
  } catch { /* corrupted state starts fresh */ }
  return { earned: new Set(), counts: {}, spoiler: true };
}

function saveState() {
  localStorage.setItem(KEY, JSON.stringify({
    earned: [...state.earned],
    counts: state.counts,
    spoiler: state.spoiler,
  }));
}

function gradeCounts() {
  const c = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const t of doc.trophies) if (state.earned.has(t.id)) c[t.grade]++;
  return c;
}

function renderProgress() {
  const total = doc.trophies.length;
  const n = state.earned.size;
  const pct = Math.round((n / total) * 100);
  els.progressText.textContent = `${n} of ${total} earned`;
  els.progressPct.textContent = `${pct}%`;
  els.progressFill.style.width = `${pct}%`;
  const g = gradeCounts();
  els.progressSub.textContent =
    `Platinum ${g.platinum}/1 · Gold ${g.gold}/2 · Silver ${g.silver}/6 · Bronze ${g.bronze}/46 · 28 hidden until earned`;
}

function renderRoadmap() {
  els.roadmapList.replaceChildren();
  for (const stage of doc.roadmap) {
    const li = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = `Stage ${stage.stage}: ${stage.title}`;
    li.append(strong, document.createTextNode(` — ${stage.text}`));
    const names = stage.trophy_ids.map((id) => {
      const t = doc.trophies.find((x) => x.id === id);
      return t ? t.name : `#${id}`;
    });
    const span = document.createElement('span');
    span.className = 'stage-trophies';
    span.textContent = `Trophies: ${names.join(' · ')}`;
    li.append(span);
    els.roadmapList.append(li);
  }
}

function spoilerHidden(t) {
  return state.spoiler && t.hidden && !state.earned.has(t.id);
}

function trophyMatches(t) {
  if (els.grade.value !== 'all' && t.grade !== els.grade.value) return false;
  if (activeKind === 'missable' && !t.missable) return false;
  if (activeKind === 'online') return false; // no online trophies in this list
  if (activeKind !== 'all' && activeKind !== 'missable' && t.kind !== activeKind) return false;
  const q = els.search.value.trim().toLowerCase();
  if (q) {
    const hay = `${t.name} ${t.description} ${t.guide} ${t.chapter ?? ''} ${t.target_label ?? ''}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function sourceLinks(sources) {
  const p = document.createElement('p');
  p.className = 'src';
  p.append(document.createTextNode('Sources: '));
  sources.forEach((s, i) => {
    if (i) p.append(document.createTextNode(' · '));
    const a = document.createElement('a');
    a.href = s.url;
    a.textContent = s.name;
    a.target = '_blank';
    a.rel = 'noopener';
    p.append(a);
  });
  return p;
}

function trophyCard(t) {
  const card = document.createElement('article');
  card.className = 'trophy' + (state.earned.has(t.id) ? ' earned' : '');
  card.id = `trophy-${t.id}`;
  card.dataset.trophyId = String(t.id);

  const head = document.createElement('div');
  head.className = 'trophy-head';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = state.earned.has(t.id);
  box.setAttribute('aria-label', `Mark ${t.name} as earned`);
  box.addEventListener('change', () => {
    if (box.checked) state.earned.add(t.id);
    else state.earned.delete(t.id);
    saveState();
    render();
  });
  const title = document.createElement('div');
  title.className = 'trophy-title';
  const h3 = document.createElement('h3');
  if (spoilerHidden(t)) {
    const span = document.createElement('span');
    span.className = 'spoiler-hidden';
    span.textContent = 'Hidden trophy — earn it to reveal its name';
    h3.append(span);
  } else {
    h3.textContent = t.name;
  }
  const off = document.createElement('p');
  off.className = 'official';
  const lbl = document.createElement('span');
  lbl.className = 'lbl';
  lbl.textContent = 'Official: ';
  off.append(lbl);
  off.append(document.createTextNode(
    spoilerHidden(t) ? 'Hidden on PlayStation until earned.' : t.description));
  title.append(h3, off);
  const grade = document.createElement('span');
  grade.className = `grade ${t.grade}`;
  grade.textContent = t.grade;
  head.append(box, title, grade);
  card.append(head);

  const tags = document.createElement('div');
  tags.className = 'tags';
  const kindTag = document.createElement('span');
  kindTag.className = 'tag';
  kindTag.textContent = KIND_LABELS[t.kind] ?? t.kind;
  tags.append(kindTag);
  if (t.hidden) {
    const s = document.createElement('span');
    s.className = 'tag hidden';
    s.textContent = 'Hidden on PSN';
    tags.append(s);
  }
  if (t.missable) {
    const s = document.createElement('span');
    s.className = 'tag missable';
    s.textContent = '⚠ Missable';
    tags.append(s);
  }
  if (t.chapter) {
    const s = document.createElement('span');
    s.className = 'tag';
    s.textContent = t.chapter;
    tags.append(s);
  }
  card.append(tags);

  if (t.target) {
    const cur = Math.min(Number(state.counts[t.id] ?? 0), t.target);
    const counter = document.createElement('div');
    counter.className = 'counter';
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.max = String(t.target);
    input.value = String(cur);
    input.setAttribute('aria-label', `Progress toward ${t.target_label}`);
    const bar = document.createElement('div');
    bar.className = 'bar';
    const fill = document.createElement('div');
    fill.style.width = `${Math.round((cur / t.target) * 100)}%`;
    bar.append(fill);
    const label = document.createElement('span');
    label.textContent = `${cur} / ${t.target} — ${t.target_label}`;
    input.addEventListener('change', () => {
      const v = Math.max(0, Math.min(t.target, Number(input.value) || 0));
      state.counts[t.id] = v;
      if (v >= t.target) state.earned.add(t.id);
      saveState();
      render();
    });
    counter.append(input, bar, label);
    card.append(counter);
  }

  if (!spoilerHidden(t)) {
    const details = document.createElement('details');
    details.className = 'guide';
    if (location.hash === `#trophy-${t.id}`) details.open = true;
    const summary = document.createElement('summary');
    summary.textContent = 'Guide — how to earn it';
    details.append(summary);
    const p = document.createElement('p');
    p.textContent = t.guide;
    details.append(p);
    if (t.missable_note) {
      const note = document.createElement('p');
      note.className = 'missable-note';
      note.textContent = t.missable_note;
      details.append(note);
    }
    details.append(sourceLinks(t.sources));
    card.append(details);
  } else {
    const p = document.createElement('p');
    p.className = 'guide muted';
    p.textContent = 'Guide hidden with the spoiler setting. Earn this trophy (or switch spoilers off) to read its guide and sources.';
    card.append(p);
  }
  return card;
}

function renderChips() {
  els.chips.replaceChildren();
  for (const kind of KIND_ORDER) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = KIND_LABELS[kind];
    b.setAttribute('aria-pressed', String(activeKind === kind));
    b.addEventListener('click', () => { activeKind = kind; render(); });
    els.chips.append(b);
  }
}

function render() {
  renderProgress();
  renderChips();
  els.list.replaceChildren();
  const shown = doc.trophies.filter(trophyMatches);
  for (const t of shown) els.list.append(trophyCard(t));
  els.emptyState.hidden = shown.length !== 0;
  els.filterCount.textContent =
    activeKind === 'online'
      ? 'Online: 0 trophies — this list has no online trophies.'
      : `Showing ${shown.length} of ${doc.trophies.length} trophies`;
}

function exportProgress() {
  const payload = {
    game: 'Grand Theft Auto VI',
    exportedAt: new Date().toISOString(),
    earned: [...state.earned].sort((a, b) => a - b),
    counts: state.counts,
    spoiler: state.spoiler,
  };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

async function importProgress(file) {
  const raw = JSON.parse(await file.text());
  const ids = new Set((raw.earned ?? []).map(Number).filter((n) => Number.isInteger(n)));
  state.earned = new Set([...ids].filter((id) => doc.trophies.some((t) => t.id === id)));
  state.counts = {};
  if (raw.counts && typeof raw.counts === 'object') {
    for (const [k, v] of Object.entries(raw.counts)) {
      const id = Number(k);
      if (doc.trophies.some((t) => t.id === id)) state.counts[id] = Math.max(0, Number(v) || 0);
    }
  }
  if (typeof raw.spoiler === 'boolean') state.spoiler = raw.spoiler;
  els.spoiler.checked = state.spoiler;
  saveState();
  render();
}

const res = await fetch('data/trophies.json');
doc = await res.json();
els.spoiler.checked = state.spoiler;

renderRoadmap();
render();

els.search.addEventListener('input', render);
els.grade.addEventListener('change', render);
els.spoiler.addEventListener('change', () => { state.spoiler = els.spoiler.checked; saveState(); render(); });
els.exportBtn.addEventListener('click', exportProgress);
els.importInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try { await importProgress(file); } catch { alert('That file is not a trophy-progress export from this guide.'); }
  e.target.value = '';
});
els.resetBtn.addEventListener('click', () => {
  if (!confirm('Clear all earned trophies and counters?')) return;
  state.earned = new Set();
  state.counts = {};
  saveState();
  render();
});

// Deep link: #trophy-<id> opens that trophy's guide and scrolls to it.
if (/^#trophy-\d+$/.test(location.hash)) {
  const el = document.getElementById(location.hash.slice(1));
  if (el) el.scrollIntoView({ block: 'start' });
}
if (location.hash === '#roadmap') {
  document.getElementById('roadmap').scrollIntoView({ block: 'start' });
}
window.__shotReady = true;
