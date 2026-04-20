# Shared Versioned Storage with Migrations

**Priority**: 2 of 15
**Confidence**: 92%
**Appears in**: All 3 idea lists
**Effort**: Medium (2–3 days)

---

## Why This Matters

Every tool stores state in `localStorage`. As tools evolve — new fields, renamed keys, restructured data — users who have existing data silently receive corrupt/missing values when the new code runs. This causes confusing blank states, runtime errors, and lost data. A unified storage module with schema versioning and migration chains solves this systematically across all tools.

---

## Design Goals

1. **Single import** — every tool uses `loadState` / `saveState` from one module.
2. **Per-tool schema version** — each tool declares a current version integer.
3. **Migration chain** — an array of `{ from, to, run }` objects that transform old data to new shape.
4. **Corruption recovery** — any `JSON.parse` failure returns defaults without crashing.
5. **Backup before migration** — store pre-migration data at `<key>__backup` so users can roll back.
6. **Zero external dependencies** — plain ES module, no libraries.

---

## Implementation Plan

### Step 1 — Create `/shared/assets/storage.js`

```js
// shared/assets/storage.js

/**
 * @typedef {{ from: number, to: number, run: (state: any) => any }} Migration
 */

/**
 * Load and migrate tool state from localStorage.
 *
 * @param {{
 *   key: string,
 *   version: number,
 *   defaults: object,
 *   migrations?: Migration[]
 * }} options
 * @returns {object}
 */
export function loadState({ key, version, defaults, migrations = [] }) {
  let raw = null;
  try {
    raw = localStorage.getItem(key);
    if (!raw) return { ...defaults, _v: version };

    let state = JSON.parse(raw);
    if (!state || typeof state !== 'object') throw new Error('non-object');

    let v = typeof state._v === 'number' ? state._v : 1;

    if (v < version) {
      // Snapshot pre-migration data for recovery
      try {
        localStorage.setItem(`${key}__backup`, raw);
      } catch { /* quota exceeded — best effort */ }

      while (v < version) {
        const step = migrations.find(m => m.from === v);
        if (!step) {
          console.warn(`[storage] No migration from v${v} for key "${key}". Resetting.`);
          return { ...defaults, _v: version };
        }
        state = step.run(state);
        v = step.to;
      }
    }

    // Merge with defaults so new fields are populated
    return { ...defaults, ...state, _v: version };
  } catch (err) {
    console.warn(`[storage] Failed to load "${key}":`, err);
    return { ...defaults, _v: version };
  }
}

/**
 * Persist tool state to localStorage.
 *
 * @param {string} key
 * @param {object} state
 * @returns {boolean} true if successful
 */
export function saveState(key, state) {
  try {
    localStorage.setItem(key, JSON.stringify(state));
    return true;
  } catch (err) {
    console.warn(`[storage] Failed to save "${key}":`, err);
    return false;
  }
}

/**
 * Remove all persisted data for a key (including backup).
 *
 * @param {string} key
 */
export function clearState(key) {
  localStorage.removeItem(key);
  localStorage.removeItem(`${key}__backup`);
}

/**
 * Return raw JSON string for a key (for export/backup features).
 *
 * @param {string} key
 * @returns {string|null}
 */
export function exportRaw(key) {
  return localStorage.getItem(key);
}
```

---

### Step 2 — Define storage contracts per tool

Each tool creates a config object at the top of its `app.js`:

```js
// rss-reader/assets/app.js
import { loadState, saveState } from '/shared/assets/storage.js';

const STORAGE_CONFIG = {
  key: 'rss-reader-data',
  version: 3,
  defaults: {
    feeds: [],
    articles: [],
    readIds: [],
    settings: { syncInterval: 30, maxArticles: 500 },
  },
  migrations: [
    {
      from: 1, to: 2,
      run: (s) => ({
        ...s,
        // v1 stored articles as object map; v2 uses array
        articles: Object.values(s.articles || {}),
      }),
    },
    {
      from: 2, to: 3,
      run: (s) => ({
        ...s,
        // v3 adds settings block
        settings: { syncInterval: 30, maxArticles: 500 },
      }),
    },
  ],
};

let state = loadState(STORAGE_CONFIG);

function persist() {
  saveState(STORAGE_CONFIG.key, state);
}
```

---

### Step 3 — Per-tool migration tables

**my-scheme** (current assumed v1 → v2: palette format change):

```js
const STORAGE_CONFIG = {
  key: 'my-scheme-data',
  version: 2,
  defaults: { palettes: [], activePaletteId: null },
  migrations: [
    {
      from: 1, to: 2,
      run: (s) => ({
        ...s,
        // v1 used `colors` array; v2 uses `swatches` with id+hex+name
        palettes: (s.palettes || []).map(p => ({
          ...p,
          swatches: (p.colors || []).map((hex, i) => ({
            id: `s${i}`,
            hex,
            name: '',
          })),
        })),
      }),
    },
  ],
};
```

**spec-helper** (v1 → v2: tasks gain `priority` field):

```js
const STORAGE_CONFIG = {
  key: 'spec-helper-data',
  version: 2,
  defaults: { tasks: [], templates: [] },
  migrations: [
    {
      from: 1, to: 2,
      run: (s) => ({
        ...s,
        tasks: (s.tasks || []).map(t => ({ priority: 'medium', ...t })),
      }),
    },
  ],
};
```

**tax-helper** (simple, currently v1):

```js
const STORAGE_CONFIG = {
  key: 'tax-helper-data',
  version: 1,
  defaults: { entries: [], year: new Date().getFullYear() },
  migrations: [],
};
```

---

### Step 4 — Migrate each tool's existing direct `localStorage` calls

Find and replace all direct storage access:

```bash
grep -rn 'localStorage\.' --include='*.js' tools/
```

Replace patterns:

```js
// Before (scattered across tools):
const data = JSON.parse(localStorage.getItem('rss-reader-data') || '{}');
localStorage.setItem('rss-reader-data', JSON.stringify(state));

// After:
let state = loadState(STORAGE_CONFIG);
// ...
saveState(STORAGE_CONFIG.key, state);
```

---

### Step 5 — Add a recovery UI

When a backup key exists (`<key>__backup`), show a subtle restore option in the tool header:

```js
function checkForBackup(key) {
  const backup = localStorage.getItem(`${key}__backup`);
  if (!backup) return;
  const banner = document.createElement('div');
  banner.className = 'storage-backup-banner';
  banner.innerHTML = `
    <span>Data was migrated from an older format.</span>
    <button id="restore-backup">Restore previous version</button>
    <button id="dismiss-backup">Dismiss</button>
  `;
  document.body.prepend(banner);

  document.getElementById('restore-backup').onclick = () => {
    localStorage.setItem(key, backup);
    localStorage.removeItem(`${key}__backup`);
    location.reload();
  };
  document.getElementById('dismiss-backup').onclick = () => {
    localStorage.removeItem(`${key}__backup`);
    banner.remove();
  };
}
```

---

### Step 6 — Write migration tests

```js
// tests/storage.test.js
import { loadState, saveState, clearState } from '/shared/assets/storage.js';

const KEY = 'test-storage-key';
const CONFIG = {
  key: KEY,
  version: 3,
  defaults: { items: [], count: 0, settings: {} },
  migrations: [
    { from: 1, to: 2, run: s => ({ ...s, count: (s.items || []).length }) },
    { from: 2, to: 3, run: s => ({ ...s, settings: {} }) },
  ],
};

// Test: fresh load returns defaults
clearState(KEY);
const fresh = loadState(CONFIG);
console.assert(Array.isArray(fresh.items), 'items is array');
console.assert(fresh._v === 3, '_v is current version');

// Test: v1 data migrates to v3
localStorage.setItem(KEY, JSON.stringify({ _v: 1, items: ['a', 'b'] }));
const migrated = loadState(CONFIG);
console.assert(migrated.count === 2, 'v1→v2 migration ran: count from items');
console.assert(typeof migrated.settings === 'object', 'v2→v3 migration ran: settings added');

// Test: backup was created
console.assert(localStorage.getItem(`${KEY}__backup`) !== null, 'backup stored');

// Test: corrupt data returns defaults
localStorage.setItem(KEY, '{invalid json}');
const recovered = loadState(CONFIG);
console.assert(Array.isArray(recovered.items), 'corrupt data returns defaults');

// Test: save/load round-trip
clearState(KEY);
saveState(KEY, { ...CONFIG.defaults, _v: 3, items: ['x'] });
const loaded = loadState(CONFIG);
console.assert(loaded.items[0] === 'x', 'save/load round-trip');

console.log('All storage tests passed');
```

---

## Files Changed

| File | Action |
|---|---|
| `shared/assets/storage.js` | Create |
| `rss-reader/assets/app.js` | Replace direct localStorage with `loadState`/`saveState` + migrations |
| `my-scheme/assets/app.js` | Same |
| `which-scheme/assets/app.js` | Same |
| `spec-helper/assets/app.js` | Same |
| `tax-helper/assets/app.js` (or inline) | Same |
| `tests/storage.test.js` | Create |

---

## Acceptance Criteria

- [ ] All tools load their state via `loadState`.
- [ ] Old data from v1 of each tool migrates cleanly without data loss.
- [ ] Corrupt `localStorage` values produce default state without throwing.
- [ ] Backup key is created before any migration runs.
- [ ] Recovery banner appears when a backup key exists.
- [ ] All migration tests pass.
- [ ] No direct `localStorage.setItem`/`getItem` calls remain in tool JS (except in `storage.js`).

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Missing migration step causes data loss | Warn + reset to defaults; backup always preserved |
| `localStorage` quota exceeded on save | `saveState` returns `false`; caller can warn user |
| Migration bug corrupts data | Backup key allows recovery; migration tests catch regressions |
| Tool forgets to bump version | Add lint rule checking `_v` is incremented in same PR |
