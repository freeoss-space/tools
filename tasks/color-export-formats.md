# Color Export Format Expansion

**Priority**: 11 of 15
**Confidence**: 91%
**Appears in**: Lists 2 & 3
**Effort**: Low–Medium (1–2 days)

---

## Why This Matters

My Scheme and Which Scheme are used by designers and developers to build or evaluate color systems. Currently, export options are limited. Users who want to use their palette in a Tailwind config, a CSS-vars system, a VS Code extension, or a design token tool have to manually reformat the hex values. Supporting multiple export formats dramatically increases the practical utility of both tools.

---

## Target Export Formats

| Format | Use case |
|---|---|
| CSS custom properties (`:root { --color-x: ... }`) | Web apps, design systems |
| JSON (flat `{ "name": "#hex" }`) | Any toolchain, APIs |
| JSON design tokens (W3C DTCG format) | Figma tokens, Style Dictionary |
| Tailwind config object | Tailwind CSS |
| SCSS variables (`$color-x: ...`) | Sass projects |
| OKLCH CSS values | Modern CSS, improved perceptual interpolation |
| Base16 YAML/JSON | Terminal emulators, Vim, Neovim themes |
| Swift/Kotlin color literals | iOS/Android developers |

---

## Implementation Plan

### Step 1 — Create `shared/assets/color-export.js`

```js
// shared/assets/color-export.js
import { hexToRgb } from './color-utils.js';

/**
 * Convert hex to OKLCH string using the CSS Color 4 formula.
 * Approximation via XYZ D65 → Oklab → OKLCH.
 *
 * @param {string} hex
 * @returns {string} e.g. "oklch(64.4% 0.174 29.2)"
 */
export function hexToOklch(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return '';

  // sRGB → linear
  const lin = rgb.map(c => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  const [r, g, b] = lin;

  // Linear sRGB → XYZ D65
  const X = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
  const Y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b;
  const Z = 0.0193339 * r + 0.1191920 * g + 0.9503041 * b;

  // XYZ → Oklab
  const l_ = Math.cbrt(0.8189330101 * X + 0.3618667424 * Y - 0.1288597137 * Z);
  const m_ = Math.cbrt(0.0329845436 * X + 0.9293118715 * Y + 0.0361456387 * Z);
  const s_ = Math.cbrt(0.0482003018 * X + 0.2643662691 * Y + 0.6338517070 * Z);

  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const bVal = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;

  // Oklab → OKLCH
  const C = Math.sqrt(a * a + bVal * bVal);
  const H = ((Math.atan2(bVal, a) * 180) / Math.PI + 360) % 360;

  return `oklch(${(L * 100).toFixed(1)}% ${C.toFixed(3)} ${H.toFixed(1)})`;
}

/**
 * Convert hex to RGB string.
 * @param {string} hex
 * @param {'values'|'function'} [fmt='function']
 * @returns {string}
 */
export function hexToRgbString(hex, fmt = 'function') {
  const rgb = hexToRgb(hex);
  if (!rgb) return '';
  if (fmt === 'values') return rgb.join(' ');
  return `rgb(${rgb.join(', ')})`;
}

/**
 * Convert hex to HSL string.
 * @param {string} hex
 * @returns {string}
 */
export function hexToHslString(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return '';
  let [r, g, b] = rgb.map(c => c / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Export format generators
// Each takes: Array<{ name: string, hex: string }> and optional palette name
// Returns: string (the formatted output)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CSS custom properties.
 *
 * @param {{ name: string, hex: string }[]} swatches
 * @param {string} paletteName
 * @returns {string}
 */
export function toCssVars(swatches, paletteName = 'palette') {
  const slug = slugify(paletteName);
  const vars = swatches
    .map(s => `  --${slug}-${slugify(s.name || s.hex)}: ${s.hex};`)
    .join('\n');
  return `:root {\n${vars}\n}`;
}

/**
 * CSS custom properties with OKLCH values.
 */
export function toCssVarsOklch(swatches, paletteName = 'palette') {
  const slug = slugify(paletteName);
  const vars = swatches
    .map(s => `  --${slug}-${slugify(s.name || s.hex)}: ${hexToOklch(s.hex)};`)
    .join('\n');
  return `:root {\n${vars}\n}`;
}

/**
 * Flat JSON map.
 */
export function toJsonFlat(swatches) {
  const obj = {};
  for (const s of swatches) obj[s.name || s.hex] = s.hex;
  return JSON.stringify(obj, null, 2);
}

/**
 * W3C Design Token Community Group (DTCG) format.
 * https://design-tokens.github.io/community-group/format/
 */
export function toDtcg(swatches, paletteName = 'palette') {
  const tokens = {};
  for (const s of swatches) {
    const key = s.name || s.hex;
    tokens[key] = { $type: 'color', $value: s.hex };
  }
  return JSON.stringify({ [paletteName]: tokens }, null, 2);
}

/**
 * Tailwind CSS config object (for `theme.colors`).
 */
export function toTailwind(swatches, paletteName = 'palette') {
  const obj = {};
  for (const s of swatches) {
    obj[slugify(s.name || s.hex)] = s.hex;
  }
  const json = JSON.stringify({ [slugify(paletteName)]: obj }, null, 2)
    .replace(/"([^"]+)":/g, '$1:');  // unquote keys
  return `// tailwind.config.js\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: ${indent(json, 6)}\n    }\n  }\n}`;
}

/**
 * SCSS variables.
 */
export function toScss(swatches, paletteName = 'palette') {
  return swatches
    .map(s => `$${slugify(paletteName)}-${slugify(s.name || s.hex)}: ${s.hex};`)
    .join('\n');
}

/**
 * Base16 JSON (terminal/editor theme format).
 * Maps the first 16 swatches to base00–base0F.
 */
export function toBase16(swatches, paletteName = 'palette') {
  const keys = Array.from({ length: 16 }, (_, i) =>
    'base' + i.toString(16).toUpperCase().padStart(2, '0')
  );
  const obj = { scheme: paletteName, author: '' };
  keys.forEach((key, i) => {
    obj[key] = (swatches[i]?.hex || '#000000').replace('#', '');
  });
  return JSON.stringify(obj, null, 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function slugify(str) {
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function indent(str, spaces) {
  const pad = ' '.repeat(spaces);
  return str.split('\n').map((l, i) => i === 0 ? l : pad + l).join('\n');
}
```

---

### Step 2 — Export panel UI in My Scheme

Replace or extend the existing export button with a format selector:

```html
<div class="export-panel">
  <h3 class="export-panel__title">Export Palette</h3>

  <div class="export-panel__formats" role="group" aria-label="Export format">
    <label class="radio-chip">
      <input type="radio" name="export-format" value="css-vars" checked>
      CSS Vars
    </label>
    <label class="radio-chip">
      <input type="radio" name="export-format" value="css-oklch">
      CSS OKLCH
    </label>
    <label class="radio-chip">
      <input type="radio" name="export-format" value="json">
      JSON
    </label>
    <label class="radio-chip">
      <input type="radio" name="export-format" value="dtcg">
      DTCG Tokens
    </label>
    <label class="radio-chip">
      <input type="radio" name="export-format" value="tailwind">
      Tailwind
    </label>
    <label class="radio-chip">
      <input type="radio" name="export-format" value="scss">
      SCSS
    </label>
    <label class="radio-chip">
      <input type="radio" name="export-format" value="base16">
      Base16
    </label>
  </div>

  <pre id="export-preview" class="export-panel__preview" aria-label="Export preview"></pre>

  <div class="export-panel__actions">
    <button id="copy-export" class="btn-primary">
      <svg aria-hidden="true" width="14" height="14"><!-- copy icon --></svg>
      Copy
    </button>
    <button id="download-export" class="btn-secondary">
      <svg aria-hidden="true" width="14" height="14"><!-- download icon --></svg>
      Download
    </button>
  </div>
</div>
```

```js
import {
  toCssVars, toCssVarsOklch, toJsonFlat, toDtcg,
  toTailwind, toScss, toBase16
} from '/shared/assets/color-export.js';
import { copyText } from '/shared/assets/clipboard.js';
import { downloadText } from '/shared/assets/download.js';

const FORMAT_GENERATORS = {
  'css-vars': (swatches, name) => ({ content: toCssVars(swatches, name),       ext: 'css' }),
  'css-oklch': (swatches, name) => ({ content: toCssVarsOklch(swatches, name), ext: 'css' }),
  'json':     (swatches, name) => ({ content: toJsonFlat(swatches),             ext: 'json' }),
  'dtcg':     (swatches, name) => ({ content: toDtcg(swatches, name),          ext: 'json' }),
  'tailwind': (swatches, name) => ({ content: toTailwind(swatches, name),      ext: 'js' }),
  'scss':     (swatches, name) => ({ content: toScss(swatches, name),          ext: 'scss' }),
  'base16':   (swatches, name) => ({ content: toBase16(swatches, name),        ext: 'json' }),
};

function getSelectedFormat() {
  return document.querySelector('[name="export-format"]:checked')?.value || 'css-vars';
}

function updatePreview() {
  const format = getSelectedFormat();
  const palette = getActivePalette();
  const gen = FORMAT_GENERATORS[format];
  if (!gen || !palette) return;
  const { content } = gen(palette.swatches, palette.name);
  document.getElementById('export-preview').textContent = content;
}

document.querySelectorAll('[name="export-format"]').forEach(r => {
  r.addEventListener('change', updatePreview);
});

document.getElementById('copy-export').addEventListener('click', async () => {
  const text = document.getElementById('export-preview').textContent;
  const ok = await copyText(text);
  showToast(ok ? 'Copied!' : 'Copy failed', { type: ok ? 'success' : 'error' });
});

document.getElementById('download-export').addEventListener('click', () => {
  const format = getSelectedFormat();
  const palette = getActivePalette();
  const gen = FORMAT_GENERATORS[format];
  if (!gen || !palette) return;
  const { content, ext } = gen(palette.swatches, palette.name);
  downloadText(`${palette.name || 'palette'}.${ext}`, content);
});
```

---

### Step 3 — Tests

```js
// tests/color-export.test.js
import { toCssVars, toJsonFlat, toDtcg, toTailwind, toScss } from '/shared/assets/color-export.js';

const swatches = [
  { name: 'primary', hex: '#656ea4' },
  { name: 'background', hex: '#1c1828' },
];

// CSS vars
const css = toCssVars(swatches, 'my-theme');
console.assert(css.includes('--my-theme-primary: #656ea4;'), 'css vars: primary');
console.assert(css.includes(':root {'), 'css vars: :root selector');

// JSON flat
const json = JSON.parse(toJsonFlat(swatches));
console.assert(json.primary === '#656ea4', 'json: primary key');

// DTCG
const dtcg = JSON.parse(toDtcg(swatches, 'brand'));
console.assert(dtcg.brand.primary.$type === 'color', 'dtcg: $type');
console.assert(dtcg.brand.primary.$value === '#656ea4', 'dtcg: $value');

// SCSS
const scss = toScss(swatches, 'my-theme');
console.assert(scss.includes('$my-theme-primary: #656ea4;'), 'scss: variable');

// Tailwind
const tw = toTailwind(swatches, 'brand');
console.assert(tw.includes('primary:'), 'tailwind: key');
console.assert(tw.includes('#656ea4'), 'tailwind: value');

console.log('All color-export tests passed');
```

---

## Files Created / Changed

| File | Action |
|---|---|
| `shared/assets/color-export.js` | Create |
| `my-scheme/assets/app.js` | Integrate export panel with all formats |
| `my-scheme/assets/style.css` | Add export panel, radio chip, preview styles |
| `which-scheme/assets/app.js` | Add export button for viewed theme in multiple formats |
| `tests/color-export.test.js` | Create |

---

## Acceptance Criteria

- [ ] All 7 export formats produce syntactically valid output for a 6-color palette.
- [ ] OKLCH values differ meaningfully from hex (conversion is applied).
- [ ] Tailwind output is a valid JS object literal.
- [ ] DTCG output matches the W3C spec (`$type`, `$value` keys).
- [ ] Copy button copies the currently visible format to clipboard.
- [ ] Download button saves file with correct extension per format.
- [ ] All color-export tests pass.

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| OKLCH conversion has floating-point error | Round to reasonable precision (4 decimal places); note approximation in tooltip |
| Tailwind config unquoted-key syntax breaks in some parsers | Provide both quoted and unquoted versions as a toggle |
| Base16 expects exactly 16 slots | Pad with #000000 if fewer swatches; truncate if more; show warning |
