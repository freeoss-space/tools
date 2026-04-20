# WCAG Contrast Validator for Color Tools

**Priority**: 10 of 15
**Confidence**: 94%
**Appears in**: List 3
**Effort**: Medium (2–3 days)

---

## Why This Matters

My Scheme and Which Scheme are fundamentally color decision-making tools. Without built-in contrast ratio feedback, users can unknowingly build color pairs that fail accessibility standards. Adding WCAG AA/AAA scoring directly in the palette editor closes the feedback loop — users see compliance status as they design, not after shipping.

---

## WCAG Contrast Formulas

```
Relative luminance (L):
  - For sRGB channel c:
    - c_linear = c / 255
    - if c_linear <= 0.04045: c_lin = c_linear / 12.92
    - else: c_lin = ((c_linear + 0.055) / 1.055) ^ 2.4
  - L = 0.2126 * R_lin + 0.7152 * G_lin + 0.0722 * B_lin

Contrast ratio:
  - ratio = (L_lighter + 0.05) / (L_darker + 0.05)

WCAG thresholds:
  - AA normal text:  ≥ 4.5:1
  - AA large text:   ≥ 3:1
  - AAA normal text: ≥ 7:1
  - AAA large text:  ≥ 4.5:1
  - UI components:   ≥ 3:1
```

---

## Implementation Plan

### Step 1 — Create `shared/assets/color-utils.js`

```js
// shared/assets/color-utils.js

/**
 * Parse a CSS hex color string to [r, g, b] integers.
 * Supports #rgb, #rrggbb, #rrggbbaa.
 *
 * @param {string} hex
 * @returns {[number, number, number] | null}
 */
export function hexToRgb(hex) {
  const clean = hex.replace(/^#/, '');
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16),
    ];
  }
  if (clean.length >= 6) {
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
    ];
  }
  return null;
}

/**
 * Compute relative luminance of an sRGB color.
 *
 * @param {number} r 0–255
 * @param {number} g 0–255
 * @param {number} b 0–255
 * @returns {number} luminance 0–1
 */
export function relativeLuminance(r, g, b) {
  const channel = (c) => {
    const lin = c / 255;
    return lin <= 0.04045 ? lin / 12.92 : Math.pow((lin + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * Compute WCAG contrast ratio between two hex colors.
 *
 * @param {string} hex1
 * @param {string} hex2
 * @returns {number | null} contrast ratio, or null if either color is invalid
 */
export function contrastRatio(hex1, hex2) {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return null;

  const l1 = relativeLuminance(...rgb1);
  const l2 = relativeLuminance(...rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Get WCAG compliance level for a contrast ratio.
 *
 * @param {number} ratio
 * @param {'normal'|'large'|'ui'} [textSize='normal']
 * @returns {{ aa: boolean, aaa: boolean, level: 'AAA'|'AA'|'Fail' }}
 */
export function wcagLevel(ratio, textSize = 'normal') {
  const thresholds = {
    normal: { aa: 4.5, aaa: 7 },
    large:  { aa: 3,   aaa: 4.5 },
    ui:     { aa: 3,   aaa: 4.5 },
  };
  const t = thresholds[textSize] || thresholds.normal;
  const aaa = ratio >= t.aaa;
  const aa = ratio >= t.aa;
  return {
    aa,
    aaa,
    level: aaa ? 'AAA' : aa ? 'AA' : 'Fail',
  };
}

/**
 * Convert hex to HSL string.
 *
 * @param {string} hex
 * @returns {string} e.g. "hsl(210, 100%, 50%)"
 */
export function hexToHsl(hex) {
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

/**
 * Suggest a lighter/darker variant of a color to meet a target contrast ratio.
 *
 * @param {string} fgHex
 * @param {string} bgHex
 * @param {number} targetRatio
 * @returns {{ hex: string, ratio: number } | null}
 */
export function suggestContrastFix(fgHex, bgHex, targetRatio = 4.5) {
  const rgb = hexToRgb(fgHex);
  if (!rgb) return null;

  // Try darkening and lightening the foreground in steps
  for (let delta = 5; delta <= 100; delta += 5) {
    for (const direction of [-1, 1]) {
      const adjusted = rgb.map(c => Math.max(0, Math.min(255, c + direction * delta)));
      const adjHex = '#' + adjusted.map(c => c.toString(16).padStart(2, '0')).join('');
      const ratio = contrastRatio(adjHex, bgHex);
      if (ratio !== null && ratio >= targetRatio) {
        return { hex: adjHex, ratio };
      }
    }
  }
  return null;
}
```

---

### Step 2 — Contrast badge component

```js
// shared/assets/contrast-badge.js
import { contrastRatio, wcagLevel } from '/shared/assets/color-utils.js';

/**
 * Create and return a contrast badge element.
 *
 * @param {string} fgHex
 * @param {string} bgHex
 * @returns {HTMLElement}
 */
export function createContrastBadge(fgHex, bgHex) {
  const ratio = contrastRatio(fgHex, bgHex);
  const badge = document.createElement('span');
  badge.className = 'contrast-badge';

  if (ratio === null) {
    badge.textContent = '–';
    badge.className += ' contrast-badge--unknown';
    return badge;
  }

  const { level } = wcagLevel(ratio);
  const ratioText = ratio.toFixed(2);

  badge.className += ` contrast-badge--${level.toLowerCase()}`;
  badge.setAttribute('title', `Contrast ratio: ${ratioText}:1 — WCAG ${level}`);
  badge.innerHTML = `
    <span class="contrast-badge__ratio">${ratioText}:1</span>
    <span class="contrast-badge__level">${level}</span>
  `;
  return badge;
}

/**
 * Update an existing contrast badge in place.
 *
 * @param {HTMLElement} badge
 * @param {string} fgHex
 * @param {string} bgHex
 */
export function updateContrastBadge(badge, fgHex, bgHex) {
  const newBadge = createContrastBadge(fgHex, bgHex);
  badge.className = newBadge.className;
  badge.innerHTML = newBadge.innerHTML;
  badge.title = newBadge.title;
}
```

CSS:

```css
.contrast-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 100px;
  font-size: 0.75rem;
  font-family: var(--font-mono, monospace);
  font-weight: 500;
  white-space: nowrap;
}

.contrast-badge--aaa {
  background: var(--success-tint, #eaf7ef);
  color: var(--success, #52b788);
}

.contrast-badge--aa {
  background: var(--warning-tint, #fef9e6);
  color: #9a7a00;
}

.contrast-badge--fail {
  background: var(--error-tint, #fceaea);
  color: var(--error, #e66260);
}

.contrast-badge--unknown {
  background: var(--border, #30363d);
  color: var(--text-muted);
}

.contrast-badge__level {
  font-weight: 700;
  font-size: 0.7rem;
  letter-spacing: 0.05em;
}
```

---

### Step 3 — Integrate into My Scheme

In the palette editor, show contrast badge for each swatch against the palette background:

```js
import { createContrastBadge, updateContrastBadge } from '/shared/assets/contrast-badge.js';
import { suggestContrastFix } from '/shared/assets/color-utils.js';

function renderSwatchRow(swatch, bgHex) {
  const row = document.createElement('div');
  row.className = 'swatch-row';

  const preview = document.createElement('div');
  preview.className = 'swatch-preview';
  preview.style.background = swatch.hex;
  preview.style.color = swatch.hex;

  const badge = createContrastBadge(swatch.hex, bgHex);
  badge.id = `contrast-${swatch.id}`;

  const fixBtn = document.createElement('button');
  fixBtn.className = 'btn-ghost btn--xs';
  fixBtn.textContent = 'Fix';
  fixBtn.title = 'Suggest color adjustment to reach AA';
  fixBtn.addEventListener('click', () => {
    const fix = suggestContrastFix(swatch.hex, bgHex, 4.5);
    if (fix) {
      showToast(`Suggested: ${fix.hex} (${fix.ratio.toFixed(2)}:1 AA)`, { type: 'info' });
    } else {
      showToast('No nearby fix found — try a darker/lighter shade', { type: 'warning' });
    }
  });

  row.append(preview, badge, fixBtn);
  return row;
}
```

---

### Step 4 — Integrate into Which Scheme

Add a contrast matrix panel that shows all token-pair contrasts:

```js
import { contrastRatio, wcagLevel } from '/shared/assets/color-utils.js';

function renderContrastMatrix(theme) {
  const pairs = [
    { label: 'fg / bg',        fg: theme.colors.fg,      bg: theme.colors.bg },
    { label: 'comment / bg',   fg: theme.colors.comment,  bg: theme.colors.bg },
    { label: 'cursor / bg',    fg: theme.colors.cursor,   bg: theme.colors.bg },
    { label: 'selection / bg', fg: theme.colors.selection, bg: theme.colors.bg },
  ];

  return `
    <table class="contrast-matrix" aria-label="WCAG contrast ratios for ${theme.name}">
      <thead>
        <tr>
          <th scope="col">Pair</th>
          <th scope="col">Ratio</th>
          <th scope="col">Level</th>
        </tr>
      </thead>
      <tbody>
        ${pairs.map(({ label, fg, bg }) => {
          if (!fg || !bg) return '';
          const ratio = contrastRatio(fg, bg);
          if (ratio === null) return '';
          const { level } = wcagLevel(ratio);
          return `
            <tr>
              <td>
                <span class="color-chip" style="background:${fg}"></span>
                <span class="color-chip" style="background:${bg}"></span>
                ${label}
              </td>
              <td class="contrast-matrix__ratio">${ratio.toFixed(2)}:1</td>
              <td>
                <span class="contrast-badge contrast-badge--${level.toLowerCase()}">
                  ${level}
                </span>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}
```

---

### Step 5 — Tests

```js
// tests/color-utils.test.js
import { hexToRgb, relativeLuminance, contrastRatio, wcagLevel, suggestContrastFix } from '/shared/assets/color-utils.js';

// hexToRgb
console.assert(JSON.stringify(hexToRgb('#fff')) === '[255,255,255]', 'short hex white');
console.assert(JSON.stringify(hexToRgb('#000000')) === '[0,0,0]', 'long hex black');
console.assert(hexToRgb('#zzzzzz') === null, 'invalid hex returns null');

// relativeLuminance
console.assert(relativeLuminance(255, 255, 255).toFixed(4) === '1.0000', 'white luminance');
console.assert(relativeLuminance(0, 0, 0).toFixed(4) === '0.0000', 'black luminance');

// contrastRatio
const blackOnWhite = contrastRatio('#000000', '#ffffff');
console.assert(Math.abs(blackOnWhite - 21) < 0.01, 'black/white ratio ~21');

const greyOnWhite = contrastRatio('#777777', '#ffffff');
console.assert(greyOnWhite > 4.4 && greyOnWhite < 4.6, 'grey/white ~4.48');

// wcagLevel
console.assert(wcagLevel(21).level === 'AAA', 'ratio 21 = AAA');
console.assert(wcagLevel(5).level === 'AA', 'ratio 5 = AA');
console.assert(wcagLevel(2).level === 'Fail', 'ratio 2 = Fail');

// suggestContrastFix
const fix = suggestContrastFix('#888888', '#ffffff', 4.5);
console.assert(fix !== null, 'fix found for grey on white');
console.assert(fix.ratio >= 4.5, 'fix meets AA threshold');

console.log('All color-utils tests passed');
```

---

## Files Created / Changed

| File | Action |
|---|---|
| `shared/assets/color-utils.js` | Create |
| `shared/assets/contrast-badge.js` | Create |
| `my-scheme/assets/app.js` | Add contrast badges to swatch rows |
| `my-scheme/assets/style.css` | Add badge and matrix CSS |
| `which-scheme/assets/app.js` | Add contrast matrix panel |
| `tests/color-utils.test.js` | Create |

---

## Acceptance Criteria

- [ ] `contrastRatio('#000', '#fff')` returns approximately 21.
- [ ] `wcagLevel(4.5)` returns `{ aa: true, aaa: false, level: 'AA' }`.
- [ ] Each swatch in My Scheme editor shows a live contrast badge against the background color.
- [ ] Clicking "Fix" on a failing badge suggests a color that passes AA.
- [ ] Which Scheme contrast matrix renders correct levels for `fg/bg` pair.
- [ ] All color-utils tests pass.

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| sRGB formula edge cases (alpha, HDR) | Scope to hex #rrggbb; strip alpha, ignore HDR |
| `suggestContrastFix` returns visually unappealing color | Show as suggestion only; user still chooses |
| Contrast matrix too slow for large theme sets | Memoize `contrastRatio` per hex pair; ratios are pure functions |
