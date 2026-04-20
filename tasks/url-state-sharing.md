# URL State Sharing

**Priority**: 13 of 15
**Confidence**: 89%
**Appears in**: Lists 2 & 3
**Effort**: Low–Medium (1–2 days)

---

## Why This Matters

Tools like My Scheme, Which Scheme, and Spec Helper have non-trivial configuration state. Right now, sharing a specific palette or comparison setup requires exporting a file, sending it, and having the recipient import it. URL-based state sharing encodes the essential configuration into the URL hash or query string, making it trivially shareable via a link — ideal for design reviews, support requests, and documentation.

---

## Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| Encoding format | Base64(JSON) | No dependencies, readable in browser DevTools |
| URL slot | `#state=...` (hash) | Does not trigger server request; same-origin safe |
| State scope | Tool-specific compact representation | Full state would produce huge URLs |
| Conflict with existing hash | Use `?state=` query param as fallback | Some tools may use hash for navigation |
| Compression | Optional LZ-string for large payloads | Only where needed; add when URL > 2KB |

---

## Implementation Plan

### Step 1 — Create `shared/assets/url-state.js`

```js
// shared/assets/url-state.js

/**
 * Encode state as a Base64 URL-safe string.
 *
 * @param {unknown} state
 * @returns {string}
 */
export function encodeState(state) {
  try {
    const json = JSON.stringify(state);
    // btoa over encodeURIComponent for Unicode safety
    return btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch {
    return '';
  }
}

/**
 * Decode a Base64 URL-safe string back to state.
 *
 * @param {string} encoded
 * @returns {unknown | null}
 */
export function decodeState(encoded) {
  if (!encoded) return null;
  try {
    // Restore standard base64 chars
    const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(escape(atob(b64)));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Push current state into the URL hash without adding a history entry.
 *
 * @param {unknown} state
 * @param {string} [param='state']
 */
export function pushStateToUrl(state, param = 'state') {
  const encoded = encodeState(state);
  if (!encoded) return;
  const hash = `#${param}=${encoded}`;
  history.replaceState(null, '', hash);
}

/**
 * Read state from the URL hash.
 *
 * @param {string} [param='state']
 * @returns {unknown | null}
 */
export function readStateFromUrl(param = 'state') {
  const hash = location.hash.slice(1); // remove leading #
  const params = new URLSearchParams(hash);
  const encoded = params.get(param);
  return encoded ? decodeState(encoded) : null;
}

/**
 * Read state from query string (?state=...).
 * Useful when hash is used for other navigation.
 *
 * @param {string} [param='state']
 * @returns {unknown | null}
 */
export function readStateFromQuery(param = 'state') {
  const params = new URLSearchParams(location.search);
  const encoded = params.get(param);
  return encoded ? decodeState(encoded) : null;
}

/**
 * Generate a shareable URL for the given state.
 *
 * @param {unknown} state
 * @param {string} [param='state']
 * @returns {string}
 */
export function buildShareUrl(state, param = 'state') {
  const encoded = encodeState(state);
  const base = `${location.origin}${location.pathname}`;
  return encoded ? `${base}#${param}=${encoded}` : base;
}
```

---

### Step 2 — Define compact state shape per tool

Only serialize the minimum needed to reproduce a meaningful view. Do **not** serialize the full app state.

#### My Scheme (compact palette state)

```js
// my-scheme/assets/share.js
import { buildShareUrl, readStateFromUrl, pushStateToUrl } from '/shared/assets/url-state.js';

/**
 * @param {object} palette
 * @returns {object} compact shareable state
 */
function serializePalette(palette) {
  return {
    n: palette.name,
    s: palette.swatches.map(sw => [sw.name, sw.hex]),
  };
}

function deserializePalette(compact) {
  return {
    id: 'shared-' + Date.now(),
    name: compact.n || 'Shared Palette',
    swatches: (compact.s || []).map(([name, hex], i) => ({
      id: `sw${i}`,
      name,
      hex,
    })),
  };
}

export function shareCurrentPalette(palette) {
  const compact = serializePalette(palette);
  pushStateToUrl(compact);
  return buildShareUrl(compact);
}

export function loadSharedPalette() {
  const compact = readStateFromUrl();
  if (!compact || !compact.s) return null;
  return deserializePalette(compact);
}
```

Usage in `app.js`:

```js
import { shareCurrentPalette, loadSharedPalette } from './share.js';

// On page load, check for shared palette
const shared = loadSharedPalette();
if (shared) {
  state.palettes.unshift(shared);
  state.activePaletteId = shared.id;
  showToast('Palette loaded from shared link', { type: 'info' });
}

// Share button
document.getElementById('share-palette')?.addEventListener('click', async () => {
  const url = shareCurrentPalette(getActivePalette());
  const ok = await copyText(url);
  showToast(ok ? 'Link copied!' : url, { type: 'success' });
});
```

---

#### Which Scheme (compact comparison state)

```js
// which-scheme/assets/share.js
import { buildShareUrl, readStateFromUrl, pushStateToUrl } from '/shared/assets/url-state.js';

export function serializeComparison({ leftTheme, rightTheme, activeTokenGroup }) {
  return { l: leftTheme, r: rightTheme, g: activeTokenGroup };
}

export function loadSharedComparison() {
  const compact = readStateFromUrl();
  if (!compact || (!compact.l && !compact.r)) return null;
  return {
    leftTheme: compact.l,
    rightTheme: compact.r,
    activeTokenGroup: compact.g || 'all',
  };
}

export function shareComparison(state) {
  const compact = serializeComparison(state);
  pushStateToUrl(compact);
  return buildShareUrl(compact);
}
```

---

### Step 3 — Add "Copy Share Link" button UI

```html
<!-- In tool header / toolbar -->
<button id="share-btn" class="btn-secondary btn--sm" aria-label="Copy shareable link">
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" stroke-width="2">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
    <polyline points="16 6 12 2 8 6"/>
    <line x1="12" y1="2" x2="12" y2="15"/>
  </svg>
  Share
</button>
```

After clicking, briefly show the URL in a tooltip or toast:

```js
shareBtn.addEventListener('click', async () => {
  const url = buildShareUrl(getCompactState());
  const ok = await copyText(url);
  if (ok) {
    shareBtn.textContent = '✓ Copied!';
    setTimeout(() => { shareBtn.innerHTML = '<!-- icon --> Share'; }, 2000);
    showToast('Share link copied to clipboard', { type: 'success' });
  }
});
```

---

### Step 4 — Update URL as state changes (optional live sync)

For tools where the state changes frequently (Which Scheme theme selectors), update the URL on each change so the URL always reflects current state:

```js
import { pushStateToUrl } from '/shared/assets/url-state.js';
import { debounce } from '/shared/assets/core.js';

const syncUrlDebounced = debounce(() => {
  pushStateToUrl(getCompactState());
}, 500);

// Call after any state change:
function updateState(patch) {
  Object.assign(state, patch);
  render();
  syncUrlDebounced();
}
```

---

### Step 5 — Validate loaded URL state

Before applying URL state, run it through import validation:

```js
import { validate, v } from '/shared/assets/validate.js';

function validateSharedPalette(x) {
  const errors = [];
  errors.push(...v.object('root', x));
  if (errors.length) return errors;
  errors.push(...v.array('root.s', x.s, (path, item) => {
    if (!Array.isArray(item) || item.length < 2) return [`${path}: expected [name, hex]`];
    errors.push(...v.pattern(`${path}[1]`, item[1], /^#[0-9a-fA-F]{3,8}$/));
    return [];
  }));
  return errors;
}
```

If validation fails, silently ignore the URL state and log a dev-mode warning:

```js
const compact = readStateFromUrl();
if (compact) {
  const result = validate(compact, validateSharedPalette);
  if (!result.ok) {
    console.warn('[share] Invalid URL state, ignoring:', result.errors);
  } else {
    applySharedState(compact);
  }
}
```

---

### Step 6 — Tests

```js
// tests/url-state.test.js
import { encodeState, decodeState, buildShareUrl } from '/shared/assets/url-state.js';

// Round-trip
const state = { n: 'Test', s: [['primary', '#ff0000']] };
const encoded = encodeState(state);
const decoded = decodeState(encoded);
console.assert(decoded.n === 'Test', 'round-trip: name');
console.assert(decoded.s[0][1] === '#ff0000', 'round-trip: color');

// URL-safe chars
console.assert(!encoded.includes('+'), 'no + in encoded');
console.assert(!encoded.includes('/'), 'no / in encoded');
console.assert(!encoded.includes('='), 'no = in encoded');

// Invalid decode
console.assert(decodeState('not-valid!!') === null, 'invalid returns null');
console.assert(decodeState('') === null, 'empty returns null');

// Unicode
const unicode = { label: 'Ñoño 🎨' };
const roundTrip = decodeState(encodeState(unicode));
console.assert(roundTrip.label === 'Ñoño 🎨', 'unicode round-trip');

console.log('All url-state tests passed');
```

---

## Files Created / Changed

| File | Action |
|---|---|
| `shared/assets/url-state.js` | Create |
| `my-scheme/assets/share.js` | Create |
| `which-scheme/assets/share.js` | Create |
| `my-scheme/assets/app.js` | Load shared state on init, add share button handler |
| `which-scheme/assets/app.js` | Load shared comparison on init, live-sync URL |
| `tests/url-state.test.js` | Create |

---

## Acceptance Criteria

- [ ] Sharing a 6-color palette produces a URL under 500 characters.
- [ ] Opening a share link in a new tab loads the exact palette.
- [ ] Invalid or tampered URL state is silently ignored (no crash, no corrupt state).
- [ ] Unicode names and emoji in palette names survive encode/decode round-trip.
- [ ] Copy Share Link button copies correct URL and shows confirmation.
- [ ] URL updates live as theme selection changes in Which Scheme.
- [ ] All url-state tests pass.

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| URL too long for many swatches (>16) | Only encode first 32 swatches; show truncation notice |
| Hash conflicts with anchor navigation | Use `?state=` query param as fallback per tool |
| Shared link exposes sensitive color names | Colors are public-facing design data; no privacy concern |
| Old URL with outdated schema fails | Validation catches it; silently ignore invalid URLs |
