# Accessibility Hardening (WCAG 2.2 AA)

**Priority**: 3 of 15
**Confidence**: 96%
**Appears in**: All 3 idea lists
**Effort**: Medium (3–4 days across all tools)

---

## Why This Matters

Every tool in this collection uses custom UI controls — icon-only buttons, custom tab groups, modals, color pickers, and toggle switches — without consistent ARIA labeling, keyboard navigation, or focus management. This excludes keyboard users and screen-reader users from the entire suite. WCAG 2.2 AA compliance is the industry baseline for inclusive products.

---

## Scope of Issues (Common Patterns Across Tools)

| Issue | WCAG Criterion | Severity |
|---|---|---|
| Icon-only buttons with no accessible name | 1.1.1, 4.1.2 | Critical |
| Custom tab panels without ARIA roles | 4.1.2 | Critical |
| Modals don't trap focus | 2.1.2 | Critical |
| No visible focus ring on many elements | 2.4.7, 2.4.11 | High |
| Color-only information (e.g. status badges) | 1.4.1 | High |
| Missing `<label>` associations for inputs | 1.3.1 | High |
| No `aria-live` for async status updates | 4.1.3 | Medium |
| Animations not respecting `prefers-reduced-motion` | 2.3.3 | Medium |
| Missing landmark roles (`main`, `nav`, `header`) | 1.3.6 | Medium |

---

## Implementation Plan

### Step 1 — Add global focus-visible styles to all tools

Add to each tool's CSS (or extract into `shared/assets/a11y.css`):

```css
/* shared/assets/a11y.css */

/* 1. Visible focus ring for all interactive elements */
:focus-visible {
  outline: 2px solid var(--primary, #656ea4);
  outline-offset: 2px;
  border-radius: 3px;
}

/* 2. Remove default outline only when :focus-visible is supported */
:focus:not(:focus-visible) {
  outline: none;
}

/* 3. Reduced-motion blanket override */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* 4. Skip-to-main-content link */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  padding: 8px 16px;
  background: var(--primary, #656ea4);
  color: #fff;
  font-weight: 600;
  text-decoration: none;
  border-radius: 0 0 4px 0;
  z-index: 9999;
  transition: top 0.15s;
}
.skip-link:focus {
  top: 0;
}
```

Add skip link to every tool's `<body>` opening:

```html
<a class="skip-link" href="#main-content">Skip to main content</a>
<!-- ... header ... -->
<main id="main-content">
```

---

### Step 2 — Fix icon-only buttons across all tools

Every `<button>` that contains only an SVG icon must have an accessible name:

```html
<!-- Before -->
<button class="btn-icon">
  <svg>...</svg>
</button>

<!-- After (option A: aria-label) -->
<button class="btn-icon" aria-label="Copy to clipboard" title="Copy to clipboard">
  <svg aria-hidden="true" focusable="false">...</svg>
</button>

<!-- After (option B: visually-hidden text) -->
<button class="btn-icon">
  <svg aria-hidden="true" focusable="false">...</svg>
  <span class="sr-only">Copy to clipboard</span>
</button>
```

Add the `.sr-only` utility to `shared/assets/a11y.css`:

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

Grep for all icon-only buttons:

```bash
grep -rn 'btn-icon\|icon-btn' --include='*.html' --include='*.js' tools/
```

---

### Step 3 — Add ARIA roles to custom tab panels

Every custom tab group must follow the ARIA tabs pattern:

```html
<div role="tablist" aria-label="Color format options">
  <button
    role="tab"
    id="tab-hex"
    aria-controls="panel-hex"
    aria-selected="true"
    tabindex="0"
  >HEX</button>
  <button
    role="tab"
    id="tab-rgb"
    aria-controls="panel-rgb"
    aria-selected="false"
    tabindex="-1"
  >RGB</button>
</div>

<div
  role="tabpanel"
  id="panel-hex"
  aria-labelledby="tab-hex"
  tabindex="0"
>
  <!-- hex content -->
</div>
<div
  role="tabpanel"
  id="panel-rgb"
  aria-labelledby="tab-rgb"
  tabindex="0"
  hidden
>
  <!-- rgb content -->
</div>
```

Add keyboard navigation for tab groups (roving tabindex):

```js
function initTabGroup(tablist) {
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];

  tablist.addEventListener('keydown', (e) => {
    const idx = tabs.indexOf(document.activeElement);
    if (idx === -1) return;

    let next = -1;
    if (e.key === 'ArrowRight') next = (idx + 1) % tabs.length;
    if (e.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = tabs.length - 1;

    if (next !== -1) {
      e.preventDefault();
      tabs[next].focus();
      tabs[next].click();
    }
  });
}
```

---

### Step 4 — Implement focus-trapping for modals

Add a shared focus-trap utility in `shared/assets/focus-trap.js`:

```js
// shared/assets/focus-trap.js

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Trap focus within an element while it is open.
 * Returns a cleanup function to release the trap.
 *
 * @param {HTMLElement} container
 * @returns {() => void}
 */
export function trapFocus(container) {
  const getFocusable = () => [...container.querySelectorAll(FOCUSABLE)];
  const previouslyFocused = document.activeElement;

  // Focus first focusable element
  const first = getFocusable()[0];
  if (first) first.focus();

  function onKeydown(e) {
    if (e.key !== 'Tab') return;
    const focusable = getFocusable();
    if (!focusable.length) { e.preventDefault(); return; }

    const firstEl = focusable[0];
    const lastEl = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      }
    } else {
      if (document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }
  }

  function onEscape(e) {
    if (e.key === 'Escape') release();
  }

  document.addEventListener('keydown', onKeydown);
  document.addEventListener('keydown', onEscape);

  function release() {
    document.removeEventListener('keydown', onKeydown);
    document.removeEventListener('keydown', onEscape);
    if (previouslyFocused) previouslyFocused.focus();
  }

  return release;
}
```

Use in every modal:

```js
import { trapFocus } from '/shared/assets/focus-trap.js';

function openModal(modal) {
  modal.removeAttribute('hidden');
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'modal-title');
  const release = trapFocus(modal);
  modal._releaseFocus = release;
}

function closeModal(modal) {
  modal.setAttribute('hidden', '');
  if (modal._releaseFocus) modal._releaseFocus();
}
```

---

### Step 5 — Add `aria-live` regions for async updates

```html
<!-- Add to each tool's HTML, near the top of <body> -->
<div
  id="status-live"
  role="status"
  aria-live="polite"
  aria-atomic="true"
  class="sr-only"
></div>

<div
  id="alert-live"
  role="alert"
  aria-live="assertive"
  aria-atomic="true"
  class="sr-only"
></div>
```

```js
function announceStatus(msg) {
  const el = document.getElementById('status-live');
  el.textContent = '';
  requestAnimationFrame(() => { el.textContent = msg; });
}

function announceAlert(msg) {
  const el = document.getElementById('alert-live');
  el.textContent = '';
  requestAnimationFrame(() => { el.textContent = msg; });
}

// Usage:
announceStatus('3 feeds synced successfully');
announceAlert('Error: could not reach feed URL');
```

---

### Step 6 — Add semantic landmarks to every tool

```html
<body>
  <a class="skip-link" href="#main">Skip to main content</a>

  <header>
    <nav aria-label="Tool navigation">
      <!-- breadcrumb/back link -->
    </nav>
    <h1>Tool Name</h1>
  </header>

  <main id="main">
    <!-- primary content -->
  </main>

  <footer>
    <!-- tool metadata, links -->
  </footer>
</body>
```

---

### Step 7 — Fix color-only information

In RSS Reader, status badges currently use only color:

```html
<!-- Before: color-only error state -->
<span class="badge badge--error"></span>

<!-- After: text + color -->
<span class="badge badge--error" aria-label="Feed error">
  <svg aria-hidden="true"><!-- warning icon --></svg>
  Error
</span>
```

In my-scheme and which-scheme, ensure contrast ratio values are also shown as text, not only as color gradient fills.

---

### Step 8 — Add axe-core checks to CI smoke tests

In the Playwright test suite (see `playwright-smoke-tests.md`):

```ts
import AxeBuilder from '@axe-core/playwright';

test('my-scheme has no critical a11y violations', async ({ page }) => {
  await page.goto('/my-scheme/');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});
```

Run for every tool page on every PR.

---

## Tool-by-Tool Audit Checklist

### RSS Reader
- [ ] Add `aria-label` to all icon buttons (sync, delete feed, mark read, refresh)
- [ ] Add `role="list"` + `role="listitem"` to feed/article lists
- [ ] `<article>` element for each article card
- [ ] `aria-busy="true"` on feed list during sync
- [ ] `aria-expanded` on feed collapse toggles

### My Scheme
- [ ] Tab group ARIA pattern on format tabs (HEX/RGB/HSL/OKLCH)
- [ ] Color swatch buttons: `aria-label="Edit color: #ff5733"`
- [ ] Modal focus trap for color picker dialog
- [ ] `aria-pressed` on toggle buttons (lock, visible, etc.)

### Which Scheme
- [ ] `<select>` elements have associated `<label>`s
- [ ] Theme comparison panels are `role="region"` with `aria-label`
- [ ] Keyboard navigation for scheme navigation

### Spec Helper
- [ ] All form inputs have explicit `<label>` elements
- [ ] Task list items use `role="listitem"`
- [ ] Drag-to-reorder: keyboard fallback with up/down arrow keys

### Tax Helper
- [ ] Table has `<caption>`, `<thead>`, `scope` on `<th>`
- [ ] Delete row button: `aria-label="Delete row for [amount]"`
- [ ] Currency inputs have visible label

---

## Files Changed

| File | Action |
|---|---|
| `shared/assets/a11y.css` | Create |
| `shared/assets/focus-trap.js` | Create |
| Every `tool/index.html` | Add skip link, landmarks, aria-live regions |
| Every `tool/assets/app.js` | Fix button labels, tab ARIA, modal focus trap |
| Every `tool/assets/style.css` | Import `a11y.css`, remove `outline: none` overrides |
| `tests/*.spec.ts` | Add axe-core checks |

---

## Acceptance Criteria

- [ ] Zero WCAG 2.2 AA violations reported by axe-core on main view of every tool.
- [ ] All modals trap focus and close on `Escape`.
- [ ] Tab key reaches all interactive elements in logical order.
- [ ] All icon-only buttons have accessible names.
- [ ] Visible focus ring on all interactive elements in every tool.
- [ ] Status updates are announced to screen readers via `aria-live`.
- [ ] `prefers-reduced-motion` disables all animations/transitions.
- [ ] Skip-to-main link is present and functional on every page.
