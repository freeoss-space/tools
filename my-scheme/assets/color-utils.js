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
