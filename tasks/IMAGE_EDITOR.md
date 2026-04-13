# Image Editor Tool

**ID:** UV2VE  
**Branch:** `claude/image-editor-ticket-UV2VE`

---

## Summary

Add a new browser-based image editor tool to the tools site. The tool lets users upload a foreground image, optionally place a background image behind it, and apply a customizable outline stroke around the foreground subject. Built with plain HTML, CSS, and vanilla JavaScript using the Canvas API — no frameworks, no build step. Styled entirely with the AquaDrive design system.

---

## Background & Motivation

Many users who share images on social media or in presentations need a quick way to add an outline "pop" effect to a subject (person, logo, sticker) and composite it over a custom background. Existing tools for this either require a desktop app or a paid subscription. This tool covers the core use-case in a single, fast, zero-install browser page.

---

## Feature Description

### Core Workflow

1. **Upload foreground image** — The user picks or drops an image file that contains a subject with a transparent background (PNG, WebP, or GIF with alpha). If the image has no alpha channel, a basic luminance threshold is applied as a fallback to approximate transparency.
2. **Upload background image** *(optional)* — The user picks a second image (any format) that is rendered behind the foreground. If omitted, the canvas background is transparent (checkerboard preview).
3. **Configure outline** — A color picker and a thickness slider control the color and width of the stroke drawn around the visible (non-transparent) edges of the foreground.
4. **Live preview** — Every change is immediately reflected in the canvas preview.
5. **Export / download** — The composited result is exported as a PNG.

### Controls Detail

| Control | Type | Notes |
|---|---|---|
| Foreground upload | File input + drag-and-drop zone | Accept `image/*` |
| Background upload | File input + drag-and-drop zone | Accept `image/*`; optional |
| Clear background | Button (ghost, danger-tinted) | Removes background, reverts to transparent |
| Outline color | `<input type="color">` + hex text input | Defaults to `#ffffff` |
| Outline thickness | Range slider + numeric input | 1–60 px, default 8 px |
| Outline opacity | Range slider + percentage label | 0–100%, default 100% |
| Canvas size | Locked to foreground image dimensions | Shown as read-only label |
| Download PNG | Primary button | Triggers `canvas.toBlob()` download |
| Copy to clipboard | Secondary button | Uses `ClipboardItem` API |

---

## UI Layout & Design

### Page Shell

Follows the same app shell used by `my-scheme` and `spec-helper`:

```
┌──────────────────────────────────────────────────────┐
│  ← All tools        Image Editor        [Download]   │  ← .app-header
├────────────────┬─────────────────────────────────────┤
│                │                                     │
│   CONTROLS     │          CANVAS PREVIEW             │
│   (sidebar)    │          (main)                     │
│                │                                     │
│                │                                     │
└────────────────┴─────────────────────────────────────┘
```

- **`.app`** — full viewport flex column, `background: var(--bg)`
- **`.app-header`** — flex row, `border-bottom: 1px solid var(--border)`, `padding: 16px 24px`, same structure as other tools:
  - Left: `<a class="header-back">` with back-arrow SVG + "All tools"
  - Center: `<h1>` + `<p>` subtitle using `font-family: var(--font-display)`
  - Right: `.header-actions` with Download and Copy buttons
- **`.layout`** — flex row, fills remaining height (`flex: 1; overflow: hidden`)
- **`.sidebar`** — `width: 280px`, `border-right: 1px solid var(--border)`, `overflow-y: auto`, `padding: 20px`
- **`.main`** — `flex: 1`, `overflow: auto`, holds the canvas preview centred

### Sidebar Controls

Each control group uses the `.input-group` + `.input-label` + `.input-hint` pattern from `components.css`. Groups are visually separated by `<hr class="divider">`.

**Section: Foreground**
```
SECTION LABEL  "FOREGROUND"  (.text-section-label)
┌──────────────────────────────┐
│  Drop image here             │  ← .drop-zone (dashed border when empty)
│  or click to upload          │
└──────────────────────────────┘
[filename.png  ×]              ← .file-chip  (shown after upload)
```

**Section: Background**
```
SECTION LABEL  "BACKGROUND"
┌──────────────────────────────┐
│  Drop image here             │
│  or click to upload          │
└──────────────────────────────┘
[filename.jpg  ×]  [Clear]
```

**Section: Outline**
```
SECTION LABEL  "OUTLINE"
Color    [████] #ffffff
Thickness  ──●──── 8 px
Opacity    ──────●  100%
```

**Section: Canvas info**
```
SECTION LABEL  "OUTPUT"
Size:  1200 × 800 px   (.text-caption .text-muted)
```

### Canvas Preview Area

The `.main` panel shows the canvas centred both horizontally and vertically with `display: flex; align-items: center; justify-content: center`. The canvas itself has:
- A checkerboard background (CSS repeating-gradient) to signal transparency when no background image is set
- `border-radius: var(--radius)`
- `box-shadow: 0 8px 32px rgba(0,0,0,0.4)`
- Max dimensions constrained to the available viewport space (`max-width: 100%; max-height: 100%`) via CSS; the canvas internal resolution stays at the source image's native pixel dimensions

When no foreground has been uploaded yet, the preview area shows an empty-state card:

```
┌─────────────────────────────────────┐
│                                     │
│   [upload icon SVG]                 │
│   Upload a foreground image         │
│   to get started                    │
│                                     │
└─────────────────────────────────────┘
```

### Responsive Behaviour

At ≤ 680 px viewport width (matching other tools):
- Layout switches from row to column
- Sidebar becomes a full-width top panel; controls collapse into a scrollable section
- Canvas preview fills remaining height

---

## Technical Implementation

### File Structure

```
image-editor/
├── index.html          ← full page, links AquaDrive CSS + local assets
├── favicon.svg         ← tool favicon (frame/photo icon, primary blue stroke)
└── assets/
    ├── style.css       ← tool-specific styles only; AquaDrive provides base
    └── app.js          ← all interaction logic
```

### CSS Strategy

`index.html` links the AquaDrive stack first, then local overrides:

```html
<link rel="stylesheet" href="../aquadrive/assets/tokens.css">
<link rel="stylesheet" href="../aquadrive/assets/theme-dark.css">
<link rel="stylesheet" href="../aquadrive/assets/typography.css">
<link rel="stylesheet" href="../aquadrive/assets/components.css">
<link rel="stylesheet" href="assets/style.css">
```

`data-theme="dark"` is set on `<html>` (dark by default, matching all other tools).

`style.css` only defines layout shells and tool-specific components (`.drop-zone`, `.file-chip`, `.canvas-wrap`, `.empty-state`). All buttons, inputs, labels, section labels, and badges come directly from AquaDrive component classes.

### JavaScript State Object

```js
const state = {
  fgImage:         null,   // HTMLImageElement or null
  fgFile:          null,   // File object
  bgImage:         null,   // HTMLImageElement or null
  bgFile:          null,   // File object
  outlineColor:    '#ffffff',
  outlineThickness: 8,
  outlineOpacity:  1.0,
};
```

`render()` is the single function that redraws the canvas from scratch on every state mutation. All event handlers mutate state then call `render()`.

### Outline Algorithm (Canvas API)

The outline effect is produced in three passes on a hidden offscreen canvas:

1. **Pass 1 — Dilate**: Draw the foreground image repeatedly offset in all directions by `thickness` pixels (or use `ctx.shadowBlur` + `ctx.shadowColor` trick for smoother edges). This "expands" the silhouette outward.
2. **Pass 2 — Composite**: Use `ctx.globalCompositeOperation = 'destination-in'` with the original foreground image to clip the dilation to the outline ring only (dilated area minus original footprint = outline ring). Alternatively, use pixel-level alpha dilation for pixel-perfect results.
3. **Pass 3 — Final composite**:
   - Clear the output canvas
   - Draw background image stretched to canvas dimensions (if present)
   - Draw the outline layer
   - Draw the foreground image on top

The recommended approach for quality and performance is the **shadow-offset stamp method**:

```js
function drawOutline(ctx, img, color, thickness, opacity) {
  const offscreen = new OffscreenCanvas(ctx.canvas.width, ctx.canvas.height);
  const oc = offscreen.getContext('2d');

  oc.save();
  oc.globalAlpha = opacity;
  // Stamp the image in a ring of offsets at the given radius
  const steps = Math.max(16, thickness * 4);
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const dx = Math.cos(angle) * thickness;
    const dy = Math.sin(angle) * thickness;
    oc.drawImage(img, dx, dy);
  }
  // Tint to outline color
  oc.globalCompositeOperation = 'source-in';
  oc.fillStyle = color;
  oc.fillRect(0, 0, oc.canvas.width, oc.canvas.height);
  oc.restore();

  // Erase overlap with original to get ring only
  oc.globalCompositeOperation = 'destination-out';
  oc.drawImage(img, 0, 0);

  ctx.drawImage(offscreen, 0, 0);
}
```

### Download

```js
canvas.toBlob(blob => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'image-editor-export.png';
  a.click();
  URL.revokeObjectURL(url);
}, 'image/png');
```

### Clipboard Copy

```js
canvas.toBlob(async blob => {
  await navigator.clipboard.write([
    new ClipboardItem({ 'image/png': blob })
  ]);
  showToast('Copied to clipboard');
}, 'image/png');
```

### Drag-and-Drop Zones

Each `.drop-zone` listens for `dragover`, `dragleave`, and `drop`. An `.is-dragging` modifier class adds a highlighted dashed border (`border-color: var(--primary)`) during active drag. Clicking the zone triggers a hidden `<input type="file">`.

### Toast Notifications

Use the same `.toast` / `showToast(msg)` pattern found in `my-scheme`: a fixed pill at the bottom of the viewport that auto-dismisses after 2.5 s.

---

## Root index.html — Tool Card Entry

Add the following card inside `.tools-grid` in `/index.html`:

```html
<a class="tool-card" href="image-editor/index.html">
  <div class="tool-thumb">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" fill="none">
      <!-- Dark background -->
      <rect width="320" height="180" fill="#1C1828"/>
      <!-- Background image placeholder (rounded rect, muted) -->
      <rect x="40" y="30" width="240" height="120" rx="12"
            fill="#261F34" stroke="#352C43" stroke-width="1.5"/>
      <!-- Foreground subject silhouette -->
      <ellipse cx="160" cy="100" rx="52" ry="62" fill="#352C43"/>
      <rect x="120" y="72" width="80" height="80" rx="8" fill="#352C43"/>
      <!-- White outline ring (drop-shadow representation) -->
      <ellipse cx="160" cy="100" rx="52" ry="62"
               stroke="#ffffff" stroke-width="6" fill="none" opacity="0.9"/>
      <rect x="120" y="72" width="80" height="80" rx="8"
            stroke="#ffffff" stroke-width="6" fill="none" opacity="0.9"/>
      <!-- Primary colored subject fill -->
      <ellipse cx="160" cy="90" rx="38" ry="45" fill="#656EA4" opacity="0.85"/>
      <!-- Color swatch dots (outline color options hint) -->
      <circle cx="68" cy="152" r="6" fill="#ffffff"/>
      <circle cx="84" cy="152" r="6" fill="#F9DB6D"/>
      <circle cx="100" cy="152" r="6" fill="#52B788"/>
      <circle cx="116" cy="152" r="6" fill="#E66260"/>
    </svg>
  </div>
  <div class="tool-info">
    <div class="tool-name">Image Editor</div>
    <div class="tool-desc">Add outlines and backgrounds to images with live preview and one-click export.</div>
    <span class="tool-tag">Image</span>
  </div>
</a>
```

---

## favicon.svg

A simple frame / photo icon in AquaDrive primary blue, 32×32 viewBox, stroke-based (consistent with site-wide inline icon style):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <rect x="3" y="3" width="26" height="26" rx="5"
        stroke="#656EA4" stroke-width="2.5"/>
  <circle cx="11" cy="12" r="2.5" fill="#656EA4"/>
  <path d="M3 22 L10 15 L17 21 L22 16 L29 22"
        stroke="#656EA4" stroke-width="2.5"
        stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Outline-effect accent: small ring around circle -->
  <circle cx="11" cy="12" r="4.5"
          stroke="#8C92BE" stroke-width="1.5" fill="none"/>
</svg>
```

---

## Acceptance Criteria

- [ ] Uploading a foreground PNG with transparency renders the subject on the canvas
- [ ] Uploading a background image composites it behind the foreground
- [ ] Clearing the background reverts to the checkerboard transparent preview
- [ ] The outline is drawn around the full alpha edge of the foreground subject
- [ ] Changing outline color is immediately reflected in the canvas
- [ ] Changing thickness (1–60 px) is immediately reflected
- [ ] Changing opacity (0–100%) is immediately reflected
- [ ] Download button exports a valid PNG file at the source image's native resolution
- [ ] Copy button copies the PNG to the clipboard (with graceful degradation if the API is unavailable)
- [ ] Drag-and-drop works for both foreground and background upload zones
- [ ] The tool is usable on a 375 px wide mobile viewport (controls stack above canvas)
- [ ] The tool card appears in the root `index.html` grid
- [ ] All UI uses AquaDrive tokens/components — no hardcoded color values outside `style.css`
- [ ] No JavaScript frameworks or build tools are introduced

---

## Out of Scope

- AI-based background removal (the tool expects a pre-cut PNG with alpha; a future ticket can add an in-browser segmentation step using `transformers.js`)
- Multi-layer compositing beyond foreground + background
- Undo/redo history
- Text overlays
- Export formats other than PNG
