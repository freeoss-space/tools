# RSS Sync Reliability: Retry, Backoff, Concurrency & Error States

**Priority**: 6 of 15
**Confidence**: 94%
**Appears in**: Lists 1 & 3
**Effort**: Medium (2–3 days)

---

## Why This Matters

The RSS Reader is the most network-intensive tool — it fires simultaneous fetch requests for every subscribed feed, with no timeout, no retry, no concurrency control, and no per-feed error visibility. A single flaky feed can silently fail; many flaky feeds can produce a wall of browser network errors. This makes the tool unreliable precisely when users have the most feeds subscribed.

---

## Current Problems

| Problem | Impact |
|---|---|
| All feeds fetched in parallel (unbounded) | 20+ simultaneous requests on slow connections, potential throttling |
| No timeout on fetch | Stalled network request can hang indefinitely |
| No retry on transient failure | 1 network blip = feed never synced until next manual trigger |
| No per-feed error state persisted | Users have no idea why a feed shows stale content |
| No backoff between retries | Rapid retries can worsen server-side rate limiting |
| Sync progress invisible | No indication of how many feeds have completed |

---

## Implementation Plan

### Step 1 — Create `shared/assets/fetch-with-retry.js`

```js
// shared/assets/fetch-with-retry.js

/**
 * Fetch with timeout control.
 *
 * @param {string} url
 * @param {RequestInit & { timeoutMs?: number }} options
 * @returns {Promise<Response>}
 */
export async function fetchWithTimeout(url, { timeoutMs = 10_000, ...options } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch with exponential backoff retry.
 *
 * @param {string} url
 * @param {RequestInit & { timeoutMs?: number, retries?: number, baseDelayMs?: number }} options
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(url, {
  retries = 2,
  baseDelayMs = 500,
  timeoutMs = 10_000,
  ...options
} = {}) {
  let attempt = 0;
  while (true) {
    try {
      const response = await fetchWithTimeout(url, { timeoutMs, ...options });
      // Treat 5xx as retryable; 4xx are definitive failures
      if (response.status >= 500 && attempt < retries) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response;
    } catch (err) {
      if (attempt >= retries) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise(r => setTimeout(r, delay));
      attempt++;
    }
  }
}
```

---

### Step 2 — Create `shared/assets/concurrency-queue.js`

```js
// shared/assets/concurrency-queue.js

/**
 * Process an array of items with bounded concurrency.
 *
 * @template T, R
 * @param {T[]} items
 * @param {number} concurrency
 * @param {(item: T, index: number) => Promise<R>} task
 * @returns {Promise<Array<{ status: 'fulfilled', value: R } | { status: 'rejected', reason: any }>>}
 */
export async function pLimit(items, concurrency, task) {
  const results = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      try {
        results[i] = { status: 'fulfilled', value: await task(items[i], i) };
      } catch (reason) {
        results[i] = { status: 'rejected', reason };
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, worker);
  await Promise.all(workers);
  return results;
}
```

---

### Step 3 — Update feed data model

Add sync metadata fields to each feed object in state:

```js
// Feed schema (v3 in storage migrations)
const feedDefaults = {
  id: '',
  url: '',
  title: '',
  description: '',
  siteUrl: '',
  // Sync metadata:
  lastSyncedAt: null,       // ISO string or null
  lastSyncError: null,      // Error message string or null
  failureCount: 0,          // Consecutive failure count
  etag: null,               // HTTP ETag for conditional requests
  lastModified: null,       // HTTP Last-Modified for conditional requests
  isLoading: false,         // UI-only: show spinner
};
```

---

### Step 4 — Rewrite the sync function in `rss-reader/assets/app.js`

```js
import { fetchWithRetry } from '/shared/assets/fetch-with-retry.js';
import { pLimit } from '/shared/assets/concurrency-queue.js';

const SYNC_CONCURRENCY = 3;
const PROXY_BASE = 'https://api.allorigins.win/raw?url=';

async function syncAllFeeds() {
  const feeds = state.feeds;
  if (!feeds.length) return;

  updateSyncProgress({ total: feeds.length, done: 0 });

  let done = 0;
  const results = await pLimit(feeds, SYNC_CONCURRENCY, async (feed) => {
    const result = await syncOneFeed(feed);
    done++;
    updateSyncProgress({ total: feeds.length, done });
    return result;
  });

  // Update state with results
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      Object.assign(state.feeds[i], result.value);
    } else {
      state.feeds[i].lastSyncError = result.reason?.message || 'Unknown error';
      state.feeds[i].failureCount = (state.feeds[i].failureCount || 0) + 1;
    }
  });

  persist();
  renderFeedList();
  clearSyncProgress();
}

async function syncOneFeed(feed) {
  const headers = {};
  if (feed.etag) headers['If-None-Match'] = feed.etag;
  if (feed.lastModified) headers['If-Modified-Since'] = feed.lastModified;

  const url = PROXY_BASE + encodeURIComponent(feed.url);
  const response = await fetchWithRetry(url, {
    headers,
    timeoutMs: 12_000,
    retries: 2,
  });

  // 304 Not Modified — feed unchanged
  if (response.status === 304) {
    return {
      lastSyncedAt: new Date().toISOString(),
      lastSyncError: null,
      failureCount: 0,
    };
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const text = await response.text();
  const parsed = parseFeed(text);

  // Merge new articles (avoid duplicates by guid/link)
  const existingIds = new Set(state.articles.map(a => a.id));
  const newArticles = parsed.items
    .filter(item => !existingIds.has(item.id))
    .map(item => ({ ...item, feedId: feed.id, readAt: null }));
  state.articles.unshift(...newArticles);

  // Prune to max articles
  const MAX = state.settings?.maxArticles ?? 500;
  if (state.articles.length > MAX) {
    state.articles = state.articles.slice(0, MAX);
  }

  return {
    title: parsed.title || feed.title,
    description: parsed.description || feed.description,
    siteUrl: parsed.siteUrl || feed.siteUrl,
    etag: response.headers.get('ETag'),
    lastModified: response.headers.get('Last-Modified'),
    lastSyncedAt: new Date().toISOString(),
    lastSyncError: null,
    failureCount: 0,
  };
}
```

---

### Step 5 — Progress indicator

```js
function updateSyncProgress({ total, done }) {
  let bar = document.getElementById('sync-progress');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'sync-progress';
    bar.setAttribute('role', 'status');
    bar.setAttribute('aria-live', 'polite');
    document.querySelector('.feed-header').appendChild(bar);
  }
  const pct = Math.round((done / total) * 100);
  bar.innerHTML = `
    <div class="sync-bar">
      <div class="sync-bar__fill" style="width: ${pct}%"></div>
    </div>
    <span class="sync-label">Syncing ${done}/${total} feeds…</span>
  `;
}

function clearSyncProgress() {
  document.getElementById('sync-progress')?.remove();
}
```

CSS:

```css
.sync-bar {
  height: 3px;
  background: var(--border);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 6px;
}
.sync-bar__fill {
  height: 100%;
  background: var(--primary);
  transition: width 0.2s ease;
}
.sync-label {
  font-size: 0.75rem;
  color: var(--text-muted);
}
```

---

### Step 6 — Per-feed error state UI

```js
function renderFeedItem(feed) {
  const hasError = !!feed.lastSyncError;
  const errorBadge = hasError ? `
    <span class="feed-badge feed-badge--error" title="${escapeHtml(feed.lastSyncError)}">
      <svg aria-hidden="true" width="12" height="12"><!-- warning icon --></svg>
      Error
    </span>
  ` : '';

  const lastSynced = feed.lastSyncedAt
    ? `<time datetime="${feed.lastSyncedAt}">
        ${formatRelativeTime(feed.lastSyncedAt)}
       </time>`
    : 'Never synced';

  return `
    <li class="feed-item ${hasError ? 'feed-item--error' : ''}" data-feed-id="${feed.id}">
      <div class="feed-item__info">
        <span class="feed-item__title">${escapeHtml(feed.title || feed.url)}</span>
        ${errorBadge}
        <span class="feed-item__meta">${lastSynced}</span>
      </div>
      <div class="feed-item__actions">
        <button class="btn-icon" data-action="retry-feed" aria-label="Retry sync for ${escapeHtml(feed.title)}">
          <svg aria-hidden="true"><!-- refresh icon --></svg>
        </button>
        <button class="btn-icon" data-action="delete-feed" aria-label="Delete feed ${escapeHtml(feed.title)}">
          <svg aria-hidden="true"><!-- trash icon --></svg>
        </button>
      </div>
    </li>
  `;
}
```

---

### Step 7 — Automatic sync scheduling

```js
const SYNC_INTERVAL_MINUTES = state.settings?.syncInterval ?? 30;

function startAutoSync() {
  if (window._syncTimer) clearInterval(window._syncTimer);
  window._syncTimer = setInterval(
    () => syncAllFeeds(),
    SYNC_INTERVAL_MINUTES * 60 * 1000
  );
}

// Also sync when page becomes visible again (after backgrounding)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    const lastSync = state.feeds
      .map(f => f.lastSyncedAt)
      .filter(Boolean)
      .sort()
      .at(-1);
    const staleMins = lastSync
      ? (Date.now() - new Date(lastSync).getTime()) / 60_000
      : Infinity;
    if (staleMins > SYNC_INTERVAL_MINUTES) syncAllFeeds();
  }
});
```

---

## Files Changed

| File | Action |
|---|---|
| `shared/assets/fetch-with-retry.js` | Create |
| `shared/assets/concurrency-queue.js` | Create |
| `rss-reader/assets/app.js` | Rewrite `syncAllFeeds`, update feed model, add progress UI |
| `rss-reader/assets/style.css` | Add `.sync-bar`, `.feed-badge--error` styles |

---

## Acceptance Criteria

- [ ] Sync never fires more than 3 concurrent requests.
- [ ] A feed that returns 500 is retried twice with backoff before marking as error.
- [ ] A feed that times out after 12s is marked as error (not loading indefinitely).
- [ ] Each feed shows its last-synced time and error message if applicable.
- [ ] Per-feed "retry" button re-syncs only that feed.
- [ ] 304 responses don't re-parse or re-merge articles.
- [ ] Progress bar shows accurate count during sync.
- [ ] Auto-sync triggers on page visibility restore after stale interval.

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| CORS proxy returns errors instead of 304 | Store ETag from proxy response; fall back gracefully if 304 not returned |
| Feed parse errors (malformed XML) | Wrap `parseFeed` in try/catch; set `lastSyncError` rather than crash |
| Infinite retry loop | `failureCount` caps at 5; after 5 failures, skip feed until user manually retries |
| Timer leaks on SPA navigation | Always `clearInterval` before setting new timer |
