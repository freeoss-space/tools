# Tools

A collection of handy browser-based utilities, deployed via GitHub Pages.

## Architecture

- **Static site**: Each tool lives in its own folder with `index.html`, `favicon.svg`, and an `assets/` directory (CSS, JS)
- **No build step**: Plain HTML, CSS, and vanilla JavaScript — no frameworks or bundlers
- **Deployment**: GitHub Pages serves the repo root directly

## Structure

```
tools/
├── index.html          # Main landing page with tool grid
├── favicon.svg         # Site-wide favicon
├── aquadrive/          # AquaDrive shared design system assets
│   └── assets/
│       ├── tokens.css      # Base design tokens (colors, spacing, radii, type scale)
│       ├── theme-light.css # Light theme custom properties
│       ├── theme-dark.css  # Dark theme custom properties
│       ├── typography.css  # Type scale & text utility classes
│       └── components.css  # Reusable UI component styles
├── my-scheme/          # Color scheme builder
├── which-scheme/       # Theme comparison browser
├── spec-helper/        # Spec-driven dev helper
├── rss-reader/         # RSS feed reader (PWA)
└── tax-helper/         # Tax tracking tool
```

## Adding a New Tool

1. Create a new folder: `tool-name/`
2. Add `index.html` as the entry point
3. Add a `favicon.svg` for the tool
4. Place CSS and JS in `tool-name/assets/`
5. Add a tool card entry in the root `index.html` with an SVG thumbnail

## Design Conventions

- **Dark theme** by default: background `#0d1117`, text `#e6edf3`
- CSS custom properties for theming (see root `index.html` for base variables)
- System font stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Monospace: `"SF Mono", "Fira Code", "Cascadia Code", monospace`
- Consistent component patterns: `.btn-primary`, `.btn-secondary`, `.tab-group`, `.tool-card`
- 1px borders using `var(--border)` (`#30363d`)
- Hover effects: `translateY(-3px)` + box-shadow
- Responsive breakpoint around 640–680px

## Code Style

- Vanilla JS with state objects and render functions (no frameworks)
- BEM-like CSS class naming
- Inline SVGs for icons (stroke-based, 16–18px)
- Single-file tools are acceptable for small utilities (see `tax-helper`)

## AquaDrive Design System

Reference design tokens for the AquaDrive car wash app. Use these colors and conventions when building or modifying AquaDrive-related UI.

### Primary — Blue Scale (base #656EA4)

| Token      | Hex       | Usage                    |
|------------|-----------|--------------------------|
| Blue 50    | `#EDEEF5` | Tinted backgrounds       |
| Blue 200   | `#C4C7DF` | Subtle borders           |
| Blue 400   | `#8C92BE` | Hover states             |
| Blue 500   | `#656EA4` | Primary brand / CTAs     |
| Blue 600   | `#4E5688` | Active / pressed         |
| Blue 800   | `#313666` | Dark mode tint surface   |

### Neutrals — Warm Rose-tinted Grays

| Token      | Hex       | Usage                        |
|------------|-----------|------------------------------|
| Warm 50    | `#F4EDED` | App background (light)       |
| Warm 100   | `#E8DEDE` | Card surface (light)         |
| Warm 200   | `#E0D5D5` | Borders, dividers            |
| Warm 500   | `#9A8E8E` | Secondary / muted text       |
| Warm 800   | `#3D3240` | Primary text (light)         |
| Warm 850   | `#352C43` | Dark elevated surface        |
| Warm 900   | `#261F34` | Dark card surface            |
| Warm 950   | `#1C1828` | App background (dark)        |

### Semantic — Status Colors

Each status color has three tiers: **Main**, **Soft**, and **Tint**.

| Status  | Main      | Soft      | Tint      | Usage                    |
|---------|-----------|-----------|-----------|--------------------------|
| Error   | `#E66260` | `#F3A8A7` | `#FCEAEA` | Failed payments, alerts  |
| Warning | `#F9DB6D` | `#FCEEA8` | `#FEF9E6` | Pending, in-progress     |
| Success | `#52B788` | `#95D4B3` | `#EAF7EF` | Completed, paid          |
| Info    | `#656EA4` | `#B0B5D4` | `#EDEEF5` | Tips, schedule notices   |

### Shared CSS Assets

The `aquadrive/assets/` folder contains importable CSS files. Usage:

```html
<!-- Load tokens first, then a theme, then optional layers -->
<link rel="stylesheet" href="/aquadrive/assets/tokens.css">
<link rel="stylesheet" href="/aquadrive/assets/theme-light.css">
<link rel="stylesheet" href="/aquadrive/assets/theme-dark.css">
<link rel="stylesheet" href="/aquadrive/assets/typography.css">
<link rel="stylesheet" href="/aquadrive/assets/components.css">
```

Toggle dark mode by setting `data-theme="dark"` on `<html>`. Light is the default.

| File             | Purpose                                                      |
|------------------|--------------------------------------------------------------|
| `tokens.css`     | Color primitives, semantic palette, type scale, radii, fonts |
| `theme-light.css`| Light theme custom properties (default / customer-facing)    |
| `theme-dark.css` | Dark theme custom properties (provider dashboard)            |
| `typography.css` | `.text-display`, `.text-h2`–`.text-caption`, utilities       |
| `components.css` | Buttons, inputs, badges, alerts, cards, tabs, modals, etc.   |

### Theme Tokens

Light mode (default):
- `--bg`: `#F4EDED`
- `--surface`: `#FFFFFF`
- `--surface-alt`: `#E8DEDE` (elevated surface)
- `--border`: `#E0D5D5`
- `--text`: `#1C1828`
- `--text-muted`: `#7A6F7F`
- `--primary`: `#656EA4`
- `--primary-hover`: `#4E5688`
- `--primary-subtle`: `#EDEEF5`
- `--accent`: alias for `--primary`

Dark mode (`[data-theme="dark"]`):
- `--bg`: `#1C1828`
- `--surface`: `#261F34`
- `--surface-alt`: `#352C43` (elevated surface)
- `--border`: `#352C43`
- `--text`: `#F4EDED`
- `--text-muted`: `#9A8E9E`
- `--primary`: `#8C92BE`
- `--primary-hover`: `#C4C7DF`
- `--primary-subtle`: `#313666`
- `--accent`: alias for `--primary`

### Typography

- Headings: `"Syne", sans-serif` (weight 400–800)
- Monospace / labels: `"DM Mono", monospace` (weight 400–500)
- Border radius: `16px` (large), `10px` (small)

### UI Component Patterns

- **Buttons**: Primary (`bg: Blue 500, color: #fff`), Secondary (`bg: Blue 50, color: Blue 500`), Ghost (`transparent, border: 1px solid var(--border)`)
- **Status badges**: Pill-shaped (`border-radius: 100px`), use semantic tint bg + main text color
- **Cards**: `border-radius: 16px`, `border: 1px solid var(--border)`, `background: var(--surface)`
- **Stat cards**: Use semantic tint background with main color text (e.g. success tint bg + success main text for revenue)
