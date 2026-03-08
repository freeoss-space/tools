// ── Default palette ───────────────────────────────────────────────
// Catppuccin Mocha subset — chosen so the text color (#cdd6f4) is
// the highest-luminance entry, giving a clean dark-theme default.

const DEFAULT_COLORS = [
  { name: 'Crust',     hex: '#11111b' },
  { name: 'Mantle',    hex: '#181825' },
  { name: 'Base',      hex: '#1e1e2e' },
  { name: 'Surface 0', hex: '#313244' },
  { name: 'Surface 1', hex: '#45475a' },
  { name: 'Overlay 0', hex: '#6c7086' },
  { name: 'Overlay 1', hex: '#7f849c' },
  { name: 'Subtext 0', hex: '#a6adc8' },
  { name: 'Mauve',     hex: '#cba6f7' },
  { name: 'Blue',      hex: '#89b4fa' },
  { name: 'Sapphire',  hex: '#74c7ec' },
  { name: 'Green',     hex: '#a6e3a1' },
  { name: 'Yellow',    hex: '#f9e2af' },
  { name: 'Peach',     hex: '#fab387' },
  { name: 'Red',       hex: '#f38ba8' },
  { name: 'Text',      hex: '#cdd6f4' },
];

// ── State ─────────────────────────────────────────────────────────

const state = {
  name:         'My Scheme',
  colors:       DEFAULT_COLORS.map(c => ({ ...c })),
  colorFormat:  'hex',
  previewMode:  'editor',
  exportFormat: 'css',
};

// ── URL hash encode / decode ──────────────────────────────────────

function encodeState() {
  const data = { n: state.name, c: state.colors.map(c => [c.name, c.hex]) };
  return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
}

function decodeState(hash) {
  try {
    const data = JSON.parse(decodeURIComponent(escape(atob(hash))));
    if (!data.c || !Array.isArray(data.c)) return null;
    return {
      name:   data.n || 'My Scheme',
      colors: data.c.map(([name, hex]) => ({ name: String(name), hex: String(hex) })),
    };
  } catch { return null; }
}

function loadFromHash() {
  const hash = location.hash.slice(1);
  if (!hash) return;
  const decoded = decodeState(hash);
  if (!decoded) return;
  state.name   = decoded.name;
  state.colors = decoded.colors;
  document.getElementById('scheme-name').value = state.name;
}

// ── Render helpers ────────────────────────────────────────────────

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── Render: color list ────────────────────────────────────────────

function renderColorList() {
  const list = document.getElementById('color-list');

  list.innerHTML = state.colors.map((c, i) => `
    <div class="color-item" data-idx="${i}">
      <div class="swatch-wrap" title="Pick color">
        <div class="swatch" style="background:${c.hex}"></div>
        <input type="color" class="swatch-picker" value="${c.hex}" data-idx="${i}" tabindex="-1">
      </div>
      <input type="text" class="color-name-input" value="${esc(c.name)}" data-idx="${i}" placeholder="Name" spellcheck="false">
      <input type="text" class="color-val-input" value="${esc(formatColor(c.hex, state.colorFormat))}" data-idx="${i}" data-hex="${c.hex}" spellcheck="false">
      <button class="del-btn" data-idx="${i}" title="Remove">×</button>
    </div>
  `).join('');

  // Native color picker
  list.querySelectorAll('.swatch-picker').forEach(el => {
    el.addEventListener('input', e => updateColor(+e.target.dataset.idx, e.target.value));
  });

  // Name editing
  list.querySelectorAll('.color-name-input').forEach(el => {
    el.addEventListener('change', e => {
      state.colors[+e.target.dataset.idx].name = e.target.value;
      renderExport();
    });
  });

  // Value editing — accept hex or rgb() input
  list.querySelectorAll('.color-val-input').forEach(el => {
    el.addEventListener('change', e => {
      const i   = +e.target.dataset.idx;
      const hex = parseToHex(e.target.value);
      if (hex) {
        updateColor(i, hex);
      } else {
        // revert
        e.target.value = formatColor(state.colors[i].hex, state.colorFormat);
      }
    });
    // Allow Escape to cancel
    el.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        e.target.value = formatColor(state.colors[+e.target.dataset.idx].hex, state.colorFormat);
        e.target.blur();
      }
    });
  });

  // Delete
  list.querySelectorAll('.del-btn').forEach(el => {
    el.addEventListener('click', e => {
      const i = +e.target.dataset.idx;
      if (state.colors.length <= 1) return;
      state.colors.splice(i, 1);
      renderColorList();
      renderPreview();
      renderExport();
    });
  });
}

// ── Render: preview ───────────────────────────────────────────────

function renderPreview() {
  const img    = document.getElementById('preview-img');
  const iframe = document.getElementById('preview-iframe');
  const result = generatePreview(state.previewMode, state.colors);

  if (result.type === 'html') {
    iframe.srcdoc = result.content;
    iframe.style.display = 'block';
    img.style.display    = 'none';
  } else {
    img.src           = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(result.content)}`;
    img.style.display    = 'block';
    iframe.style.display = 'none';
  }
}

// ── Render: export ────────────────────────────────────────────────

function renderExport() {
  const el = document.getElementById('export-code');
  switch (state.exportFormat) {
    case 'base16': el.textContent = buildBase16(state.colors, state.name); break;
    case 'json':   el.textContent = buildJson(state.colors, state.name); break;
    default:       el.textContent = buildCssVars(state.colors, state.name);
  }
}

// ── Update a single color (partial re-render) ─────────────────────

function updateColor(idx, hex) {
  state.colors[idx].hex = hex;

  // Update swatch + value input in-place (avoid full list re-render)
  const item = document.querySelector(`.color-item[data-idx="${idx}"]`);
  if (item) {
    item.querySelector('.swatch').style.background = hex;
    item.querySelector('.swatch-picker').value = hex;
    const vi = item.querySelector('.color-val-input');
    vi.dataset.hex = hex;
    if (document.activeElement !== vi) {
      vi.value = formatColor(hex, state.colorFormat);
    }
  }

  renderPreview();
  renderExport();
}

// ── Toast ─────────────────────────────────────────────────────────

function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = isError ? '#da3633' : '#238636';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

// ── Init ──────────────────────────────────────────────────────────

loadFromHash();
renderColorList();
renderPreview();
renderExport();

// ── Event: scheme name ────────────────────────────────────────────

document.getElementById('scheme-name').addEventListener('input', e => {
  state.name = e.target.value;
  renderExport();
});

// ── Event: color format toggle ────────────────────────────────────

document.getElementById('fmt-toggle').addEventListener('click', e => {
  const btn = e.target.closest('.fmt-btn');
  if (!btn) return;
  state.colorFormat = btn.dataset.fmt;
  document.querySelectorAll('#fmt-toggle .fmt-btn')
    .forEach(b => b.classList.toggle('active', b === btn));
  // Refresh all value inputs
  document.querySelectorAll('.color-val-input').forEach(el => {
    el.value = formatColor(el.dataset.hex, state.colorFormat);
  });
});

// ── Event: preview tabs ───────────────────────────────────────────

document.getElementById('preview-tabs').addEventListener('click', e => {
  const btn = e.target.closest('.tab');
  if (!btn) return;
  state.previewMode = btn.dataset.mode;
  document.querySelectorAll('#preview-tabs .tab')
    .forEach(b => b.classList.toggle('active', b === btn));
  renderPreview();
});

// ── Event: export tabs ────────────────────────────────────────────

document.getElementById('export-tabs').addEventListener('click', e => {
  const btn = e.target.closest('.tab');
  if (!btn) return;
  state.exportFormat = btn.dataset.efmt;
  document.querySelectorAll('#export-tabs .tab')
    .forEach(b => b.classList.toggle('active', b === btn));
  renderExport();
});

// ── Event: add color ──────────────────────────────────────────────

document.getElementById('add-color-btn').addEventListener('click', () => {
  // Random vivid hue, same lightness feel as typical accent colors
  const hue = Math.floor(Math.random() * 360);
  const hex = hslToHex(hue, 72, 68);
  state.colors.push({ name: 'New Color', hex });
  renderColorList();
  renderPreview();
  renderExport();
  // Scroll to bottom
  const list = document.getElementById('color-list');
  list.scrollTop = list.scrollHeight;
  // Focus the new name input
  const items = list.querySelectorAll('.color-name-input');
  const last = items[items.length - 1];
  if (last) { last.focus(); last.select(); }
});

// ── Event: reset ──────────────────────────────────────────────────

document.getElementById('reset-btn').addEventListener('click', () => {
  if (!confirm('Reset to the default Catppuccin Mocha palette?')) return;
  state.name   = 'My Scheme';
  state.colors = DEFAULT_COLORS.map(c => ({ ...c }));
  document.getElementById('scheme-name').value = state.name;
  history.replaceState(null, '', location.pathname);
  renderColorList();
  renderPreview();
  renderExport();
});

// ── Event: share ──────────────────────────────────────────────────

document.getElementById('share-btn').addEventListener('click', () => {
  const hash = encodeState();
  const url  = `${location.origin}${location.pathname}#${hash}`;
  history.replaceState(null, '', '#' + hash);
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url)
      .then(() => showToast('Share URL copied!'))
      .catch(() => showToast('URL updated in address bar'));
  } else {
    showToast('URL updated in address bar');
  }
});

// ── Event: copy export ────────────────────────────────────────────

document.getElementById('copy-export-btn').addEventListener('click', e => {
  const code = document.getElementById('export-code').textContent;
  const btn  = e.currentTarget;
  navigator.clipboard.writeText(code).then(() => {
    const orig = btn.innerHTML;
    btn.textContent = '✓ Copied!';
    btn.classList.add('btn-copied');
    setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('btn-copied'); }, 2000);
  }).catch(() => showToast('Copy failed', true));
});
