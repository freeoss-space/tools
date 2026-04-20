# Playwright E2E Smoke Tests

**Priority**: 4 of 15
**Confidence**: 93%
**Appears in**: All 3 idea lists
**Effort**: Medium (2–3 days)

---

## Why This Matters

There are currently no automated tests for any tool in this repo. A deployment could silently break a tool's core interaction with no automated signal. Playwright smoke tests provide the highest-leverage safety net: they exercise real browser behavior, catch JS errors, broken markup, and broken DOM interactions — all without mocking.

---

## Architecture Decision

- Use **Playwright** with Node (`npm`). This is the only Node dependency; it runs in CI only.
- Serve the static site with `npx serve` or `http-server` before running tests.
- One smoke spec file per tool — tests are intentionally minimal (load + one core action).
- Run on every PR and main branch push via GitHub Actions.

---

## Setup

### Step 1 — Initialize Playwright

```bash
npm init -y                         # creates package.json if none exists
npm install --save-dev playwright @playwright/test @axe-core/playwright
npx playwright install chromium     # download browser binary
```

Add to `package.json`:

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "serve": "npx serve . -p 4000 --no-clipboard"
  },
  "devDependencies": {
    "@axe-core/playwright": "^4.x",
    "@playwright/test": "^1.x"
  }
}
```

---

### Step 2 — Playwright config (`playwright.config.ts`)

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: 'http://localhost:4000',
    // Capture trace on first retry for easier debugging
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  // Start static server before tests
  webServer: {
    command: 'npm run serve',
    url: 'http://localhost:4000',
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
```

---

### Step 3 — Shared test helpers (`e2e/helpers.ts`)

```ts
import { Page, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** Assert no unhandled JS errors occurred on the page */
export function watchConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));
  return () => errors;
}

/** Run axe accessibility check and assert no violations */
export async function assertNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(
    results.violations,
    `Accessibility violations:\n${results.violations.map(v =>
      `  [${v.impact}] ${v.id}: ${v.description}`
    ).join('\n')}`
  ).toEqual([]);
}
```

---

### Step 4 — Root landing page smoke test (`e2e/index.spec.ts`)

```ts
import { test, expect } from '@playwright/test';
import { watchConsoleErrors, assertNoA11yViolations } from './helpers';

test.describe('Landing page', () => {
  test('loads and displays tool cards', async ({ page }) => {
    const errors = watchConsoleErrors(page);
    await page.goto('/');
    await expect(page).toHaveTitle(/tools/i);
    const cards = page.locator('.tool-card');
    await expect(cards).toHaveCountGreaterThan(3);
    expect(errors()).toHaveLength(0);
  });

  test('has no critical accessibility violations', async ({ page }) => {
    await page.goto('/');
    await assertNoA11yViolations(page);
  });
});
```

---

### Step 5 — RSS Reader smoke test (`e2e/rss-reader.spec.ts`)

```ts
import { test, expect } from '@playwright/test';
import { watchConsoleErrors, assertNoA11yViolations } from './helpers';

test.describe('RSS Reader', () => {
  test('loads without errors', async ({ page }) => {
    const errors = watchConsoleErrors(page);
    await page.goto('/rss-reader/');
    await expect(page.locator('h1')).toBeVisible();
    expect(errors()).toHaveLength(0);
  });

  test('can open the Add Feed dialog', async ({ page }) => {
    await page.goto('/rss-reader/');
    await page.getByRole('button', { name: /add feed/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    // Dialog should have an input for the feed URL
    await expect(dialog.getByRole('textbox')).toBeVisible();
  });

  test('closes dialog on Escape', async ({ page }) => {
    await page.goto('/rss-reader/');
    await page.getByRole('button', { name: /add feed/i }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('has no critical accessibility violations', async ({ page }) => {
    await page.goto('/rss-reader/');
    await assertNoA11yViolations(page);
  });
});
```

---

### Step 6 — My Scheme smoke test (`e2e/my-scheme.spec.ts`)

```ts
import { test, expect } from '@playwright/test';
import { watchConsoleErrors, assertNoA11yViolations } from './helpers';

test.describe('My Scheme', () => {
  test('loads without errors', async ({ page }) => {
    const errors = watchConsoleErrors(page);
    await page.goto('/my-scheme/');
    await expect(page.locator('h1')).toBeVisible();
    expect(errors()).toHaveLength(0);
  });

  test('can create a new palette', async ({ page }) => {
    await page.goto('/my-scheme/');
    await page.getByRole('button', { name: /new palette/i }).click();
    await expect(page.locator('.palette-editor, [data-role="palette"]')).toBeVisible();
  });

  test('export button is visible and clickable', async ({ page }) => {
    await page.goto('/my-scheme/');
    const exportBtn = page.getByRole('button', { name: /export/i });
    await expect(exportBtn).toBeVisible();
    await exportBtn.click();
    // Should show export options or trigger download
  });

  test('has no critical accessibility violations', async ({ page }) => {
    await page.goto('/my-scheme/');
    await assertNoA11yViolations(page);
  });
});
```

---

### Step 7 — Which Scheme smoke test (`e2e/which-scheme.spec.ts`)

```ts
import { test, expect } from '@playwright/test';
import { watchConsoleErrors, assertNoA11yViolations } from './helpers';

test.describe('Which Scheme', () => {
  test('loads and shows scheme options', async ({ page }) => {
    const errors = watchConsoleErrors(page);
    await page.goto('/which-scheme/');
    await expect(page.locator('h1')).toBeVisible();
    // At least one theme selector should exist
    await expect(page.getByRole('combobox').first()).toBeVisible();
    expect(errors()).toHaveLength(0);
  });

  test('can switch between schemes', async ({ page }) => {
    await page.goto('/which-scheme/');
    const selector = page.getByRole('combobox').first();
    const initialValue = await selector.inputValue();
    // Select a different option
    await selector.selectOption({ index: 1 });
    const newValue = await selector.inputValue();
    expect(newValue).not.toBe(initialValue);
  });

  test('has no critical accessibility violations', async ({ page }) => {
    await page.goto('/which-scheme/');
    await assertNoA11yViolations(page);
  });
});
```

---

### Step 8 — Spec Helper smoke test (`e2e/spec-helper.spec.ts`)

```ts
import { test, expect } from '@playwright/test';
import { watchConsoleErrors, assertNoA11yViolations } from './helpers';

test.describe('Spec Helper', () => {
  test('loads without errors', async ({ page }) => {
    const errors = watchConsoleErrors(page);
    await page.goto('/spec-helper/');
    await expect(page.locator('h1')).toBeVisible();
    expect(errors()).toHaveLength(0);
  });

  test('can add a task', async ({ page }) => {
    await page.goto('/spec-helper/');
    await page.getByRole('button', { name: /add task/i }).click();
    const tasks = page.locator('[data-role="task"], .task-item');
    await expect(tasks).toHaveCountGreaterThan(0);
  });

  test('has no critical accessibility violations', async ({ page }) => {
    await page.goto('/spec-helper/');
    await assertNoA11yViolations(page);
  });
});
```

---

### Step 9 — Tax Helper smoke test (`e2e/tax-helper.spec.ts`)

```ts
import { test, expect } from '@playwright/test';
import { watchConsoleErrors, assertNoA11yViolations } from './helpers';

test.describe('Tax Helper', () => {
  test('loads without errors', async ({ page }) => {
    const errors = watchConsoleErrors(page);
    await page.goto('/tax-helper/');
    await expect(page.locator('h1')).toBeVisible();
    expect(errors()).toHaveLength(0);
  });

  test('can add an entry', async ({ page }) => {
    await page.goto('/tax-helper/');
    await page.getByRole('button', { name: /add/i }).click();
    await expect(page.locator('.entry-row, tr:not(:first-child)')).toHaveCountGreaterThan(0);
  });

  test('totals update after adding an entry', async ({ page }) => {
    await page.goto('/tax-helper/');
    // Fill amount in new entry row
    await page.getByRole('button', { name: /add/i }).click();
    const amountInput = page.locator('input[type="number"]').last();
    await amountInput.fill('1000');
    await amountInput.blur();
    // Total should be non-zero now
    const total = page.locator('.total, [data-role="total"]');
    await expect(total).not.toHaveText('$0.00');
  });

  test('has no critical accessibility violations', async ({ page }) => {
    await page.goto('/tax-helper/');
    await assertNoA11yViolations(page);
  });
});
```

---

### Step 10 — Add to `.gitignore`

```
# Playwright
/playwright-report/
/test-results/
node_modules/
```

---

## Files Created

```
tools/
├── e2e/
│   ├── helpers.ts
│   ├── index.spec.ts
│   ├── rss-reader.spec.ts
│   ├── my-scheme.spec.ts
│   ├── which-scheme.spec.ts
│   ├── spec-helper.spec.ts
│   └── tax-helper.spec.ts
├── playwright.config.ts
├── package.json
└── .gitignore (updated)
```

---

## CI Integration

See `ci-quality-pipeline.md` for the GitHub Actions workflow that runs these tests. Key points:

- Tests run on `ubuntu-latest` with Chromium only in CI (fast, reproducible).
- Browser binary is cached via `actions/cache`.
- Test artifacts (traces, screenshots) are uploaded on failure.

---

## Acceptance Criteria

- [ ] `npm run test:e2e` passes locally against `npm run serve`.
- [ ] Each tool's smoke spec: page loads, no console errors, one core action works.
- [ ] axe-core finds zero WCAG 2.2 AA violations on each tool's main view.
- [ ] Tests run in CI on every PR.
- [ ] Failing test produces a useful trace artifact.
- [ ] Total test runtime under 60 seconds in CI.

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Brittle selectors break on rename | Use `getByRole` and `getByLabel` over CSS selectors |
| Tests fail due to network requests (RSS feeds) | Mock or intercept external fetches in tests |
| axe-core flags third-party content | Scope axe to `main` element only |
| Test suite grows too slow | Keep smoke tests < 5 assertions per tool; move deeper tests to separate files |
