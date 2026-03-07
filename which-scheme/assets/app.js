// ─────────────────────────────────────────────
// State & cache
// ─────────────────────────────────────────────

const themeCache = new Map();
const editedThemes = new Map();
let colorFormat = 'hex';

function getEditedTheme(themeId) {
  if (!editedThemes.has(themeId)) {
    const orig = themeCache.get(themeId);
    editedThemes.set(themeId, {
      ...orig,
      colors: orig.colors.map(c => ({ ...c })),
      preview: { ...orig.preview },
    });
  }
  return editedThemes.get(themeId);
}

// Global registry — theme files call WhichTheme.register({...})
window.WhichTheme = { register: theme => themeCache.set(theme.id, theme) };

function loadThemeScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-theme-src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.dataset.themeSrc = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

async function loadTheme(id) {
  if (themeCache.has(id)) return themeCache.get(id);
  const entry = THEME_MANIFEST.find(t => t.id === id);
  if (!entry) throw new Error(`Unknown theme: ${id}`);
  await loadThemeScript(entry.src);
  const theme = themeCache.get(id);
  if (!theme) throw new Error(`Theme "${id}" did not register itself`);
  return theme;
}

// ─────────────────────────────────────────────
// Group manifest
// ─────────────────────────────────────────────

const groupMap = new Map();
for (const t of THEME_MANIFEST) {
  if (!groupMap.has(t.group)) groupMap.set(t.group, []);
  groupMap.get(t.group).push(t);
}

// ─────────────────────────────────────────────
// Card rendering
// ─────────────────────────────────────────────

const GITHUB_ICON = `<svg width="15" height="15" viewBox="0 0 98 96" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"/></svg>`;
const GLOBE_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;

function homepageIcon(url) {
  return url && url.includes('github.com') ? GITHUB_ICON : GLOBE_ICON;
}

function renderCard(theme, themeId) {
  const svgContent = generatePreviewSVG(theme.preview);
  const svgDataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;

  const colorItems = theme.colors.map((c, idx) => `
    <div class="color-item">
      <div class="squircle" style="background:${c.hex}"></div>
      <span class="color-name">${c.name}</span>
      <span class="color-value" data-hex="${c.hex}" data-theme="${themeId}" data-idx="${idx}"
            onclick="handleColorClick(this)">${formatColor(c.hex, colorFormat)}</span>
      <button class="copy-icon" onclick="handleColorClick(this.previousElementSibling)" title="Copy">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
      </button>
      <button class="edit-icon" onclick="openColorEdit('${themeId}', ${idx})" title="Edit color">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
      <input type="color" class="color-picker" id="picker-${themeId}-${idx}" value="${c.hex}"
             oninput="applyColorEdit('${themeId}', ${idx}, this.value)">
      <span class="color-copied" id="copied-${themeId}-${idx}">Copied!</span>
    </div>
  `).join('');

  return `
    <div class="theme-card" data-theme-id="${themeId}">
      <div class="card-preview">
        <img src="${svgDataUri}" alt="${theme.name} preview" loading="lazy"/>
      </div>
      <div class="card-body">
        <div class="card-title">
          <span>${theme.name}</span>
          ${theme.homepage ? `<a class="homepage-icon" href="${theme.homepage}" target="_blank" rel="noopener" title="Homepage">${homepageIcon(theme.homepage)}</a>` : ''}
        </div>

        <div class="color-format-toggle" data-theme="${themeId}">
          <button class="fmt-btn ${colorFormat==='hex'?'active':''}" data-fmt="hex" onclick="setFormat('hex')">HEX</button>
          <button class="fmt-btn ${colorFormat==='rgb'?'active':''}" data-fmt="rgb" onclick="setFormat('rgb')">RGB</button>
          <button class="fmt-btn ${colorFormat==='hsl'?'active':''}" data-fmt="hsl" onclick="setFormat('hsl')">HSL</button>
          <button class="fmt-btn ${colorFormat==='oklch'?'active':''}" data-fmt="oklch" onclick="setFormat('oklch')">OKLCH</button>
        </div>

        <div class="color-list">${colorItems}</div>

        <div class="card-actions">
          <button class="btn btn-secondary" onclick="copyAllCss('${themeId}', this)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            Copy CSS vars
          </button>
          <button class="btn btn-ghost" id="reset-${themeId}" onclick="resetTheme('${themeId}')" style="display:none" title="Discard edits">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
            Reset
          </button>
        </div>
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────
// Grouped layout
// ─────────────────────────────────────────────

const container = document.getElementById('cards-container');

container.innerHTML = [...groupMap.entries()].map(([group, themes], i) => `
  <details class="theme-group" data-group-index="${i}">
    <summary class="theme-group-summary">
      <svg class="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
      <span class="theme-group-name">${group}</span>
      <span class="theme-group-count">${themes.length}</span>
    </summary>
    <div class="theme-group-cards" data-group-index="${i}">
      ${themes.map(() => `<div class="loading-card"></div>`).join('')}
    </div>
  </details>
`).join('');

const groupEntries = [...groupMap.entries()];

document.querySelectorAll('details.theme-group').forEach(details => {
  const idx = parseInt(details.dataset.groupIndex, 10);
  const [, themes] = groupEntries[idx];
  const cardsDiv = details.querySelector('.theme-group-cards');
  let loaded = false;

  async function loadGroup() {
    if (loaded) return;
    loaded = true;
    try {
      const loadedThemes = await Promise.all(themes.map(t => loadTheme(t.id)));
      cardsDiv.innerHTML = loadedThemes.map((t, i) => renderCard(t, themes[i].id)).join('');
    } catch (err) {
      console.error('Failed to load group:', err);
      cardsDiv.innerHTML = `<div class="group-error">Failed to load: ${err.message}</div>`;
    }
  }

  details.addEventListener('toggle', () => { if (details.open) loadGroup(); });
  if (details.open) loadGroup();
});

// ─────────────────────────────────────────────
// Interactivity (exposed globally for inline handlers)
// ─────────────────────────────────────────────

window.handleColorClick = function(el) {
  const hex = el.getAttribute('data-hex');
  const themeId = el.getAttribute('data-theme');
  const idx = el.getAttribute('data-idx');
  const value = formatColor(hex, colorFormat);
  navigator.clipboard.writeText(value).then(() => {
    const copied = document.getElementById(`copied-${themeId}-${idx}`);
    if (copied) {
      copied.classList.add('show');
      setTimeout(() => copied.classList.remove('show'), 1500);
    }
  });
};

window.setFormat = function(fmt) {
  colorFormat = fmt;
  document.querySelectorAll('.fmt-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.fmt === fmt);
  });
  document.querySelectorAll('.color-value').forEach(el => {
    el.textContent = formatColor(el.dataset.hex, fmt);
  });
};

window.copyAllCss = function(themeId, btn) {
  const theme = editedThemes.has(themeId) ? editedThemes.get(themeId) : themeCache.get(themeId);
  if (!theme) return;
  const css = buildCssVariables(theme, colorFormat);
  navigator.clipboard.writeText(css).then(() => {
    const orig = btn.innerHTML;
    btn.innerHTML = '✓ Copied!';
    btn.classList.add('btn-copied');
    setTimeout(() => {
      btn.innerHTML = orig;
      btn.classList.remove('btn-copied');
    }, 2000);
  });
};

window.openColorEdit = function(themeId, idx) {
  document.getElementById(`picker-${themeId}-${idx}`).click();
};

window.applyColorEdit = function(themeId, idx, newHex) {
  const theme = getEditedTheme(themeId);
  const oldHex = theme.colors[idx].hex;
  theme.colors[idx].hex = newHex;

  // Sync any preview colors that matched the old hex
  for (const key of Object.keys(theme.preview)) {
    if (theme.preview[key] && theme.preview[key].toLowerCase() === oldHex.toLowerCase()) {
      theme.preview[key] = newHex;
    }
  }

  // Update DOM
  const card = document.querySelector(`.theme-card[data-theme-id="${themeId}"]`);
  const colorValue = card.querySelector(`.color-value[data-idx="${idx}"]`);
  const squircle = colorValue.closest('.color-item').querySelector('.squircle');
  colorValue.dataset.hex = newHex;
  colorValue.textContent = formatColor(newHex, colorFormat);
  squircle.style.background = newHex;

  // Live-update preview SVG
  const svgContent = generatePreviewSVG(theme.preview);
  card.querySelector('.card-preview img').src =
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;

  // Show reset button
  const resetBtn = document.getElementById(`reset-${themeId}`);
  if (resetBtn) resetBtn.style.display = '';
};

window.resetTheme = function(themeId) {
  editedThemes.delete(themeId);
  const orig = themeCache.get(themeId);
  const card = document.querySelector(`.theme-card[data-theme-id="${themeId}"]`);

  orig.colors.forEach((c, idx) => {
    const colorValue = card.querySelector(`.color-value[data-idx="${idx}"]`);
    if (!colorValue) return;
    const squircle = colorValue.closest('.color-item').querySelector('.squircle');
    const picker = document.getElementById(`picker-${themeId}-${idx}`);
    colorValue.dataset.hex = c.hex;
    colorValue.textContent = formatColor(c.hex, colorFormat);
    squircle.style.background = c.hex;
    if (picker) picker.value = c.hex;
  });

  // Restore preview
  const svgContent = generatePreviewSVG(orig.preview);
  card.querySelector('.card-preview img').src =
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;

  // Hide reset button
  const resetBtn = document.getElementById(`reset-${themeId}`);
  if (resetBtn) resetBtn.style.display = 'none';
};
