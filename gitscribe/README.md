# GitScribe Mascot

This folder contains an animated mascot face logo for **GitScribe**, inspired by git branch nodes and lines.

## ASCII Motion MCP workflow used

I used the MCP docs at <https://docs.ascii-motion.com/mcp> to model the process and tool capabilities (canvas, palettes, animation, export). The SVG in `assets/mascot.svg` reflects that workflow:

1. Create circular face shape and branch-node motif.
2. Use Tailwind purple palette values (`#a78bfa`, `#8b5cf6`, `#7c3aed`, `#ddd6fe`, `#ede9fe`).
3. Add simple eye animation (blink + pupil bob).
4. Export as SVG asset for direct app use.

## Files

- `assets/mascot.svg` — animated mascot logo
- `index.html` — local preview page
- `tests/logo.test.js` — constraints test (palette, eyes, git motif)
