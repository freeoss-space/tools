const THEME_MANIFEST = [
  // ── Catppuccin ──────────────────────────────────────────────────────────
  { id: 'catppuccin-mocha',     name: 'Catppuccin Mocha',     group: 'Catppuccin',  src: 'themes/catppuccin/mocha.js' },
  { id: 'catppuccin-macchiato', name: 'Catppuccin Macchiato', group: 'Catppuccin',  src: 'themes/catppuccin/macchiato.js' },
  { id: 'catppuccin-frappe',    name: 'Catppuccin Frappé',    group: 'Catppuccin',  src: 'themes/catppuccin/frappe.js' },
  { id: 'catppuccin-latte',     name: 'Catppuccin Latte',     group: 'Catppuccin',  src: 'themes/catppuccin/latte.js' },

  // ── Rosé Pine ────────────────────────────────────────────────────────────
  { id: 'rose-pine',      name: 'Rosé Pine',       group: 'Rosé Pine', src: 'themes/rose-pine/base.js' },
  { id: 'rose-pine-moon', name: 'Rosé Pine Moon',  group: 'Rosé Pine', src: 'themes/rose-pine/moon.js' },
  { id: 'rose-pine-dawn', name: 'Rosé Pine Dawn',  group: 'Rosé Pine', src: 'themes/rose-pine/dawn.js' },

  // ── Dracula ──────────────────────────────────────────────────────────────
  { id: 'dracula', name: 'Dracula', group: 'Dracula', src: 'themes/dracula/index.js' },

  // ── Nord ─────────────────────────────────────────────────────────────────
  { id: 'nord', name: 'Nord', group: 'Nord', src: 'themes/nord/index.js' },

  // ── Atom One ─────────────────────────────────────────────────────────────
  { id: 'one-dark',  name: 'One Dark',  group: 'Atom One', src: 'themes/one-dark/index.js' },
  { id: 'one-light', name: 'One Light', group: 'Atom One', src: 'themes/one-light/index.js' },

  // ── Ayu ──────────────────────────────────────────────────────────────────
  { id: 'ayu-dark',   name: 'Ayu Dark',   group: 'Ayu', src: 'themes/ayu/dark.js' },
  { id: 'ayu-mirage', name: 'Ayu Mirage', group: 'Ayu', src: 'themes/ayu/mirage.js' },
  { id: 'ayu-light',  name: 'Ayu Light',  group: 'Ayu', src: 'themes/ayu/light.js' },

  // ── Material ─────────────────────────────────────────────────────────────
  { id: 'material-dark',      name: 'Material Dark',      group: 'Material', src: 'themes/material/dark.js' },
  { id: 'material-palenight', name: 'Material Palenight', group: 'Material', src: 'themes/material/palenight.js' },
  { id: 'material-ocean',     name: 'Material Ocean',     group: 'Material', src: 'themes/material/ocean.js' },

  // ── Monokai ──────────────────────────────────────────────────────────────
  { id: 'monokai', name: 'Monokai', group: 'Monokai', src: 'themes/monokai/index.js' },

  // ── Solarized ────────────────────────────────────────────────────────────
  { id: 'solarized-dark',  name: 'Solarized Dark',  group: 'Solarized', src: 'themes/solarized/dark.js' },
  { id: 'solarized-light', name: 'Solarized Light', group: 'Solarized', src: 'themes/solarized/light.js' },

  // ── Gruvbox ──────────────────────────────────────────────────────────────
  { id: 'gruvbox-dark',  name: 'Gruvbox Dark',  group: 'Gruvbox', src: 'themes/gruvbox/dark.js' },
  { id: 'gruvbox-light', name: 'Gruvbox Light', group: 'Gruvbox', src: 'themes/gruvbox/light.js' },

  // ── Tokyo Night ──────────────────────────────────────────────────────────
  { id: 'tokyo-night-dark',  name: 'Tokyo Night',       group: 'Tokyo Night', src: 'themes/tokyo-night/dark.js' },
  { id: 'tokyo-night-storm', name: 'Tokyo Night Storm', group: 'Tokyo Night', src: 'themes/tokyo-night/storm.js' },
  { id: 'tokyo-night-day',   name: 'Tokyo Night Day',   group: 'Tokyo Night', src: 'themes/tokyo-night/day.js' },

  // ── Kanagawa ─────────────────────────────────────────────────────────────
  { id: 'kanagawa-wave',   name: 'Kanagawa Wave',   group: 'Kanagawa', src: 'themes/kanagawa/wave.js' },
  { id: 'kanagawa-dragon', name: 'Kanagawa Dragon', group: 'Kanagawa', src: 'themes/kanagawa/dragon.js' },
  { id: 'kanagawa-lotus',  name: 'Kanagawa Lotus',  group: 'Kanagawa', src: 'themes/kanagawa/lotus.js' },

  // ── Everforest ───────────────────────────────────────────────────────────
  { id: 'everforest-dark',  name: 'Everforest Dark',  group: 'Everforest', src: 'themes/everforest/dark.js' },
  { id: 'everforest-light', name: 'Everforest Light', group: 'Everforest', src: 'themes/everforest/light.js' },

  // ── GitHub ───────────────────────────────────────────────────────────────
  { id: 'github-dark',  name: 'GitHub Dark',  group: 'GitHub', src: 'themes/github/dark.js' },
  { id: 'github-light', name: 'GitHub Light', group: 'GitHub', src: 'themes/github/light.js' },

  // ── Nightfox ─────────────────────────────────────────────────────────────
  { id: 'nightfox',   name: 'Nightfox',   group: 'Nightfox', src: 'themes/nightfox/nightfox.js' },
  { id: 'dayfox',     name: 'Dayfox',     group: 'Nightfox', src: 'themes/nightfox/dayfox.js' },
  { id: 'dawnfox',    name: 'Dawnfox',    group: 'Nightfox', src: 'themes/nightfox/dawnfox.js' },
  { id: 'duskfox',    name: 'Duskfox',    group: 'Nightfox', src: 'themes/nightfox/duskfox.js' },
  { id: 'carbonfox',  name: 'Carbonfox',  group: 'Nightfox', src: 'themes/nightfox/carbonfox.js' },
  { id: 'nordfox',    name: 'Nordfox',    group: 'Nightfox', src: 'themes/nightfox/nordfox.js' },
  { id: 'terafox',    name: 'Terafox',    group: 'Nightfox', src: 'themes/nightfox/terafox.js' },

  // ── Flexoki ──────────────────────────────────────────────────────────────
  { id: 'flexoki-dark',  name: 'Flexoki Dark',  group: 'Flexoki', src: 'themes/flexoki/dark.js' },
  { id: 'flexoki-light', name: 'Flexoki Light', group: 'Flexoki', src: 'themes/flexoki/light.js' },

  // ── Iceberg ──────────────────────────────────────────────────────────────
  { id: 'iceberg-dark',  name: 'Iceberg Dark',  group: 'Iceberg', src: 'themes/iceberg/dark.js' },
  { id: 'iceberg-light', name: 'Iceberg Light', group: 'Iceberg', src: 'themes/iceberg/light.js' },

  // ── Synthwave ────────────────────────────────────────────────────────────
  { id: 'synthwave', name: "Synthwave '84", group: 'Synthwave', src: 'themes/synthwave/index.js' },

  // ── Night Owl ────────────────────────────────────────────────────────────
  { id: 'night-owl',   name: 'Night Owl',   group: 'Night Owl', src: 'themes/night-owl/dark.js' },
  { id: 'light-owl',   name: 'Light Owl',   group: 'Night Owl', src: 'themes/night-owl/light.js' },

  // ── Winter is Coming ─────────────────────────────────────────────────────
  { id: 'winter-is-coming-dark-blue',   name: 'WiC Dark Blue',  group: 'Winter is Coming', src: 'themes/winter-is-coming/dark-blue.js' },
  { id: 'winter-is-coming-dark-black',  name: 'WiC Dark Black', group: 'Winter is Coming', src: 'themes/winter-is-coming/dark-black.js' },
  { id: 'winter-is-coming-light',       name: 'WiC Light',      group: 'Winter is Coming', src: 'themes/winter-is-coming/light.js' },

  // ── One Monokai ──────────────────────────────────────────────────────────
  { id: 'one-monokai', name: 'One Monokai', group: 'One Monokai', src: 'themes/one-monokai/index.js' },

  // ── Shades of Purple ─────────────────────────────────────────────────────
  { id: 'shades-of-purple',            name: 'Shades of Purple',           group: 'Shades of Purple', src: 'themes/shades-of-purple/index.js' },
  { id: 'shades-of-purple-super-dark', name: 'Shades of Purple Super Dark', group: 'Shades of Purple', src: 'themes/shades-of-purple/super-dark.js' },

  // ── Cobalt2 ──────────────────────────────────────────────────────────────
  { id: 'cobalt2', name: 'Cobalt2', group: 'Cobalt2', src: 'themes/cobalt2/index.js' },

  // ── Noctis ───────────────────────────────────────────────────────────────
  { id: 'noctis',         name: 'Noctis',         group: 'Noctis', src: 'themes/noctis/dark.js' },
  { id: 'noctis-azureus', name: 'Noctis Azureus', group: 'Noctis', src: 'themes/noctis/azureus.js' },

  // ── Panda ────────────────────────────────────────────────────────────────
  { id: 'panda', name: 'Panda', group: 'Panda', src: 'themes/panda/index.js' },

  // ── Horizon ──────────────────────────────────────────────────────────────
  { id: 'horizon',        name: 'Horizon',        group: 'Horizon', src: 'themes/horizon/dark.js' },
  { id: 'horizon-bright', name: 'Horizon Bright', group: 'Horizon', src: 'themes/horizon/bright.js' },

  // ── Oxocarbon ────────────────────────────────────────────────────────────
  { id: 'oxocarbon-dark',  name: 'Oxocarbon Dark',  group: 'Oxocarbon', src: 'themes/oxocarbon/dark.js' },
  { id: 'oxocarbon-light', name: 'Oxocarbon Light', group: 'Oxocarbon', src: 'themes/oxocarbon/light.js' },

  // ── Poimandres ───────────────────────────────────────────────────────────
  { id: 'poimandres', name: 'Poimandres', group: 'Poimandres', src: 'themes/poimandres/index.js' },

  // ── Vesper ───────────────────────────────────────────────────────────────
  { id: 'vesper', name: 'Vesper', group: 'Vesper', src: 'themes/vesper/index.js' },

  // ── Moonfly ──────────────────────────────────────────────────────────────
  { id: 'moonfly', name: 'Moonfly', group: 'Moonfly', src: 'themes/moonfly/index.js' },

  // ── Nightfly ─────────────────────────────────────────────────────────────
  { id: 'nightfly', name: 'Nightfly', group: 'Nightfly', src: 'themes/nightfly/index.js' },

  // ── Gruvbox Material ─────────────────────────────────────────────────────
  { id: 'gruvbox-material-dark',  name: 'Gruvbox Material Dark',  group: 'Gruvbox Material', src: 'themes/gruvbox-material/dark.js' },
  { id: 'gruvbox-material-light', name: 'Gruvbox Material Light', group: 'Gruvbox Material', src: 'themes/gruvbox-material/light.js' },

  // ── Modus ────────────────────────────────────────────────────────────────
  { id: 'modus-vivendi',         name: 'Modus Vivendi',         group: 'Modus', src: 'themes/modus/vivendi.js' },
  { id: 'modus-vivendi-tinted',  name: 'Modus Vivendi Tinted',  group: 'Modus', src: 'themes/modus/vivendi-tinted.js' },
  { id: 'modus-operandi',        name: 'Modus Operandi',        group: 'Modus', src: 'themes/modus/operandi.js' },
  { id: 'modus-operandi-tinted', name: 'Modus Operandi Tinted', group: 'Modus', src: 'themes/modus/operandi-tinted.js' },
];
