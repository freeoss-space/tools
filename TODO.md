# TODO

## which-scheme.html — Which Theme?

Compare color schemes side by side. Browse palettes, copy colors in any CSS format, and export as CSS custom properties.

- [ ] Add option to generate ports from color schemes using [tinted-theming](https://github.com/tinted-theming) and/or [Base24](https://github.com/Base24) — let user pick a scheme and download config files for their terminal/editor
- [ ] Add option to generate a custom color scheme — select up to 24 colors with a color picker, with live preview updating as colors change
- [ ] Add option to edit individual colors within an existing color scheme (tweak and export a modified version)
- [ ] Separate tool into multiple files for organization: split into `which-scheme.html`, `which-scheme.css`, `which-scheme.js`, and load theme data from separate JSON/JS files per scheme (loaded on demand)
- [ ] Add more color scheme support:
  - **Base16 (via tinted-theming):** Ayu (dark/mirage/light), Catppuccin (all 4), Gruvbox (all 6 hard/medium/soft × dark/light), Gruvbox Material, Kanagawa (wave/dragon/paper), Tokyo Night (dark/moon/storm/light), Rose Pine (base/moon/dawn), Solarized (dark/light), One Dark/One Light, Nord (dark/light), Everforest (6 variants), Horizon (dark/light), Penumbra (6 variants), Flexoki (dark/light), Oxocarbon (dark/light), Papercolor (dark/light), Github (dark/light), Material (dark/darker/ocean/palenight/lighter), Tomorrow Night, Monokai, Zenburn, Snazzy, Espresso, Railscasts, Atelier family (10 themes × dark/light), Black Metal family (12 variants), Selenized (black/dark/light/white), Da One (6 variants)
  - **Base24 (via tinted-theming):** One Dark, Monokai Vivid, Challenger Deep, Cobalt2, Bluloco (dark/light), JetBrains Darcula, Spacedust, Tokyo Night (dark/moon/storm/light), Night Lion (v1/v2), Shades of Purple, Wild Cherry, Poimandres, Cyberdyne
  - **Standalone (not in tinted-theming):** Monokai Pro (6 filter variants), One Dark Pro (3 variants), Sonokai (6 variants), Nightfox family (Nightfox/Carbonfox/Dawnfox/Dayfox/Nordfox/Terafox), Melange (dark/light), Iceberg (dark/light), Cyberdream (dark/light), Synthwave '84, Modus (Operandi/Vivendi), Night Owl (dark/light), Spacegray (3 variants), Srcery, [base46](https://github.com/NvChad/base46) (NvChad — 60+ themes)

## index.html — Tool Directory

Landing page listing all available tools.

-
