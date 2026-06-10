/* Diagram Builder — build visual diagrams with custom image nodes.
 * Rendering is delegated to Mermaid (https://mermaid.js.org) using the
 * flowchart "image shape" (v11.3+), which natively supports an image with
 * the node label displayed below it. */

const MERMAID_URLS = [
  'https://cdn.jsdelivr.net/npm/mermaid@11.6.0/dist/mermaid.esm.min.mjs',
  'https://unpkg.com/mermaid@11.6.0/dist/mermaid.esm.min.mjs',
];

const STORAGE_KEY = 'diagram-builder:v1';
const NODE_IMG_SIZE = 56;
const UPLOAD_MAX_PX = 256;

/* ── Built-in icon presets (stroke-based, palette colors) ── */

const ICON_WRAP = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="#c4c7df" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

const PRESETS = {
  internet: { name: 'Internet', svg: ICON_WRAP('<circle cx="24" cy="24" r="16"/><ellipse cx="24" cy="24" rx="7" ry="16"/><path d="M8.5 24h31M11 16.5h26M11 31.5h26" stroke="#8c92be"/>') },
  cloud: { name: 'Cloud', svg: ICON_WRAP('<path d="M14 36a8 8 0 1 1 1.6-15.8A11 11 0 0 1 37 23.5 6.5 6.5 0 0 1 35.5 36z"/>') },
  router: { name: 'Router', svg: ICON_WRAP('<rect x="6" y="26" width="36" height="13" rx="4"/><path d="M14 26V12M34 26V15" stroke="#8c92be"/><circle cx="14" cy="11" r="1.6" fill="#8c92be" stroke="none"/><circle cx="34" cy="14" r="1.6" fill="#8c92be" stroke="none"/><circle cx="13" cy="32.5" r="1.7" fill="#52b788" stroke="none"/><circle cx="19" cy="32.5" r="1.7" fill="#52b788" stroke="none"/><rect x="30" y="30.5" width="7" height="4" rx="1" stroke-width="1.8"/>') },
  switch: { name: 'Switch', svg: ICON_WRAP('<rect x="6" y="18" width="36" height="13" rx="3"/><circle cx="12" cy="24.5" r="1.5" fill="#52b788" stroke="none"/><circle cx="18" cy="24.5" r="1.5" fill="#52b788" stroke="none"/><circle cx="24" cy="24.5" r="1.5" fill="#52b788" stroke="none"/><circle cx="30" cy="24.5" r="1.5" fill="#52b788" stroke="none"/><path d="M14 38h12m0 0-3.5-3.5M26 38l-3.5 3.5M34 11H22m0 0 3.5-3.5M22 11l3.5 3.5" stroke="#8c92be" stroke-width="2"/>') },
  ap: { name: 'Access point', svg: ICON_WRAP('<circle cx="24" cy="35" r="3.2" fill="#8c92be" stroke="none"/><path d="M15.5 27.5a12 12 0 0 1 17 0M10 20.5a20 20 0 0 1 28 0M21 31a4.5 4.5 0 0 1 6 0" stroke="#c4c7df"/>') },
  firewall: { name: 'Firewall', svg: ICON_WRAP('<rect x="7" y="12" width="34" height="24" rx="2"/><path d="M7 20h34M7 28h34" stroke="#e66260" stroke-width="2"/><path d="M18 12v8M30 12v8M13 20v8M24 20v8M35 20v8M18 28v8M30 28v8" stroke="#e66260" stroke-width="2"/>') },
  server: { name: 'Server', svg: ICON_WRAP('<rect x="10" y="7" width="28" height="10" rx="2"/><rect x="10" y="19" width="28" height="10" rx="2"/><rect x="10" y="31" width="28" height="10" rx="2"/><circle cx="15.5" cy="12" r="1.5" fill="#52b788" stroke="none"/><circle cx="15.5" cy="24" r="1.5" fill="#52b788" stroke="none"/><circle cx="15.5" cy="36" r="1.5" fill="#f9db6d" stroke="none"/><path d="M26 12h7M26 24h7M26 36h7" stroke="#8c92be" stroke-width="2"/>') },
  nas: { name: 'NAS', svg: ICON_WRAP('<rect x="10" y="9" width="28" height="30" rx="3"/><rect x="15" y="15" width="18" height="6.5" rx="1.2" stroke-width="1.8"/><rect x="15" y="25" width="18" height="6.5" rx="1.2" stroke-width="1.8"/><circle cx="30.5" cy="18.2" r="1.1" fill="#52b788" stroke="none"/><circle cx="30.5" cy="28.2" r="1.1" fill="#52b788" stroke="none"/>') },
  desktop: { name: 'Desktop', svg: ICON_WRAP('<rect x="8" y="9" width="32" height="21" rx="2"/><path d="M24 30v6M17 38h14" stroke="#8c92be"/>') },
  laptop: { name: 'Laptop', svg: ICON_WRAP('<rect x="12" y="11" width="24" height="17" rx="2"/><path d="M8 35h32l-3.5-7h-25z" stroke="#8c92be"/>') },
  phone: { name: 'Phone', svg: ICON_WRAP('<rect x="15.5" y="7" width="17" height="34" rx="3.5"/><circle cx="24" cy="35.5" r="1.6" fill="#8c92be" stroke="none"/>') },
  printer: { name: 'Printer', svg: ICON_WRAP('<path d="M15 18v-8h18v8" stroke="#8c92be"/><rect x="9" y="18" width="30" height="13" rx="2"/><path d="M15 27h18v12H15z"/><circle cx="34" cy="22.5" r="1.4" fill="#52b788" stroke="none"/>') },
  camera: { name: 'Camera', svg: ICON_WRAP('<circle cx="24" cy="19" r="10"/><circle cx="24" cy="19" r="3.6" fill="#8c92be" stroke="none"/><path d="M24 29v6M16 40h16" stroke="#8c92be"/>') },
  tv: { name: 'TV', svg: ICON_WRAP('<rect x="6" y="11" width="36" height="22" rx="2.5"/><path d="M18 40h12M24 33v7" stroke="#8c92be"/>') },
};

const presetDataUrl = (key) =>
  'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(PRESETS[key].svg);

/* ── State ── */

let state = null;
let mermaid = null;
let zoom = 1;
let renderSeq = 0;
let renderTimer = null;

function defaultState() {
  return {
    direction: 'TD',
    seq: 8,
    nodes: [
      { id: 'n1', name: 'Internet', preset: 'internet', img: null },
      { id: 'n2', name: 'Router', preset: 'router', img: null },
      { id: 'n3', name: 'Switch', preset: 'switch', img: null },
      { id: 'n4', name: 'NAS', preset: 'nas', img: null },
      { id: 'n5', name: 'Desktop', preset: 'desktop', img: null },
      { id: 'n6', name: 'Laptop', preset: 'laptop', img: null },
      { id: 'n7', name: 'Phone', preset: 'phone', img: null },
    ],
    edges: [
      { id: 'e1', from: 'n1', to: 'n2', label: 'fiber', style: 'arrow' },
      { id: 'e2', from: 'n2', to: 'n3', label: 'ethernet', style: 'arrow' },
      { id: 'e3', from: 'n3', to: 'n4', label: '1 Gbps', style: 'arrow' },
      { id: 'e4', from: 'n3', to: 'n5', label: '', style: 'arrow' },
      { id: 'e5', from: 'n2', to: 'n6', label: 'wifi 5 GHz', style: 'dashed' },
      { id: 'e6', from: 'n2', to: 'n7', label: 'wifi', style: 'dashed' },
    ],
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) return parsed;
    }
  } catch { /* corrupted state — fall through to default */ }
  return defaultState();
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    setStatus('Could not save locally (storage full?)');
  }
}

const nextId = (prefix) => `${prefix}${++state.seq}`;
const nodeById = (id) => state.nodes.find((n) => n.id === id);
const nodeImage = (n) => n.img || (n.preset ? presetDataUrl(n.preset) : null);

/* ── DOM refs ── */

const $ = (sel) => document.querySelector(sel);
const nodeListEl = $('#node-list');
const edgeListEl = $('#edge-list');
const diagramEl = $('#diagram');
const diagramScrollEl = $('#diagram-scroll');
const errorEl = $('#diagram-error');
const statusEl = $('#diagram-status');
const fileImageEl = $('#file-image');
const fileJsonEl = $('#file-json');

function setStatus(text) { statusEl.textContent = text; }

/* ── Mermaid source generation ── */

const esc = (s) => String(s).replace(/["\\]/g, "'").replace(/[\r\n]+/g, ' ').trim();

function buildMermaidSource() {
  const lines = [`flowchart ${state.direction}`];
  for (const n of state.nodes) {
    const label = esc(n.name) || 'Untitled';
    const url = nodeImage(n);
    if (url) {
      lines.push(`  ${n.id}@{ img: "${url}", label: "${label}", pos: "b", w: ${NODE_IMG_SIZE}, h: ${NODE_IMG_SIZE}, constraint: "off" }`);
    } else {
      lines.push(`  ${n.id}["${label}"]`);
    }
  }
  for (const e of state.edges) {
    if (!nodeById(e.from) || !nodeById(e.to)) continue;
    const label = esc(e.label || '');
    let link;
    if (e.style === 'dashed') link = label ? `-. "${label}" .->` : '-.->';
    else if (e.style === 'line') link = label ? `-- "${label}" ---` : '---';
    else link = label ? `-- "${label}" -->` : '-->';
    lines.push(`  ${e.from} ${link} ${e.to}`);
  }
  return lines.join('\n');
}

/* ── Rendering ── */

async function renderDiagram() {
  if (!mermaid) return;
  if (!state.nodes.length) {
    diagramEl.innerHTML = '<div class="canvas__empty">Add a node to start your diagram.</div>';
    errorEl.hidden = true;
    setStatus('empty');
    return;
  }
  const src = buildMermaidSource();
  const id = `mmd-${++renderSeq}`;
  try {
    const { svg } = await mermaid.render(id, src);
    diagramEl.innerHTML = svg;
    errorEl.hidden = true;
    setStatus(`${state.nodes.length} nodes · ${state.edges.length} connections`);
  } catch (err) {
    // Mermaid leaves an orphan error element in <body> on failure
    document.getElementById(id)?.remove();
    document.getElementById('d' + id)?.remove();
    errorEl.textContent = `Render error: ${err.message || err}`;
    errorEl.hidden = false;
  }
}

function scheduleRender() {
  saveState();
  clearTimeout(renderTimer);
  renderTimer = setTimeout(renderDiagram, 250);
}

/* ── Node list UI ── */

function renderNodeList() {
  nodeListEl.innerHTML = '';
  for (const node of state.nodes) {
    const card = document.createElement('div');
    card.className = 'node-card';

    const thumb = document.createElement('button');
    thumb.className = 'node-card__thumb';
    thumb.title = 'Choose image or icon';
    const url = nodeImage(node);
    thumb.innerHTML = url
      ? `<img src="${url}" alt="">`
      : '<span>+</span>';
    thumb.addEventListener('click', (ev) => openIconPicker(node.id, ev.currentTarget));

    const fields = document.createElement('div');
    fields.className = 'node-card__fields';
    const nameInput = document.createElement('input');
    nameInput.className = 'input';
    nameInput.placeholder = 'Node name';
    nameInput.value = node.name;
    nameInput.addEventListener('input', () => {
      node.name = nameInput.value;
      scheduleRender();
      refreshEdgeSelects();
    });
    fields.appendChild(nameInput);

    const actions = document.createElement('div');
    actions.className = 'node-card__actions';
    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn--ghost btn--icon btn--danger';
    delBtn.title = 'Delete node';
    delBtn.textContent = '×';
    delBtn.addEventListener('click', () => {
      state.nodes = state.nodes.filter((n) => n.id !== node.id);
      state.edges = state.edges.filter((e) => e.from !== node.id && e.to !== node.id);
      renderLists();
      scheduleRender();
    });
    actions.appendChild(delBtn);

    card.append(thumb, fields, actions);
    nodeListEl.appendChild(card);
  }
}

/* ── Edge list UI ── */

function nodeOptions(selected) {
  return state.nodes
    .map((n) => `<option value="${n.id}" ${n.id === selected ? 'selected' : ''}>${escHtml(n.name || 'Untitled')}</option>`)
    .join('');
}

const escHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function renderEdgeList() {
  edgeListEl.innerHTML = '';
  for (const edge of state.edges) {
    const card = document.createElement('div');
    card.className = 'edge-card';

    const row = document.createElement('div');
    row.className = 'edge-card__row';

    const fromSel = document.createElement('select');
    fromSel.className = 'select edge-from';
    fromSel.innerHTML = nodeOptions(edge.from);
    fromSel.addEventListener('change', () => { edge.from = fromSel.value; scheduleRender(); });

    const arrow = document.createElement('span');
    arrow.className = 'edge-card__arrow';
    arrow.textContent = '→';

    const toSel = document.createElement('select');
    toSel.className = 'select edge-to';
    toSel.innerHTML = nodeOptions(edge.to);
    toSel.addEventListener('change', () => { edge.to = toSel.value; scheduleRender(); });

    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn--ghost btn--icon btn--danger';
    delBtn.title = 'Delete connection';
    delBtn.textContent = '×';
    delBtn.addEventListener('click', () => {
      state.edges = state.edges.filter((e) => e.id !== edge.id);
      renderEdgeList();
      scheduleRender();
    });

    row.append(fromSel, arrow, toSel, delBtn);

    const labelRow = document.createElement('div');
    labelRow.className = 'edge-card__row edge-card__row--label';

    const labelInput = document.createElement('input');
    labelInput.className = 'input';
    labelInput.placeholder = 'Connection name (optional)';
    labelInput.value = edge.label || '';
    labelInput.addEventListener('input', () => { edge.label = labelInput.value; scheduleRender(); });

    const styleSel = document.createElement('select');
    styleSel.className = 'select';
    styleSel.innerHTML = `
      <option value="arrow" ${edge.style === 'arrow' ? 'selected' : ''}>Arrow</option>
      <option value="dashed" ${edge.style === 'dashed' ? 'selected' : ''}>Dashed</option>
      <option value="line" ${edge.style === 'line' ? 'selected' : ''}>Line</option>`;
    styleSel.addEventListener('change', () => { edge.style = styleSel.value; scheduleRender(); });

    labelRow.append(labelInput, styleSel);
    card.append(row, labelRow);
    edgeListEl.appendChild(card);
  }
}

function refreshEdgeSelects() {
  // Keep node-name dropdowns in sync while typing, without rebuilding inputs
  edgeListEl.querySelectorAll('.edge-card').forEach((card, i) => {
    const edge = state.edges[i];
    if (!edge) return;
    card.querySelector('.edge-from').innerHTML = nodeOptions(edge.from);
    card.querySelector('.edge-to').innerHTML = nodeOptions(edge.to);
  });
}

function renderLists() {
  renderNodeList();
  renderEdgeList();
}

/* ── Icon picker ── */

let pickerEl = null;
let pickerNodeId = null;

function closeIconPicker() {
  pickerEl?.remove();
  pickerEl = null;
}

function openIconPicker(nodeId, anchor) {
  closeIconPicker();
  pickerNodeId = nodeId;
  pickerEl = document.createElement('div');
  pickerEl.className = 'icon-pop';

  const grid = document.createElement('div');
  grid.className = 'icon-pop__grid';
  for (const [key, preset] of Object.entries(PRESETS)) {
    const item = document.createElement('button');
    item.className = 'icon-pop__item';
    item.innerHTML = `<img src="${presetDataUrl(key)}" alt=""><span>${preset.name}</span>`;
    item.addEventListener('click', () => {
      const node = nodeById(nodeId);
      node.preset = key;
      node.img = null;
      closeIconPicker();
      renderNodeList();
      scheduleRender();
    });
    grid.appendChild(item);
  }
  pickerEl.appendChild(grid);

  const uploadBtn = document.createElement('button');
  uploadBtn.className = 'btn btn--primary icon-pop__upload';
  uploadBtn.textContent = 'Upload custom image…';
  uploadBtn.addEventListener('click', () => {
    fileImageEl.value = '';
    fileImageEl.click();
  });
  pickerEl.appendChild(uploadBtn);

  const noneBtn = document.createElement('button');
  noneBtn.className = 'btn btn--ghost icon-pop__upload';
  noneBtn.textContent = 'No image (plain node)';
  noneBtn.addEventListener('click', () => {
    const node = nodeById(nodeId);
    node.preset = null;
    node.img = null;
    closeIconPicker();
    renderNodeList();
    scheduleRender();
  });
  pickerEl.appendChild(noneBtn);

  document.body.appendChild(pickerEl);
  const r = anchor.getBoundingClientRect();
  const w = pickerEl.offsetWidth;
  const h = pickerEl.offsetHeight;
  pickerEl.style.left = `${Math.max(8, Math.min(r.left, innerWidth - w - 8))}px`;
  pickerEl.style.top = `${r.bottom + h + 8 > innerHeight ? Math.max(8, r.top - h - 8) : r.bottom + 8}px`;

  setTimeout(() => {
    document.addEventListener('pointerdown', onPickerOutside, { once: true, capture: true });
  });
}

function onPickerOutside(ev) {
  if (pickerEl && !pickerEl.contains(ev.target)) closeIconPicker();
  else if (pickerEl) document.addEventListener('pointerdown', onPickerOutside, { once: true, capture: true });
}

/* ── Image upload (downscaled so localStorage stays small) ── */

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function importImage(file) {
  const raw = await fileToDataUrl(file);
  if (file.type === 'image/svg+xml') return raw; // keep vectors as-is
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = () => reject(new Error('Could not read image'));
    img.src = raw;
  });
  const scale = Math.min(1, UPLOAD_MAX_PX / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

fileImageEl.addEventListener('change', async () => {
  const file = fileImageEl.files?.[0];
  if (!file || !pickerNodeId) return;
  const node = nodeById(pickerNodeId);
  closeIconPicker();
  if (!node) return;
  try {
    node.img = await importImage(file);
    node.preset = null;
    renderNodeList();
    scheduleRender();
  } catch (err) {
    alert(`Could not load image: ${err.message}`);
  }
});

/* ── Toolbar actions ── */

$('#btn-add-node').addEventListener('click', () => {
  state.nodes.push({ id: nextId('n'), name: `Node ${state.nodes.length + 1}`, preset: null, img: null });
  renderLists();
  scheduleRender();
  nodeListEl.lastElementChild?.querySelector('input')?.focus();
});

$('#btn-add-edge').addEventListener('click', () => {
  if (state.nodes.length < 2) {
    alert('Add at least two nodes first.');
    return;
  }
  const last = state.edges[state.edges.length - 1];
  state.edges.push({
    id: nextId('e'),
    from: last?.to || state.nodes[0].id,
    to: state.nodes[state.nodes.length - 1].id,
    label: '',
    style: 'arrow',
  });
  renderEdgeList();
  scheduleRender();
});

function setDirection(dir) {
  state.direction = dir;
  $('#dir-td').classList.toggle('is-active', dir === 'TD');
  $('#dir-lr').classList.toggle('is-active', dir === 'LR');
  scheduleRender();
}

$('#dir-td').addEventListener('click', () => setDirection('TD'));
$('#dir-lr').addEventListener('click', () => setDirection('LR'));

$('#btn-clear').addEventListener('click', () => {
  if (!confirm('Clear the whole diagram? This cannot be undone.')) return;
  state = { direction: state.direction, seq: 0, nodes: [], edges: [] };
  renderLists();
  scheduleRender();
});

/* ── Export / import ── */

function download(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function currentSvg() {
  const svg = diagramEl.querySelector('svg');
  if (!svg) {
    alert('Nothing to export yet.');
    return null;
  }
  return svg;
}

$('#btn-svg').addEventListener('click', () => {
  const svg = currentSvg();
  if (!svg) return;
  const xml = new XMLSerializer().serializeToString(svg);
  download('diagram.svg', new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
});

$('#btn-png').addEventListener('click', async () => {
  const svg = currentSvg();
  if (!svg) return;
  const rect = svg.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width / zoom));
  const height = Math.max(1, Math.round(rect.height / zoom));
  const clone = svg.cloneNode(true);
  clone.setAttribute('width', width);
  clone.setAttribute('height', height);
  const xml = new XMLSerializer().serializeToString(clone);
  const img = new Image();
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('SVG rasterization failed'));
      img.src = url;
    });
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg').trim() || '#1c1828';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => download('diagram.png', blob), 'image/png');
  } catch (err) {
    alert(`PNG export failed: ${err.message}`);
  } finally {
    URL.revokeObjectURL(url);
  }
});

$('#btn-mermaid').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(buildMermaidSource());
    setStatus('Mermaid source copied');
    setTimeout(renderDiagram, 1500);
  } catch {
    alert('Clipboard unavailable — Mermaid source:\n\n' + buildMermaidSource());
  }
});

$('#btn-export').addEventListener('click', () => {
  download('diagram.json', new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
});

$('#btn-import').addEventListener('click', () => {
  fileJsonEl.value = '';
  fileJsonEl.click();
});

fileJsonEl.addEventListener('change', async () => {
  const file = fileJsonEl.files?.[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
      throw new Error('not a Diagram Builder export');
    }
    state = parsed;
    setDirection(state.direction === 'LR' ? 'LR' : 'TD');
    renderLists();
    scheduleRender();
  } catch (err) {
    alert(`Import failed: ${err.message}`);
  }
});

/* ── Zoom ── */

function applyZoom() {
  diagramEl.style.transform = `scale(${zoom})`;
  $('#zoom-reset').textContent = `${Math.round(zoom * 100)}%`;
}

$('#zoom-in').addEventListener('click', () => { zoom = Math.min(3, zoom + 0.2); applyZoom(); });
$('#zoom-out').addEventListener('click', () => { zoom = Math.max(0.2, zoom - 0.2); applyZoom(); });
$('#zoom-reset').addEventListener('click', () => { zoom = 1; applyZoom(); });

/* ── Mobile view tabs ── */

$('#tab-edit').addEventListener('click', () => {
  document.body.classList.remove('show-diagram');
  $('#tab-edit').classList.add('is-active');
  $('#tab-diagram').classList.remove('is-active');
});

$('#tab-diagram').addEventListener('click', () => {
  document.body.classList.add('show-diagram');
  $('#tab-diagram').classList.add('is-active');
  $('#tab-edit').classList.remove('is-active');
});

/* ── Boot ── */

async function loadMermaid() {
  for (const url of MERMAID_URLS) {
    try {
      return (await import(/* @vite-ignore */ url)).default;
    } catch { /* try next CDN */ }
  }
  throw new Error('Could not load Mermaid from any CDN');
}

(async function init() {
  state = loadState();
  setDirection(state.direction === 'LR' ? 'LR' : 'TD');
  renderLists();
  setStatus('loading Mermaid…');
  try {
    mermaid = await loadMermaid();
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'loose',
      maxTextSize: 9_000_000,
      theme: 'base',
      themeVariables: {
        background: '#1c1828',
        primaryColor: '#261f34',
        primaryTextColor: '#f4eded',
        primaryBorderColor: '#352c43',
        lineColor: '#8c92be',
        edgeLabelBackground: '#261f34',
        fontFamily: 'Syne, sans-serif',
        fontSize: '14px',
      },
      flowchart: { htmlLabels: false, curve: 'basis', padding: 14 },
    });
    await renderDiagram();
  } catch (err) {
    errorEl.textContent = `${err.message}. Check your internet connection and reload.`;
    errorEl.hidden = false;
    setStatus('offline');
  }
})();
