# Ideas for Improving `freeoss-space/tools`

## 1) Initial list: 30 candidate ideas (one-liners)

1. Add robust HTML/URL sanitization for user-generated content and rendered previews.
2. Create a shared versioned localStorage utility with schema migrations and corruption recovery.
3. Add a cross-tool backup/restore feature (single JSON export/import for all tool data).
4. Perform a full accessibility pass (keyboard navigation, ARIA labels, focus states, reduced motion).
5. Add Playwright smoke tests for all tools and key user flows.
6. Add GitHub Actions CI for linting, tests, and dead-link checks.
7. Improve RSS Reader sync with concurrency limits, retry/backoff, and feed-level error states.
8. Add ETag/Last-Modified caching to RSS fetches to reduce bandwidth and speed sync.
9. Add a global theme switcher with persisted preference across all tools.
10. Extract shared page shell/header/card styles into reusable CSS to remove duplication.
11. Introduce shared utility modules (DOM helpers, toast, file download, storage) reused by all tools.
12. Add virtualized rendering for very large RSS article lists.
13. Add built-in data validation for imported JSON across tools.
14. Add undo/redo support to more tools (not just PDF annotator).
15. Add keyboard shortcuts cheat-sheet and command palette per tool.
16. Add mobile-first layout refinements for dense tools (Tax Helper, Spec Helper).
17. Add one-click “reset app data” controls with confirmation and partial reset options.
18. Add structured error panel/logging in dev mode to make debugging easier.
19. Add screenshot thumbnail generation for tool cards from live pages.
20. Add a “recently used tools” section on the root index page.
21. Add search/filter to the root tool directory.
22. Add optional cloud sync (GitHub Gist or file-based) for tool state.
23. Add import-from-URL support for palettes and templates.
24. Add schema docs for each tool’s persisted data.
25. Add performance budgets and bundle-size checks in CI.
26. Add visual regression tests for key screens.
27. Add i18n scaffolding and locale files.
28. Add plugin architecture for extending each tool.
29. Add telemetry/analytics for anonymous usage patterns.
30. Add in-app onboarding tours for first-time users.

## 2) Critical evaluation of all 30 ideas

| # | Decision | Verdict rationale |
|---|---|---|
| 1 | **Keep** | Strong security impact; directly relevant because multiple tools render user-controlled content. |
| 2 | **Keep** | High reliability and maintainability gain across many localStorage-backed tools. |
| 3 | **Keep** | High user value (portability/backup); aligns with offline/local-first architecture. |
| 4 | **Keep** | Accessibility gaps are likely in custom controls; high product quality impact. |
| 5 | **Keep** | No existing test harness detected; smoke tests would prevent regressions. |
| 6 | **Keep** | CI gate is foundational and currently appears absent; protects quality over time. |
| 7 | **Keep** | RSS Reader is network-heavy; reliability improvements are high leverage. |
| 8 | **Keep** | Meaningful performance win for RSS sync with low UX risk. |
| 9 | **Keep** | Cross-tool consistency and user preference persistence are practical quality wins. |
| 10 | **Keep** | Significant duplication exists in page scaffolding/styles; strong maintainability gain. |
| 11 | **Keep** | JS helper patterns are repeated across tools; shared utilities reduce bugs and drift. |
| 12 | Reject | Valuable only for very large feeds; lower ROI than core reliability/security work. |
| 13 | **Keep** | Import paths are risky without validation; this prevents corruption and edge-case crashes. |
| 14 | Reject | Nice-to-have but expensive and uneven value depending on tool complexity. |
| 15 | Reject | Useful but secondary to correctness, security, and test coverage. |
| 16 | Reject | Good UX work, but broad and subjective without first fixing systemic quality issues. |
| 17 | Reject | Helpful but lower priority than backup/restore and schema safety. |
| 18 | Reject | Debug logging is useful mostly for developers; lower end-user impact than top picks. |
| 19 | Reject | Cosmetic enhancement with limited functional benefit. |
| 20 | Reject | Minor discoverability gain; not a top-tier improvement. |
| 21 | Reject | Directory is still small enough; search is premature optimization. |
| 22 | Reject | Significant complexity and security/privacy implications; not worth current scope. |
| 23 | Reject | Useful niche feature; lower impact than core infra/security improvements. |
| 24 | Reject | Good documentation idea, but deferred until schemas are stabilized by migration work. |
| 25 | Reject | Repo has no bundling step; bundle budgets add little value currently. |
| 26 | Reject | Good long-term, but should come after basic smoke tests and CI are in place. |
| 27 | Reject | Premature without explicit multilingual goals. |
| 28 | Reject | Over-engineering for a compact static tool collection. |
| 29 | Reject | Privacy overhead and policy burden; conflicts with local-first simplicity. |
| 30 | Reject | Nice onboarding feature, but secondary to reliability/security/testing foundations. |

## 3) Detailed plans for ideas that passed scrutiny

### Idea 1 — Security hardening for rendered content and URLs

**What this is**
Create a shared sanitization layer for any user-controlled content rendered into the DOM (notably markdown and imported content), and enforce safe URL handling (`http:`, `https:`, `mailto:` allowlist).

**Concrete plan**
1. Add `/shared/assets/sanitize.js` with `escapeHtml`, `sanitizeHtml`, and `sanitizeUrl`.
2. Replace unsafe `innerHTML` rendering paths with sanitized output.
3. Enforce URL sanitization in RSS links/images and Spec Helper markdown output.
4. Add tests that inject malicious payloads and verify they are neutralized.

```js
// /shared/assets/sanitize.js
export function sanitizeUrl(url) {
  try {
    const u = new URL(url, location.origin);
    const allowed = ['http:', 'https:', 'mailto:'];
    return allowed.includes(u.protocol) ? u.href : '#';
  } catch {
    return '#';
  }
}

export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

**Why this is good**
Prevents XSS and unsafe-link vectors in a repo where multiple tools accept/import/render user-provided content.

**Possible downsides**
- Slightly more complexity in render code.
- May strip some advanced markdown/HTML behaviors users expect.

**Confidence it improves project**: **95%**

---

### Idea 2 — Shared versioned storage with migrations

**What this is**
Standardize persistence behind a small storage engine with schema versioning, migration hooks, and fallback on invalid/corrupt data.

**Concrete plan**
1. Add `/shared/assets/storage.js` with `loadState(key, defaults, migrations)` and `saveState(key, state)`.
2. Add per-tool schema version and migration arrays.
3. Add migration tests for old versions and malformed payloads.

```js
// /shared/assets/storage.js
export function loadState({ key, version, defaults, migrations = [] }) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { ...defaults, _v: version };
    let state = JSON.parse(raw);
    let v = state._v || 1;
    while (v < version) {
      const migrate = migrations.find(m => m.from === v);
      if (!migrate) break;
      state = migrate.run(state);
      v = migrate.to;
    }
    return { ...defaults, ...state, _v: version };
  } catch {
    return { ...defaults, _v: version };
  }
}
```

**Why this is good**
Prevents silent data breakage as features evolve and reduces copy-pasted storage logic.

**Possible downsides**
- Requires careful migration design and testing.
- Initial refactor touches multiple tools.

**Confidence it improves project**: **92%**

---

### Idea 3 — Cross-tool backup/restore bundle

**What this is**
Allow users to export all tool data to one file and restore it later or on another device.

**Concrete plan**
1. Add a root-level “Data Manager” page (or modal) linked from `index.html`.
2. Define a manifest format containing per-tool keys and versions.
3. Implement export (download JSON) and restore (validate + merge/replace strategy).

```json
{
  "format": "tools-backup-v1",
  "exportedAt": "2026-04-20T00:00:00.000Z",
  "data": {
    "rss-reader-data": { "_v": 2, "feeds": [], "articles": [] },
    "spec-helper-data": { "_v": 1, "tasks": [] }
  }
}
```

**Why this is good**
Massively improves trust and portability for local-first apps.

**Possible downsides**
- Restore UX must avoid accidental destructive overwrite.
- Needs robust validation to avoid importing corrupted payloads.

**Confidence it improves project**: **90%**

---

### Idea 4 — Accessibility hardening across tools

**What this is**
Systematically improve keyboard navigation, labels, focus handling, and reduced-motion behavior.

**Concrete plan**
1. Add semantic labels/roles for custom controls and icon-only buttons.
2. Ensure all modals trap focus and close on `Escape`.
3. Add visible focus styles and `prefers-reduced-motion` fallbacks.
4. Add accessibility checks in CI (Playwright + axe-core).

```css
:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; animation: none !important; }
}
```

**Why this is good**
Improves usability for keyboard and assistive-tech users while usually improving overall UX quality.

**Possible downsides**
- Requires cross-tool audit time.
- Some UI interactions may need redesign, not just attributes.

**Confidence it improves project**: **93%**

---

### Idea 5 — Playwright smoke tests for all tools

**What this is**
Introduce minimal end-to-end checks that each tool page loads and key interactions work.

**Concrete plan**
1. Add Playwright config and one smoke suite per tool.
2. Test basic flows (open page, core action, expected state change).
3. Run on CI for pull requests.

```ts
test('rss reader loads and can open add-feed dialog', async ({ page }) => {
  await page.goto('/rss-reader/index.html');
  await expect(page.getByRole('heading', { name: /rss/i })).toBeVisible();
  await page.getByRole('button', { name: /add feed/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
});
```

**Why this is good**
Catches breakages quickly in a multi-tool static project with lots of DOM-driven behavior.

**Possible downsides**
- Adds maintenance burden for brittle selectors.
- Introduces Node dependency in otherwise no-build repo.

**Confidence it improves project**: **88%**

---

### Idea 6 — GitHub Actions quality pipeline

**What this is**
Add CI workflows for formatting/lint checks, smoke tests, and link validation.

**Concrete plan**
1. Add workflow: install deps, run static checks, run Playwright tests.
2. Add HTML/CSS/JS lint commands and link checker for internal links.
3. Require status checks for PR merge.

```yaml
name: ci
on: [pull_request, push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run lint
      - run: npm run test:e2e
```

**Why this is good**
Provides consistent, automated quality gates and prevents regressions from landing.

**Possible downsides**
- Requires defining and maintaining scripts/tooling baseline.
- CI runtime cost.

**Confidence it improves project**: **91%**

---

### Idea 7 — RSS sync reliability (retry/backoff/concurrency/error states)

**What this is**
Refactor RSS sync to process feeds with bounded concurrency, resilient retries, timeout control, and visible per-feed failure states.

**Concrete plan**
1. Add fetch wrapper with timeout and exponential backoff.
2. Sync feeds via queue (`N=3` concurrency).
3. Track `lastSyncedAt`, `lastError`, and failure counts on each feed.
4. Show status badges and retry controls in UI.

```js
async function withRetry(task, retries = 2) {
  let attempt = 0;
  while (true) {
    try { return await task(); }
    catch (e) {
      if (attempt >= retries) throw e;
      await new Promise(r => setTimeout(r, 500 * 2 ** attempt));
      attempt++;
    }
  }
}
```

**Why this is good**
Directly improves one of the most failure-prone paths (network-heavy sync).

**Possible downsides**
- More state complexity in RSS tool.
- Must avoid making sync feel slower due to conservative concurrency.

**Confidence it improves project**: **94%**

---

### Idea 8 — HTTP caching for RSS feeds (ETag/Last-Modified)

**What this is**
Persist feed validators and use conditional requests to skip downloading unchanged feed payloads.

**Concrete plan**
1. Store `etag` and `lastModified` per feed.
2. Send `If-None-Match` / `If-Modified-Since` headers when possible.
3. On `304`, skip parse/merge and mark feed as checked.

```js
const headers = {};
if (feed.etag) headers['If-None-Match'] = feed.etag;
if (feed.lastModified) headers['If-Modified-Since'] = feed.lastModified;
const resp = await fetch(url, { headers });
if (resp.status === 304) return { unchanged: true };
```

**Why this is good**
Reduces network use and speeds repeat syncs, especially for many feeds.

**Possible downsides**
- Proxy/CDN paths may not always preserve validator headers.
- Needs compatibility fallback when headers are unavailable.

**Confidence it improves project**: **84%**

---

### Idea 9 — Global theme preference and toggle

**What this is**
Provide a consistent dark/light toggle on every page, persisting user choice in localStorage and applying it before first paint.

**Concrete plan**
1. Add tiny shared theme script loaded in `<head>`.
2. Add toggle UI in each tool header.
3. Sync preference across tools using same key (`tools-theme`).

```html
<script>
  (function() {
    const t = localStorage.getItem('tools-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', t);
  })();
</script>
```

**Why this is good**
Improves consistency and user control across a multi-tool suite.

**Possible downsides**
- Some pages may require contrast tuning in light mode.
- Small implementation overhead per page.

**Confidence it improves project**: **86%**

---

### Idea 10 — Extract shared layout/components to reduce duplication

**What this is**
Move repeated header/button/card/tab styles from inline page CSS into shared assets under `aquadrive/assets/`.

**Concrete plan**
1. Audit common selectors across tool pages (`header`, buttons, tabs, cards).
2. Promote stable patterns into `components.css` and optional `layout.css`.
3. Replace duplicated inline styles with shared classes.

```css
/* aquadrive/assets/layout.css */
.page-shell { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
.page-header { border-bottom: 1px solid var(--border); padding: 20px 0; margin-bottom: 24px; }
```

**Why this is good**
Reduces maintenance overhead and makes visual consistency easier.

**Possible downsides**
- Refactor risk if pages rely on subtle style differences.
- Requires careful incremental rollout.

**Confidence it improves project**: **89%**

---

### Idea 11 — Shared utility layer for repeated JS helpers

**What this is**
Centralize repeated helper logic (`$` selector helper, toast behavior, file download helper, ID generation, debouncing).

**Concrete plan**
1. Add `/shared/assets/core.js` with utility exports.
2. Migrate tools incrementally to avoid large blast radius.
3. Add small unit tests for helper behavior.

```js
export const $ = (s, root = document) => root.querySelector(s);
export function debounce(fn, ms = 200) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
```

**Why this is good**
Improves consistency and reduces chance of subtly different buggy re-implementations.

**Possible downsides**
- Introduces shared dependency surface area across tools.
- Needs clear versioning strategy for utilities.

**Confidence it improves project**: **87%**

---

### Idea 12 — Strict import validation framework

**What this is**
Before importing user JSON/structured data, validate shape/types and reject unknown or dangerous fields.

**Concrete plan**
1. Define JSON schemas (or lightweight validators) per importable format.
2. Validate payload before merge.
3. Show user-friendly error messages with exact failing paths.

```js
function validateTemplateImport(x) {
  if (!x || typeof x !== 'object') return 'Payload must be an object';
  if (!Array.isArray(x.templates)) return 'templates must be an array';
  for (const t of x.templates) {
    if (typeof t.name !== 'string' || typeof t.content !== 'string') {
      return 'Each template needs string name/content';
    }
  }
  return null;
}
```

**Why this is good**
Prevents crashes, corrupted state, and unsafe content paths from malformed imports.

**Possible downsides**
- Additional code for validators and maintenance.
- Needs version-aware schema evolution.

**Confidence it improves project**: **90%**

---

## 4) Final prioritization (recommended execution order)

1. Idea 1 (Security hardening)
2. Idea 2 (Versioned storage + migrations)
3. Idea 6 (CI pipeline)
4. Idea 5 (Playwright smoke tests)
5. Idea 4 (Accessibility hardening)
6. Idea 7 (RSS reliability)
7. Idea 3 (Cross-tool backup/restore)
8. Idea 10 (Shared layout/components)
9. Idea 11 (Shared JS utilities)
10. Idea 12 (Strict import validation)
11. Idea 9 (Global theme preference)
12. Idea 8 (ETag/Last-Modified caching)
