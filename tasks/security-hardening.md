# Security Hardening: XSS Sanitization, CSP & URL Safety

**Priority**: 1 of 15
**Confidence**: 95%
**Appears in**: All 3 idea lists
**Effort**: Medium (2–3 days)

---

## Why This Matters

Multiple tools accept user-controlled content and render it into the DOM — RSS article bodies, imported JSON, markdown previews in spec-helper, color names, and template fields. Any of these paths can become an XSS vector if output is placed into `innerHTML` without sanitization. A shared, well-tested sanitization layer closes all these holes at once and ensures future tools start secure by default.

---

## Scope

| Area | Risk | Fix |
|---|---|---|
| RSS article HTML rendering | High — feed content injected via `innerHTML` | Sanitize with allowlist |
| Spec-helper markdown output | High — user markdown may contain `<script>` | Strip unsafe tags/attrs |
| Imported JSON field values | Medium — values rendered as labels/text | Escape HTML entities |
| Link `href` attributes | Medium — `javascript:` URLs | URL allowlist |
| Color name / label fields | Low — mostly text, but rendered | `escapeHtml` before insert |

---

## Implementation Plan

### Step 1 — Create `/shared/assets/sanitize.js`

```
tools/
└── shared/
    └── assets/
        └── sanitize.js   ← new file
```

Full module source:

```js
// shared/assets/sanitize.js

/**
 * Allowlist-based HTML sanitizer.
 * Strips all tags and attributes not in the allowlist.
 */
const ALLOWED_TAGS = new Set([
  'a', 'b', 'blockquote', 'br', 'cite', 'code', 'del', 'em',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img',
  'li', 'ol', 'p', 'pre', 'q', 's', 'small', 'strong',
  'sub', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th',
  'thead', 'tr', 'u', 'ul',
]);

const ALLOWED_ATTRS = {
  a:   ['href', 'title', 'rel', 'target'],
  img: ['src', 'alt', 'title', 'width', 'height'],
  td:  ['colspan', 'rowspan'],
  th:  ['colspan', 'rowspan', 'scope'],
  '*': ['class', 'id', 'lang', 'dir'],
};

const SAFE_URL_RE = /^(https?:|mailto:|#)/i;

/**
 * Sanitize an HTML string, stripping unsafe tags and attributes.
 * @param {string} html
 * @returns {string}
 */
export function sanitizeHtml(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  sanitizeNode(tpl.content);
  const div = document.createElement('div');
  div.appendChild(tpl.content.cloneNode(true));
  return div.innerHTML;
}

function sanitizeNode(node) {
  for (const child of [...node.childNodes]) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const tag = child.tagName.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) {
        // Replace disallowed element with its text content
        const text = document.createTextNode(child.textContent);
        node.replaceChild(text, child);
        continue;
      }
      // Strip disallowed attributes
      const allowed = new Set([
        ...(ALLOWED_ATTRS[tag] || []),
        ...(ALLOWED_ATTRS['*'] || []),
      ]);
      for (const attr of [...child.attributes]) {
        if (!allowed.has(attr.name)) {
          child.removeAttribute(attr.name);
        } else if (attr.name === 'href' || attr.name === 'src') {
          if (!SAFE_URL_RE.test(attr.value.trim())) {
            child.setAttribute(attr.name, '#');
          }
        } else if (attr.name === 'target') {
          // Force safe target
          child.setAttribute('target', '_blank');
          child.setAttribute('rel', 'noopener noreferrer');
        }
      }
      sanitizeNode(child);
    }
  }
}

/**
 * Escape text for safe insertion as HTML.
 * Use when setting textContent is not possible (e.g. building HTML strings).
 * @param {string} text
 * @returns {string}
 */
export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Validate and sanitize a URL, returning '#' for unsafe schemes.
 * @param {string} url
 * @returns {string}
 */
export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return '#';
  const trimmed = url.trim();
  try {
    const u = new URL(trimmed, location.origin);
    const allowed = ['http:', 'https:', 'mailto:'];
    return allowed.includes(u.protocol) ? u.href : '#';
  } catch {
    return '#';
  }
}
```

---

### Step 2 — Patch RSS Reader (`rss-reader/assets/app.js`)

Find all locations where article content is written to `innerHTML` and wrap them:

```js
// Before:
articleBody.innerHTML = item.content || item.description || '';

// After:
import { sanitizeHtml } from '/shared/assets/sanitize.js';
articleBody.innerHTML = sanitizeHtml(item.content || item.description || '');
```

Also sanitize link `href` values before building anchor elements:

```js
import { sanitizeUrl } from '/shared/assets/sanitize.js';

const a = document.createElement('a');
a.href = sanitizeUrl(item.link);
a.target = '_blank';
a.rel = 'noopener noreferrer';
```

---

### Step 3 — Patch Spec Helper markdown output

Locate the markdown-to-HTML rendering step in `spec-helper/assets/app.js`. After any markdown parse, pass output through `sanitizeHtml`:

```js
import { sanitizeHtml } from '/shared/assets/sanitize.js';

function renderMarkdown(raw) {
  const html = marked.parse(raw); // or existing parser
  return sanitizeHtml(html);
}
```

---

### Step 4 — Patch all tools that use `innerHTML` with imported/user data

Grep the repo for all `innerHTML` assignments:

```bash
grep -rn 'innerHTML\s*=' --include='*.js' --include='*.html' tools/
```

For each hit:
- If the value comes from a hardcoded string literal → safe, no change needed.
- If the value involves any variable (user input, localStorage, network) → wrap with `sanitizeHtml` or replace with `textContent` + DOM construction.

---

### Step 5 — Add Content Security Policy headers

Create `_headers` (for Netlify/Cloudflare Pages) or `headers` section in `vercel.json` / GitHub Pages `_config.yml` equivalent:

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```

Note: `unsafe-inline` for styles is acceptable while inline styles remain; remove once CSS is fully external.

---

### Step 6 — Remove inline `<script>` blocks from HTML files

Each tool currently uses `<script>` inside `<body>`. Move all logic to `assets/app.js` with `type="module"` to enable strict CSP `script-src 'self'`:

```html
<!-- Before -->
<script>
  // 200 lines of app logic
</script>

<!-- After -->
<script type="module" src="./assets/app.js"></script>
```

---

### Step 7 — Write tests (`tests/sanitize.test.js`)

```js
import { sanitizeHtml, escapeHtml, sanitizeUrl } from '/shared/assets/sanitize.js';

// escapeHtml
console.assert(escapeHtml('<script>') === '&lt;script&gt;');
console.assert(escapeHtml('"quote"') === '&quot;quote&quot;');

// sanitizeUrl
console.assert(sanitizeUrl('javascript:alert(1)') === '#');
console.assert(sanitizeUrl('data:text/html,<h1>x</h1>') === '#');
console.assert(sanitizeUrl('https://example.com') === 'https://example.com/');
console.assert(sanitizeUrl('mailto:a@b.com') === 'mailto:a@b.com');

// sanitizeHtml
const out = sanitizeHtml('<script>alert(1)</script><b>ok</b>');
console.assert(!out.includes('<script>'));
console.assert(out.includes('<b>ok</b>'));

const link = sanitizeHtml('<a href="javascript:void(0)">click</a>');
console.assert(!link.includes('javascript:'));
```

---

## Files Changed

| File | Action |
|---|---|
| `shared/assets/sanitize.js` | Create |
| `rss-reader/assets/app.js` | Patch `innerHTML`, `href` assignments |
| `spec-helper/assets/app.js` | Patch markdown render output |
| `my-scheme/assets/app.js` | Audit and patch any user-content `innerHTML` |
| `which-scheme/assets/app.js` | Audit and patch any user-content `innerHTML` |
| `_headers` (or equivalent) | Create CSP + security headers |
| `tests/sanitize.test.js` | Create |

---

## Acceptance Criteria

- [ ] `sanitizeHtml('<script>alert(1)</script>')` returns no `<script>` tag.
- [ ] `sanitizeUrl('javascript:alert(1)')` returns `'#'`.
- [ ] RSS articles render correctly with images, links, bold, lists.
- [ ] No `innerHTML` assignment in any tool uses raw user/network/import data.
- [ ] CSP header is served on all pages (verify with browser DevTools → Network → Response Headers).
- [ ] All existing smoke tests pass after changes.

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Legitimate HTML in RSS feeds stripped | Widen ALLOWED_TAGS allowlist; log stripped tags during dev |
| Inline event handlers in existing code break CSP | Move all to `addEventListener` calls |
| `unsafe-inline` still needed for styles | Acceptable short-term; file a follow-up to externalize |
