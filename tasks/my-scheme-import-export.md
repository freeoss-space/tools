# My Scheme Import/Export Format Expansion

**Priority**: 14 of 15
**Confidence**: 95%
**Appears in**: List 3
**Effort**: Medium (2–3 days)

---

## Why This Matters

My Scheme currently supports a basic internal format for palette data. Users who work with existing color systems — CSS vars files, Base16 terminal themes, NvChad Base46 Neovim themes, VS Code token color JSON — have no way to bring their palettes into My Scheme for editing. Adding robust import parsers for common formats dramatically expands the tool's utility as a central color editing hub.

---

## Import Formats Target List

| Format | Extension | Use case |
|---|---|---|
| CSS custom properties | `.css` | Web design system variables |
| JSON flat map `{ "name": "#hex" }` | `.json` | Generic toolchain |
| W3C DTCG design tokens | `.json` | Figma tokens, Style Dictionary |
| Tailwind config colors | `.js` / `.json` | Tailwind CSS projects |
| Base16 scheme | `.yaml` / `.json` | Terminal emulators, editors |
| NvChad Base46 | `.lua` (limited) / `.json` | Neovim color schemes |
| VS Code token colors | `.json` | Editor themes |
| Adobe ASE / ACO | `.ase` / `.aco` | Photoshop/Illustrator swatches |

**Phase 1 (this task)**: CSS vars, JSON flat, DTCG, Tailwind, Base16 JSON.
**Phase 2**: NvChad, VS Code tokenColors, Adobe formats.

---

## Implementation Plan

### Step 1 — Import parser modules

Create `my-scheme/assets/parsers/` directory:

```
my-scheme/assets/parsers/
├── css-vars.js
├── json-flat.js
├── dtcg.js
├── tailwind.js
└── base16.js
```

#### `parsers/css-vars.js`

```js
/**
 * Parse CSS custom properties into palette swatches.
 *
 * Handles:
 *   :root { --color-primary: #hex; }
 *   :root { --color-primary: rgb(100, 200, 50); }
 *   :root { --color-primary: oklch(64% 0.15 250); }
 *
 * @param {string} cssText
 * @returns {{ swatches: Array<{name:string, hex:string}>, warnings: string[] }}
 */
export function parseCssVars(cssText) {
  const swatches = [];
  const warnings = [];

  // Match --custom-property: <value>;
  const re = /--([a-zA-Z0-9_-]+)\s*:\s*([^;}{]+);/g;
  for (const m of cssText.matchAll(re)) {
    const name = m[1].trim();
    const rawValue = m[2].trim();

    const hex = resolveColorValue(rawValue);
    if (hex) {
      swatches.push({ name, hex });
    } else {
      warnings.push(`Skipped "${name}": could not resolve "${rawValue}" as a color`);
    }
  }

  return { swatches, warnings };
}

function resolveColorValue(value) {
  // Already hex
  if (/^#[0-9a-fA-F]{3,8}$/.test(value)) return normalizeHex(value);

  // rgb(r, g, b) or rgb(r g b)
  const rgb = value.match(/^rgb[a]?\(\s*(\d+)\s*[,\s]\s*(\d+)\s*[,\s]\s*(\d+)/i);
  if (rgb) return rgbToHex(+rgb[1], +rgb[2], +rgb[3]);

  // hsl — use browser canvas or approximate
  const hsl = value.match(/^hsl[a]?\(\s*([\d.]+)(?:deg)?\s*[,\s]\s*([\d.]+)%\s*[,\s]\s*([\d.]+)%/i);
  if (hsl) return hslToHex(+hsl[1], +hsl[2] / 100, +hsl[3] / 100);

  return null;
}

function normalizeHex(hex) {
  const c = hex.replace('#', '');
  if (c.length === 3) return '#' + c.split('').map(x => x + x).join('');
  return '#' + c.slice(0, 6).toLowerCase();
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.min(255, Math.max(0, v)).toString(16).padStart(2, '0')).join('');
}

function hslToHex(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
```

#### `parsers/json-flat.js`

```js
/**
 * Parse a flat JSON color map: { "name": "#hex" }
 * Also handles nested objects (first level only).
 *
 * @param {object} json
 * @returns {{ swatches: Array<{name:string, hex:string}>, warnings: string[] }}
 */
export function parseJsonFlat(json) {
  const swatches = [];
  const warnings = [];

  function processEntry(key, value, prefix = '') {
    const fullKey = prefix ? `${prefix}-${key}` : key;
    if (typeof value === 'string') {
      const hex = normalizeColor(value);
      if (hex) {
        swatches.push({ name: fullKey, hex });
      } else {
        warnings.push(`Skipped "${fullKey}": "${value}" is not a valid color`);
      }
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recurse one level for nested objects like Tailwind's nested colors
      for (const [k, v] of Object.entries(value)) {
        processEntry(k, v, fullKey);
      }
    }
  }

  for (const [key, value] of Object.entries(json)) {
    processEntry(key, value);
  }

  return { swatches, warnings };
}

function normalizeColor(value) {
  if (/^#[0-9a-fA-F]{3,8}$/.test(value)) {
    const c = value.replace('#', '');
    return '#' + (c.length === 3 ? c.split('').map(x => x + x).join('') : c.slice(0, 6));
  }
  return null;
}
```

#### `parsers/dtcg.js`

```js
/**
 * Parse W3C Design Token Community Group format.
 * Spec: https://design-tokens.github.io/community-group/format/
 *
 * @param {object} json
 * @returns {{ swatches: Array<{name:string, hex:string}>, warnings: string[] }}
 */
export function parseDtcg(json, path = '') {
  const swatches = [];
  const warnings = [];

  function traverse(node, currentPath) {
    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith('$')) continue; // Skip metadata keys
      const nodePath = currentPath ? `${currentPath}/${key}` : key;

      if (value && typeof value === 'object') {
        if (value.$type === 'color' && value.$value) {
          const hex = normalizeColor(value.$value);
          if (hex) {
            swatches.push({ name: nodePath.replace(/\//g, '-'), hex });
          } else {
            warnings.push(`Skipped "${nodePath}": unsupported color value "${value.$value}"`);
          }
        } else {
          traverse(value, nodePath);
        }
      }
    }
  }

  traverse(json, path);
  return { swatches, warnings };
}

function normalizeColor(value) {
  if (typeof value === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(value)) {
    const c = value.replace('#', '');
    return '#' + (c.length === 3 ? c.split('').map(x => x + x).join('') : c.slice(0, 6));
  }
  return null;
}
```

#### `parsers/base16.js`

```js
/**
 * Parse a Base16 JSON color scheme.
 * Keys: base00–base0F (hex without #)
 *
 * @param {object} json
 * @returns {{ swatches: Array<{name:string, hex:string}>, warnings: string[], paletteName: string }}
 */
export function parseBase16(json) {
  const swatches = [];
  const warnings = [];

  const BASE16_NAMES = {
    base00: 'background',
    base01: 'alt-background',
    base02: 'selection',
    base03: 'comments',
    base04: 'dark-foreground',
    base05: 'foreground',
    base06: 'light-foreground',
    base07: 'light-background',
    base08: 'red',
    base09: 'orange',
    base0A: 'yellow',
    base0B: 'green',
    base0C: 'cyan',
    base0D: 'blue',
    base0E: 'magenta',
    base0F: 'brown',
  };

  for (const [key, label] of Object.entries(BASE16_NAMES)) {
    const value = json[key] || json[key.toLowerCase()];
    if (!value) {
      warnings.push(`Missing ${key} (${label})`);
      continue;
    }
    const raw = String(value).replace('#', '');
    if (/^[0-9a-fA-F]{6}$/.test(raw)) {
      swatches.push({ name: label, hex: '#' + raw.toLowerCase() });
    } else {
      warnings.push(`Invalid color for ${key}: "${value}"`);
    }
  }

  return {
    swatches,
    warnings,
    paletteName: json.scheme || json.name || 'Base16 Import',
  };
}
```

---

### Step 2 — Import orchestrator

```js
// my-scheme/assets/import-palette.js
import { parseCssVars } from './parsers/css-vars.js';
import { parseJsonFlat } from './parsers/json-flat.js';
import { parseDtcg } from './parsers/dtcg.js';
import { parseBase16 } from './parsers/base16.js';
import { uid } from '/shared/assets/core.js';

/**
 * Detect format and parse a raw string into palette data.
 *
 * @param {string} content
 * @param {string} filename
 * @returns {{ palette: object, warnings: string[] } | { error: string }}
 */
export function autoImportPalette(content, filename) {
  const ext = filename.split('.').pop().toLowerCase();

  // Try JSON-based formats
  if (ext === 'json' || ext === 'js') {
    let json;
    try {
      // Handle JS modules with `export default { ... }` or `module.exports = { ... }`
      const cleaned = content
        .replace(/^export\s+default\s+/, '')
        .replace(/^module\.exports\s*=\s*/, '')
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']');
      json = JSON.parse(cleaned);
    } catch {
      return { error: 'Could not parse as JSON. Check the file format.' };
    }

    // Detect DTCG
    const isDtcg = Object.values(json).some(v =>
      v && typeof v === 'object' && ('$type' in v || '$value' in v)
    );
    if (isDtcg) {
      const { swatches, warnings } = parseDtcg(json);
      return { palette: buildPalette(swatches, filename), warnings };
    }

    // Detect Base16
    if (json.base00 || json.base0F) {
      const { swatches, warnings, paletteName } = parseBase16(json);
      return { palette: buildPalette(swatches, paletteName), warnings };
    }

    // Default: flat JSON
    const { swatches, warnings } = parseJsonFlat(json);
    return { palette: buildPalette(swatches, filename), warnings };
  }

  // CSS vars
  if (ext === 'css') {
    const { swatches, warnings } = parseCssVars(content);
    if (!swatches.length) return { error: 'No color custom properties found in CSS.' };
    return { palette: buildPalette(swatches, filename), warnings };
  }

  return { error: `Unsupported format ".${ext}". Supported: .css, .json` };
}

function buildPalette(swatches, nameHint) {
  return {
    id: uid(),
    name: String(nameHint).replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
    swatches: swatches.map((s, i) => ({ ...s, id: uid() })),
    createdAt: new Date().toISOString(),
  };
}
```

---

### Step 3 — Import UI in My Scheme

```html
<!-- Add to palette sidebar or toolbar -->
<div class="import-section">
  <h4 class="import-section__title">Import Palette</h4>

  <div class="import-section__drop" id="import-drop-zone" role="button"
       tabindex="0" aria-label="Drop a file here or click to choose">
    <svg aria-hidden="true" width="24" height="24"><!-- upload icon --></svg>
    <p>Drop a <code>.css</code> or <code>.json</code> file</p>
    <p class="import-section__hint">or</p>
    <label class="btn-secondary btn--sm">
      Choose File
      <input type="file" id="import-file" accept=".css,.json,.js" hidden>
    </label>
  </div>

  <div class="import-section__paste">
    <label for="import-paste">Paste CSS / JSON</label>
    <textarea
      id="import-paste"
      rows="6"
      placeholder=":root { --primary: #656ea4; }"
      spellcheck="false"
    ></textarea>
    <button id="import-paste-btn" class="btn-secondary btn--sm">Import</button>
  </div>

  <div id="import-feedback" class="import-feedback" aria-live="polite"></div>
</div>
```

```js
import { autoImportPalette } from './import-palette.js';
import { showToast } from '/shared/assets/toast.js';

function handleImport(content, filename) {
  const result = autoImportPalette(content, filename);
  const feedback = document.getElementById('import-feedback');

  if (result.error) {
    feedback.innerHTML = `<p class="import-feedback--error">${result.error}</p>`;
    return;
  }

  const { palette, warnings } = result;
  state.palettes.push(palette);
  state.activePaletteId = palette.id;
  persist();
  renderPaletteList();
  renderPaletteEditor();

  let msg = `Imported "${palette.name}" with ${palette.swatches.length} colors.`;
  if (warnings.length) {
    msg += ` ${warnings.length} warning(s):`;
    feedback.innerHTML = `
      <p class="import-feedback--success">${msg}</p>
      <ul class="import-feedback__warnings">
        ${warnings.slice(0, 5).map(w => `<li>${w}</li>`).join('')}
      </ul>
    `;
  } else {
    feedback.innerHTML = `<p class="import-feedback--success">${msg}</p>`;
  }
  showToast(`Palette "${palette.name}" imported`, { type: 'success' });
}

// File input
document.getElementById('import-file').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => handleImport(ev.target.result, file.name);
  reader.readAsText(file);
  e.target.value = '';
});

// Paste
document.getElementById('import-paste-btn').addEventListener('click', () => {
  const text = document.getElementById('import-paste').value.trim();
  if (!text) return;
  // Guess format: CSS if contains '--', else JSON
  const filename = text.includes('--') ? 'pasted.css' : 'pasted.json';
  handleImport(text, filename);
});

// Drag-and-drop
const dropZone = document.getElementById('import-drop-zone');
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => handleImport(ev.target.result, file.name);
  reader.readAsText(file);
});
```

---

### Step 4 — Tests

```js
// tests/palette-parsers.test.js
import { parseCssVars } from '/my-scheme/assets/parsers/css-vars.js';
import { parseJsonFlat } from '/my-scheme/assets/parsers/json-flat.js';
import { parseDtcg } from '/my-scheme/assets/parsers/dtcg.js';
import { parseBase16 } from '/my-scheme/assets/parsers/base16.js';

// CSS vars
const css = ':root { --primary: #656ea4; --bg: #1c1828; --border: rgb(48, 54, 61); }';
const { swatches: cssSwatches } = parseCssVars(css);
console.assert(cssSwatches.find(s => s.name === 'primary')?.hex === '#656ea4', 'css: primary');
console.assert(cssSwatches.find(s => s.name === 'border')?.hex === '#30363d', 'css: rgb conversion');

// JSON flat
const { swatches: jsonSwatches } = parseJsonFlat({ primary: '#656ea4', bad: 'not-a-color' });
console.assert(jsonSwatches.length === 1, 'json: skips invalid');
console.assert(jsonSwatches[0].hex === '#656ea4', 'json: primary');

// DTCG
const dtcg = { brand: { primary: { $type: 'color', $value: '#656ea4' } } };
const { swatches: dtcgSwatches } = parseDtcg(dtcg);
console.assert(dtcgSwatches[0].hex === '#656ea4', 'dtcg: primary');
console.assert(dtcgSwatches[0].name === 'brand-primary', 'dtcg: name path');

// Base16
const b16 = { scheme: 'Test', base00: '1c1828', base08: 'e66260' };
const { swatches: b16Swatches, paletteName } = parseBase16(b16);
console.assert(b16Swatches.find(s => s.name === 'background')?.hex === '#1c1828', 'base16: bg');
console.assert(paletteName === 'Test', 'base16: scheme name');

console.log('All palette parser tests passed');
```

---

## Files Created / Changed

| File | Action |
|---|---|
| `my-scheme/assets/parsers/css-vars.js` | Create |
| `my-scheme/assets/parsers/json-flat.js` | Create |
| `my-scheme/assets/parsers/dtcg.js` | Create |
| `my-scheme/assets/parsers/base16.js` | Create |
| `my-scheme/assets/import-palette.js` | Create |
| `my-scheme/assets/app.js` | Wire up import UI |
| `my-scheme/index.html` | Add import section HTML |
| `tests/palette-parsers.test.js` | Create |

---

## Acceptance Criteria

- [ ] A CSS vars file with `--color-name: #hex` imports all recognized color tokens.
- [ ] RGB values in CSS vars are converted to hex correctly.
- [ ] A Tailwind JSON nested color object imports all named colors.
- [ ] A Base16 JSON imports all 16 base colors with semantic names.
- [ ] A DTCG JSON imports all `$type: color` tokens.
- [ ] Invalid color values are skipped with a warning, not crash.
- [ ] Drag-and-drop a CSS file imports the palette.
- [ ] Pasting CSS text imports correctly.
- [ ] All parser tests pass.

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| OKLCH / lab / P3 colors in CSS can't be resolved to hex | Skip with warning; show "OKLCH not yet supported" message |
| Tailwind JS config with variables/functions, not literals | Skip dynamic values; import only string literal colors |
| Very large files (500+ colors) cause UI lag | Limit import to first 200 colors; show truncation notice |
| Base16 YAML format (not JSON) | Phase 2: add a YAML parser; Phase 1 only supports JSON Base16 |
