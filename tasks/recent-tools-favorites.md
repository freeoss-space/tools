# Recent Tools & Favorites on Landing Page

**Priority**: 15 of 15
**Confidence**: 87%
**Appears in**: Lists 2 & 3
**Effort**: Low (half a day)

---

## Why This Matters

Returning users always navigate to the same 1–3 tools. Currently, every visit requires scanning the full grid. A "Recent" row and a "Pinned" favorites section at the top of the landing page eliminate this friction, making the suite feel like a real productivity environment rather than a list of links.

---

## Feature Specification

### Recent tools
- Track the last 8 tools the user visited (localStorage, keyed by path).
- Show as a horizontal scroll row above the main grid, labeled "Recent."
- Only show if at least 1 tool has been visited.

### Pinned favorites
- Allow users to star/pin any tool from the landing page.
- Pinned tools appear in a "Pinned" row above Recent.
- Toggling the star again un-pins.
- Persist separately in localStorage.

### Layout
```
[Pinned]   ★ My Scheme   ★ RSS Reader
[Recent]   My Scheme   Tax Helper   Spec Helper
─────────────────────────────────────────────────
[All Tools]
  [tool grid]
```

---

## Implementation Plan

### Step 1 — Storage keys and data shape

```js
const RECENTS_KEY = 'tools:recents';    // string[] of paths
const PINS_KEY    = 'tools:pinned';     // string[] of paths
const MAX_RECENTS = 8;
```

---

### Step 2 — Record tool visits

On each tool's page (via inline script or module import), record the visit on page load:

```js
// shared/assets/recents.js

const RECENTS_KEY = 'tools:recents';
const MAX_RECENTS = 8;

/**
 * Record a tool visit. Call on tool page load.
 * @param {string} [path] defaults to location.pathname
 */
export function recordVisit(path = location.pathname) {
  // Normalize path to ensure consistency
  const normalized = path.endsWith('/') ? path : path + '/';
  try {
    const current = JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]');
    const updated = [normalized, ...current.filter(p => p !== normalized)].slice(0, MAX_RECENTS);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(updated));
  } catch { /* quota or parse error — ignore */ }
}

/**
 * Get recent paths.
 * @returns {string[]}
 */
export function getRecents() {
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]');
  } catch {
    return [];
  }
}
```

Add to each tool's `<head>` or first script:

```html
<!-- In each tool's index.html head -->
<script type="module">
  import { recordVisit } from '/shared/assets/recents.js';
  recordVisit();
</script>
```

---

### Step 3 — Pinned tools management

```js
// shared/assets/pinned.js

const PINS_KEY = 'tools:pinned';

export function getPinned() {
  try {
    return JSON.parse(localStorage.getItem(PINS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function togglePin(path) {
  const normalized = path.endsWith('/') ? path : path + '/';
  const current = getPinned();
  const isPinned = current.includes(normalized);
  const updated = isPinned
    ? current.filter(p => p !== normalized)
    : [...current, normalized];
  localStorage.setItem(PINS_KEY, JSON.stringify(updated));
  return !isPinned; // returns new pinned state
}

export function isPinned(path) {
  const normalized = path.endsWith('/') ? path : path + '/';
  return getPinned().includes(normalized);
}
```

---

### Step 4 — HTML additions in root `index.html`

Insert before the main tool grid:

```html
<!-- Pinned row: hidden until JS populates it -->
<section id="pinned-section" class="tools-section" hidden aria-label="Pinned tools">
  <h2 class="tools-section__title">
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
    Pinned
  </h2>
  <div id="pinned-cards" class="tools-row"></div>
</section>

<!-- Recent row: hidden until JS populates it -->
<section id="recents-section" class="tools-section" hidden aria-label="Recently used tools">
  <h2 class="tools-section__title">
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
    Recent
  </h2>
  <div id="recent-cards" class="tools-row"></div>
</section>

<section class="tools-section" aria-label="All tools">
  <h2 class="tools-section__title">All Tools</h2>
  <!-- existing grid -->
</section>
```

---

### Step 5 — CSS for sections and rows

```css
/* Section headings */
.tools-section {
  margin-bottom: 32px;
}

.tools-section__title {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted, #6e7681);
  margin: 0 0 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Horizontal scroll row for recent/pinned */
.tools-row {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  scrollbar-width: none;        /* Firefox */
  -webkit-overflow-scrolling: touch;
  padding-bottom: 4px;
}
.tools-row::-webkit-scrollbar { display: none; }

/* Compact card variant for rows */
.tool-card--compact {
  flex: 0 0 auto;
  min-width: 140px;
  max-width: 180px;
}

/* Pin button on card hover */
.tool-card {
  position: relative;
}

.tool-card .pin-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--surface, #161b22);
  border: 1px solid var(--border, #30363d);
  color: var(--text-muted, #6e7681);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s, color 0.15s, background 0.15s;
  z-index: 1;
}

.tool-card:hover .pin-btn,
.tool-card .pin-btn--active {
  opacity: 1;
}

.tool-card .pin-btn--active {
  color: #f5c542;
  background: var(--surface-alt, #21262d);
}

.tool-card .pin-btn:hover {
  color: var(--text, #e6edf3);
  background: var(--surface-alt, #21262d);
}
```

---

### Step 6 — JS: render recent and pinned rows

```js
// Add to root index.html script (or assets/home.js):
import { getRecents } from '/shared/assets/recents.js';
import { getPinned, togglePin, isPinned } from '/shared/assets/pinned.js';

const ALL_CARDS = [...document.querySelectorAll('.tool-card')];

function getCardByPath(path) {
  const normalized = path.endsWith('/') ? path : path + '/';
  return ALL_CARDS.find(card => {
    const href = card.getAttribute('href');
    return href === normalized || href === path;
  });
}

function makeCompactCard(originalCard, showPinBtn = false) {
  const clone = originalCard.cloneNode(true);
  clone.classList.add('tool-card--compact');

  if (showPinBtn) {
    const path = clone.getAttribute('href');
    const pinBtn = document.createElement('button');
    pinBtn.className = 'pin-btn' + (isPinned(path) ? ' pin-btn--active' : '');
    pinBtn.setAttribute('aria-label', isPinned(path) ? 'Unpin tool' : 'Pin tool');
    pinBtn.setAttribute('title', isPinned(path) ? 'Unpin' : 'Pin to top');
    pinBtn.innerHTML = `<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24"
      fill="${isPinned(path) ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>`;
    pinBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const newState = togglePin(path);
      renderRows(); // Re-render both rows
    });
    clone.appendChild(pinBtn);
  }

  return clone;
}

function renderRows() {
  // --- Pinned ---
  const pinnedPaths = getPinned();
  const pinnedSection = document.getElementById('pinned-section');
  const pinnedContainer = document.getElementById('pinned-cards');
  pinnedContainer.innerHTML = '';

  const pinnedCards = pinnedPaths
    .map(path => getCardByPath(path))
    .filter(Boolean);

  if (pinnedCards.length) {
    pinnedCards.forEach(card => {
      pinnedContainer.appendChild(makeCompactCard(card, true));
    });
    pinnedSection.hidden = false;
  } else {
    pinnedSection.hidden = true;
  }

  // --- Recent ---
  const recentPaths = getRecents();
  const recentSection = document.getElementById('recents-section');
  const recentContainer = document.getElementById('recent-cards');
  recentContainer.innerHTML = '';

  const recentCards = recentPaths
    .map(path => getCardByPath(path))
    .filter(Boolean);

  if (recentCards.length) {
    recentCards.forEach(card => {
      recentContainer.appendChild(makeCompactCard(card, true));
    });
    recentSection.hidden = false;
  } else {
    recentSection.hidden = true;
  }
}

// Add pin buttons to main grid cards too
ALL_CARDS.forEach(card => {
  const path = card.getAttribute('href');
  const pinBtn = document.createElement('button');
  pinBtn.className = 'pin-btn' + (isPinned(path) ? ' pin-btn--active' : '');
  pinBtn.setAttribute('aria-label', isPinned(path) ? 'Unpin tool' : 'Pin tool');
  pinBtn.setAttribute('title', 'Pin to top');
  pinBtn.innerHTML = `<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24"
    fill="${isPinned(path) ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>`;
  pinBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    togglePin(path);
    renderRows();
  });
  card.appendChild(pinBtn);
});

// Initial render
renderRows();
```

---

### Step 7 — Graceful degradation without JS

Add a noscript fallback note (or simply hide the sections with CSS until JS runs):

```html
<style>
  #pinned-section,
  #recents-section { display: none; }
</style>
<!-- JS sets hidden attribute dynamically; CSS hides by default so no FOUC -->
```

---

## Files Changed

| File | Action |
|---|---|
| `shared/assets/recents.js` | Create |
| `shared/assets/pinned.js` | Create |
| `index.html` | Add pinned/recent sections, pin buttons, JS logic |
| Every `tool/index.html` | Add `recordVisit()` call on load |

---

## Acceptance Criteria

- [ ] Visiting My Scheme, then Tax Helper, then returning to root shows both in Recent row.
- [ ] Recent row shows max 8 tools, newest first.
- [ ] Clicking the star on a tool card adds it to the Pinned row.
- [ ] Clicking star again removes it from Pinned.
- [ ] Pinned and Recent rows are hidden when empty (first visit with no history).
- [ ] Row scrolls horizontally on small viewports without breaking layout.
- [ ] Pin state persists across page reloads.
- [ ] Works correctly if `localStorage` is unavailable (rows stay hidden).

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Card cloning duplicates duplicate IDs | Remove `id` attributes from cloned cards |
| Horizontal scroll hard to discover on desktop | Add subtle fade-out gradient at right edge when overflow is present |
| Pin button intercepting card click | `e.preventDefault()` + `e.stopPropagation()` on pin button |
| Private mode / localStorage unavailable | Wrap all localStorage calls in try/catch; rows stay hidden gracefully |
