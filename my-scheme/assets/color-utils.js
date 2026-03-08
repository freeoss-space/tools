// ── Conversion ────────────────────────────────────────────────────

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      default: h = ((r - g) / d + 4) / 6;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function linearize(c) {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function hexToOklch(hex) {
  const { r, g, b } = hexToRgb(hex);
  const lr = linearize(r), lg = linearize(g), lb = linearize(b);
  const l  = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m  = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s  = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
  const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
  const L  = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const a  = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const bv = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;
  const C  = Math.sqrt(a * a + bv * bv);
  let H = Math.atan2(bv, a) * 180 / Math.PI;
  if (H < 0) H += 360;
  return { L: Math.round(L * 1000) / 1000, C: Math.round(C * 1000) / 1000, H: Math.round(H * 10) / 10 };
}

function formatColor(hex, fmt) {
  if (fmt === 'hex') return hex;
  const { r, g, b } = hexToRgb(hex);
  if (fmt === 'rgb') return `rgb(${r}, ${g}, ${b})`;
  if (fmt === 'hsl') { const { h, s, l } = rgbToHsl(r, g, b); return `hsl(${h}, ${s}%, ${l}%)`; }
  if (fmt === 'oklch') { const { L, C, H } = hexToOklch(hex); return `oklch(${L} ${C} ${H})`; }
  return hex;
}

// ── Luminance & derive ────────────────────────────────────────────

function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

// Maps an arbitrary palette to a set of semantic color roles by
// sorting the colors from darkest to lightest and distributing them
// across roles positionally. Works best with full dark-theme palettes.
function deriveAll(colors) {
  if (!colors.length) return {};
  const sorted = [...colors].sort((a, b) => relativeLuminance(a.hex) - relativeLuminance(b.hex));
  const n = sorted.length;
  // at(f): color at fractional position f in the sorted array
  const at  = f => sorted[Math.min(Math.floor(f * n), n - 1)].hex;
  // idx(i): color at absolute index i (clamped)
  const idx = i => sorted[Math.min(Math.max(0, i), n - 1)].hex;

  return {
    bg:        idx(0),
    bg2:       idx(Math.min(1, n - 1)),
    bg3:       idx(Math.min(2, n - 1)),
    highlight: idx(Math.min(2, n - 1)),
    border:    at(0.22),
    comment:   at(0.35),
    muted:     at(0.35),
    subtext:   at(0.42),
    operator:  at(0.48),
    keyword:   at(0.65),
    purple:    at(0.65),
    func:      at(0.60),
    blue:      at(0.60),
    cyan:      at(0.70),
    type:      at(0.70),
    string:    at(0.88),
    green:     at(0.88),
    red:       at(0.48),
    number:    at(0.78),
    orange:    at(0.78),
    yellow:    at(0.84),
    text:      idx(n - 1),
  };
}

// ── Export builders ───────────────────────────────────────────────

function buildCssVars(colors, name) {
  const header = name ? `/* ${name} */\n` : '';
  const vars = colors.map(c => {
    const slug = c.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return `  --color-${slug}: ${c.hex};`;
  });
  return `${header}:root {\n${vars.join('\n')}\n}`;
}

function buildBase16(colors, name) {
  const sorted = [...colors].sort((a, b) => relativeLuminance(a.hex) - relativeLuminance(b.hex));
  const n = sorted.length;
  const at  = f => sorted[Math.min(Math.floor(f * n), n - 1)].hex.slice(1);
  const idx = i => sorted[Math.min(i, n - 1)].hex.slice(1);
  return [
    `scheme: "${name || 'My Scheme'}"`,
    `author: ""`,
    `base00: "${idx(0)}"`,
    `base01: "${idx(Math.min(1,n-1))}"`,
    `base02: "${idx(Math.min(2,n-1))}"`,
    `base03: "${at(0.35)}"`,
    `base04: "${at(0.42)}"`,
    `base05: "${idx(n-1)}"`,
    `base06: "${at(0.92)}"`,
    `base07: "${at(0.96)}"`,
    `base08: "${at(0.48)}"`,
    `base09: "${at(0.78)}"`,
    `base0A: "${at(0.84)}"`,
    `base0B: "${at(0.88)}"`,
    `base0C: "${at(0.70)}"`,
    `base0D: "${at(0.60)}"`,
    `base0E: "${at(0.65)}"`,
    `base0F: "${at(0.94)}"`,
  ].join('\n');
}

function buildJson(colors, name) {
  return JSON.stringify(
    { name: name || 'My Scheme', colors: colors.map(c => ({ name: c.name, hex: c.hex })) },
    null, 2
  );
}

// ── Misc ──────────────────────────────────────────────────────────

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(c * 255).toString(16).padStart(2, '0');
  };
  return '#' + f(0) + f(8) + f(4);
}

// ── Lightness adjustment ──────────────────────────────────────────

function adjustLightness(hex, delta) {
  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);
  return hslToHex(h, s, Math.max(0, Math.min(100, l + delta)));
}

// ── Shared sorted-palette helper ──────────────────────────────────

function _palette(colors) {
  const sorted = [...colors].sort((a, b) => relativeLuminance(a.hex) - relativeLuminance(b.hex));
  const n  = sorted.length;
  const at  = f => sorted[Math.min(Math.floor(f * n), n - 1)].hex;
  const idx = i => sorted[Math.min(Math.max(0, i), n - 1)].hex;
  return { sorted, n, at, idx };
}

// ── Base16 YAML ───────────────────────────────────────────────────

function buildBase16Yaml(colors, name) {
  const { n, at, idx } = _palette(colors);
  const h = v => v.slice(1);
  return [
    `scheme: "${name || 'My Scheme'}"`,
    `author: ""`,
    `base00: "${h(idx(0))}"`,
    `base01: "${h(idx(Math.min(1, n-1)))}"`,
    `base02: "${h(idx(Math.min(2, n-1)))}"`,
    `base03: "${h(at(0.35))}"`,
    `base04: "${h(at(0.42))}"`,
    `base05: "${h(idx(n-1))}"`,
    `base06: "${h(at(0.92))}"`,
    `base07: "${h(at(0.96))}"`,
    `base08: "${h(at(0.48))}"`,
    `base09: "${h(at(0.78))}"`,
    `base0A: "${h(at(0.84))}"`,
    `base0B: "${h(at(0.88))}"`,
    `base0C: "${h(at(0.70))}"`,
    `base0D: "${h(at(0.60))}"`,
    `base0E: "${h(at(0.65))}"`,
    `base0F: "${h(at(0.94))}"`,
  ].join('\n');
}

// ── Base24 YAML ───────────────────────────────────────────────────

function buildBase24Yaml(colors, name) {
  const { n, at, idx } = _palette(colors);
  const h  = v => v.slice(1);
  const br = (f, d) => adjustLightness(at(f), d).slice(1);
  return [
    `scheme: "${name || 'My Scheme'}"`,
    `author: ""`,
    `base00: "${h(idx(0))}"`,
    `base01: "${h(idx(Math.min(1, n-1)))}"`,
    `base02: "${h(idx(Math.min(2, n-1)))}"`,
    `base03: "${h(at(0.35))}"`,
    `base04: "${h(at(0.42))}"`,
    `base05: "${h(idx(n-1))}"`,
    `base06: "${h(at(0.92))}"`,
    `base07: "${h(at(0.96))}"`,
    `base08: "${h(at(0.48))}"`,
    `base09: "${h(at(0.78))}"`,
    `base0A: "${h(at(0.84))}"`,
    `base0B: "${h(at(0.88))}"`,
    `base0C: "${h(at(0.70))}"`,
    `base0D: "${h(at(0.60))}"`,
    `base0E: "${h(at(0.65))}"`,
    `base0F: "${h(at(0.94))}"`,
    `# Base24 — bright ANSI variants`,
    `base10: "${br(0.35, 10)}"`,
    `base11: "${br(0.48, 12)}"`,
    `base12: "${br(0.88,  8)}"`,
    `base13: "${br(0.84,  8)}"`,
    `base14: "${br(0.60, 10)}"`,
    `base15: "${br(0.70,  8)}"`,
    `base16: "${br(0.65, 10)}"`,
    `base17: "${br(0.78, 10)}"`,
  ].join('\n');
}

// ── NvChad / Base46 Lua ──────────────────────────────────────────

function buildNvChad(colors, name) {
  const { n, at, idx } = _palette(colors);
  const adj  = (f, d) => adjustLightness(at(f), d);
  const adjI = (i, d) => adjustLightness(idx(i), d);
  const sn   = name || 'My Scheme';

  return `-- ${sn} — NvChad / Base46 theme
-- Generated by My Scheme

local M = {}

M.base_30 = {
  white          = "${idx(n-1)}",
  black          = "${idx(0)}",
  darker_black   = "${adjI(0, -4)}",
  black2         = "${idx(Math.min(1, n-1))}",
  one_bg         = "${idx(Math.min(2, n-1))}",
  one_bg2        = "${adj(0.22, 4)}",
  one_bg3        = "${adj(0.22, 8)}",
  grey           = "${at(0.35)}",
  grey_fg        = "${adj(0.35, 6)}",
  grey_fg2       = "${adj(0.35, 10)}",
  light_grey     = "${at(0.42)}",
  red            = "${at(0.48)}",
  baby_pink      = "${adj(0.48, 8)}",
  pink           = "${adj(0.48, 12)}",
  line           = "${idx(Math.min(2, n-1))}",
  green          = "${at(0.88)}",
  vibrant_green  = "${adj(0.88, 6)}",
  nord_blue      = "${at(0.60)}",
  blue           = "${at(0.60)}",
  seablue        = "${adj(0.60, -6)}",
  yellow         = "${at(0.84)}",
  sun            = "${adj(0.84, 8)}",
  purple         = "${at(0.65)}",
  dark_purple    = "${adj(0.65, -6)}",
  teal           = "${at(0.70)}",
  orange         = "${at(0.78)}",
  cyan           = "${at(0.70)}",
  statusline_bg  = "${idx(Math.min(1, n-1))}",
  lightbg        = "${idx(Math.min(2, n-1))}",
  pmenu_bg       = "${at(0.60)}",
  folder_bg      = "${at(0.60)}",
}

M.base_16 = {
  base00 = "${idx(0)}",
  base01 = "${idx(Math.min(1, n-1))}",
  base02 = "${idx(Math.min(2, n-1))}",
  base03 = "${at(0.35)}",
  base04 = "${at(0.42)}",
  base05 = "${idx(n-1)}",
  base06 = "${at(0.92)}",
  base07 = "${at(0.96)}",
  base08 = "${at(0.48)}",
  base09 = "${at(0.78)}",
  base0A = "${at(0.84)}",
  base0B = "${at(0.88)}",
  base0C = "${at(0.70)}",
  base0D = "${at(0.60)}",
  base0E = "${at(0.65)}",
  base0F = "${at(0.94)}",
}

M.type = "dark"

return M`;
}

// ── Alacritty TOML ────────────────────────────────────────────────

function buildAlacritty(colors, name) {
  const { n, at, idx } = _palette(colors);
  const br = (f, d) => adjustLightness(at(f), d);
  const sn = name || 'My Scheme';

  return `# ${sn} — Alacritty color scheme
# Generated by My Scheme

[colors.primary]
background = "${idx(0)}"
foreground = "${idx(n-1)}"

[colors.cursor]
text   = "${idx(0)}"
cursor = "${idx(n-1)}"

[colors.selection]
text       = "${idx(n-1)}"
background = "${idx(Math.min(2, n-1))}"

[colors.normal]
black   = "${idx(Math.min(2, n-1))}"
red     = "${at(0.48)}"
green   = "${at(0.88)}"
yellow  = "${at(0.84)}"
blue    = "${at(0.60)}"
magenta = "${at(0.65)}"
cyan    = "${at(0.70)}"
white   = "${idx(n-1)}"

[colors.bright]
black   = "${at(0.35)}"
red     = "${br(0.48, 10)}"
green   = "${br(0.88,  6)}"
yellow  = "${br(0.84,  6)}"
blue    = "${br(0.60,  8)}"
magenta = "${br(0.65,  8)}"
cyan    = "${br(0.70,  6)}"
white   = "${at(0.96)}"`;
}

// ── Kitty conf ────────────────────────────────────────────────────

function buildKitty(colors, name) {
  const { n, at, idx } = _palette(colors);
  const br   = (f, d) => adjustLightness(at(f), d);
  const sn   = name || 'My Scheme';
  const slug = sn.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  return `# ${sn} — Kitty color scheme
# Generated by My Scheme
# Place in ~/.config/kitty/${slug}.conf

background              ${idx(0)}
foreground              ${idx(n-1)}
selection_background    ${idx(Math.min(2, n-1))}
selection_foreground    ${idx(n-1)}
cursor                  ${idx(n-1)}
cursor_text_color       ${idx(0)}
url_color               ${at(0.60)}

# Normal ANSI
color0  ${idx(Math.min(2, n-1))}
color1  ${at(0.48)}
color2  ${at(0.88)}
color3  ${at(0.84)}
color4  ${at(0.60)}
color5  ${at(0.65)}
color6  ${at(0.70)}
color7  ${idx(n-1)}

# Bright ANSI
color8  ${at(0.35)}
color9  ${br(0.48, 10)}
color10 ${br(0.88,  6)}
color11 ${br(0.84,  6)}
color12 ${br(0.60,  8)}
color13 ${br(0.65,  8)}
color14 ${br(0.70,  6)}
color15 ${at(0.96)}

# Tab bar
active_tab_background   ${at(0.60)}
active_tab_foreground   ${idx(0)}
inactive_tab_background ${idx(Math.min(1, n-1))}
inactive_tab_foreground ${at(0.42)}
tab_bar_background      ${idx(0)}`;
}

// ── WezTerm Lua ───────────────────────────────────────────────────

function buildWezTerm(colors, name) {
  const { n, at, idx } = _palette(colors);
  const br   = (f, d) => adjustLightness(at(f), d);
  const sn   = name || 'My Scheme';
  const slug = sn.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  return `-- ${sn} — WezTerm color scheme
-- Generated by My Scheme
-- Save as ~/.config/wezterm/colors/${slug}.toml
-- Then set: color_scheme = "${sn}"

return {
  colors = {
    foreground    = "${idx(n-1)}",
    background    = "${idx(0)}",
    cursor_bg     = "${idx(n-1)}",
    cursor_border = "${idx(n-1)}",
    cursor_fg     = "${idx(0)}",
    selection_bg  = "${idx(Math.min(2, n-1))}",
    selection_fg  = "${idx(n-1)}",
    ansi = {
      "${idx(Math.min(2, n-1))}",
      "${at(0.48)}",
      "${at(0.88)}",
      "${at(0.84)}",
      "${at(0.60)}",
      "${at(0.65)}",
      "${at(0.70)}",
      "${idx(n-1)}",
    },
    brights = {
      "${at(0.35)}",
      "${br(0.48, 10)}",
      "${br(0.88,  6)}",
      "${br(0.84,  6)}",
      "${br(0.60,  8)}",
      "${br(0.65,  8)}",
      "${br(0.70,  6)}",
      "${at(0.96)}",
    },
    tab_bar = {
      background = "${idx(0)}",
      active_tab = {
        bg_color = "${at(0.60)}",
        fg_color = "${idx(0)}",
      },
      inactive_tab = {
        bg_color = "${idx(Math.min(1, n-1))}",
        fg_color = "${at(0.42)}",
      },
      inactive_tab_hover = {
        bg_color = "${idx(Math.min(2, n-1))}",
        fg_color = "${at(0.42)}",
      },
    },
  },
  metadata = {
    name = "${sn}",
  },
}`;
}

// ── Ghostty conf ─────────────────────────────────────────────────

function buildGhostty(colors, name) {
  const { n, at, idx } = _palette(colors);
  const br   = (f, d) => adjustLightness(at(f), d);
  const sn   = name || 'My Scheme';
  const slug = sn.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const nh   = v => v.slice(1); // no '#' prefix (Ghostty format)

  return `# ${sn} — Ghostty color scheme
# Generated by My Scheme
# Place in ~/.config/ghostty/themes/${slug}

background = ${nh(idx(0))}
foreground = ${nh(idx(n-1))}
selection-background = ${nh(idx(Math.min(2, n-1)))}
selection-foreground = ${nh(idx(n-1))}
cursor-color = ${nh(idx(n-1))}

# Normal ANSI colors (0–7)
palette = 0=${nh(idx(Math.min(2, n-1)))}
palette = 1=${nh(at(0.48))}
palette = 2=${nh(at(0.88))}
palette = 3=${nh(at(0.84))}
palette = 4=${nh(at(0.60))}
palette = 5=${nh(at(0.65))}
palette = 6=${nh(at(0.70))}
palette = 7=${nh(idx(n-1))}

# Bright ANSI colors (8–15)
palette = 8=${nh(at(0.35))}
palette = 9=${nh(br(0.48, 10))}
palette = 10=${nh(br(0.88, 6))}
palette = 11=${nh(br(0.84, 6))}
palette = 12=${nh(br(0.60, 8))}
palette = 13=${nh(br(0.65, 8))}
palette = 14=${nh(br(0.70, 6))}
palette = 15=${nh(at(0.96))}`;
}

// ── Vim colorscheme ───────────────────────────────────────────────

function buildVim(colors, name) {
  const { n, at, idx } = _palette(colors);
  const sn   = name || 'My Scheme';
  const slug = sn.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

  const p = {
    bg:      idx(0),
    bg2:     idx(Math.min(1, n-1)),
    bg3:     idx(Math.min(2, n-1)),
    border:  at(0.22),
    comment: at(0.35),
    muted:   at(0.42),
    red:     at(0.48),
    blue:    at(0.60),
    purple:  at(0.65),
    cyan:    at(0.70),
    orange:  at(0.78),
    yellow:  at(0.84),
    green:   at(0.88),
    text:    idx(n-1),
  };

  const hi = (g, o) => {
    let s = `hi ${g.padEnd(28)}`;
    if (o.fg)  s += ` guifg=${o.fg}`;
    if (o.bg)  s += ` guibg=${o.bg}`;
    if (o.gui) s += ` gui=${o.gui}`;
    if (o.sp)  s += ` guisp=${o.sp}`;
    return s;
  };

  return `" Name: ${sn}
" Generated by My Scheme

hi clear
if exists("syntax_on")
  syntax reset
endif
let g:colors_name = "${slug}"

" ── Editor ───────────────────────────────────────────────────────
${hi('Normal',                  { fg: p.text,    bg: p.bg })}
${hi('NormalFloat',             { fg: p.text,    bg: p.bg2 })}
${hi('NormalNC',                { fg: p.muted,   bg: p.bg })}
${hi('ColorColumn',             {                bg: p.bg3 })}
${hi('Cursor',                  { fg: p.bg,      bg: p.text })}
${hi('CursorLine',              {                bg: p.bg2 })}
${hi('CursorLineNr',            { fg: p.text,              gui: 'bold' })}
${hi('LineNr',                  { fg: p.comment })}
${hi('SignColumn',              {                bg: 'NONE' })}
${hi('FoldColumn',              { fg: p.comment, bg: 'NONE' })}
${hi('Folded',                  { fg: p.muted,   bg: p.bg2 })}
${hi('VertSplit',               { fg: p.border })}
${hi('WinSeparator',            { fg: p.border })}
${hi('EndOfBuffer',             { fg: p.border })}
${hi('StatusLine',              { fg: p.text,    bg: p.bg2 })}
${hi('StatusLineNC',            { fg: p.comment, bg: p.bg2 })}
${hi('TabLine',                 { fg: p.comment, bg: p.bg2 })}
${hi('TabLineFill',             {                bg: p.bg })}
${hi('TabLineSel',              { fg: p.text,    bg: p.bg3 })}
${hi('Pmenu',                   { fg: p.text,    bg: p.bg2 })}
${hi('PmenuSel',                { fg: p.bg,      bg: p.blue })}
${hi('PmenuSbar',               {                bg: p.bg3 })}
${hi('PmenuThumb',              {                bg: p.comment })}
${hi('Visual',                  {                bg: p.bg3 })}
${hi('Search',                  { fg: p.bg,      bg: p.yellow })}
${hi('IncSearch',               { fg: p.bg,      bg: p.orange })}
${hi('Substitute',              { fg: p.bg,      bg: p.red })}
${hi('MatchParen',              { fg: p.orange,            gui: 'bold,underline' })}
${hi('DiagnosticError',         { fg: p.red })}
${hi('DiagnosticWarn',          { fg: p.yellow })}
${hi('DiagnosticInfo',          { fg: p.blue })}
${hi('DiagnosticHint',          { fg: p.cyan })}
${hi('DiagnosticUnderlineError',{                          gui: 'underline', sp: p.red })}
${hi('DiagnosticUnderlineWarn', {                          gui: 'underline', sp: p.yellow })}
${hi('DiagnosticUnderlineInfo', {                          gui: 'underline', sp: p.blue })}
${hi('DiagnosticUnderlineHint', {                          gui: 'underline', sp: p.cyan })}
${hi('DiffAdd',                 { fg: p.green })}
${hi('DiffChange',              { fg: p.yellow })}
${hi('DiffDelete',              { fg: p.red })}
${hi('DiffText',                { fg: p.yellow,            gui: 'bold' })}

" ── Syntax ───────────────────────────────────────────────────────
${hi('Comment',                 { fg: p.comment,           gui: 'italic' })}
${hi('Constant',                { fg: p.orange })}
${hi('String',                  { fg: p.green })}
${hi('Number',                  { fg: p.orange })}
${hi('Boolean',                 { fg: p.orange })}
${hi('Identifier',              { fg: p.text })}
${hi('Function',                { fg: p.blue })}
${hi('Statement',               { fg: p.purple })}
${hi('Keyword',                 { fg: p.purple })}
${hi('Operator',                { fg: p.cyan })}
${hi('PreProc',                 { fg: p.cyan })}
${hi('Type',                    { fg: p.yellow })}
${hi('Special',                 { fg: p.cyan })}
${hi('Underlined',              { fg: p.blue,              gui: 'underline' })}
${hi('Error',                   { fg: p.red })}
${hi('Todo',                    { fg: p.yellow, bg: p.bg2, gui: 'bold' })}
${hi('Title',                   { fg: p.blue,              gui: 'bold' })}

" ── Treesitter ───────────────────────────────────────────────────
hi! link @comment         Comment
hi! link @variable        Identifier
hi! link @string          String
hi! link @number          Number
hi! link @boolean         Boolean
hi! link @keyword         Keyword
hi! link @operator        Operator
hi! link @function        Function
hi! link @function.call   Function
hi! link @method          Function
hi! link @constructor     Function
hi! link @type            Type
hi! link @constant        Constant
hi! link @property        Identifier
hi! link @attribute       PreProc
hi! link @tag             Tag
hi! link @markup.heading  Title
hi! link @markup.bold     Bold
hi! link @markup.italic   Italic
hi! link @markup.raw      String
hi! link @diff.plus       DiffAdd
hi! link @diff.minus      DiffDelete
hi! link @diff.delta      DiffChange

" ── LSP ──────────────────────────────────────────────────────────
hi! link LspReferenceText  Visual
hi! link LspReferenceWrite Visual
hi! link LspReferenceRead  Visual
hi! link LspInlayHint      Comment`;
}

// ── tmux conf ─────────────────────────────────────────────────────

function buildTmux(colors, name) {
  const { n, at, idx } = _palette(colors);
  const sn = name || 'My Scheme';

  return `# ${sn} — tmux color scheme
# Generated by My Scheme
# Source with: tmux source-file path/to/this.conf

# Status bar
set -g status-style          "bg=${idx(0)},fg=${at(0.42)}"
set -g status-left           "#[bg=${at(0.60)},fg=${idx(0)},bold] #S #[bg=${idx(0)},fg=${at(0.60)}]"
set -g status-right          "#[fg=${at(0.35)}] %H:%M  %d %b "
set -g status-left-length    24
set -g status-right-length   24

# Window tabs
setw -g window-status-style          "fg=${at(0.35)}"
setw -g window-status-current-style  "fg=${idx(n-1)},bold"
setw -g window-status-format         " #I #W "
setw -g window-status-current-format "#[bg=${idx(Math.min(2, n-1))}] #I #W "

# Pane borders
set -g pane-border-style        "fg=${at(0.22)}"
set -g pane-active-border-style "fg=${at(0.60)}"

# Message / command prompt
set -g message-style         "bg=${at(0.60)},fg=${idx(0)}"
set -g message-command-style "bg=${idx(Math.min(2, n-1))},fg=${idx(n-1)}"

# Selection / copy mode
set -g mode-style "bg=${idx(Math.min(2, n-1))},fg=${idx(n-1)}"

# Misc
set -g display-panes-colour        "${at(0.35)}"
set -g display-panes-active-colour "${at(0.60)}"
set -g clock-mode-colour           "${at(0.60)}"`;
}

// Parse user-typed value back to hex (supports hex, hex without #, rgb())
function parseToHex(val) {
  val = val.trim();
  if (/^#[0-9a-f]{6}$/i.test(val)) return val.toLowerCase();
  if (/^[0-9a-f]{6}$/i.test(val))  return '#' + val.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(val)) {
    const [,a,b,c] = val; return `#${a}${a}${b}${b}${c}${c}`.toLowerCase();
  }
  const m = val.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (m) return '#' + [m[1],m[2],m[3]].map(v => (+v).toString(16).padStart(2,'0')).join('');
  return null;
}
