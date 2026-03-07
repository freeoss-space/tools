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
      case b: h = ((r - g) / d + 4) / 6; break;
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
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
  const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const bv = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;
  const C = Math.sqrt(a * a + bv * bv);
  let H = Math.atan2(bv, a) * 180 / Math.PI;
  if (H < 0) H += 360;
  return { L: Math.round(L * 1000) / 1000, C: Math.round(C * 1000) / 1000, H: Math.round(H * 10) / 10 };
}

function formatColor(hex, fmt) {
  if (fmt === 'hex') return hex;
  const { r, g, b } = hexToRgb(hex);
  if (fmt === 'rgb') return `rgb(${r}, ${g}, ${b})`;
  if (fmt === 'hsl') {
    const { h, s, l } = rgbToHsl(r, g, b);
    return `hsl(${h}, ${s}%, ${l}%)`;
  }
  if (fmt === 'oklch') {
    const { L, C, H } = hexToOklch(hex);
    return `oklch(${L} ${C} ${H})`;
  }
  return hex;
}

function buildCssVariables(theme, fmt) {
  const lines = theme.colors.map(c => {
    const name = c.name.toLowerCase().replace(/\s+/g, '-');
    return `  --color-${name}: ${formatColor(c.hex, fmt)};`;
  });
  return `:root {\n${lines.join('\n')}\n}`;
}
