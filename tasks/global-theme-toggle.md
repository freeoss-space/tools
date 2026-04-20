# Global Theme Toggle & Persistence

**Priority**: 12 of 15
**Confidence**: 88%
**Appears in**: Lists 1 & 2
**Effort**: Low (half a day)

---

## Why This Matters

All tools currently default to a hard-coded dark theme with no way to switch. Users who prefer light mode — or who switch contexts — have no option. A consistent, persisted theme toggle across all tools makes the suite feel polished and respects OS preferences. Because `aquadrive/assets/` already has `theme-light.css` and `theme-dark.css`, the infrastructure is already there; this task wires it up.

---

## Implementation Plan

### Step 1 — Create `shared/assets/theme.js`

This file is loaded as the very first script in `<head>` (before any CSS renders) to prevent a flash of the wrong theme:

```js
// shared/assets/theme.js
// Runs synchronously before first paint to set correct theme.
(function () {
  const STORAGE_KEY = 'tools:theme';
  const VALID = ['dark', 'light'];

  function getPreferred() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (VALID.includes(stored)) return stored;
    // Respect OS preference
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  const theme = getPreferred();
  document.documentElement.setAttribute('data-theme', theme);

  // Export for use by toggle button (after DOM ready)
  window.__theme = {
    current: () => document.documentElement.getAttribute('data-theme'),
    set: (t) => {
      if (!VALID.includes(t)) return;
      document.documentElement.setAttribute('data-theme', t);
      localStorage.setItem(STORAGE_KEY, t);
      window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: t } }));
    },
    toggle: () => {
      const next = window.__theme.current() === 'dark' ? 'light' : 'dark';
      window.__theme.set(next);
    },
  };
})();
```

---

### Step 2 — Add inline `<script>` in `<head>` of every tool

The theme script **must** be inlined (or loaded synchronously as the first `<script>`) to prevent flash. Because it's tiny (~20 lines), inline is acceptable:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tool Name</title>

  <!-- Theme initialization: must run before stylesheets apply -->
  <script>
    (function(){
      var k='tools:theme', v=localStorage.getItem(k);
      if(!v) v=matchMedia('(prefers-color-scheme:light)').matches?'light':'dark';
      document.documentElement.setAttribute('data-theme',v);
    })();
  </script>

  <link rel="stylesheet" href="/aquadrive/assets/tokens.css">
  <link rel="stylesheet" href="/aquadrive/assets/theme-light.css">
  <link rel="stylesheet" href="/aquadrive/assets/theme-dark.css">
  <!-- tool-specific CSS -->
</head>
```

Note: Both `theme-light.css` and `theme-dark.css` must be loaded. They use `[data-theme="dark"]` / `[data-theme="light"]` selectors to scope their custom properties.

---

### Step 3 — Verify `theme-light.css` and `theme-dark.css` use `data-theme` selectors

Check that `aquadrive/assets/theme-light.css` uses:

```css
/* theme-light.css */
:root,
[data-theme="light"] {
  --bg: #F4EDED;
  --surface: #FFFFFF;
  /* ... */
}
```

And `theme-dark.css` uses:

```css
/* theme-dark.css */
[data-theme="dark"] {
  --bg: #1C1828;
  --surface: #261F34;
  /* ... */
}
```

If `theme-light.css` uses `:root` without a selector guard, add the `[data-theme="light"]` guard so both can coexist.

---

### Step 4 — Add toggle button component

Create `shared/assets/theme-toggle.js`:

```js
// shared/assets/theme-toggle.js

/**
 * Create and return a theme toggle button.
 * Automatically updates icon and aria-label when theme changes.
 *
 * @returns {HTMLButtonElement}
 */
export function createThemeToggle() {
  const btn = document.createElement('button');
  btn.className = 'theme-toggle';
  btn.setAttribute('aria-label', 'Switch to light mode');
  btn.setAttribute('title', 'Toggle theme');
  btn.setAttribute('type', 'button');

  function updateIcon() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    btn.innerHTML = isDark
      ? `<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2">
           <circle cx="12" cy="12" r="5"/>
           <line x1="12" y1="1" x2="12" y2="3"/>
           <line x1="12" y1="21" x2="12" y2="23"/>
           <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
           <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
           <line x1="1" y1="12" x2="3" y2="12"/>
           <line x1="21" y1="12" x2="23" y2="12"/>
           <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
           <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
         </svg>`  // sun icon for dark mode (click → go light)
      : `<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2">
           <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
         </svg>`;  // moon icon for light mode (click → go dark)
  }

  updateIcon();
  btn.addEventListener('click', () => {
    window.__theme.toggle();
    updateIcon();
  });

  // Keep icon in sync if theme changes externally
  window.addEventListener('themechange', updateIcon);

  return btn;
}
```

---

### Step 5 — Add toggle to each tool's header

In each tool's `app.js` or inline script, after DOM load:

```js
import { createThemeToggle } from '/shared/assets/theme-toggle.js';

document.addEventListener('DOMContentLoaded', () => {
  const toggle = createThemeToggle();
  // Insert into header — adjust selector per tool
  const header = document.querySelector('header .header-actions, header, nav');
  if (header) header.appendChild(toggle);
});
```

Or directly in `<header>` HTML as a placeholder:

```html
<header>
  <h1>My Scheme</h1>
  <div class="header-actions">
    <div id="theme-toggle-slot"></div>
    <!-- other actions -->
  </div>
</header>
```

```js
const slot = document.getElementById('theme-toggle-slot');
if (slot) slot.appendChild(createThemeToggle());
```

---

### Step 6 — CSS for toggle button

```css
.theme-toggle {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-muted);
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  flex-shrink: 0;
}

.theme-toggle:hover {
  background: var(--surface-alt);
  color: var(--text);
  border-color: var(--primary);
}

.theme-toggle:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
```

---

### Step 7 — Handle tools with hard-coded colors

Run a grep to find any remaining hard-coded color values in tool CSS that bypass tokens:

```bash
grep -rn '#[0-9a-fA-F]\{3,6\}' --include='*.css' tools/ | grep -v 'tokens\|theme-'
```

For each hit, replace with the appropriate `var(--*)` token from `tokens.css` / theme files.

---

### Step 8 — Root `index.html` integration

```html
<!-- In <head> -->
<script>
  (function(){
    var k='tools:theme', v=localStorage.getItem(k);
    if(!v) v=matchMedia('(prefers-color-scheme:light)').matches?'light':'dark';
    document.documentElement.setAttribute('data-theme',v);
  })();
</script>
```

```js
// In root assets/filter.js or inline:
import { createThemeToggle } from '/shared/assets/theme-toggle.js';
document.querySelector('.site-header')?.appendChild(createThemeToggle());
```

---

## Files Created / Changed

| File | Action |
|---|---|
| `shared/assets/theme.js` | Create (inline version embedded in each page's `<head>`) |
| `shared/assets/theme-toggle.js` | Create |
| `aquadrive/assets/theme-light.css` | Verify/add `[data-theme="light"]` selector |
| `aquadrive/assets/theme-dark.css` | Verify `[data-theme="dark"]` selector |
| Every `tool/index.html` | Add inline theme init script to `<head>`, import both theme CSS files |
| Every `tool/assets/app.js` | Add `createThemeToggle()` call |

---

## Acceptance Criteria

- [ ] Toggling theme persists across page reloads (same tab).
- [ ] Toggling on one tool page reflects on other tool pages (shared `localStorage` key).
- [ ] On first visit with no preference saved, OS color scheme is respected.
- [ ] No flash of wrong theme on page load (init script runs before paint).
- [ ] Toggle button has correct `aria-label` for current state.
- [ ] Theme changes announced via `themechange` event (for programmatic consumers).
- [ ] All tools display correctly in both light and dark modes.

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Flash of wrong theme if inline script fails | Inline script has no dependencies; failure is silent and defaults to dark |
| Tool CSS uses hard-coded colors not in tokens | Systematic grep + replace before this ships |
| `theme-light.css` conflicts with `:root` selectors | Add `[data-theme="light"]` specificity to light theme; test with both themes active |
| Toggle icon is color-only information | Toggle uses text label via `aria-label`; icon is supplementary |
