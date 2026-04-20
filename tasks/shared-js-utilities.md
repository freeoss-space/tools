# Shared JavaScript Utilities Module

**Priority**: 7 of 15
**Confidence**: 90%
**Appears in**: All 3 idea lists
**Effort**: Low–Medium (1–2 days)

---

## Why This Matters

Every tool in this repo contains its own slightly different versions of the same helper functions: a `$` selector shorthand, clipboard copy logic, file download logic, debounce, toast notifications, and ID generation. These divergent implementations accumulate subtle bugs and behavioral differences. Extracting them into a single shared module reduces maintenance surface, makes cross-tool behavior consistent, and provides a well-tested foundation for future tools.

---

## Module Structure

```
shared/
└── assets/
    ├── core.js        ← DOM helpers, debounce, ID generation
    ├── clipboard.js   ← copy to clipboard with fallback
    ├── download.js    ← file download helper
    ├── toast.js       ← toast notification component
    ├── storage.js     ← (see versioned-storage-migrations.md)
    ├── sanitize.js    ← (see security-hardening.md)
    └── focus-trap.js  ← (see accessibility-hardening.md)
```

---

## Implementation Plan

### `shared/assets/core.js`

```js
// shared/assets/core.js

/**
 * Query a single element.
 * @param {string} selector
 * @param {Element|Document} [root=document]
 * @returns {Element|null}
 */
export const $ = (selector, root = document) => root.querySelector(selector);

/**
 * Query all matching elements as an array.
 * @param {string} selector
 * @param {Element|Document} [root=document]
 * @returns {Element[]}
 */
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

/**
 * Create an element with optional attributes and children.
 * @param {string} tag
 * @param {Record<string, string>} [attrs]
 * @param {(string|Element)[]} [children]
 * @returns {Element}
 */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else node.setAttribute(k, v);
  }
  for (const child of children) {
    node.append(typeof child === 'string' ? child : child);
  }
  return node;
}

/**
 * Debounce a function.
 * @param {Function} fn
 * @param {number} [ms=200]
 * @returns {Function}
 */
export function debounce(fn, ms = 200) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

/**
 * Throttle a function to at most once per interval.
 * @param {Function} fn
 * @param {number} [ms=100]
 * @returns {Function}
 */
export function throttle(fn, ms = 100) {
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= ms) {
      lastCall = now;
      fn.apply(this, args);
    }
  };
}

/**
 * Generate a short random ID (not cryptographically secure).
 * @param {number} [length=8]
 * @returns {string}
 */
export function uid(length = 8) {
  return Math.random().toString(36).slice(2, 2 + length);
}

/**
 * Format a date/timestamp as a relative human-readable string.
 * @param {string|number|Date} date
 * @returns {string}
 */
export function formatRelativeTime(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

/**
 * Format bytes into a human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

/**
 * Clamp a number between min and max.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/**
 * Add a one-time event listener.
 * @param {EventTarget} target
 * @param {string} event
 * @param {EventListener} handler
 */
export function once(target, event, handler) {
  target.addEventListener(event, handler, { once: true });
}
```

---

### `shared/assets/clipboard.js`

```js
// shared/assets/clipboard.js

/**
 * Copy text to clipboard.
 * Falls back to execCommand for older browsers.
 *
 * @param {string} text
 * @returns {Promise<boolean>} true if successful
 */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for non-secure contexts
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } finally {
      textarea.remove();
    }
    return ok;
  }
}

/**
 * Copy an object as formatted JSON to clipboard.
 * @param {unknown} value
 * @returns {Promise<boolean>}
 */
export async function copyJson(value) {
  return copyText(JSON.stringify(value, null, 2));
}
```

---

### `shared/assets/download.js`

```js
// shared/assets/download.js

/**
 * Trigger a file download in the browser.
 *
 * @param {string} filename
 * @param {string} content
 * @param {string} [mimeType='text/plain']
 */
export function downloadText(filename, content, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  downloadBlob(filename, blob);
}

/**
 * Trigger a JSON file download.
 *
 * @param {string} filename
 * @param {unknown} data
 */
export function downloadJson(filename, data) {
  downloadText(filename, JSON.stringify(data, null, 2), 'application/json');
}

/**
 * Trigger a CSS file download.
 *
 * @param {string} filename
 * @param {string} cssContent
 */
export function downloadCss(filename, cssContent) {
  downloadText(filename, cssContent, 'text/css');
}

/**
 * Trigger a Blob download.
 *
 * @param {string} filename
 * @param {Blob} blob
 */
export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), {
    href: url,
    download: filename,
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Release object URL after download begins
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
```

---

### `shared/assets/toast.js`

```js
// shared/assets/toast.js

let container = null;

function getContainer() {
  if (container) return container;
  container = document.createElement('div');
  container.id = 'toast-container';
  container.setAttribute('aria-live', 'polite');
  container.setAttribute('aria-atomic', 'false');
  container.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: 8px;
    pointer-events: none;
  `;
  document.body.appendChild(container);
  return container;
}

/**
 * Show a toast notification.
 *
 * @param {string} message
 * @param {{ type?: 'info'|'success'|'error'|'warning', duration?: number }} [options]
 */
export function showToast(message, { type = 'info', duration = 3000 } = {}) {
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'status');
  toast.textContent = message;
  toast.style.cssText = `
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    max-width: 320px;
    pointer-events: auto;
    cursor: pointer;
    opacity: 0;
    transform: translateY(8px);
    transition: opacity 0.2s, transform 0.2s;
    background: var(--surface-alt, #352c43);
    color: var(--text, #f4eded);
    border: 1px solid var(--border, #352c43);
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;

  // Type-specific accent
  const accentMap = {
    success: 'var(--success, #52b788)',
    error: 'var(--error, #e66260)',
    warning: 'var(--warning, #f9db6d)',
    info: 'var(--primary, #656ea4)',
  };
  toast.style.borderLeftColor = accentMap[type] || accentMap.info;
  toast.style.borderLeftWidth = '3px';

  getContainer().appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  const dismiss = () => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  };

  toast.addEventListener('click', dismiss);
  setTimeout(dismiss, duration);
}
```

CSS needed in each tool (or in `shared/assets/a11y.css`):

```css
/* Toast container is injected by JS — no HTML needed */
/* Reduced motion: disable toast animations */
@media (prefers-reduced-motion: reduce) {
  .toast { transition: none !important; }
}
```

---

## Migration Guide for Existing Tools

Replace ad-hoc patterns progressively:

```js
// Before:
const el = document.querySelector('#foo');
setTimeout(() => fn(), 300);

// After:
import { $, debounce } from '/shared/assets/core.js';
const fooEl = $('#foo');
const debouncedFn = debounce(fn, 300);
```

```js
// Before:
navigator.clipboard.writeText(text).catch(() => { /* ... */ });

// After:
import { copyText } from '/shared/assets/clipboard.js';
const ok = await copyText(text);
```

```js
// Before: (different in each tool)
const blob = new Blob([json], { type: 'application/json' });
const link = document.createElement('a');
link.href = URL.createObjectURL(blob);
link.download = 'data.json';
link.click();

// After:
import { downloadJson } from '/shared/assets/download.js';
downloadJson('data.json', state);
```

---

## Files Created

| File | Contents |
|---|---|
| `shared/assets/core.js` | DOM helpers, debounce, throttle, uid, formatRelativeTime, clamp |
| `shared/assets/clipboard.js` | copyText, copyJson |
| `shared/assets/download.js` | downloadText, downloadJson, downloadCss, downloadBlob |
| `shared/assets/toast.js` | showToast with type variants |

---

## Acceptance Criteria

- [ ] `copyText` works in both secure (HTTPS) and insecure (file://) contexts.
- [ ] `downloadJson` triggers browser download with correct MIME type.
- [ ] `showToast('saved', { type: 'success' })` shows green-accented toast that auto-dismisses.
- [ ] `debounce` correctly delays multiple rapid calls to a single invocation.
- [ ] `uid()` returns unique values across 1000 calls (no collision).
- [ ] `formatRelativeTime` returns correct relative labels for: <1min, 1h, 2d, 35d.
- [ ] All tools migrated to shared utilities show no behavioral regressions.

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Import paths break if served from subdirectory | Use absolute paths from root (`/shared/assets/...`) consistently |
| `clipboard.writeText` not available on HTTP | Fallback via `execCommand` is included |
| Toast z-index conflicts with modals | Set toast z-index above modal overlay (10000+) |
| Tools use `<script>` not `type="module"` | Migrate tools to module scripts as part of this change |
