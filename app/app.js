// Leonida Trophy Guide — interactive checklist.
// Saved progress lives in localStorage; the page itself fetches only its own
// data/trophies.json and loads nothing else over the network. Source links
// are plain anchors that open only when the reader follows them.
const STORE_KEY = 'gta6-trophy-guide-v1';

const $ = (id) => document.getElementById(id);
const ui = {
  list: $('trophyList'),
  progressText: $('progressText'),
  progressPct: $('progressPct'),
  progressFill: $('progressFill'),
  progressSub: $('progressSub'),
  roadmapList: $('roadmapList'),
  search: $('search'),
  grade: $('grade'),
  spoiler: $('spoiler'),
  chips: $('kindChips'),
  filterCount: $('filterCount'),
  emptyState: $('emptyState'),
  exportBtn: $('export'),
  importInput: $('import'),
  resetBtn: $('reset'),
};

const KIND_NAMES = {
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
const KIND_SEQUENCE = ['all', 'story', 'missable', 'collectibles', 'activities', 'side', 'robbery', 'money', 'world', 'misc', 'online'];

let guide = null;
let pickedKind = 'all';
let progress = readProgress();

function readProgress() {
  const fallback = { earned: new Set(), counts: {}, spoiler: true };
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null');
    if (!parsed || typeof parsed !== 'object') return fallback;
    return {
      earned: new Set(Array.isArray(parsed.earned) ? parsed.earned : []),
      counts: parsed.counts && typeof parsed.counts === 'object' ? parsed.counts : {},
      spoiler: parsed.spoiler !== false,
    };
  } catch {
    return fallback; // a damaged save starts over rather than breaking the page
  }
}

function writeProgress() {
  localStorage.setItem(STORE_KEY, JSON.stringify({
    earned: [...progress.earned],
    counts: progress.counts,
    spoiler: progress.spoiler,
  }));
}

function earnedByGrade() {
  const tally = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const trophy of guide.trophies) {
    if (progress.earned.has(trophy.id)) tally[trophy.grade]++;
  }
  return tally;
}

function paintProgress() {
  const total = guide.trophies.length;
  const done = progress.earned.size;
  const pct = Math.round((done / total) * 100);
  ui.progressText.textContent = `${done} of ${total} earned`;
  ui.progressPct.textContent = `${pct}%`;
  ui.progressFill.style.width = `${pct}%`;
  const g = earnedByGrade();
  ui.progressSub.textContent =
    `Platinum ${g.platinum}/1 · Gold ${g.gold}/2 · Silver ${g.silver}/6 · Bronze ${g.bronze}/46 · 28 hidden until earned`;
}

function paintRoadmap() {
  ui.roadmapList.replaceChildren();
  for (const stage of guide.roadmap) {
    const item = document.createElement('li');
    const heading = document.createElement('strong');
    heading.textContent = `Stage ${stage.stage}: ${stage.title}`;
    item.append(heading, document.createTextNode(` — ${stage.text}`));
    const names = stage.trophy_ids.map((id) => {
      const found = guide.trophies.find((t) => t.id === id);
      return found ? found.name : `#${id}`;
    });
    const line = document.createElement('span');
    line.className = 'stage-trophies';
    line.textContent = `Trophies: ${names.join(' · ')}`;
    item.append(line);
    ui.roadmapList.append(item);
  }
}

function isConcealed(trophy) {
  return progress.spoiler && trophy.hidden && !progress.earned.has(trophy.id);
}

function passesFilters(trophy) {
  if (ui.grade.value !== 'all' && trophy.grade !== ui.grade.value) return false;
  if (pickedKind === 'missable' && !trophy.missable) return false;
  if (pickedKind === 'online') return false; // the list has no online trophies
  if (pickedKind !== 'all' && pickedKind !== 'missable' && trophy.kind !== pickedKind) return false;
  const query = ui.search.value.trim().toLowerCase();
  if (query) {
    const haystack = `${trophy.name} ${trophy.description} ${trophy.guide} ${trophy.chapter ?? ''} ${trophy.target_label ?? ''}`.toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  return true;
}

function buildSourceList(sources) {
  const para = document.createElement('p');
  para.className = 'src';
  para.append(document.createTextNode('Sources: '));
  sources.forEach((entry, index) => {
    if (index) para.append(document.createTextNode(' · '));
    const link = document.createElement('a');
    link.href = entry.url;
    link.textContent = entry.name;
    link.target = '_blank';
    link.rel = 'noopener';
    para.append(link);
  });
  return para;
}

function tag(text, className) {
  const el = document.createElement('span');
  el.className = className;
  el.textContent = text;
  return el;
}

function buildCounter(trophy) {
  const current = Math.min(Number(progress.counts[trophy.id] ?? 0), trophy.target);
  const wrap = document.createElement('div');
  wrap.className = 'counter';
  const field = document.createElement('input');
  field.type = 'number';
  field.min = '0';
  field.max = String(trophy.target);
  field.value = String(current);
  field.setAttribute('aria-label', `Progress toward ${trophy.target_label}`);
  const track = document.createElement('div');
  track.className = 'bar';
  const fill = document.createElement('div');
  fill.style.width = `${Math.round((current / trophy.target) * 100)}%`;
  track.append(fill);
  const label = document.createElement('span');
  label.textContent = `${current} / ${trophy.target} — ${trophy.target_label}`;
  field.addEventListener('change', () => {
    const value = Math.max(0, Math.min(trophy.target, Number(field.value) || 0));
    progress.counts[trophy.id] = value;
    if (value >= trophy.target) progress.earned.add(trophy.id);
    writeProgress();
    paintAll();
  });
  wrap.append(field, track, label);
  return wrap;
}

function buildCard(trophy) {
  const earned = progress.earned.has(trophy.id);
  const concealed = isConcealed(trophy);
  const card = document.createElement('article');
  card.className = 'trophy' + (earned ? ' earned' : '');
  card.id = `trophy-${trophy.id}`;
  card.dataset.trophyId = String(trophy.id);

  const head = document.createElement('div');
  head.className = 'trophy-head';
  const tick = document.createElement('input');
  tick.type = 'checkbox';
  tick.checked = earned;
  tick.setAttribute('aria-label', `Mark ${trophy.name} as earned`);
  tick.addEventListener('change', () => {
    if (tick.checked) progress.earned.add(trophy.id);
    else progress.earned.delete(trophy.id);
    writeProgress();
    paintAll();
  });
  const titleBox = document.createElement('div');
  titleBox.className = 'trophy-title';
  const heading = document.createElement('h3');
  if (concealed) {
    const veil = document.createElement('span');
    veil.className = 'spoiler-hidden';
    veil.textContent = 'Hidden trophy — earn it to reveal its name';
    heading.append(veil);
  } else {
    heading.textContent = trophy.name;
  }
  const official = document.createElement('p');
  official.className = 'official';
  const marker = document.createElement('span');
  marker.className = 'lbl';
  marker.textContent = 'Official: ';
  official.append(marker);
  official.append(document.createTextNode(
    concealed ? 'Hidden on PlayStation until earned.' : trophy.description));
  titleBox.append(heading, official);
  const badge = document.createElement('span');
  badge.className = `grade ${trophy.grade}`;
  badge.textContent = trophy.grade;
  head.append(tick, titleBox, badge);
  card.append(head);

  const tags = document.createElement('div');
  tags.className = 'tags';
  tags.append(tag(KIND_NAMES[trophy.kind] ?? trophy.kind, 'tag'));
  if (trophy.hidden) tags.append(tag('Hidden on PSN', 'tag hidden'));
  if (trophy.missable) tags.append(tag('⚠ Missable', 'tag missable'));
  if (trophy.chapter) tags.append(tag(trophy.chapter, 'tag'));
  card.append(tags);

  if (trophy.target) card.append(buildCounter(trophy));

  if (concealed) {
    const note = document.createElement('p');
    note.className = 'guide muted';
    note.textContent = 'Guide hidden with the spoiler setting. Earn this trophy (or switch spoilers off) to read its guide and sources.';
    card.append(note);
  } else {
    const details = document.createElement('details');
    details.className = 'guide';
    if (location.hash === `#trophy-${trophy.id}`) details.open = true;
    const summary = document.createElement('summary');
    summary.textContent = 'Guide — how to earn it';
    details.append(summary);
    const body = document.createElement('p');
    body.textContent = trophy.guide;
    details.append(body);
    if (trophy.missable_note) {
      const warn = document.createElement('p');
      warn.className = 'missable-note';
      warn.textContent = trophy.missable_note;
      details.append(warn);
    }
    details.append(buildSourceList(trophy.sources));
    card.append(details);
  }
  return card;
}

function paintChips() {
  ui.chips.replaceChildren();
  for (const kind of KIND_SEQUENCE) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = KIND_NAMES[kind];
    chip.setAttribute('aria-pressed', String(pickedKind === kind));
    chip.addEventListener('click', () => { pickedKind = kind; paintAll(); });
    ui.chips.append(chip);
  }
}

function paintAll() {
  paintProgress();
  paintChips();
  ui.list.replaceChildren();
  const visible = guide.trophies.filter(passesFilters);
  for (const trophy of visible) ui.list.append(buildCard(trophy));
  ui.emptyState.hidden = visible.length !== 0;
  ui.filterCount.textContent =
    pickedKind === 'online'
      ? 'Online: 0 trophies — this list has no online trophies.'
      : `Showing ${visible.length} of ${guide.trophies.length} trophies`;
}

function downloadProgress() {
  const payload = {
    game: 'Grand Theft Auto VI',
    exportedAt: new Date().toISOString(),
    earned: [...progress.earned].sort((a, b) => a - b),
    counts: progress.counts,
    spoiler: progress.spoiler,
  };
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  link.download = 'gta6-trophy-progress.json';
  link.click();
  URL.revokeObjectURL(link.href);
}

async function restoreProgress(file) {
  const raw = JSON.parse(await file.text());
  const wanted = new Set((raw.earned ?? []).map(Number).filter((n) => Number.isInteger(n)));
  progress.earned = new Set([...wanted].filter((id) => guide.trophies.some((t) => t.id === id)));
  progress.counts = {};
  if (raw.counts && typeof raw.counts === 'object') {
    for (const [key, value] of Object.entries(raw.counts)) {
      const id = Number(key);
      if (guide.trophies.some((t) => t.id === id)) progress.counts[id] = Math.max(0, Number(value) || 0);
    }
  }
  if (typeof raw.spoiler === 'boolean') progress.spoiler = raw.spoiler;
  ui.spoiler.checked = progress.spoiler;
  writeProgress();
  paintAll();
}

const response = await fetch('data/trophies.json');
guide = await response.json();
ui.spoiler.checked = progress.spoiler;

paintRoadmap();
paintAll();

ui.search.addEventListener('input', paintAll);
ui.grade.addEventListener('change', paintAll);
ui.spoiler.addEventListener('change', () => { progress.spoiler = ui.spoiler.checked; writeProgress(); paintAll(); });
ui.exportBtn.addEventListener('click', downloadProgress);
ui.importInput.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try { await restoreProgress(file); } catch { alert('That file is not a trophy-progress export from this guide.'); }
  event.target.value = '';
});
ui.resetBtn.addEventListener('click', () => {
  if (!confirm('Clear all earned trophies and counters?')) return;
  progress.earned = new Set();
  progress.counts = {};
  writeProgress();
  paintAll();
});

// Deep links: #trophy-<id> opens that trophy's guide and scrolls to it.
if (/^#trophy-\d+$/.test(location.hash)) {
  const target = document.getElementById(location.hash.slice(1));
  if (target) target.scrollIntoView({ block: 'start' });
}
if (location.hash === '#roadmap') {
  document.getElementById('roadmap').scrollIntoView({ block: 'start' });
}
window.__shotReady = true;
