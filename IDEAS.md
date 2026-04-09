# Project Improvement Ideas

## Phase 1 — Brainstorm (30 ideas)

1. Add a WCAG contrast-ratio checker as a standalone tool
2. Add OPML import/export to the RSS reader
3. Add search/filter to the Which Scheme? theme grid
4. Add a one-click "copy all colors as CSS variables" button to each Which Scheme? theme card
5. Show live WCAG contrast ratios between pairs of colors in My Scheme
6. Implement "Import from CSS custom properties" in My Scheme (listed in TODO)
7. Add drag-to-reorder for the color rows in My Scheme
8. Export Which Scheme? themes as VS Code `.json` theme files
9. Add a JSON Formatter / Viewer as a new tool
10. Add a Regex Tester as a new tool
11. Export Which Scheme? themes as Alacritty / Windows Terminal config files
12. Add an "extract palette from image" feature to My Scheme
13. Add PWA manifests (installable) to Spec Helper, Tax Helper, and PDF Annotator
14. Add keyboard-shortcut help overlay (press `?`) to tools that already use shortcuts
15. Add time tracking (start/stop timer per task) to Spec Helper
16. Add virtual / lazy rendering to Which Scheme? to handle the large theme list faster
17. Add a light/dark theme toggle to every tool
18. Add a CSS Gradient Generator as a new tool
19. Add a URL / Base64 encoder–decoder utility tool
20. Add a search bar to the main tool-directory index page
21. Add keyboard shortcuts to Spec Helper (n = new task, / = focus search, etc.)
22. Add a "recently visited tools" section to the index page
23. Add a Markdown Editor / Previewer as a new tool
24. Add diff/patch viewer as a new tool
25. Add a Pomodoro / focus timer as a new tool
26. Add multi-page PDF support with a page-thumbnail sidebar to PDF Annotator
27. Add OPDS / JSON Feed support to RSS Reader (in addition to RSS/Atom)
28. Add font-pairing preview tool
29. Add text-diff / readability score overlay to RSS reader articles
30. Make the RSS reader's service worker cache articles for full offline reading

---

## Phase 2 — Critical Evaluation

Each idea is assessed on: **fit** (does it belong here?), **feasibility** (plain HTML/CSS/JS, no build step), **impact** (genuine value to users), and **effort vs reward**.

| # | Idea | Verdict | Reason |
|---|------|---------|--------|
| 1 | WCAG contrast checker tool | **KEEP** | Perfect fit for a color-focused toolkit; highly requested by devs/designers; pure math, no deps needed |
| 2 | OPML import/export for RSS reader | **KEEP** | OPML is the universal RSS migration format; without it the reader is a walled garden; straightforward XML serialization |
| 3 | Search/filter for Which Scheme? | **KEEP** | 60+ themes with zero discoverability tooling; a simple text filter transforms the UX |
| 4 | One-click copy all colors as CSS vars | **KEEP** | Users already copy individual colors; "copy all" is a 10-second task for the dev and saves 10 minutes for users |
| 5 | WCAG contrast ratios in My Scheme | **KEEP** | A color-scheme builder that doesn't surface accessibility info leaves users in the dark; relative-luminance math is well-defined |
| 6 | Import CSS custom properties in My Scheme | **KEEP** | Already in the TODO; round-trips with export; enables bootstrapping from an existing design system |
| 7 | Drag-to-reorder colors in My Scheme | **KEEP** | Palette order matters for mental models (darks → lights, etc.); native HTML drag-and-drop handles it cleanly |
| 8 | Export as VS Code theme JSON | **KEEP** | Which Scheme? is aimed at developers; exporting directly to a usable VS Code theme closes the loop from "I like this palette" to "installed in my editor" |
| 9 | JSON Formatter/Viewer tool | **KEEP** | One of the single most-used developer micro-tools; dead simple in vanilla JS; complements the existing utility-toolkit flavour |
| 10 | Regex Tester tool | **KEEP** | Developers reach for regex testers constantly; a clean, distraction-free one-page tool fits perfectly |
| 11 | Alacritty / Windows Terminal export | **KEEP** | Logical follow-on to VS Code export; terminal users are exactly the audience for Which Scheme? |
| 12 | Extract palette from image | **KEEP** | Creative, delightful feature for My Scheme; the Canvas API color-sampling approach is ~50 lines of JS |
| 13 | PWA manifests for other tools | **KEEP** | RSS reader already demonstrates the pattern; 10-line manifest + 30-line SW gives installable status for free |
| 14 | Keyboard-shortcut help overlay (`?`) | **KEEP** | PDF Annotator has undiscoverable keyboard shortcuts; a uniform `?` overlay makes them findable without docs |
| 15 | Time tracking in Spec Helper | **KEEP** | Task trackers without time tracking lose to competitors; the data model and UI already exist — just add a timer column |
| 16 | Virtual/lazy rendering for Which Scheme? | **REJECT** | Themes are loaded on-demand already via `loadTheme()`; the DOM card count is bounded by visible themes; no measurable perf problem yet |
| 17 | Light/dark theme toggle | **REJECT** | All tools hardcode `data-theme="dark"`; several tools also hardcode dark-specific hex values in local CSS (`#21262d`, etc.), making a full toggle a multi-file refactor with high regression risk for marginal gain |
| 18 | CSS Gradient Generator | **REJECT** | Dozens of excellent standalone gradient tools already exist; this doesn't meaningfully leverage the existing color-scheme data; low differentiation |
| 19 | URL / Base64 encoder–decoder | **KEEP** | Tiny, zero-dependency micro-tool that fits the "handy browser utilities" tagline; complements the dev-toolkit flavour |
| 20 | Search bar on index page | **REJECT** | Only 5–8 tools; a search box would be comically over-engineered at this scale |
| 21 | Keyboard shortcuts in Spec Helper | **KEEP** | The tool already has a search input and task list that cry out for keyboard navigation; low effort, high daily-use value |
| 22 | Recently visited tools on index | **REJECT** | With fewer than 10 tools the index is already scannable in 2 seconds; localStorage-backed recency tracking is complexity for zero real gain |
| 23 | Markdown Editor/Previewer | **REJECT** | Spec Helper already contains a bespoke markdown renderer; a standalone MD editor exists in 50 other places; low differentiation |
| 24 | Diff/patch viewer | **REJECT** | Significantly more complex than other tools (Myers diff algorithm or dep); GitHub and every IDE already provide this; low fit |
| 25 | Pomodoro / focus timer | **REJECT** | Completely outside the project's developer-utilities-and-color-tools niche; zero reuse of any shared code or design patterns |
| 26 | PDF Annotator page-thumbnail sidebar | **KEEP** | Multi-page navigation in PDF Annotator is currently next/prev buttons only; thumbnails are a standard affordance that would make it feel polished |
| 27 | OPDS / JSON Feed support for RSS | **REJECT** | OPDS is a library-catalogue protocol (not a news-feed format); JSON Feed adoption is <1% of sites the average user follows; complexity is not justified |
| 28 | Font-pairing preview tool | **REJECT** | Different domain entirely (typography vs color); no reuse of existing infrastructure; dozens of better-known tools already exist |
| 29 | Readability score overlay in RSS reader | **REJECT** | Requires a non-trivial NLP heuristic; the feature would surface inside an article view; more distraction than value |
| 30 | Offline-cached articles in RSS SW | **KEEP** | The service worker already caches the app shell; caching fetched article HTML in a second Cache gives genuine value for commuters/low-signal use |

**Ideas that passed: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 19, 21, 26, 30**

---

## Phase 3 — Detailed Plans

---

### 1. WCAG Contrast Checker (new tool)

**What it is**  
A new `contrast/` tool with two color pickers (foreground + background). As you adjust either color the tool instantly shows:
- The contrast ratio (e.g., 7.43:1)
- Pass/Fail badges for AA Normal, AA Large, AAA Normal, AAA Large
- A live text preview rendered at normal and large sizes in both colours

**Why it's a good improvement**  
Designers building color schemes with My Scheme have no way to verify accessibility. A purpose-built contrast checker that lives in the same toolkit closes the loop. WCAG math (relative luminance via the sRGB formula) requires zero dependencies and runs synchronously.

**Code sketch**
```js
function relativeLuminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const [bright, dark] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (bright + 0.05) / (dark + 0.05);
}
```

WCAG thresholds: AA Normal ≥ 4.5, AA Large ≥ 3.0, AAA Normal ≥ 7.0, AAA Large ≥ 4.5.

**Possible downsides**  
None significant. The only risk is users misunderstanding that large text is ≥ 18pt (or 14pt bold) — this can be explained with a tooltip.

**Confidence: 95%** — This is a universally useful tool that perfectly extends the existing color theme of the project.

---

### 2. OPML Import/Export for RSS Reader

**What it is**  
Two new buttons in the RSS reader's settings/menu panel:
- **Export OPML** — serialises `state.feeds` (and folders) into a standard OPML 2.0 XML string and triggers a file download
- **Import OPML** — opens a file picker, parses the XML, and merges feeds into the current state (deduplicating by URL)

**Why it's a good improvement**  
OPML is the lingua franca for RSS subscriptions. Without it, every user who wants to migrate from Feedly, Inoreader, or any other reader must re-enter all feeds manually. This single feature upgrades the RSS reader from a toy to a viable daily driver.

**Code sketch**
```js
function exportOPML() {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<opml version="2.0"><head><title>RSS Reader Export</title></head><body>',
    ...state.feeds.map(f =>
      `  <outline type="rss" text="${esc(f.title)}" xmlUrl="${esc(f.url)}"` +
      (f.siteUrl ? ` htmlUrl="${esc(f.siteUrl)}"` : '') + '/>'
    ),
    '</body></opml>',
  ];
  downloadText(lines.join('\n'), 'feeds.opml', 'text/x-opml');
}

function importOPML(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
  const outlines = [...doc.querySelectorAll('outline[xmlUrl]')];
  let added = 0;
  outlines.forEach(o => {
    const url = o.getAttribute('xmlUrl');
    if (!url || state.feeds.find(f => f.url === url)) return;
    state.feeds.push({ id: genId(), url, title: o.getAttribute('text') || url, folder: null });
    added++;
  });
  Store.save(state);
  renderAll();
  showToast(`Imported ${added} feed(s)`);
}
```

**Possible downsides**  
Nested OPML folder structure is possible but adds complexity; an initial implementation can flatten all feeds and import folder names as-is.

**Confidence: 92%** — OPML support is the single most-requested feature class for any RSS reader.

---

### 3. Search / Filter for Which Scheme?

**What it is**  
A text input at the top of the Which Scheme? theme grid. As the user types, theme cards whose `group` or variant name don't match are hidden with `display:none`. A small "N results" counter updates in real time. Theme groups where all variants are hidden collapse entirely.

**Why it's a good improvement**  
The tool ships 60+ themes across 20+ groups. A user who knows they want "Tokyo Night" or "Rose Pine" currently has to visually scan the entire grid. A filter reduces time-to-card from ~10 seconds to ~1 second.

**Code sketch**
```js
function applySearch(query) {
  const q = query.toLowerCase().trim();
  let visible = 0;
  document.querySelectorAll('.theme-card').forEach(card => {
    const name = (card.dataset.group + ' ' + card.dataset.variant).toLowerCase();
    const match = !q || name.includes(q);
    card.style.display = match ? '' : 'none';
    if (match) visible++;
  });
  document.querySelector('#result-count').textContent =
    q ? `${visible} theme${visible !== 1 ? 's' : ''}` : '';
}
```

Also collapse empty group headings:
```js
document.querySelectorAll('.theme-group').forEach(group => {
  const anyVisible = [...group.querySelectorAll('.theme-card')]
    .some(c => c.style.display !== 'none');
  group.style.display = anyVisible ? '' : 'none';
});
```

**Possible downsides**  
None; this is purely additive UI with no state mutation.

**Confidence: 97%** — Pure quality-of-life with near-zero implementation risk.

---

### 4. One-Click "Copy All Colors as CSS Variables"

**What it is**  
A small **"Copy CSS"** button on every Which Scheme? theme card (next to the existing card actions). Clicking it copies the full theme palette as a CSS custom-properties block to the clipboard — ready to paste into any stylesheet.

**Why it's a good improvement**  
Individual color copying exists already. Bulk export via the card button removes the multi-click dance of copying 10–16 colors one by one.

**Code sketch**
```js
function copyThemeAsCSS(themeId) {
  const theme = themeCache.get(themeId) || editedThemes.get(themeId);
  const slug = themeId.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const vars = theme.colors
    .map(c => `  --${slug}-${c.name.toLowerCase().replace(/\s+/g, '-')}: ${c.hex};`)
    .join('\n');
  const css = `:root {\n${vars}\n}`;
  navigator.clipboard.writeText(css).then(() => showToast('Copied CSS!'));
}
```

The button is added inside `renderCard()`:
```js
<button class="copy-all-btn" onclick="copyThemeAsCSS('${themeId}')" title="Copy all as CSS vars">
  <!-- clipboard icon SVG -->
</button>
```

**Possible downsides**  
None. Clipboard API has broad support; the existing copy-individual-color code uses the same API already.

**Confidence: 96%** — Existing infrastructure makes this trivial; direct user-visible payoff.

---

### 5. WCAG Contrast Ratios in My Scheme

**What it is**  
In the My Scheme color list, add a "contrast vs text" column that shows the ratio of each color against the highest-luminance color in the palette (auto-detected as the "text" color). The ratio is color-coded:
- Green badge: ≥ 4.5 (AA Normal pass)
- Yellow badge: 3.0–4.49 (AA Large pass only)
- Red badge: < 3.0 (fail)

A toggle lets the user pick the reference color manually.

**Why it's a good improvement**  
My Scheme is a color-scheme builder. Its output is used in editors, terminals, and browsers where text legibility depends on contrast. Surfacing WCAG data in-context stops users from shipping inaccessible themes.

**Code sketch**
```js
function contrastBadge(hex, referenceHex) {
  const ratio = contrastRatio(hex, referenceHex);
  const cls = ratio >= 4.5 ? 'pass-aa' : ratio >= 3.0 ? 'pass-large' : 'fail';
  return `<span class="contrast-badge ${cls}" title="Contrast ratio">${ratio.toFixed(2)}:1</span>`;
}
```

Integrated into `renderColorList()` by adding the badge HTML to each row.

**Possible downsides**  
When a scheme has no obvious "text" color the auto-detection heuristic (highest luminance) can be wrong. The manual reference-color picker mitigates this.

**Confidence: 88%** — The shared `relativeLuminance` function from idea #1 can be extracted into `color-utils.js` (which already exists in both `my-scheme/` and `which-scheme/`).

---

### 6. Import CSS Custom Properties into My Scheme

**What it is**  
An "Import → From CSS" button in My Scheme that opens a `<textarea>`. The user pastes any CSS (e.g., `:root { --color-primary: #6366f1; --color-bg: #0f172a; ... }`). The tool parses all custom properties whose values are valid CSS color strings, maps them into the palette (using the variable name as the color name and the parsed hex as the value), and replaces the current palette.

**Why it's a good improvement**  
This is already on the project's own TODO list. It enables round-tripping — paste your existing design system tokens, tweak them in the visual editor, and re-export.

**Code sketch**
```js
function parseCSSVars(css) {
  const re = /--([a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
  const colors = [];
  let m;
  while ((m = re.exec(css)) !== null) {
    const hex = resolveColor(m[2].trim()); // converts named/rgb/hsl → hex
    if (hex) colors.push({ name: m[1], hex });
  }
  return colors;
}

function resolveColor(value) {
  // Use a hidden canvas element to let the browser parse any CSS color
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.fillStyle = value;
  const parsed = ctx.fillStyle; // returns '' for invalid, '#rrggbb' for valid
  return /^#[0-9a-f]{6}$/i.test(parsed) ? parsed : null;
}
```

**Possible downsides**  
CSS variables that reference other variables (e.g., `--color-text: var(--gray-900)`) can't be resolved without a full cascade. The import ignores these and only imports literal color values — a reasonable limitation to document.

**Confidence: 93%** — It's on the TODO, the `color-utils.js` infrastructure is already present, and the implementation is straightforward.

---

### 7. Drag-to-Reorder Colors in My Scheme

**What it is**  
Make each row in My Scheme's color list draggable (`draggable="true"`) using the native HTML5 Drag and Drop API. Visual feedback (drag handle icon, drop-target highlight) is added via CSS. On drop, the `state.colors` array is reordered and the palette re-renders.

**Why it's a good improvement**  
Palette order carries semantic meaning (e.g., darks → mids → lights, background → foreground → accents). Currently the only way to reorder is to delete and re-add colors. Drag-and-drop is the expected UX for any sortable list.

**Code sketch**
```js
let dragSrcIndex = null;

colorRow.setAttribute('draggable', 'true');
colorRow.addEventListener('dragstart', e => {
  dragSrcIndex = +e.currentTarget.dataset.index;
  e.currentTarget.classList.add('dragging');
});
colorRow.addEventListener('dragover', e => {
  e.preventDefault();
  e.currentTarget.classList.add('drag-over');
});
colorRow.addEventListener('drop', e => {
  e.preventDefault();
  const destIndex = +e.currentTarget.dataset.index;
  if (dragSrcIndex !== null && dragSrcIndex !== destIndex) {
    const [moved] = state.colors.splice(dragSrcIndex, 1);
    state.colors.splice(destIndex, 0, moved);
    syncHash();
    renderColorList();
  }
});
```

**Possible downsides**  
Touch drag-and-drop requires a pointer-events polyfill or a separate touch handler. An initial release can note "desktop drag-and-drop only" and add touch support later.

**Confidence: 85%** — Native DnD is well-supported on desktop; the limitation on mobile is acceptable given the tool's primary use case.

---

### 8. Export Which Scheme? Themes as VS Code Theme JSON

**What it is**  
An **"Export → VS Code Theme"** button on each Which Scheme? theme card. It generates a valid VS Code `*.json` color theme file mapping the theme's semantic color roles (background, foreground, red, green, blue, etc.) to VS Code's well-known token/workbench keys and triggers a download.

**Why it's a good improvement**  
Developers who find a palette they love in Which Scheme? currently need to manually create a VS Code theme extension. A one-click export that produces an immediately-usable JSON file completes the "discover → use" loop.

**Code sketch**
```js
function exportVSCodeTheme(themeId) {
  const theme = getEditedTheme(themeId);
  const c = Object.fromEntries(theme.colors.map(x => [x.name.toLowerCase(), x.hex]));
  const json = {
    name: theme.name,
    type: theme.dark ? 'dark' : 'light',
    colors: {
      'editor.background':          c.background || c.bg || c.base,
      'editor.foreground':          c.foreground || c.text || c.fg,
      'editorCursor.foreground':    c.cursor || c.foreground || c.text,
      'editor.selectionBackground': c.selection || (c.background + '60'),
      'activityBar.background':     c.background || c.base,
      'sideBar.background':         c.surface || c.mantle,
      'terminal.ansiRed':           c.red,
      'terminal.ansiGreen':         c.green,
      'terminal.ansiYellow':        c.yellow,
      'terminal.ansiBlue':          c.blue,
      'terminal.ansiMagenta':       c.magenta || c.mauve || c.pink,
      'terminal.ansiCyan':          c.cyan || c.teal || c.sapphire,
      // ... (full mapping ~30 keys)
    },
    tokenColors: [ /* standard syntax scopes mapped to palette */ ],
  };
  downloadJSON(json, `${themeId}-vscode.json`);
}
```

Because theme color-role names vary, a best-effort mapping with sensible fallbacks is used.

**Possible downsides**  
The mapping from a palette's named colors to VS Code's 200+ workbench keys is imperfect — only the most-visible keys can be auto-mapped. Documenting the limitation ("provides a starter theme; tweak to taste") sets correct expectations.

**Confidence: 80%** — High value, but the VS Code color key space is large; partial coverage is still significantly more useful than no export at all.

---

### 9. JSON Formatter / Viewer (new tool)

**What it is**  
A new `json/` tool with:
- A large `<textarea>` for pasting raw JSON
- A **Format** button that pretty-prints with 2-space indentation
- A **Minify** button that strips whitespace
- A **Validate** button that shows parse errors with line/column numbers
- A collapsible tree view rendered via recursive DOM construction
- A "Copy" button for the formatted output

**Why it's a good improvement**  
JSON formatting is one of the highest-frequency micro-tasks for any developer. A clean, zero-tracking, privacy-respecting formatter that lives alongside other dev tools fits the project's mission perfectly.

**Code sketch**
```js
function format(raw) {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch (e) {
    showError(e.message); // e.g. "Unexpected token at position 42"
    return null;
  }
}

function buildTree(value, depth = 0) {
  if (value === null) return span('null', 'null');
  if (typeof value === 'boolean') return span(String(value), 'bool');
  if (typeof value === 'number') return span(String(value), 'number');
  if (typeof value === 'string') return span(`"${value}"`, 'string');
  if (Array.isArray(value)) { /* collapsible <details> */ }
  if (typeof value === 'object') { /* collapsible <details> with key: value rows */ }
}
```

**Possible downsides**  
Very large JSON blobs (>10 MB) can make the tree view slow. A size threshold (e.g., skip tree view above 1 MB) mitigates this.

**Confidence: 90%** — Zero dependencies, clear scope, immediate usefulness.

---

### 10. Regex Tester (new tool)

**What it is**  
A new `regex/` tool with:
- A **Pattern** input (`/pattern/flags`)
- A multi-line **Test string** textarea
- Real-time match highlighting (using `<mark>` spans) as the user types
- A **Matches** panel listing each match with index, full match, and capture groups
- Common-pattern quick-inserts (email, URL, date, UUID, etc.)

**Why it's a good improvement**  
Regex testing is a near-daily developer task. A privacy-preserving, no-ads, fast alternative to regex101 that lives in the same local toolkit is a genuine quality-of-life improvement.

**Code sketch**
```js
function runRegex(pattern, flags, subject) {
  let re;
  try { re = new RegExp(pattern, flags + (flags.includes('g') ? '' : 'g')); }
  catch (e) { return { error: e.message }; }

  const matches = [];
  let m;
  while ((m = re.exec(subject)) !== null) {
    matches.push({ index: m.index, full: m[0], groups: m.slice(1) });
    if (!flags.includes('g')) break; // avoid infinite loop on zero-length matches
  }
  return { matches };
}

function highlight(subject, matches) {
  // Walk backwards through sorted matches replacing each span with <mark>text</mark>
  let result = subject;
  [...matches].reverse().forEach(({ index, full }) => {
    result = result.slice(0, index) + `<mark>${esc(full)}</mark>` + result.slice(index + full.length);
  });
  return result;
}
```

**Possible downsides**  
Catastrophic backtracking in user-supplied patterns can hang the browser tab. Running the regex in a Web Worker with a timeout resolves this.

**Confidence: 88%** — Simple, high-utility, zero dependencies, matches the toolkit's developer audience.

---

### 11. Alacritty / Windows Terminal Export from Which Scheme?

**What it is**  
Extend the Which Scheme? export menu with two additional formats:
- **Alacritty** (TOML): produces an `alacritty.toml` snippet for the `[colors]` table
- **Windows Terminal** (JSON): produces a `schemes` array entry that can be pasted into `settings.json`

Both map the palette's standard ANSI color roles (black, red, green, yellow, blue, magenta, cyan, white × normal/bright).

**Why it's a good improvement**  
Terminal colour schemes are Where many developers spend most of their day. Which Scheme? already shows a terminal preview for every theme — exporting to the two most popular modern terminals is a natural next step.

**Code sketch (Alacritty TOML)**
```toml
[colors.primary]
background = "#1e1e2e"
foreground = "#cdd6f4"

[colors.normal]
black   = "#45475a"
red     = "#f38ba8"
green   = "#a6e3a1"
yellow  = "#f9e2af"
blue    = "#89b4fa"
magenta = "#f5c2e7"
cyan    = "#94e2d5"
white   = "#bac2de"
```

Generated from the theme's `ansi` color map (already present in theme files).

**Possible downsides**  
Not all themes in the manifest include a full ANSI color set; for those with gaps the export falls back to greyscale placeholder values with a comment noting the substitution.

**Confidence: 82%** — High value for the target audience; straightforward serialization.

---

### 12. Extract Palette from Image (My Scheme)

**What it is**  
An "Import → From Image" button in My Scheme. The user drops or selects an image; the tool draws it onto a hidden `<canvas>`, samples pixel colors at a grid of points, clusters the results into N dominant colors (using a fast k-means pass), and populates the palette with the clustered centroids.

**Why it's a good improvement**  
This is a genuinely delightful feature. Designers often start a color scheme from a photograph or artwork. Automating the extraction step, then letting the user refine in the visual editor, is a creative workflow that no other tool in the set currently supports.

**Code sketch**
```js
function samplePixels(canvas, ctx, n = 200) {
  const { width, height } = canvas;
  const step = Math.max(1, Math.floor(Math.sqrt((width * height) / n)));
  const pixels = [];
  for (let y = 0; y < height; y += step)
    for (let x = 0; x < width; x += step) {
      const [r, g, b, a] = ctx.getImageData(x, y, 1, 1).data;
      if (a > 128) pixels.push([r, g, b]);
    }
  return pixels;
}

function kMeans(pixels, k = 8, iterations = 10) {
  // Initialize centroids randomly, then iterate assign → update
  // Returns k hex strings
}
```

**Possible downsides**  
k-means can be slow for large images; downscaling to max 400×400 before sampling caps execution time. Color results depend heavily on image content and may need manual curation — which is fine because the user is already in the color editor.

**Confidence: 75%** — The creative value is high but the color-clustering quality varies; framing it as a "starting point" sets correct expectations.

---

### 13. PWA Manifests for Spec Helper, Tax Helper, and PDF Annotator

**What it is**  
Add a `manifest.json` and a minimal service worker (`sw.js`) to each of the three tools that lack them, mirroring what the RSS Reader already has. Register the SW in each tool's `index.html`.

The manifests give users an "Add to Home Screen" / "Install app" prompt on desktop Chrome and mobile browsers. The service worker caches the app shell (HTML, CSS, JS) for offline access.

**Why it's a good improvement**  
Tax Helper and Spec Helper are tools users want to return to repeatedly. Making them installable and offline-capable (they already use only `localStorage` for data) requires about 50 lines of boilerplate. The RSS Reader pattern can be copy-adapted in minutes.

**Code sketch (manifest.json)**
```json
{
  "name": "Spec Helper",
  "short_name": "Spec",
  "start_url": "./index.html",
  "display": "standalone",
  "background_color": "#1c1828",
  "theme_color": "#1c1828",
  "icons": [{ "src": "favicon.svg", "sizes": "any", "type": "image/svg+xml" }]
}
```

**Possible downsides**  
Service worker caching can cause stale assets after updates. The RSS Reader already handles this with a versioned `CACHE_NAME` — the same pattern applies.

**Confidence: 91%** — Proven pattern already in the repo; copy-and-adapt; high installability payoff.

---

### 14. Keyboard-Shortcut Help Overlay (`?` key)

**What it is**  
For tools with keyboard shortcuts (PDF Annotator, and Spec Helper after idea #21), pressing `?` (when not in a text input) opens a modal listing all shortcuts in a two-column table. Pressing `?` again or `Escape` closes it.

**Why it's a good improvement**  
PDF Annotator has at least 6 undiscoverable keyboard shortcuts (D, T, R, Escape, Ctrl+Z, Ctrl+Shift+Z). New users have no way to find them without reading source code. A standard `?` shortcut-sheet is the industry convention (Figma, GitHub, Notion all use it).

**Code sketch**
```js
const SHORTCUTS = [
  ['D', 'Freeform draw'],
  ['T', 'Add text'],
  ['R', 'Rectangle'],
  ['Escape', 'Deselect / cancel'],
  ['Ctrl + Z', 'Undo'],
  ['Ctrl + Shift + Z', 'Redo'],
  ['?', 'Show this help'],
];

document.addEventListener('keydown', e => {
  if (e.key === '?' && !isInputFocused()) toggleShortcutModal();
  if (e.key === 'Escape') closeShortcutModal();
});

function renderShortcutModal() {
  return `<div class="shortcut-modal">
    <h3>Keyboard Shortcuts</h3>
    <table>${SHORTCUTS.map(([k, d]) =>
      `<tr><td><kbd>${k}</kbd></td><td>${d}</td></tr>`).join('')}
    </table>
  </div>`;
}
```

**Possible downsides**  
None significant; the overlay is additive and does not change any existing behavior.

**Confidence: 93%** — A polish feature that every keyboard-shortcut-enabled tool should have.

---

### 15. Time Tracking in Spec Helper

**What it is**  
Add an optional **timer** to each task in Spec Helper:
- A ▶ Play / ⏸ Pause button per task row
- A running total of time logged (stored in `task.timeEntries: [{start, end}]`)
- A time summary column in the task list (e.g., "2h 14m")
- Export includes time data in the JSON/Markdown output

**Why it's a good improvement**  
Spec Helper is designed for spec-driven development work — exactly the kind of work where time tracking adds value for invoicing, estimation, and retrospectives. The data model and render loop already exist; a timer is a natural extension.

**Code sketch**
```js
// Task shape extension:
// { ...existing fields, timeEntries: [{start: iso, end: iso|null}] }

function startTimer(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task.timeEntries) task.timeEntries = [];
  task.timeEntries.push({ start: new Date().toISOString(), end: null });
  saveState();
  renderTaskList();
}

function stopTimer(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  const entry = task.timeEntries?.findLast(e => !e.end);
  if (entry) { entry.end = new Date().toISOString(); saveState(); renderTaskList(); }
}

function totalMs(task) {
  return (task.timeEntries || []).reduce((sum, e) => {
    const end = e.end ? new Date(e.end) : new Date();
    return sum + (end - new Date(e.start));
  }, 0);
}
```

**Possible downsides**  
The running timer needs a `setInterval` to update the displayed elapsed time in real time. Care is needed to clear the interval when the task detail view is closed or the task is deleted.

**Confidence: 82%** — Useful for the tool's intended audience; non-breaking data model extension; localStorage capacity is ample.

---

### 19. URL / Base64 Encoder–Decoder (new tool)

**What it is**  
A new `encode/` tool with two panels (tabs: URL Encode/Decode and Base64 Encode/Decode). Each panel has an input textarea and an output textarea that update in real-time as the user types. A "Swap" button reverses the direction.

**Why it's a good improvement**  
URL-encoding and Base64 are constant micro-tasks when working with APIs, JWTs, query strings, data URIs, and email links. A clean, offline-capable tool that doesn't send your data to a server fits the project's privacy-respecting ethos.

**Code sketch**
```js
// URL encode
input.addEventListener('input', () => {
  output.value = encodeURIComponent(input.value);
});

// Base64 encode (UTF-8 safe)
function toBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}
function fromBase64(b64) {
  try { return decodeURIComponent(escape(atob(b64))); }
  catch { return '[invalid base64]'; }
}
```

**Possible downsides**  
None significant. Both APIs (`encodeURIComponent`, `btoa`/`atob`) are universal browser builtins.

**Confidence: 89%** — Tiny scope, zero dependencies, immediate daily utility.

---

### 21. Keyboard Shortcuts for Spec Helper

**What it is**  
Add keyboard shortcuts to Spec Helper's most-used actions:
- `N` — open "New Task" modal
- `/` — focus the search input
- `Escape` — close modals, blur search
- `J` / `K` — navigate up/down the task list
- `Enter` on a focused task row — open the detail view

These are the conventions established by GitHub issues, Linear, and Notion.

**Why it's a good improvement**  
Power users who live in Spec Helper throughout a workday will perform these actions hundreds of times. Keyboard shortcuts eliminate the mouse and dramatically reduce friction for repeated actions.

**Code sketch**
```js
document.addEventListener('keydown', e => {
  if (isInputFocused()) return;
  switch (e.key) {
    case 'n': case 'N': openNewTaskModal(); break;
    case '/': e.preventDefault(); document.getElementById('search').focus(); break;
    case 'Escape': closeAllModals(); break;
    case 'j': case 'J': focusNextTask(1); break;
    case 'k': case 'K': focusNextTask(-1); break;
  }
});
```

**Possible downsides**  
Single-letter shortcuts fire while the user edits a task's description textarea unless `isInputFocused()` is robust. Checking `document.activeElement.tagName` against `INPUT`, `TEXTAREA`, `SELECT` covers all cases.

**Confidence: 91%** — Standard pattern, straightforward implementation, immediately apparent value.

---

### 26. Page-Thumbnail Sidebar for PDF Annotator

**What it is**  
Add a collapsible left panel to PDF Annotator containing small rendered thumbnails of every page (rendered at 1/4 scale using the existing mupdf canvas pipeline). Clicking a thumbnail jumps to that page. The current page is highlighted in the panel.

**Why it's a good improvement**  
Navigating a 50-page PDF with prev/next buttons is tedious. A thumbnail panel is the canonical affordance used by every PDF viewer (Preview, Acrobat, PDF.js). It also reveals the document structure at a glance, helping users orient themselves before annotating.

**Code sketch**
```js
async function buildThumbnails() {
  const panel = document.getElementById('thumb-panel');
  panel.innerHTML = '';
  for (let i = 0; i < state.totalPages; i++) {
    const canvas = document.createElement('canvas');
    // Render page at 0.25× zoom into thumbnail canvas
    await renderPageToCanvas(i, canvas, 0.25);
    const thumb = document.createElement('div');
    thumb.className = 'thumb' + (i === state.currentPage ? ' active' : '');
    thumb.dataset.page = i;
    thumb.appendChild(canvas);
    thumb.addEventListener('click', () => goToPage(i));
    panel.appendChild(thumb);
  }
}
```

**Possible downsides**  
Rendering all thumbnails synchronously for a 200-page PDF is slow. An intersection-observer–based lazy render (render thumbnails only as they scroll into view in the panel) resolves the performance concern.

**Confidence: 80%** — High UX impact for multi-page documents; the mupdf rendering pipeline is already in place; thumbnail generation reuses existing code.

---

### 30. Offline Article Caching in RSS Reader

**What it is**  
Extend the RSS reader's existing service worker to cache the raw HTML of fetched articles in a separate `articles-cache-v1` Cache. When the app fetches an article that has already been loaded, serve it from the cache if the network request fails. A small "offline" badge on the article card indicates it's available offline.

**Why it's a good improvement**  
The current service worker caches only the app shell. The app's primary content — articles — disappears when offline. For a reader used on commutes or in low-connectivity environments, cached articles are the most important offline capability.

**Code sketch (sw.js addition)**
```js
const ARTICLE_CACHE = 'rss-articles-v1';
const ARTICLE_PROXY_PATTERNS = [
  /allorigins\.win/,
  /corsproxy\.io/,
];

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (ARTICLE_PROXY_PATTERNS.some(p => p.test(url.href))) {
    e.respondWith(
      caches.open(ARTICLE_CACHE).then(async cache => {
        const cached = await cache.match(e.request);
        if (cached) return cached;
        const response = await fetch(e.request);
        if (response.ok) cache.put(e.request, response.clone());
        return response;
      }).catch(() => caches.match(e.request))
    );
  }
});
```

**Possible downsides**  
The articles cache can grow unbounded. A cache-eviction strategy (e.g., keep only the last 200 articles, evict by LRU or date) should be added. The SW currently has no pruning logic, so this needs care.

**Confidence: 84%** — Service worker + Cache API is already in use; extending it for content caching is a natural and well-documented pattern.
