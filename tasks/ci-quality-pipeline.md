# GitHub Actions CI Quality Pipeline

**Priority**: 5 of 15
**Confidence**: 94%
**Appears in**: Lists 1 & 2
**Effort**: Low–Medium (1–2 days)

---

## Why This Matters

There is currently no automated quality gate for this repository. Any PR — or a direct push to main — can silently introduce JS errors, broken links, malformed HTML, or style regressions. A GitHub Actions pipeline is the single highest-leverage investment for long-term code health: it runs automatically, gives fast feedback, and can be extended incrementally.

---

## Pipeline Architecture

Three workflows, each with a clear purpose:

| Workflow | Trigger | Jobs |
|---|---|---|
| `ci.yml` | PR, push to `main` | lint, format-check, html-validate, e2e smoke tests |
| `links.yml` | Weekly schedule + PR | broken internal link check |
| `lighthouse.yml` | Push to `main` | Lighthouse CI for each tool route |

---

## Implementation Plan

### Step 1 — Project tooling setup

Add `package.json` (if not already present from Playwright setup):

```json
{
  "name": "tools",
  "private": true,
  "scripts": {
    "serve": "npx serve . -p 4000 --no-clipboard --single",
    "lint:js": "eslint '**/*.js' --ignore-pattern 'node_modules/**'",
    "format:check": "prettier --check '**/*.{html,css,js}' --ignore-path .prettierignore",
    "format:write": "prettier --write '**/*.{html,css,js}' --ignore-path .prettierignore",
    "validate:html": "html-validate 'tools/**/*.html' 'index.html'",
    "check:links": "lychee --offline --include-verbatim '**/*.html' '**/*.md'",
    "test:e2e": "playwright test",
    "ci": "npm run lint:js && npm run format:check && npm run validate:html && npm run test:e2e"
  },
  "devDependencies": {
    "@playwright/test": "^1.44.0",
    "@axe-core/playwright": "^4.9.0",
    "eslint": "^9.x",
    "html-validate": "^9.x",
    "prettier": "^3.x"
  }
}
```

---

### Step 2 — ESLint config (`.eslintrc.json`)

```json
{
  "env": {
    "browser": true,
    "es2022": true
  },
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "rules": {
    "no-unused-vars": "warn",
    "no-undef": "error",
    "no-console": "off",
    "eqeqeq": ["error", "always"],
    "no-eval": "error",
    "no-implied-eval": "error",
    "no-new-func": "error",
    "no-script-url": "error",
    "no-inner-declarations": "error"
  },
  "ignorePatterns": ["node_modules/", "playwright-report/", "test-results/"]
}
```

Key rules: `no-eval`, `no-implied-eval`, `no-new-func`, `no-script-url` directly catch security anti-patterns.

---

### Step 3 — Prettier config (`.prettierrc`)

```json
{
  "singleQuote": true,
  "semi": true,
  "tabWidth": 2,
  "printWidth": 100,
  "trailingComma": "es5",
  "htmlWhitespaceSensitivity": "ignore"
}
```

`.prettierignore`:

```
node_modules/
playwright-report/
test-results/
*.min.js
*.min.css
```

---

### Step 4 — HTML validate config (`.htmlvalidate.json`)

```json
{
  "extends": ["html-validate:recommended"],
  "rules": {
    "require-sri": "off",
    "no-inline-style": "off",
    "void-style": "off",
    "attr-quotes": "error",
    "no-dup-id": "error",
    "button-type": "error",
    "input-missing-label": "error",
    "aria-label-misuse": "error",
    "heading-level": "warn",
    "no-missing-references": "error"
  }
}
```

---

### Step 5 — Main CI workflow (`.github/workflows/ci.yml`)

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint-and-validate:
    name: Lint & Validate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Lint JavaScript
        run: npm run lint:js

      - name: Check formatting
        run: npm run format:check

      - name: Validate HTML
        run: npm run validate:html

  smoke-tests:
    name: E2E Smoke Tests
    runs-on: ubuntu-latest
    needs: lint-and-validate

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run smoke tests
        run: npm run test:e2e

      - name: Upload test artifacts on failure
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

---

### Step 6 — Link checker workflow (`.github/workflows/links.yml`)

```yaml
name: Check Links

on:
  schedule:
    - cron: '0 9 * * 1'   # Monday 09:00 UTC
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  lychee:
    name: Broken Link Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check internal links
        uses: lycheeverse/lychee-action@v1
        with:
          args: >
            --offline
            --include-verbatim
            --exclude-all-private
            '*.html'
            '**/*.html'
            '**/*.md'
          fail: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

### Step 7 — Lighthouse CI workflow (`.github/workflows/lighthouse.yml`)

```yaml
name: Lighthouse CI

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  lighthouse:
    name: Lighthouse Performance
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci && npm install -g @lhci/cli

      - name: Start static server
        run: npm run serve &
        
      - name: Wait for server
        run: npx wait-on http://localhost:4000

      - name: Run Lighthouse CI
        run: lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

Lighthouse config (`lighthouserc.json`):

```json
{
  "ci": {
    "collect": {
      "url": [
        "http://localhost:4000/",
        "http://localhost:4000/my-scheme/",
        "http://localhost:4000/which-scheme/",
        "http://localhost:4000/rss-reader/",
        "http://localhost:4000/spec-helper/",
        "http://localhost:4000/tax-helper/"
      ],
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:performance": ["warn", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "categories:best-practices": ["warn", { "minScore": 0.9 }],
        "categories:seo": ["warn", { "minScore": 0.8 }],
        "first-contentful-paint": ["warn", { "maxNumericValue": 2000 }],
        "total-blocking-time": ["warn", { "maxNumericValue": 300 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

---

### Step 8 — Branch protection rules

After pipeline is green, configure GitHub branch protection for `main`:

1. Go to **Settings → Branches → Add rule** for `main`.
2. Enable:
   - ✅ Require status checks before merging
   - ✅ Required checks: `Lint & Validate`, `E2E Smoke Tests`
   - ✅ Require branches to be up to date before merging
   - ✅ Do not allow bypassing the above settings

---

### Step 9 — Add CI status badges to `README.md` (or root `index.html`)

```md
[![CI](https://github.com/freeoss-space/tools/actions/workflows/ci.yml/badge.svg)](https://github.com/freeoss-space/tools/actions/workflows/ci.yml)
[![Lighthouse](https://github.com/freeoss-space/tools/actions/workflows/lighthouse.yml/badge.svg)](https://github.com/freeoss-space/tools/actions/workflows/lighthouse.yml)
```

---

## Files Created

```
tools/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── links.yml
│       └── lighthouse.yml
├── .eslintrc.json
├── .prettierrc
├── .prettierignore
├── .htmlvalidate.json
├── lighthouserc.json
└── package.json  (updated)
```

---

## Acceptance Criteria

- [ ] `npm run lint:js` passes on the current codebase (or all violations are fixed).
- [ ] `npm run format:check` passes after a `format:write` run.
- [ ] `npm run validate:html` reports zero errors.
- [ ] CI workflow passes on a test PR.
- [ ] Link checker workflow runs on schedule and fails on broken internal links.
- [ ] Lighthouse CI reports performance ≥ 0.9 for all tool routes.
- [ ] Branch protection prevents merging if `lint-and-validate` or `smoke-tests` fail.

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Existing code fails lint on first run | Use `--fix` to auto-fix trivially; create initial "fix lint" PR |
| Lighthouse scores below threshold initially | Start with `warn` level, then tighten to `error` once scores are stable |
| Link checker flags external URLs as broken | Use `--offline` flag (internal only) for PR checks; external in weekly schedule |
| CI minutes cost | All jobs use `ubuntu-latest` and `cancel-in-progress: true` to minimize waste |
