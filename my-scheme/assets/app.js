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
  name:          'My Scheme',
  variants:      [{ name: 'Dark', colors: DEFAULT_COLORS.map(c => ({ ...c })) }],
  activeVariant: 0,
  colorFormat:   'hex',
  previewMode:   'editor',
  exportFormat:  'css',
};

// Active-variant shortcut
const vc = () => state.variants[state.activeVariant];

// ── URL hash encode / decode ──────────────────────────────────────

function encodeState() {
  const data = {
    n: state.name,
    v: state.variants.map(v => ({ n: v.name, c: v.colors.map(c => [c.name, c.hex]) })),
  };
  return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
}

function decodeState(hash) {
  try {
    const data = JSON.parse(decodeURIComponent(escape(atob(hash))));
    if (!data) return null;

    // New format: { n, v: [{ n, c }] }
    if (data.v && Array.isArray(data.v)) {
      const variants = data.v
        .map(v => ({
          name:   v.n || 'Variant',
          colors: (v.c || []).map(([name, hex]) => ({ name: String(name), hex: String(hex) })),
        }))
        .filter(v => v.colors.length > 0);
      if (!variants.length) return null;
      return { name: data.n || 'My Scheme', variants };
    }

    // Legacy format: { n, c: [[name, hex]] }
    if (data.c && Array.isArray(data.c)) {
      return {
        name: data.n || 'My Scheme',
        variants: [{
          name:   'Dark',
          colors: data.c.map(([name, hex]) => ({ name: String(name), hex: String(hex) })),
        }],
      };
    }

    return null;
  } catch { return null; }
}

function syncHash() {
  history.replaceState(null, '', '#' + encodeState());
}

function loadFromHash() {
  const hash = location.hash.slice(1);
  if (!hash) return;
  const decoded = decodeState(hash);
  if (!decoded) return;
  state.name          = decoded.name;
  state.variants      = decoded.variants;
  state.activeVariant = 0;
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

// ── Render: variant tabs ──────────────────────────────────────────

function renderVariantTabs() {
  const bar    = document.getElementById('variant-bar');
  const canDel = state.variants.length > 1;

  bar.innerHTML = state.variants.map((v, i) => `
    <div class="variant-tab${i === state.activeVariant ? ' active' : ''}" data-vidx="${i}">
      <span class="variant-tab-name" data-vidx="${i}" title="Double-click to rename">${esc(v.name)}</span>
      ${canDel ? `<button class="variant-del" data-vidx="${i}" aria-label="Remove variant">
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>` : ''}
    </div>
  `).join('') + `
    <button class="variant-add" id="add-variant-btn">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      Add variant
    </button>`;

  // Switch active variant
  bar.querySelectorAll('.variant-tab').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.closest('.variant-del')) return;
      const i = +el.dataset.vidx;
      if (i === state.activeVariant) return;
      state.activeVariant = i;
      renderVariantTabs();
      renderColorList();
      renderPreview();
      renderExport();
    });
  });

  // Double-click to rename
  bar.querySelectorAll('.variant-tab-name').forEach(el => {
    el.addEventListener('dblclick', () => {
      const i    = +el.dataset.vidx;
      const name = prompt('Rename variant:', state.variants[i].name);
      if (name !== null && name.trim()) {
        state.variants[i].name = name.trim();
        renderVariantTabs();
        renderPreview();
        syncHash();
      }
    });
  });

  // Delete variant
  bar.querySelectorAll('.variant-del').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      const i = +el.dataset.vidx;
      if (state.variants.length <= 1) return;
      state.variants.splice(i, 1);
      if (state.activeVariant >= state.variants.length) state.activeVariant = state.variants.length - 1;
      renderVariantTabs();
      renderColorList();
      renderPreview();
      renderExport();
      syncHash();
    });
  });

  // Add variant
  const addBtn = document.getElementById('add-variant-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const SUGGESTED = ['Dark', 'Light', 'Dim', 'OLED', 'High Contrast', 'Soft'];
      const existing  = new Set(state.variants.map(v => v.name));
      const name      = SUGGESTED.find(n => !existing.has(n)) ?? `Variant ${state.variants.length + 1}`;
      state.variants.push({ name, colors: vc().colors.map(c => ({ ...c })) });
      state.activeVariant = state.variants.length - 1;
      renderVariantTabs();
      renderColorList();
      renderPreview();
      renderExport();
      syncHash();
    });
  }
}

// ── Render: color palette as swatch cards ─────────────────────────

function renderColorList() {
  const list = document.getElementById('color-list');

  list.innerHTML = vc().colors.map((c, i) => `
    <div class="swatch-card" data-idx="${i}">
      <div class="swatch-color" style="background:${c.hex}">
        <input type="color" class="swatch-picker" value="${c.hex}" data-idx="${i}" tabindex="-1">
        <button class="del-btn" data-idx="${i}" title="Remove">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="swatch-info">
        <input type="text" class="color-name-input" value="${esc(c.name)}" data-idx="${i}" placeholder="Name" spellcheck="false">
        <input type="text" class="color-val-input" value="${esc(formatColor(c.hex, state.colorFormat))}" data-idx="${i}" data-hex="${c.hex}" spellcheck="false">
      </div>
    </div>
  `).join('');

  // Update palette label with current count
  const label = document.getElementById('palette-label');
  if (label) label.textContent = `Palette — ${vc().colors.length} Colors`;

  // Native color picker
  list.querySelectorAll('.swatch-picker').forEach(el => {
    el.addEventListener('input', e => updateColor(+e.target.dataset.idx, e.target.value));
  });

  // Name editing
  list.querySelectorAll('.color-name-input').forEach(el => {
    el.addEventListener('change', e => {
      vc().colors[+e.target.dataset.idx].name = e.target.value;
      renderExport();
      syncHash();
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
        e.target.value = formatColor(vc().colors[i].hex, state.colorFormat);
      }
    });
    // Allow Escape to cancel
    el.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        e.target.value = formatColor(vc().colors[+e.target.dataset.idx].hex, state.colorFormat);
        e.target.blur();
      }
    });
  });

  // Delete
  list.querySelectorAll('.del-btn').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      const i = +e.currentTarget.dataset.idx;
      if (vc().colors.length <= 1) return;
      vc().colors.splice(i, 1);
      renderColorList();
      renderPreview();
      renderExport();
      syncHash();
    });
  });
}

// ── Render: preview ───────────────────────────────────────────────

function renderPreview() {
  const img    = document.getElementById('preview-img');
  const iframe = document.getElementById('preview-iframe');
  const result = generatePreview(state.previewMode, vc().colors, state.variants);

  if (result.type === 'html') {
    iframe.srcdoc = result.content;
    iframe.style.display = 'block';
    img.style.display    = 'none';
  } else {
    img.src              = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(result.content)}`;
    img.style.display    = 'block';
    iframe.style.display = 'none';
  }
}

// ── Render: export ────────────────────────────────────────────────

function renderExport() {
  const el = document.getElementById('export-code');
  switch (state.exportFormat) {
    case 'base16':    el.textContent = buildBase16Yaml(vc().colors, state.name);  break;
    case 'base24':    el.textContent = buildBase24Yaml(vc().colors, state.name);  break;
    case 'nvchad':    el.textContent = buildNvChad(vc().colors, state.name);      break;
    case 'json':      el.textContent = buildJson(vc().colors, state.name);        break;
    case 'alacritty': el.textContent = buildAlacritty(vc().colors, state.name);  break;
    case 'kitty':     el.textContent = buildKitty(vc().colors, state.name);      break;
    case 'wezterm':   el.textContent = buildWezTerm(vc().colors, state.name);    break;
    case 'ghostty':   el.textContent = buildGhostty(vc().colors, state.name);    break;
    case 'vim':       el.textContent = buildVim(vc().colors, state.name);        break;
    case 'tmux':      el.textContent = buildTmux(vc().colors, state.name);       break;
    default:          el.textContent = buildCssVars(vc().colors, state.name);
  }
}

function exportFilename() {
  const slug = (state.name || 'my-scheme').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  switch (state.exportFormat) {
    case 'base16':    return `${slug}.yaml`;
    case 'base24':    return `${slug}-base24.yaml`;
    case 'nvchad':    return `${slug}.lua`;
    case 'json':      return `${slug}.json`;
    case 'alacritty': return `${slug}.toml`;
    case 'kitty':     return `${slug}.conf`;
    case 'wezterm':   return `${slug}.lua`;
    case 'ghostty':   return slug;
    case 'vim':       return `${slug}.vim`;
    case 'tmux':      return `${slug}-tmux.conf`;
    default:          return `${slug}.css`;
  }
}

// ── Update a single color (partial re-render) ─────────────────────

function updateColor(idx, hex) {
  vc().colors[idx].hex = hex;

  // Update swatch color area and value input in-place
  const card = document.querySelector(`.swatch-card[data-idx="${idx}"]`);
  if (card) {
    card.querySelector('.swatch-color').style.background = hex;
    card.querySelector('.swatch-picker').value = hex;
    const vi = card.querySelector('.color-val-input');
    vi.dataset.hex = hex;
    if (document.activeElement !== vi) {
      vi.value = formatColor(hex, state.colorFormat);
    }
  }

  renderPreview();
  renderExport();
  syncHash();
}

// ── Toast ─────────────────────────────────────────────────────────

function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = isError ? '#E66260' : '#52B788';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

// ── Init ──────────────────────────────────────────────────────────

loadFromHash();
renderVariantTabs();
renderColorList();
renderPreview();
renderExport();

// ── Event: scheme name ────────────────────────────────────────────

document.getElementById('scheme-name').addEventListener('input', e => {
  state.name = e.target.value;
  renderExport();
  syncHash();
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

document.getElementById('export-tabs-groups').addEventListener('click', e => {
  const btn = e.target.closest('.tab');
  if (!btn) return;
  state.exportFormat = btn.dataset.efmt;
  document.querySelectorAll('#export-tabs-groups .tab')
    .forEach(b => b.classList.toggle('active', b === btn));
  renderExport();
});

// ── Event: add color ──────────────────────────────────────────────

document.getElementById('add-color-btn').addEventListener('click', () => {
  const hue = Math.floor(Math.random() * 360);
  const hex = hslToHex(hue, 72, 68);
  vc().colors.push({ name: 'New Color', hex });
  renderColorList();
  renderPreview();
  renderExport();
  syncHash();
  // Scroll new card into view and focus its name input
  const cards = document.querySelectorAll('.swatch-card');
  const last  = cards[cards.length - 1];
  if (last) {
    last.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    const nameInput = last.querySelector('.color-name-input');
    if (nameInput) { nameInput.focus(); nameInput.select(); }
  }
});

// ── Event: reset ──────────────────────────────────────────────────

document.getElementById('reset-btn').addEventListener('click', () => {
  if (!confirm('Reset to the default Catppuccin Mocha palette?')) return;
  state.name          = 'My Scheme';
  state.variants      = [{ name: 'Dark', colors: DEFAULT_COLORS.map(c => ({ ...c })) }];
  state.activeVariant = 0;
  document.getElementById('scheme-name').value = state.name;
  history.replaceState(null, '', location.pathname);
  renderVariantTabs();
  renderColorList();
  renderPreview();
  renderExport();
});

// ── Share modal ────────────────────────────────────────────────────

function openShareModal() {
  syncHash();
  const url = `${location.origin}${location.pathname}${location.hash}`;
  const input = document.getElementById('share-url-input');
  input.value = url;
  document.getElementById('share-modal').removeAttribute('hidden');
  requestAnimationFrame(() => { input.focus(); input.select(); });
}

function closeShareModal() {
  document.getElementById('share-modal').setAttribute('hidden', '');
}

document.getElementById('share-btn').addEventListener('click', openShareModal);
document.getElementById('share-modal-close').addEventListener('click', closeShareModal);

document.getElementById('share-modal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeShareModal();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeShareModal();
});

document.getElementById('share-copy-btn').addEventListener('click', e => {
  const url = document.getElementById('share-url-input').value;
  const btn = e.currentTarget;
  navigator.clipboard.writeText(url).then(() => {
    const orig = btn.innerHTML;
    btn.textContent = '✓ Copied!';
    btn.classList.add('btn-copied');
    setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('btn-copied'); }, 2000);
  }).catch(() => showToast('Copy failed', true));
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

// ── Event: download export ────────────────────────────────────────

document.getElementById('download-export-btn').addEventListener('click', () => {
  const code = document.getElementById('export-code').textContent;
  const blob = new Blob([code], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = exportFilename();
  a.click();
  URL.revokeObjectURL(url);
});
