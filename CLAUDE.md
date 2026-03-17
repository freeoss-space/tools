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
├── my-scheme/          # Color scheme builder
├── which-scheme/       # Theme comparison browser
├── spec-helper/        # Spec-driven dev helper
├── rss-reader/         # RSS feed reader (PWA)
├── tax-helper/         # Tax tracking tool
└── aquadrive/          # AquaDrive design system reference
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
