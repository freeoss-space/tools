# Import Validation & Schema Safety

**Priority**: 8 of 15
**Confidence**: 91%
**Appears in**: All 3 idea lists
**Effort**: Low–Medium (1–2 days)

---

## Why This Matters

Several tools accept user-provided JSON imports — backup files, palette definitions, template sets, feed OPML. If the imported payload is malformed, has unexpected types, or is from an incompatible version, the result is silent data corruption, runtime crashes, or (in the worst case with rendered content) an XSS vector. A lightweight validation layer at the import boundary closes all these failure modes while providing clear, actionable error messages to users.

---

## Design Principles

1. **Fail loudly at the boundary** — reject invalid payloads before touching state.
2. **Schema-per-tool** — each tool defines its own expected shape.
3. **Version-aware** — validator checks `_v` and can reject payloads too old or new.
4. **Human-readable errors** — errors include exact field path and what was expected.
5. **No dependencies** — plain JS type checking, no external schema libraries.

---

## Implementation Plan

### Step 1 — Create `shared/assets/validate.js`

```js
// shared/assets/validate.js

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} ok
 * @property {string[]} errors
 */

/**
 * Validator builder — returns validator functions for common shapes.
 */
export const v = {
  /** Assert value is a string. */
  string: (path, value) => {
    if (typeof value !== 'string') return [`${path}: expected string, got ${typeof value}`];
    return [];
  },

  /** Assert value is a number. */
  number: (path, value) => {
    if (typeof value !== 'number' || isNaN(value)) return [`${path}: expected number`];
    return [];
  },

  /** Assert value is a boolean. */
  bool: (path, value) => {
    if (typeof value !== 'boolean') return [`${path}: expected boolean, got ${typeof value}`];
    return [];
  },

  /** Assert value is a non-null object (not array). */
  object: (path, value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return [`${path}: expected object`];
    }
    return [];
  },

  /** Assert value is an array, optionally validate each item. */
  array: (path, value, itemValidator = null) => {
    if (!Array.isArray(value)) return [`${path}: expected array`];
    if (!itemValidator) return [];
    const errors = [];
    value.forEach((item, i) => {
      errors.push(...itemValidator(`${path}[${i}]`, item));
    });
    return errors;
  },

  /** Assert value is one of the given literals. */
  enum: (path, value, allowed) => {
    if (!allowed.includes(value)) {
      return [`${path}: expected one of [${allowed.join(', ')}], got ${JSON.stringify(value)}`];
    }
    return [];
  },

  /** Assert value is a string matching the given regex. */
  pattern: (path, value, re) => {
    if (typeof value !== 'string' || !re.test(value)) {
      return [`${path}: expected string matching ${re}`];
    }
    return [];
  },

  /** Assert value is null or passes given validator. */
  nullable: (path, value, validator) => {
    if (value === null || value === undefined) return [];
    return validator(path, value);
  },

  /** Assert value is a valid ISO date string. */
  isoDate: (path, value) => {
    if (typeof value !== 'string' || isNaN(Date.parse(value))) {
      return [`${path}: expected ISO date string`];
    }
    return [];
  },
};

/**
 * Run a schema validator and return a ValidationResult.
 *
 * @param {unknown} payload
 * @param {(value: unknown) => string[]} schemaFn
 * @returns {ValidationResult}
 */
export function validate(payload, schemaFn) {
  try {
    const errors = schemaFn(payload);
    return { ok: errors.length === 0, errors };
  } catch (err) {
    return { ok: false, errors: [`Unexpected validation error: ${err.message}`] };
  }
}
```

---

### Step 2 — Per-tool schemas

#### Backup/restore bundle schema

```js
// shared/assets/schemas/backup.js
import { v } from '/shared/assets/validate.js';

/** @param {unknown} x */
export function validateBackupBundle(x) {
  const errors = [];
  errors.push(...v.object('root', x));
  if (errors.length) return errors;

  if (x.format !== 'tools-backup-v1') {
    errors.push(`root.format: expected "tools-backup-v1", got ${JSON.stringify(x.format)}`);
  }
  errors.push(...v.isoDate('root.exportedAt', x.exportedAt));
  errors.push(...v.object('root.data', x.data));

  // Each key in data must be a non-null object
  for (const [key, val] of Object.entries(x.data || {})) {
    errors.push(...v.object(`root.data.${key}`, val));
  }

  return errors;
}
```

#### My Scheme palette import schema

```js
// my-scheme/assets/schemas/palette.js
import { v } from '/shared/assets/validate.js';

function validateSwatch(path, swatch) {
  const errors = [];
  errors.push(...v.object(path, swatch));
  if (errors.length) return errors;
  errors.push(...v.string(`${path}.id`, swatch.id));
  errors.push(...v.pattern(`${path}.hex`, swatch.hex, /^#[0-9a-fA-F]{3,8}$/));
  errors.push(...v.string(`${path}.name`, swatch.name));
  return errors;
}

/** @param {unknown} x */
export function validatePaletteImport(x) {
  const errors = [];
  errors.push(...v.object('root', x));
  if (errors.length) return errors;
  errors.push(...v.string('root.name', x.name));
  errors.push(...v.array('root.swatches', x.swatches, validateSwatch));
  return errors;
}
```

#### RSS Reader feed import schema (OPML subset)

```js
// rss-reader/assets/schemas/feed-import.js
import { v } from '/shared/assets/validate.js';

function validateFeedEntry(path, feed) {
  const errors = [];
  errors.push(...v.object(path, feed));
  if (errors.length) return errors;
  errors.push(...v.string(`${path}.url`, feed.url));
  // title is optional
  if (feed.title !== undefined) errors.push(...v.string(`${path}.title`, feed.title));
  return errors;
}

/** @param {unknown} x */
export function validateFeedListImport(x) {
  const errors = [];
  errors.push(...v.object('root', x));
  if (errors.length) return errors;
  errors.push(...v.array('root.feeds', x.feeds, validateFeedEntry));
  return errors;
}
```

#### Spec Helper tasks import

```js
// spec-helper/assets/schemas/task-import.js
import { v } from '/shared/assets/validate.js';

const VALID_PRIORITIES = ['low', 'medium', 'high'];
const VALID_STATUSES = ['todo', 'in-progress', 'done'];

function validateTask(path, task) {
  const errors = [];
  errors.push(...v.object(path, task));
  if (errors.length) return errors;
  errors.push(...v.string(`${path}.id`, task.id));
  errors.push(...v.string(`${path}.title`, task.title));
  errors.push(...v.enum(`${path}.priority`, task.priority, VALID_PRIORITIES));
  errors.push(...v.enum(`${path}.status`, task.status, VALID_STATUSES));
  return errors;
}

/** @param {unknown} x */
export function validateTasksImport(x) {
  const errors = [];
  errors.push(...v.object('root', x));
  if (errors.length) return errors;
  errors.push(...v.array('root.tasks', x.tasks, validateTask));
  return errors;
}
```

---

### Step 3 — Import flow helper

```js
// shared/assets/import-file.js
import { validate } from '/shared/assets/validate.js';

/**
 * Read and parse a JSON file from an <input type="file"> element.
 * Validates the payload against a schema, then calls onSuccess or onError.
 *
 * @param {File} file
 * @param {(payload: unknown) => string[]} schemaFn
 * @param {{ onSuccess: (data: any) => void, onError: (errors: string[]) => void }} callbacks
 */
export function importJsonFile(file, schemaFn, { onSuccess, onError }) {
  const reader = new FileReader();
  reader.onload = (e) => {
    let parsed;
    try {
      parsed = JSON.parse(e.target.result);
    } catch {
      onError(['File is not valid JSON']);
      return;
    }
    const result = validate(parsed, schemaFn);
    if (!result.ok) {
      onError(result.errors);
    } else {
      onSuccess(parsed);
    }
  };
  reader.onerror = () => onError(['Could not read file']);
  reader.readAsText(file);
}
```

---

### Step 4 — Error display component

Show validation errors inline, near the import button:

```js
function showImportErrors(errors, container) {
  container.innerHTML = '';
  if (!errors.length) return;

  const heading = document.createElement('p');
  heading.className = 'import-error__heading';
  heading.textContent = `Import failed — ${errors.length} issue${errors.length > 1 ? 's' : ''} found:`;

  const list = document.createElement('ul');
  list.className = 'import-error__list';
  for (const msg of errors.slice(0, 10)) {
    const li = document.createElement('li');
    li.textContent = msg;
    list.appendChild(li);
  }
  if (errors.length > 10) {
    const more = document.createElement('li');
    more.textContent = `…and ${errors.length - 10} more`;
    list.appendChild(more);
  }

  container.appendChild(heading);
  container.appendChild(list);
}
```

CSS:

```css
.import-error__heading {
  color: var(--error, #e66260);
  font-weight: 600;
  margin: 0 0 8px;
  font-size: 0.875rem;
}
.import-error__list {
  margin: 0;
  padding-left: 1.2em;
  font-size: 0.8rem;
  color: var(--error, #e66260);
  font-family: var(--font-mono, monospace);
}
```

---

### Step 5 — Wire up in each tool

Example for My Scheme:

```js
import { importJsonFile } from '/shared/assets/import-file.js';
import { validatePaletteImport } from './schemas/palette.js';

const importBtn = document.getElementById('import-palette');
const fileInput = document.getElementById('import-file');
const errorContainer = document.getElementById('import-errors');

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  importJsonFile(file, validatePaletteImport, {
    onSuccess: (data) => {
      showImportErrors([], errorContainer); // clear errors
      applyImportedPalette(data);
      showToast('Palette imported successfully', { type: 'success' });
      fileInput.value = '';
    },
    onError: (errors) => {
      showImportErrors(errors, errorContainer);
      fileInput.value = '';
    },
  });
});
```

---

## Files Created / Changed

| File | Action |
|---|---|
| `shared/assets/validate.js` | Create |
| `shared/assets/import-file.js` | Create |
| `shared/assets/schemas/backup.js` | Create |
| `my-scheme/assets/schemas/palette.js` | Create |
| `rss-reader/assets/schemas/feed-import.js` | Create |
| `spec-helper/assets/schemas/task-import.js` | Create |
| Each tool's `app.js` | Wire up import flow with schema validation |

---

## Tests

```js
// tests/validate.test.js
import { validate, v } from '/shared/assets/validate.js';
import { validatePaletteImport } from '/my-scheme/assets/schemas/palette.js';

// String validator
let errs = v.string('x', 'hello');
console.assert(errs.length === 0, 'valid string passes');
errs = v.string('x', 42);
console.assert(errs.length === 1, 'number fails string check');

// Palette import
let result = validate({ name: 'Ocean', swatches: [{ id: 's1', hex: '#1a2b3c', name: 'deep' }] }, validatePaletteImport);
console.assert(result.ok, 'valid palette passes');

result = validate({ name: 'Ocean', swatches: [{ id: 's1', hex: 'notacolor', name: 'deep' }] }, validatePaletteImport);
console.assert(!result.ok, 'bad hex fails');
console.assert(result.errors[0].includes('hex'), 'error mentions hex field');

result = validate(null, validatePaletteImport);
console.assert(!result.ok, 'null payload fails');

console.log('All validation tests passed');
```

---

## Acceptance Criteria

- [ ] Importing a valid palette JSON succeeds silently.
- [ ] Importing a JSON with wrong field types shows a clear error listing each bad field.
- [ ] Importing non-JSON text shows "File is not valid JSON".
- [ ] Importing an empty object shows specific missing-field errors.
- [ ] After a failed import, tool state is unchanged.
- [ ] Error messages are human-readable (not stack traces).
- [ ] All validation tests pass.

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Overly strict schema rejects valid old exports | Include version tolerance; only hard-fail on structurally invalid data |
| Validator grows complex with nested optionals | Keep validators flat and composable; add `v.nullable` for optional fields |
| Schema diverges from actual saved data | Generate or derive schema from same defaults object used in storage module |
