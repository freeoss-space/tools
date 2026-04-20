# Landing Page Search & Tag Filters

**Priority**: 9 of 15
**Confidence**: 95%
**Appears in**: Lists 1 & 2
**Effort**: Low (half a day)

---

## Why This Matters

The landing page currently shows a static grid of tool cards. As the collection grows beyond 10–15 tools, finding the right one becomes a scrolling exercise. A live search input and tag filter chips let users instantly narrow to relevant tools — with zero page load, no backend, and minimal JS.

---

## Implementation Plan

### Step 1 — Add metadata attributes to every `.tool-card` in `index.html`

Each card gets three `data-*` attributes:

```html
<a
  class="tool-card"
  href="/my-scheme/"
  data-name="my scheme"
  data-tags="color theme palette"
  data-description="build and export custom color schemes"
>
  <!-- existing card SVG/content -->
</a>

<a
  class="tool-card"
  href="/which-scheme/"
  data-name="which scheme"
  data-tags="color theme compare"
  data-description="browse and compare editor color themes"
>...</a>

<a
  class="tool-card"
  href="/rss-reader/"
  data-name="rss reader"
  data-tags="rss feed reader news"
  data-description="lightweight rss feed reader with offline support"
>...</a>

<a
  class="tool-card"
  href="/spec-helper/"
  data-name="spec helper"
  data-tags="productivity tasks spec planning"
  data-description="spec-driven development task helper"
>...</a>

<a
  class="tool-card"
  href="/tax-helper/"
  data-name="tax helper"
  data-tags="finance tax tracking"
  data-description="track freelance income and tax obligations"
>...</a>
```

**Defined tag taxonomy** (keep this list intentionally small):

| Tag | Covers |
|---|---|
| `color` | Color pickers, palettes, theme tools |
| `theme` | Editor/UI theme tools |
| `productivity` | Task management, planning |
| `finance` | Tax, budget, money tracking |
| `reader` | Reading, feeds, content consumption |
| `editor` | Image/PDF editing, annotation |
| `ai` | AI-assisted tools |
| `dev` | Developer utilities |

---

### Step 2 — Add search input and tag filter chips to `index.html`

Insert after the site header, before the tools grid:

```html
<div class="tools-filter" role="search">
  <div class="tools-filter__search">
    <svg class="tools-filter__icon" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
    <input
      id="tool-search"
      type="search"
      placeholder="Search tools…"
      aria-label="Search tools"
      autocomplete="off"
      spellcheck="false"
    />
    <button id="clear-search" class="tools-filter__clear" aria-label="Clear search" hidden>
      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 6 6 18M6 6l12 12"/>
      </svg>
    </button>
  </div>

  <div id="tag-filters" class="tools-filter__tags" role="group" aria-label="Filter by tag">
    <button class="tag-chip tag-chip--active" data-tag="all">All</button>
    <button class="tag-chip" data-tag="color">Color</button>
    <button class="tag-chip" data-tag="theme">Theme</button>
    <button class="tag-chip" data-tag="productivity">Productivity</button>
    <button class="tag-chip" data-tag="finance">Finance</button>
    <button class="tag-chip" data-tag="reader">Reader</button>
    <button class="tag-chip" data-tag="editor">Editor</button>
    <button class="tag-chip" data-tag="dev">Dev</button>
  </div>

  <p id="filter-count" class="tools-filter__count" aria-live="polite" aria-atomic="true"></p>
</div>

<div id="no-results" class="tools-no-results" hidden>
  <svg aria-hidden="true" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
  <p>No tools match <strong id="no-results-term"></strong></p>
  <button id="reset-filters" class="btn-secondary">Clear filters</button>
</div>
```

---

### Step 3 — CSS for filter components

Add to root `index.html`'s `<style>` block (or extract to `assets/style.css`):

```css
/* Search + filter bar */
.tools-filter {
  margin-bottom: 32px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tools-filter__search {
  position: relative;
  display: flex;
  align-items: center;
  max-width: 480px;
}

.tools-filter__icon {
  position: absolute;
  left: 12px;
  color: var(--text-muted, #6e7681);
  pointer-events: none;
}

#tool-search {
  width: 100%;
  padding: 10px 40px 10px 38px;
  background: var(--surface, #161b22);
  border: 1px solid var(--border, #30363d);
  border-radius: 8px;
  color: var(--text, #e6edf3);
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.15s;
}

#tool-search:focus {
  border-color: var(--primary, #656ea4);
}

#tool-search::placeholder {
  color: var(--text-muted, #6e7681);
}

.tools-filter__clear {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  color: var(--text-muted, #6e7681);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
}

.tools-filter__clear:hover { color: var(--text, #e6edf3); }

/* Tag chips */
.tools-filter__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-chip {
  padding: 4px 12px;
  border-radius: 100px;
  border: 1px solid var(--border, #30363d);
  background: transparent;
  color: var(--text-muted, #6e7681);
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  white-space: nowrap;
}

.tag-chip:hover {
  background: var(--surface, #161b22);
  color: var(--text, #e6edf3);
}

.tag-chip--active {
  background: var(--primary, #656ea4);
  border-color: var(--primary, #656ea4);
  color: #fff;
}

/* Result count */
.tools-filter__count {
  font-size: 0.8rem;
  color: var(--text-muted, #6e7681);
  min-height: 1.2em;
}

/* No results */
.tools-no-results {
  text-align: center;
  padding: 48px 24px;
  color: var(--text-muted, #6e7681);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

/* Hidden tool cards */
.tool-card[hidden] { display: none; }

/* Highlight matching text */
.tool-card mark {
  background: transparent;
  color: var(--primary, #656ea4);
  font-weight: 600;
}
```

---

### Step 4 — JavaScript filter logic

Add to `index.html` (or `assets/filter.js`):

```js
(function () {
  'use strict';

  const searchInput = document.getElementById('tool-search');
  const clearBtn = document.getElementById('clear-search');
  const tagContainer = document.getElementById('tag-filters');
  const countEl = document.getElementById('filter-count');
  const noResults = document.getElementById('no-results');
  const noResultsTerm = document.getElementById('no-results-term');
  const resetBtn = document.getElementById('reset-filters');
  const cards = [...document.querySelectorAll('.tool-card')];

  let activeTag = 'all';

  function normalize(s) {
    return s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ');
  }

  function applyFilters() {
    const term = normalize(searchInput.value.trim());
    let visible = 0;

    cards.forEach(card => {
      const haystack = normalize([
        card.dataset.name || '',
        card.dataset.tags || '',
        card.dataset.description || '',
      ].join(' '));

      const tagMatch = activeTag === 'all' ||
        (card.dataset.tags || '').split(' ').includes(activeTag);
      const termMatch = !term || haystack.includes(term);

      const show = tagMatch && termMatch;
      card.hidden = !show;
      if (show) visible++;
    });

    // Update count
    countEl.textContent = visible < cards.length
      ? `${visible} of ${cards.length} tools`
      : '';

    // No results state
    const hasFilters = term || activeTag !== 'all';
    noResults.hidden = visible > 0 || !hasFilters;
    if (noResultsTerm) {
      noResultsTerm.textContent = term ? `"${searchInput.value.trim()}"` :
        `tag: ${activeTag}`;
    }

    // Clear button visibility
    clearBtn.hidden = !searchInput.value;
  }

  // Search input
  searchInput.addEventListener('input', applyFilters);

  // Clear search
  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchInput.focus();
    applyFilters();
  });

  // Tag chips
  tagContainer.addEventListener('click', (e) => {
    const chip = e.target.closest('.tag-chip');
    if (!chip) return;
    activeTag = chip.dataset.tag;
    tagContainer.querySelectorAll('.tag-chip').forEach(c => {
      c.classList.toggle('tag-chip--active', c === chip);
    });
    applyFilters();
  });

  // Keyboard: tag chips support arrow key navigation
  tagContainer.addEventListener('keydown', (e) => {
    const chips = [...tagContainer.querySelectorAll('.tag-chip')];
    const idx = chips.indexOf(document.activeElement);
    if (idx === -1) return;
    if (e.key === 'ArrowRight') chips[(idx + 1) % chips.length].focus();
    if (e.key === 'ArrowLeft') chips[(idx - 1 + chips.length) % chips.length].focus();
  });

  // Reset all filters
  resetBtn?.addEventListener('click', () => {
    searchInput.value = '';
    activeTag = 'all';
    tagContainer.querySelectorAll('.tag-chip').forEach(c => {
      c.classList.toggle('tag-chip--active', c.dataset.tag === 'all');
    });
    applyFilters();
    searchInput.focus();
  });

  // Keyboard shortcut: `/` focuses search from anywhere on the page
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== searchInput &&
        !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
  });
})();
```

---

### Step 5 — Persist last used tag filter (optional quality-of-life)

```js
// Restore last tag filter on page load
const savedTag = localStorage.getItem('tools:filter-tag') || 'all';
if (savedTag !== 'all') {
  const chip = tagContainer.querySelector(`[data-tag="${savedTag}"]`);
  if (chip) {
    activeTag = savedTag;
    tagContainer.querySelectorAll('.tag-chip').forEach(c => {
      c.classList.toggle('tag-chip--active', c === chip);
    });
    applyFilters();
  }
}

// Save tag filter on change (add inside click handler):
localStorage.setItem('tools:filter-tag', activeTag);
```

---

## Files Changed

| File | Action |
|---|---|
| `index.html` | Add `data-name`, `data-tags`, `data-description` to all `.tool-card` elements |
| `index.html` | Add search input + tag chips HTML |
| `index.html` (style block) | Add filter CSS |
| `index.html` (script block) | Add filter JS (or extract to `assets/filter.js`) |

---

## Acceptance Criteria

- [ ] Typing "color" in search instantly shows only color-related tools.
- [ ] Clicking "Finance" tag shows only tax/finance tools.
- [ ] Combining search term + tag filter narrows results correctly.
- [ ] "No results" state shows when no tools match.
- [ ] Clicking "Clear filters" resets to full grid.
- [ ] `/` keyboard shortcut focuses search input (when not already in an input).
- [ ] Arrow keys navigate tag chips.
- [ ] Result count updates correctly with accessible `aria-live` region.
- [ ] Works correctly with JavaScript disabled? (graceful degradation: all cards visible)

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Typos in `data-tags` cause mismatch | Keep tags to a defined set; validate at build/CI time |
| New tools added without metadata | Document the requirement in `CLAUDE.md` and HTML validate |
| Search performance on large lists | `normalize` and `includes` are O(n·m); fast for <100 tools |
