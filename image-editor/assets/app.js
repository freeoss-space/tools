/* Image Editor — app.js */
/* All interaction logic: state, rendering, file handling, export */

// ── State ────────────────────────────────────────────────

const state = {
  fgImage: null,
  fgFile: null,

  bgMode: 'upload',
  bgImage: null,
  bgFile: null,

  bgGen: {
    type: 'gradient',
    solidColor: '#1c1828',
    gradStyle: 'linear',
    colorA: '#1c1828',
    colorB: '#656ea4',
    angle: 135,
    pattern: 'dots',
    patternColor: '#656ea4',
    patternBg: '#1c1828',
    patternSize: 20,
    patternGap: 10,
    patternAngle: 0,
  },

  outlineColor: '#ffffff',
  outlineThickness: 8,
  outlineOpacity: 1.0,
};

// ── DOM refs ─────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

const canvas = $('canvas');
const ctx = canvas.getContext('2d');

const fgDrop = $('fg-drop');
const fgInput = $('fg-input');
const fgChip = $('fg-chip');
const fgChipName = $('fg-chip-name');
const fgRemove = $('fg-remove');

const bgDrop = $('bg-drop');
const bgInput = $('bg-input');
const bgChipRow = $('bg-chip-row');
const bgChipName = $('bg-chip-name');
const bgRemove = $('bg-remove');
const bgClear = $('bg-clear');

const btnDownload = $('btn-download');
const btnCopy = $('btn-copy');
const emptyState = $('empty-state');
const canvasInfo = $('canvas-info');

// ── Toast ────────────────────────────────────────────────

let toastTimer;
function showToast(msg, isError) {
  const t = $('toast');
  t.textContent = msg;
  t.style.background = isError ? 'var(--error)' : 'var(--success)';
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

// ── File loading helpers ─────────────────────────────────

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function setupDropZone(dropEl, inputEl, onFile) {
  dropEl.addEventListener('click', () => inputEl.click());
  dropEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputEl.click(); }
  });

  dropEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropEl.classList.add('is-dragging');
  });
  dropEl.addEventListener('dragleave', () => dropEl.classList.remove('is-dragging'));
  dropEl.addEventListener('drop', (e) => {
    e.preventDefault();
    dropEl.classList.remove('is-dragging');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) onFile(file);
  });

  inputEl.addEventListener('change', () => {
    const file = inputEl.files[0];
    if (file) onFile(file);
    inputEl.value = '';
  });
}

// ── Foreground handling ──────────────────────────────────

async function handleForeground(file) {
  try {
    const img = await loadImage(file);
    state.fgImage = img;
    state.fgFile = file;

    fgChipName.textContent = file.name;
    fgChip.removeAttribute('hidden');
    fgDrop.setAttribute('hidden', '');

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.removeAttribute('hidden');
    emptyState.setAttribute('hidden', '');

    btnDownload.disabled = false;
    btnCopy.disabled = false;
    canvasInfo.textContent = `Size: ${img.naturalWidth} \u00d7 ${img.naturalHeight} px`;

    render();
  } catch {
    showToast('Failed to load image', true);
  }
}

function removeForeground() {
  state.fgImage = null;
  state.fgFile = null;
  fgChip.setAttribute('hidden', '');
  fgDrop.removeAttribute('hidden');
  canvas.setAttribute('hidden', '');
  emptyState.removeAttribute('hidden');
  btnDownload.disabled = true;
  btnCopy.disabled = true;
  canvasInfo.textContent = 'No image loaded';
}

setupDropZone(fgDrop, fgInput, handleForeground);
fgRemove.addEventListener('click', removeForeground);

// ── Background handling ──────────────────────────────────

async function handleBackground(file) {
  try {
    const img = await loadImage(file);
    state.bgImage = img;
    state.bgFile = file;

    bgChipName.textContent = file.name;
    bgChipRow.removeAttribute('hidden');
    bgDrop.setAttribute('hidden', '');

    render();
  } catch {
    showToast('Failed to load background', true);
  }
}

function removeBackground() {
  state.bgImage = null;
  state.bgFile = null;
  bgChipRow.setAttribute('hidden', '');
  bgDrop.removeAttribute('hidden');
  render();
}

setupDropZone(bgDrop, bgInput, handleBackground);
bgRemove.addEventListener('click', removeBackground);
bgClear.addEventListener('click', removeBackground);

// ── Tab switching helper ─────────────────────────────────

function initTabs(containerId, onChange) {
  const container = document.getElementById(containerId);
  container.addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    container.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    onChange(tab.dataset.tab);
  });
}

// ── Background mode tabs ─────────────────────────────────

initTabs('bg-mode-tabs', (mode) => {
  state.bgMode = mode;
  $('bg-upload-panel').toggleAttribute('hidden', mode !== 'upload');
  $('bg-generate-panel').toggleAttribute('hidden', mode !== 'generate');
  render();
});

// ── Generator type tabs ──────────────────────────────────

function showGenPanel() {
  const t = state.bgGen.type;
  $('gen-solid').toggleAttribute('hidden', t !== 'solid');
  $('gen-gradient').toggleAttribute('hidden', t !== 'gradient');
  $('gen-pattern').toggleAttribute('hidden', t !== 'pattern');
}

initTabs('gen-type-tabs', (type) => {
  state.bgGen.type = type;
  showGenPanel();
  render();
});

// ── Gradient style tabs ──────────────────────────────────

initTabs('grad-style-tabs', (style) => {
  state.bgGen.gradStyle = style;
  $('grad-angle-row').toggleAttribute('hidden', style !== 'linear');
  render();
});

// ── Pattern shape tabs ───────────────────────────────────

function updatePatternAngleVisibility() {
  const p = state.bgGen.pattern;
  const show = p === 'lines' || p === 'hex' || p === 'triangles';
  $('pat-angle-row').toggleAttribute('hidden', !show);
}

initTabs('pattern-shape-tabs', (shape) => {
  state.bgGen.pattern = shape;
  updatePatternAngleVisibility();
  render();
});

// ── Color + hex input sync helper ────────────────────────

function linkColorHex(colorId, hexId, setter) {
  const colorEl = document.getElementById(colorId);
  const hexEl = document.getElementById(hexId);

  colorEl.addEventListener('input', () => {
    hexEl.value = colorEl.value;
    setter(colorEl.value);
    render();
  });

  hexEl.addEventListener('input', () => {
    const v = hexEl.value;
    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
      colorEl.value = v;
      setter(v);
      render();
    }
  });

  hexEl.addEventListener('blur', () => {
    let v = hexEl.value.trim();
    if (v && !v.startsWith('#')) v = '#' + v;
    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
      hexEl.value = v;
      colorEl.value = v;
      setter(v);
      render();
    } else {
      hexEl.value = colorEl.value;
    }
  });
}

// ── Range + label sync helper ────────────────────────────

function linkRange(rangeId, labelId, suffix, setter) {
  const rangeEl = document.getElementById(rangeId);
  const labelEl = document.getElementById(labelId);

  rangeEl.addEventListener('input', () => {
    const v = Number(rangeEl.value);
    labelEl.innerHTML = v + suffix;
    setter(v);
    render();
  });
}

// ── Wire up controls ─────────────────────────────────────

// Solid
linkColorHex('solid-color', 'solid-color-hex', (v) => { state.bgGen.solidColor = v; });

// Gradient
linkColorHex('grad-colorA', 'grad-colorA-hex', (v) => { state.bgGen.colorA = v; });
linkColorHex('grad-colorB', 'grad-colorB-hex', (v) => { state.bgGen.colorB = v; });
linkRange('grad-angle', 'grad-angle-val', '&deg;', (v) => { state.bgGen.angle = v; });

// Pattern
linkColorHex('pat-color', 'pat-color-hex', (v) => { state.bgGen.patternColor = v; });
linkColorHex('pat-bg', 'pat-bg-hex', (v) => { state.bgGen.patternBg = v; });
linkRange('pat-size', 'pat-size-val', ' px', (v) => { state.bgGen.patternSize = v; });
linkRange('pat-gap', 'pat-gap-val', ' px', (v) => { state.bgGen.patternGap = v; });
linkRange('pat-angle', 'pat-angle-val', '&deg;', (v) => { state.bgGen.patternAngle = v; });

// Outline
linkColorHex('outline-color', 'outline-color-hex', (v) => { state.outlineColor = v; });
linkRange('outline-thickness', 'outline-thickness-val', ' px', (v) => { state.outlineThickness = v; });
linkRange('outline-opacity', 'outline-opacity-val', '%', (v) => { state.outlineOpacity = v / 100; });

// ── Procedural background generators ─────────────────────

function drawSolid(ctx, w, h, gen) {
  ctx.fillStyle = gen.solidColor;
  ctx.fillRect(0, 0, w, h);
}

function drawGradient(ctx, w, h, gen) {
  let fill;
  if (gen.gradStyle === 'linear') {
    const rad = gen.angle * Math.PI / 180;
    const cx = w / 2, cy = h / 2;
    const len = Math.abs(w * Math.cos(rad)) + Math.abs(h * Math.sin(rad));
    fill = ctx.createLinearGradient(
      cx - Math.cos(rad) * len / 2, cy - Math.sin(rad) * len / 2,
      cx + Math.cos(rad) * len / 2, cy + Math.sin(rad) * len / 2,
    );
  } else {
    fill = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.hypot(w, h) / 2);
  }
  fill.addColorStop(0, gen.colorA);
  fill.addColorStop(1, gen.colorB);
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, w, h);
}

function drawDots(ctx, w, h, gen) {
  ctx.fillStyle = gen.patternBg;
  ctx.fillRect(0, 0, w, h);
  const step = gen.patternSize + gen.patternGap;
  const r = gen.patternSize / 2;
  ctx.fillStyle = gen.patternColor;
  for (let y = r; y < h + step; y += step) {
    for (let x = r; x < w + step; x += step) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawLines(ctx, w, h, gen) {
  ctx.fillStyle = gen.patternBg;
  ctx.fillRect(0, 0, w, h);
  const step = gen.patternSize + gen.patternGap;
  if (step <= 0) return;
  const diag = Math.hypot(w, h);
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(gen.patternAngle * Math.PI / 180);
  ctx.strokeStyle = gen.patternColor;
  ctx.lineWidth = gen.patternSize;
  for (let x = -diag; x <= diag; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, -diag);
    ctx.lineTo(x, diag);
    ctx.stroke();
  }
  ctx.restore();
}

function drawChecks(ctx, w, h, gen) {
  const cell = gen.patternSize + gen.patternGap;
  if (cell <= 0) return;
  for (let row = 0; row * cell < h + cell; row++) {
    for (let col = 0; col * cell < w + cell; col++) {
      ctx.fillStyle = (row + col) % 2 === 0 ? gen.patternBg : gen.patternColor;
      ctx.fillRect(col * cell, row * cell, cell, cell);
    }
  }
}

function drawHex(ctx, w, h, gen) {
  ctx.fillStyle = gen.patternBg;
  ctx.fillRect(0, 0, w, h);
  const r = gen.patternSize / 2;
  if (r <= 0) return;
  const hx = r * Math.sqrt(3);
  const hy = r * 1.5;
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(gen.patternAngle * Math.PI / 180);
  ctx.translate(-w / 2, -h / 2);
  const cols = Math.ceil(w / hx) + 4;
  const rows = Math.ceil(h / hy) + 4;
  ctx.strokeStyle = gen.patternColor;
  ctx.lineWidth = Math.max(1, gen.patternGap);
  for (let row = -2; row < rows; row++) {
    for (let col = -2; col < cols; col++) {
      const cx = col * hx + (row % 2 === 0 ? 0 : hx / 2);
      const cy = row * hy;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i;
        const px = cx + r * Math.cos(a);
        const py = cy + r * Math.sin(a);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawTriangles(ctx, w, h, gen) {
  ctx.fillStyle = gen.patternBg;
  ctx.fillRect(0, 0, w, h);
  const s = gen.patternSize + gen.patternGap;
  if (s <= 0) return;
  const th = (s * Math.sqrt(3)) / 2;
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(gen.patternAngle * Math.PI / 180);
  ctx.translate(-w / 2, -h / 2);
  ctx.strokeStyle = gen.patternColor;
  ctx.lineWidth = Math.max(1, gen.patternGap * 0.5);
  const cols = Math.ceil(w / s) + 4;
  const rows = Math.ceil(h / th) + 4;
  for (let row = -2; row < rows; row++) {
    for (let col = -2; col < cols; col++) {
      const x = col * s + (row % 2 === 0 ? 0 : s / 2);
      const y = row * th;
      ctx.beginPath();
      ctx.moveTo(x, y + th);
      ctx.lineTo(x + s / 2, y);
      ctx.lineTo(x + s, y + th);
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawProceduralBg(ctx, gen) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  if (gen.type === 'solid') drawSolid(ctx, w, h, gen);
  if (gen.type === 'gradient') drawGradient(ctx, w, h, gen);
  if (gen.type === 'pattern') {
    const p = gen.pattern;
    if (p === 'dots') drawDots(ctx, w, h, gen);
    if (p === 'lines') drawLines(ctx, w, h, gen);
    if (p === 'checks') drawChecks(ctx, w, h, gen);
    if (p === 'hex') drawHex(ctx, w, h, gen);
    if (p === 'triangles') drawTriangles(ctx, w, h, gen);
  }
}

// ── Outline algorithm ────────────────────────────────────

function drawOutline(ctx, img, color, thickness, opacity) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const offscreen = document.createElement('canvas');
  offscreen.width = w;
  offscreen.height = h;
  const oc = offscreen.getContext('2d');

  oc.save();
  oc.globalAlpha = opacity;

  // Stamp the image in a ring of offsets at the given radius
  const steps = Math.max(16, thickness * 4);
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const dx = Math.cos(angle) * thickness;
    const dy = Math.sin(angle) * thickness;
    oc.drawImage(img, dx, dy);
  }

  // Tint to outline color
  oc.globalCompositeOperation = 'source-in';
  oc.fillStyle = color;
  oc.fillRect(0, 0, w, h);
  oc.restore();

  // Erase overlap with original to get ring only
  oc.globalCompositeOperation = 'destination-out';
  oc.drawImage(img, 0, 0);

  ctx.drawImage(offscreen, 0, 0);
}

// ── Main render ──────────────────────────────────────────

let renderRAF = null;

function render() {
  if (renderRAF) cancelAnimationFrame(renderRAF);
  renderRAF = requestAnimationFrame(_render);
}

function _render() {
  renderRAF = null;
  if (!state.fgImage) return;

  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  // 1. Background
  if (state.bgMode === 'upload' && state.bgImage) {
    ctx.drawImage(state.bgImage, 0, 0, w, h);
  } else if (state.bgMode === 'generate') {
    drawProceduralBg(ctx, state.bgGen);
  }

  // 2. Outline
  if (state.outlineThickness > 0 && state.outlineOpacity > 0) {
    drawOutline(ctx, state.fgImage, state.outlineColor, state.outlineThickness, state.outlineOpacity);
  }

  // 3. Foreground
  ctx.drawImage(state.fgImage, 0, 0);
}

// ── Export: Download ──────────────────────────────────────

btnDownload.addEventListener('click', () => {
  if (!state.fgImage) return;
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'image-editor-export.png';
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
});

// ── Export: Copy to clipboard ────────────────────────────

btnCopy.addEventListener('click', () => {
  if (!state.fgImage) return;
  const btn = btnCopy;

  if (!navigator.clipboard || !window.ClipboardItem) {
    showToast('Clipboard API not available in this browser', true);
    return;
  }

  canvas.toBlob(async (blob) => {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      const orig = btn.innerHTML;
      btn.innerHTML = '\u2713 Copied!';
      btn.classList.add('btn-copied');
      setTimeout(() => {
        btn.innerHTML = orig;
        btn.classList.remove('btn-copied');
      }, 2000);
    } catch {
      showToast('Failed to copy to clipboard', true);
    }
  }, 'image/png');
});

// ── Mobile sidebar toggle ────────────────────────────────

const btnPanelToggle = $('btn-panel-toggle');
const sidebarEl = document.querySelector('.sidebar');

if (btnPanelToggle) {
  btnPanelToggle.addEventListener('click', () => {
    const collapsed = sidebarEl.classList.toggle('is-collapsed');
    btnPanelToggle.setAttribute('aria-pressed', collapsed);
  });
}

// ── Initial UI state ─────────────────────────────────────

showGenPanel();
updatePatternAngleVisibility();
