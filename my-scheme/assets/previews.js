// ── Editor ────────────────────────────────────────────────────────
// Adapted from which-scheme's preview.js — code token rectangles

function previewEditor(p) {
  const W = 600, H = 375;
  const TB = 34, SB = 44, LN = 38;
  const cx = SB + LN, lh = 22, sy = TB + 14;

  const lines = [
    { i: 0,  t: [{w:44,c:'kw'},{w:8,c:'tx'},{w:54,c:'fn'},{w:8,c:'tx'},{w:36,c:'ty'},{w:6,c:'tx'},{w:40,c:'ty'},{w:6,c:'op'}] },
    { i: 16, t: [{w:10,c:'cm'},{w:48,c:'cm'},{w:50,c:'cm'}] },
    { i: 16, t: [{w:36,c:'kw'},{w:6,c:'tx'},{w:42,c:'tx'},{w:6,c:'op'},{w:68,c:'st'},{w:6,c:'op'}] },
    { i: 16, t: [{w:50,c:'kw'},{w:6,c:'tx'},{w:36,c:'tx'},{w:6,c:'op'}] },
    { i: 0,  t: [{w:6,c:'tx'}] },
    null,
    { i: 0,  t: [{w:36,c:'kw'},{w:6,c:'tx'},{w:50,c:'fn'},{w:6,c:'tx'},{w:6,c:'tx'},{w:6,c:'op'}] },
    { i: 16, t: [{w:36,c:'kw'},{w:6,c:'tx'},{w:6,c:'op'},{w:28,c:'nu'},{w:6,c:'op'},{w:36,c:'tx'},{w:6,c:'op'},{w:28,c:'nu'},{w:6,c:'op'}] },
    { i: 32, t: [{w:50,c:'kw'},{w:6,c:'tx'},{w:54,c:'st'},{w:6,c:'op'}] },
    { i: 16, t: [{w:6,c:'tx'}] },
    { i: 0,  t: [{w:6,c:'tx'}] },
    null,
    { i: 0,  t: [{w:50,c:'kw'},{w:6,c:'tx'},{w:44,c:'fn'},{w:6,c:'tx'},{w:6,c:'tx'},{w:6,c:'op'}] },
    { i: 16, t: [{w:50,c:'ty'},{w:6,c:'tx'},{w:60,c:'fn'},{w:6,c:'tx'},{w:6,c:'tx'}] },
    { i: 0,  t: [{w:6,c:'tx'}] },
  ];

  const cm = { kw:p.keyword, fn:p.func, st:p.string, nu:p.number, op:p.operator, ty:p.type, cm:p.comment, tx:p.text };

  let rects = '', nums = '';
  lines.forEach((ln, i) => {
    nums += `<text x="${SB+LN-6}" y="${sy+i*lh+14}" text-anchor="end" fill="${p.comment}" font-family="monospace" font-size="10.5" opacity="0.65">${i+1}</text>`;
    if (!ln) return;
    let x = cx + ln.i;
    ln.t.forEach(t => {
      rects += `<rect x="${x}" y="${sy+i*lh+5}" width="${t.w}" height="10" rx="2" fill="${cm[t.c]||p.text}" opacity="0.88"/>`;
      x += t.w + 5;
    });
  });

  const icons = [0,1,2,3,4].map(i => `
    <rect x="12" y="${TB+18+i*28}" width="20" height="3" rx="1.5" fill="${p.comment}" opacity="0.3"/>
    <rect x="12" y="${TB+23+i*28}" width="13" height="2.5" rx="1.25" fill="${p.comment}" opacity="0.18"/>
  `).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${p.bg}"/>
    <rect width="${W}" height="${TB}" fill="${p.bg2}"/>
    <circle cx="18" cy="17" r="5.5" fill="#ff5f57"/>
    <circle cx="34" cy="17" r="5.5" fill="#febc2e"/>
    <circle cx="50" cy="17" r="5.5" fill="#28c840"/>
    <text x="${W/2}" y="22" text-anchor="middle" fill="${p.comment}" font-family="sans-serif" font-size="12" opacity="0.7">main.ts — editor</text>
    <rect x="0" y="${TB}" width="${SB}" height="${H-TB}" fill="${p.bg2}" opacity="0.85"/>
    ${icons}
    <rect x="${SB}" y="${TB}" width="${LN}" height="${H-TB}" fill="${p.bg}" opacity="0.2"/>
    <rect x="${SB}" y="${sy+2*lh-3}" width="${W-SB}" height="${lh}" fill="${p.highlight}" opacity="0.5"/>
    ${nums}
    ${rects}
    <rect x="${cx+6}" y="${sy+3*lh+4}" width="2" height="13" fill="${p.text}" opacity="0.75"/>
    <rect x="0" y="${H-20}" width="${W}" height="20" fill="${p.bg2}"/>
    <rect x="8" y="${H-14}" width="44" height="7" rx="2" fill="${p.blue}" opacity="0.45"/>
    <rect x="60" y="${H-14}" width="36" height="7" rx="2" fill="${p.comment}" opacity="0.35"/>
    <rect x="${W-110}" y="${H-14}" width="100" height="7" rx="2" fill="${p.comment}" opacity="0.3"/>
  </svg>`;
}

// ── Terminal ──────────────────────────────────────────────────────
// PS1: user @ hostname ~/myfolder [main]*
//      >

function previewTerminal(p, colors) {
  const W = 600, H = 375;
  const e = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  // Monospace text at given size, ≈6.5px/char at size 11
  const m = (x, y, fill, text, size=11) =>
    `<text x="${x}" y="${y}" font-family="'SF Mono','Fira Code',monospace" font-size="${size}" fill="${fill}">${e(text)}</text>`;

  // Approximate char width at a given font-size for position computation
  const cw = (size=11) => size * 0.605;

  // PS1 line: "user @ hostname ~/myfolder [main]*"
  // Returns SVG fragments; x advances per segment
  const ps1 = (baseY) => {
    const fs = 11;
    const segments = [
      ['user',        p.green],
      [' @ ',         p.muted],
      ['hostname',    p.blue],
      [' ~/myfolder', p.purple],
      [' [',          p.muted],
      ['main',        p.yellow],
      ['*',           p.red],
      [']',           p.muted],
    ];
    let out = '', x = 16;
    for (const [txt, col] of segments) {
      out += m(x, baseY, col, txt, fs);
      x += txt.length * cw(fs);
    }
    return out;
  };

  // Prompt: "> command"
  const prompt = (y, cmd) =>
    m(16, y, p.green, '>') + m(16 + cw(11) * 2, y, p.text, cmd);

  // Color swatch grid — shows every palette color
  const cols = 4;
  const colW = (W - 32) / cols;  // ~142px
  let swatches = '';
  let colorRows = 0;
  (colors || []).forEach((c, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    colorRows = row + 1;
    const sx = 16 + col * colW;
    const sy = row * 20;  // relative; caller adds base Y
    swatches += `SWATCH|${sx}|${sy}|${c.hex}|${e(c.name)}`;
  });

  // Compute y layout
  const TH = 34;      // titlebar height
  const lh = 16;      // line height
  let y = TH + 16;

  const yPS1a  = y;  y += lh;
  const yCmda  = y;  y += lh;
  const yLs0   = y;  y += lh;
  const yLs1   = y;  y += lh;
  const yLs2   = y;  y += lh;
  const yLs3   = y;  y += lh + 4;
  const yPS1b  = y;  y += lh;
  const yCmdb  = y;  y += lh + 8;
  const ySwBase = y; // swatches start here
  const nRows  = Math.ceil((colors||[]).length / cols);
  y += nRows * 20 + 8;
  const yPS1c  = y;  y += lh;
  const yCursor = y;

  // Build swatch SVG
  let swatchSvg = '';
  (colors || []).forEach((c, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const sx = 16 + col * colW;
    const sy = ySwBase + row * 20;
    swatchSvg += `<rect x="${sx}" y="${sy - 10}" width="14" height="11" rx="2" fill="${c.hex}" stroke="${p.border}" stroke-width="0.5" stroke-opacity="0.5"/>`;
    swatchSvg += m(sx + 18, sy, p.muted, c.name, 10);
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${p.bg}"/>
    <rect width="${W}" height="${TH}" fill="${p.bg2}"/>
    <circle cx="18" cy="17" r="5.5" fill="#ff5f57"/>
    <circle cx="34" cy="17" r="5.5" fill="#febc2e"/>
    <circle cx="50" cy="17" r="5.5" fill="#28c840"/>
    ${m(W/2, 22, p.muted, 'bash — terminal', 12)}

    ${ps1(yPS1a)}
    ${prompt(yCmda, 'ls --color=auto')}

    ${m(16, yLs0, p.blue,  'src/')}
    ${m(16, yLs1, p.text,  'package.json')}
    ${m(16, yLs2, p.green, 'build.sh*')}
    ${m(16, yLs3, p.text,  'README.md')}

    ${ps1(yPS1b)}
    ${prompt(yCmdb, 'theme --colors')}

    ${swatchSvg}

    ${ps1(yPS1c)}
    ${m(16, yCursor, p.green, '>')}
    <rect x="${16 + cw(11) * 2}" y="${yCursor - 11}" width="8" height="13" fill="${p.text}" opacity="0.75"/>
  </svg>`;
}

// ── Browser ───────────────────────────────────────────────────────

function previewBrowser(p) {
  const W = 600, H = 375;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${p.bg}"/>

    <!-- Tab bar -->
    <rect width="${W}" height="30" fill="${p.bg3}"/>
    <!-- Active tab: give it comfortable internal padding so close btn isn't cramped -->
    <rect x="0" y="4" width="178" height="26" rx="6" fill="${p.bg2}"/>
    <!-- Favicon -->
    <rect x="12" y="11" width="10" height="10" rx="2" fill="${p.blue}" opacity="0.7"/>
    <!-- Tab title -->
    <rect x="28" y="15" width="102" height="7" rx="2" fill="${p.subtext}" opacity="0.55"/>
    <!-- Close button: positioned with enough margin from right edge (178-22=18px from edge) -->
    <text x="150" y="22" font-family="sans-serif" font-size="10" fill="${p.muted}">✕</text>
    <!-- Inactive tab -->
    <rect x="184" y="8" width="118" height="20" rx="4" fill="${p.bg3}"/>
    <rect x="196" y="14" width="68" height="6" rx="2" fill="${p.muted}" opacity="0.4"/>
    <text x="290" y="22" font-family="sans-serif" font-size="10" fill="${p.muted}">✕</text>
    <!-- New tab -->
    <text x="310" y="21" font-family="sans-serif" font-size="16" fill="${p.muted}" opacity="0.5">+</text>

    <!-- Toolbar -->
    <rect width="${W}" height="34" y="30" fill="${p.bg2}"/>
    <text x="12" y="52" font-family="sans-serif" font-size="14" fill="${p.muted}">←</text>
    <text x="30" y="52" font-family="sans-serif" font-size="14" fill="${p.border}">→</text>
    <text x="50" y="52" font-family="sans-serif" font-size="13" fill="${p.muted}">↻</text>
    <rect x="68" y="35" width="416" height="22" rx="11" fill="${p.bg3}"/>
    <rect x="80" y="42" width="6" height="6" rx="1" fill="${p.green}" opacity="0.7"/>
    <text x="92" y="50" font-family="monospace" font-size="10" fill="${p.muted}">localhost:5173/my-scheme</text>
    <rect x="494" y="38" width="14" height="14" rx="3" fill="${p.border}" opacity="0.6"/>
    <rect x="514" y="38" width="14" height="14" rx="3" fill="${p.border}" opacity="0.6"/>
    <rect x="534" y="38" width="14" height="14" rx="3" fill="${p.border}" opacity="0.6"/>

    <!-- Bookmarks bar -->
    <rect width="${W}" height="22" y="64" fill="${p.bg2}" opacity="0.6"/>
    <rect x="10" y="70" width="50" height="9" rx="3" fill="${p.muted}" opacity="0.35"/>
    <rect x="68" y="70" width="66" height="9" rx="3" fill="${p.muted}" opacity="0.35"/>
    <rect x="142" y="70" width="44" height="9" rx="3" fill="${p.muted}" opacity="0.35"/>
    <rect x="194" y="70" width="76" height="9" rx="3" fill="${p.muted}" opacity="0.35"/>

    <!-- Site navbar -->
    <rect x="0" y="86" width="${W}" height="42" fill="${p.bg2}"/>
    <rect x="16" y="97" width="24" height="22" rx="5" fill="${p.blue}" opacity="0.7"/>
    <rect x="48" y="103" width="56" height="9" rx="2" fill="${p.text}" opacity="0.65"/>
    <rect x="178" y="105" width="38" height="8" rx="2" fill="${p.subtext}" opacity="0.45"/>
    <rect x="226" y="105" width="46" height="8" rx="2" fill="${p.subtext}" opacity="0.45"/>
    <rect x="282" y="105" width="42" height="8" rx="2" fill="${p.subtext}" opacity="0.45"/>
    <rect x="334" y="105" width="38" height="8" rx="2" fill="${p.subtext}" opacity="0.45"/>
    <!-- CTA button -->
    <rect x="494" y="97" width="90" height="26" rx="13" fill="${p.blue}"/>
    <rect x="512" y="106" width="54" height="8" rx="3" fill="${p.bg}" opacity="0.7"/>

    <!-- Hero section -->
    <rect x="0" y="128" width="${W}" height="102" fill="${p.bg}"/>
    <rect x="76" y="140" width="248" height="16" rx="4" fill="${p.text}" opacity="0.85"/>
    <rect x="76" y="162" width="192" height="14" rx="4" fill="${p.text}" opacity="0.52"/>
    <rect x="76" y="190" width="274" height="7" rx="2" fill="${p.muted}" opacity="0.55"/>
    <rect x="76" y="203" width="234" height="7" rx="2" fill="${p.muted}" opacity="0.42"/>
    <rect x="76" y="218" width="100" height="26" rx="13" fill="${p.blue}"/>
    <rect x="84" y="227" width="84" height="8" rx="3" fill="${p.bg}" opacity="0.7"/>
    <rect x="186" y="218" width="100" height="26" rx="13" fill="none" stroke="${p.border}" stroke-width="1.5"/>
    <rect x="194" y="227" width="84" height="8" rx="3" fill="${p.subtext}" opacity="0.4"/>
    <!-- Hero card -->
    <rect x="378" y="134" width="196" height="92" rx="8" fill="${p.bg2}"/>
    <rect x="378" y="134" width="196" height="36" rx="8" fill="${p.blue}" opacity="0.18"/>
    <rect x="378" y="152" width="196" height="18" fill="${p.blue}" opacity="0.07"/>
    <rect x="394" y="145" width="80" height="8" rx="2" fill="${p.blue}" opacity="0.5"/>
    <rect x="394" y="181" width="148" height="6" rx="2" fill="${p.muted}" opacity="0.35"/>
    <rect x="394" y="193" width="112" height="6" rx="2" fill="${p.muted}" opacity="0.28"/>
    <rect x="394" y="207" width="52" height="18" rx="5" fill="${p.purple}" opacity="0.5"/>
    <rect x="452" y="207" width="52" height="18" rx="5" fill="${p.border}" opacity="0.4"/>

    <!-- Cards row -->
    <rect x="0" y="230" width="${W}" height="145" fill="${p.bg3}" opacity="0.25"/>
    <rect x="16" y="240" width="120" height="8" rx="2" fill="${p.text}" opacity="0.45"/>
    <!-- Card 1 -->
    <rect x="16"  y="256" width="178" height="106" rx="8" fill="${p.bg2}"/>
    <rect x="16"  y="256" width="178" height="44"  rx="8" fill="${p.blue}"   opacity="0.22"/>
    <rect x="16"  y="278" width="178" height="22"        fill="${p.blue}"   opacity="0.08"/>
    <rect x="28"  y="312" width="84"  height="7"   rx="2" fill="${p.text}"   opacity="0.55"/>
    <rect x="28"  y="324" width="116" height="6"   rx="2" fill="${p.muted}"  opacity="0.38"/>
    <rect x="28"  y="340" width="62"  height="16"  rx="8" fill="${p.blue}"   opacity="0.65"/>
    <!-- Card 2 -->
    <rect x="212" y="256" width="178" height="106" rx="8" fill="${p.bg2}"/>
    <rect x="212" y="256" width="178" height="44"  rx="8" fill="${p.purple}" opacity="0.2"/>
    <rect x="212" y="278" width="178" height="22"        fill="${p.purple}" opacity="0.07"/>
    <rect x="224" y="312" width="84"  height="7"   rx="2" fill="${p.text}"   opacity="0.55"/>
    <rect x="224" y="324" width="116" height="6"   rx="2" fill="${p.muted}"  opacity="0.38"/>
    <rect x="224" y="340" width="62"  height="16"  rx="8" fill="${p.purple}" opacity="0.65"/>
    <!-- Card 3 -->
    <rect x="408" y="256" width="176" height="106" rx="8" fill="${p.bg2}"/>
    <rect x="408" y="256" width="176" height="44"  rx="8" fill="${p.green}"  opacity="0.16"/>
    <rect x="408" y="278" width="176" height="22"        fill="${p.green}"  opacity="0.06"/>
    <rect x="420" y="312" width="84"  height="7"   rx="2" fill="${p.text}"   opacity="0.55"/>
    <rect x="420" y="324" width="116" height="6"   rx="2" fill="${p.muted}"  opacity="0.38"/>
    <rect x="420" y="340" width="62"  height="16"  rx="8" fill="${p.green}"  opacity="0.65"/>
  </svg>`;
}

// ── HTML Components ───────────────────────────────────────────────
// Returns a full HTML document string — rendered in an <iframe>.

function previewHtml(p) {
  // rgba helper for tinted backgrounds/shadows
  const rgba = (hex, a) => {
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);
    return `rgba(${r},${g},${b},${a})`;
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: ${p.bg};
  color: ${p.text};
  font-size: 12px;
  line-height: 1.5;
  padding: 14px 16px;
  overflow: hidden;
  height: 100vh;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 20px;
}

section { margin-bottom: 13px; }

.section-label {
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: ${p.muted};
  margin-bottom: 7px;
  padding-bottom: 5px;
  border-bottom: 1px solid ${p.border};
}

/* ── Typography ── */
h1 { font-size: 20px; font-weight: 700; color: ${p.text}; line-height: 1.2; margin-bottom: 3px; }
h2 { font-size: 14px; font-weight: 600; color: ${p.subtext}; margin-bottom: 3px; }
h3 { font-size: 12px; font-weight: 600; color: ${p.muted}; margin-bottom: 5px; }
p  { font-size: 11.5px; color: ${p.text}; opacity: 0.78; margin-bottom: 7px; }
strong { font-weight: 700; }
em     { font-style: italic; color: ${p.subtext}; }
a      { color: ${p.blue}; text-decoration: none; }
a:hover { text-decoration: underline; }
code {
  background: ${p.bg2};
  padding: 1px 5px;
  border-radius: 3px;
  font-family: "SF Mono", "Fira Code", monospace;
  font-size: 10.5px;
  color: ${p.cyan};
  border: 1px solid ${p.border};
}

/* ── Inputs ── */
.form-group { margin-bottom: 8px; }
label { font-size: 10.5px; color: ${p.subtext}; display: block; margin-bottom: 3px; }
input[type="text"], input[type="email"], textarea, select {
  width: 100%;
  background: ${p.bg2};
  border: 1px solid ${p.border};
  border-radius: 5px;
  color: ${p.text};
  padding: 5px 9px;
  font-size: 11.5px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
input:focus, textarea:focus, select:focus {
  border-color: ${p.blue};
  box-shadow: 0 0 0 2.5px ${rgba(p.blue, 0.22)};
}
textarea { resize: none; height: 50px; }
.input-row { display: flex; gap: 6px; }
.input-row > * { flex: 1; }

.check-row { display: flex; gap: 14px; margin-top: 2px; }
.check { display: flex; align-items: center; gap: 5px; font-size: 11px; color: ${p.subtext}; cursor: pointer; }
input[type="checkbox"], input[type="radio"] { accent-color: ${p.blue}; width: 13px; height: 13px; cursor: pointer; }

/* ── Buttons ── */
.btn-row { display: flex; flex-wrap: wrap; gap: 5px; }
.btn {
  padding: 5px 11px;
  border-radius: 5px;
  font-size: 11.5px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  font-family: inherit;
  line-height: 1.4;
  transition: opacity 0.15s, box-shadow 0.15s;
}
.btn:hover { opacity: 0.88; }
.btn:active { opacity: 0.75; }
.btn.primary   { background: ${p.blue};   color: ${p.bg}; }
.btn.secondary { background: ${p.purple}; color: ${p.bg}; }
.btn.success   { background: ${p.green};  color: ${p.bg}; }
.btn.outline   { background: transparent; border-color: ${p.blue}; color: ${p.blue}; }
.btn.ghost     { background: ${p.bg2}; color: ${p.subtext}; border-color: ${p.border}; }
.btn.danger    { background: ${p.red};    color: ${p.bg}; }
.btn-sm        { padding: 3px 9px; font-size: 10.5px; }

/* ── Badges ── */
.badge-row { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; }
.badge {
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 10.5px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.badge.blue   { background: ${rgba(p.blue,   0.18)}; color: ${p.blue};   }
.badge.green  { background: ${rgba(p.green,  0.18)}; color: ${p.green};  }
.badge.red    { background: ${rgba(p.red,    0.18)}; color: ${p.red};    }
.badge.yellow { background: ${rgba(p.yellow, 0.18)}; color: ${p.yellow}; }
.badge.purple { background: ${rgba(p.purple, 0.18)}; color: ${p.purple}; }
.badge.orange { background: ${rgba(p.orange, 0.18)}; color: ${p.orange}; }

/* ── Alerts ── */
.alert {
  padding: 7px 10px;
  border-radius: 5px;
  font-size: 11px;
  margin-bottom: 5px;
  border-left: 3px solid;
  display: flex;
  align-items: flex-start;
  gap: 7px;
}
.alert .icon { flex-shrink: 0; margin-top: 1px; }
.alert.info    { background: ${rgba(p.blue,  0.1)}; border-color: ${p.blue};  color: ${p.text}; }
.alert.success { background: ${rgba(p.green, 0.1)}; border-color: ${p.green}; color: ${p.text}; }
.alert.warning { background: ${rgba(p.yellow,0.1)}; border-color: ${p.yellow};color: ${p.text}; }
.alert.error   { background: ${rgba(p.red,   0.1)}; border-color: ${p.red};   color: ${p.text}; }

/* ── Card ── */
.card {
  background: ${p.bg2};
  border: 1px solid ${p.border};
  border-radius: 8px;
  overflow: hidden;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 12px;
  border-bottom: 1px solid ${p.border};
  background: ${rgba(p.blue, 0.05)};
}
.card-title { font-size: 12px; font-weight: 600; }
.card-body  { padding: 9px 12px; font-size: 11px; color: ${p.subtext}; }
.card-footer {
  display: flex;
  gap: 6px;
  padding: 7px 12px;
  border-top: 1px solid ${p.border};
  background: ${rgba(p.bg3, 0.5)};
}

/* ── Progress ── */
.progress-wrap { margin-bottom: 7px; }
.progress-label { display: flex; justify-content: space-between; font-size: 10.5px; color: ${p.subtext}; margin-bottom: 4px; }
.progress-bar { height: 6px; background: ${p.bg3}; border-radius: 3px; overflow: hidden; }
.progress-fill { height: 100%; border-radius: 3px; transition: width 0.3s; }

/* ── Toggle ── */
.toggle-row { display: flex; flex-direction: column; gap: 6px; }
.toggle { display: flex; align-items: center; gap: 8px; font-size: 11px; color: ${p.subtext}; cursor: pointer; }
.toggle-switch {
  width: 32px; height: 17px;
  background: ${p.border};
  border-radius: 10px;
  position: relative;
  flex-shrink: 0;
  transition: background 0.2s;
}
.toggle-switch::after {
  content: '';
  position: absolute;
  top: 2px; left: 2px;
  width: 13px; height: 13px;
  background: ${p.subtext};
  border-radius: 50%;
  transition: left 0.2s, background 0.2s;
}
.toggle.on .toggle-switch { background: ${p.blue}; }
.toggle.on .toggle-switch::after { left: 17px; background: ${p.bg}; }
</style>
</head>
<body>
<div class="grid">

  <!-- Left column -->
  <div>
    <section>
      <div class="section-label">Typography</div>
      <h1>Display Title</h1>
      <h2>Section Heading</h2>
      <h3>Subsection label</h3>
      <p>Body text with <strong>bold emphasis</strong>, <em>italics</em>, and <a href="#">hyperlinks</a>. Also inline <code>code</code> for technical terms.</p>
    </section>

    <section>
      <div class="section-label">Inputs</div>
      <div class="form-group">
        <label>Email address</label>
        <input type="email" placeholder="user@example.com">
      </div>
      <div class="form-group">
        <label>Message <span style="color:${p.blue}">·</span> focused</label>
        <textarea style="border-color:${p.blue}; box-shadow: 0 0 0 2.5px ${rgba(p.blue,0.22)}">Hello from My Scheme!</textarea>
      </div>
      <div class="check-row">
        <label class="check"><input type="checkbox" checked> Remember me</label>
        <label class="check"><input type="checkbox"> Newsletter</label>
        <label class="check"><input type="radio" name="r" checked> Option A</label>
        <label class="check"><input type="radio" name="r"> Option B</label>
      </div>
    </section>

    <section>
      <div class="section-label">Progress</div>
      <div class="progress-wrap">
        <div class="progress-label"><span>Storage used</span><span>68%</span></div>
        <div class="progress-bar"><div class="progress-fill" style="width:68%; background:${p.blue}"></div></div>
      </div>
      <div class="progress-wrap">
        <div class="progress-label"><span>CPU load</span><span>24%</span></div>
        <div class="progress-bar"><div class="progress-fill" style="width:24%; background:${p.green}"></div></div>
      </div>
      <div class="progress-wrap">
        <div class="progress-label"><span>Errors</span><span>5%</span></div>
        <div class="progress-bar"><div class="progress-fill" style="width:5%;  background:${p.red}"></div></div>
      </div>
    </section>
  </div>

  <!-- Right column -->
  <div>
    <section>
      <div class="section-label">Buttons</div>
      <div class="btn-row">
        <button class="btn primary">Primary</button>
        <button class="btn secondary">Secondary</button>
        <button class="btn success">Success</button>
        <button class="btn outline">Outline</button>
        <button class="btn ghost">Ghost</button>
        <button class="btn danger">Danger</button>
      </div>
    </section>

    <section>
      <div class="section-label">Badges</div>
      <div class="badge-row">
        <span class="badge blue">Info</span>
        <span class="badge green">Success</span>
        <span class="badge red">Error</span>
        <span class="badge yellow">Warning</span>
        <span class="badge purple">New</span>
        <span class="badge orange">Beta</span>
      </div>
    </section>

    <section>
      <div class="section-label">Alerts</div>
      <div class="alert info">   <span class="icon">ℹ</span> Your session expires in 15 minutes.</div>
      <div class="alert success"><span class="icon">✓</span> Theme exported successfully.</div>
      <div class="alert warning"><span class="icon">⚠</span> Some colors have low contrast.</div>
      <div class="alert error">  <span class="icon">✕</span> Failed to load palette file.</div>
    </section>

    <section>
      <div class="section-label">Card</div>
      <div class="card">
        <div class="card-header">
          <span class="card-title">Color Scheme</span>
          <span class="badge blue">v1.0</span>
        </div>
        <div class="card-body">
          A custom palette with ${'{n}'} colors. Preview across editor, terminal, browser, and more.
        </div>
        <div class="card-footer">
          <button class="btn primary btn-sm">Export</button>
          <button class="btn ghost btn-sm">Share</button>
        </div>
      </div>
    </section>

    <section>
      <div class="section-label">Toggles</div>
      <div class="toggle-row">
        <label class="toggle on">  <div class="toggle-switch"></div> Dark mode enabled</label>
        <label class="toggle">     <div class="toggle-switch"></div> Auto-contrast</label>
        <label class="toggle on">  <div class="toggle-switch"></div> Show hex values</label>
      </div>
    </section>
  </div>

</div>
</body>
</html>`;
}

// ── Obsidian ──────────────────────────────────────────────────────
// Shows a realistic Obsidian vault with actual rendered markdown content.

function previewObsidian(p) {
  const W = 600, H = 375;
  const e = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  // Text helpers
  const sans = (x, y, fill, content, size=11, extra='') =>
    `<text x="${x}" y="${y}" font-family="sans-serif" font-size="${size}" fill="${fill}" ${extra}>${e(content)}</text>`;
  const mono = (x, y, fill, content, size=10.5) =>
    `<text x="${x}" y="${y}" font-family="'SF Mono','Fira Code',monospace" font-size="${size}" fill="${fill}">${e(content)}</text>`;

  // Content area starts at x=206, y=62 (after ribbon + sidebar + tab bar + toolbar)
  const cx = 206;  // content left
  const cxEnd = W - 10; // content right (slight right padding)

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${p.bg}"/>

    <!-- ── Ribbon ── -->
    <rect width="34" height="${H}" fill="${p.bg3}" opacity="0.65"/>
    <!-- Vault icon (active) -->
    <rect x="9" y="16" width="16" height="16" rx="3" fill="${p.purple}" opacity="0.6"/>
    <rect x="9" y="40" width="16" height="16" rx="3" fill="${p.muted}" opacity="0.25"/>
    <rect x="9" y="64" width="16" height="16" rx="3" fill="${p.muted}" opacity="0.25"/>
    <rect x="9" y="88" width="16" height="16" rx="3" fill="${p.muted}" opacity="0.25"/>
    <rect x="9" y="${H-38}" width="16" height="16" rx="3" fill="${p.muted}" opacity="0.25"/>
    <rect x="9" y="${H-18}" width="16" height="16" rx="3" fill="${p.blue}" opacity="0.4"/>

    <!-- ── File explorer ── -->
    <rect x="34" y="0" width="156" height="${H}" fill="${p.bg2}" opacity="0.65"/>
    <!-- Explorer header -->
    <rect x="34" y="0" width="156" height="30" fill="${p.bg2}"/>
    ${sans(48, 20, p.text, 'My Vault', 12, 'font-weight="600"')}
    <text x="172" y="20" font-family="sans-serif" font-size="14" fill="${p.muted}" opacity="0.5">+</text>
    <!-- Search box -->
    <rect x="42" y="36" width="140" height="18" rx="4" fill="${p.bg3}" opacity="0.7"/>
    <text x="54" y="49" font-family="sans-serif" font-size="10" fill="${p.muted}" opacity="0.45">🔍 Search...</text>
    <!-- File tree -->
    ${sans(46, 74, p.subtext, '▾ Notes', 10)}
    <rect x="54" y="80" width="1" height="68" fill="${p.border}" opacity="0.5"/>
    <!-- Active file row -->
    <rect x="56" y="80" width="126" height="17" rx="3" fill="${p.blue}" opacity="0.14"/>
    ${sans(66, 92, p.blue, '📝 Color Theory', 10)}
    ${sans(66, 109, p.muted, '   Getting Started', 10)}
    ${sans(66, 126, p.muted, '   Daily Notes', 10)}
    ${sans(66, 143, p.muted, '   Ideas', 10)}
    ${sans(46, 160, p.subtext, '▸ Projects', 10)}
    ${sans(46, 177, p.subtext, '▸ Resources', 10)}
    ${sans(46, 194, p.subtext, '▸ Templates', 10)}

    <!-- Tags panel header -->
    <rect x="34" y="${H-60}" width="156" height="1" fill="${p.border}" opacity="0.4"/>
    ${sans(46, H-46, p.muted, 'Tags', 10, 'font-weight="600"')}
    <rect x="46"  y="${H-38}" width="34" height="12" rx="6" fill="${p.purple}" opacity="0.2"/>
    <rect x="50"  y="${H-34}" width="26" height="4"  rx="2" fill="${p.purple}" opacity="0.6"/>
    <rect x="86"  y="${H-38}" width="28" height="12" rx="6" fill="${p.blue}"   opacity="0.2"/>
    <rect x="90"  y="${H-34}" width="20" height="4"  rx="2" fill="${p.blue}"   opacity="0.6"/>
    <rect x="120" y="${H-38}" width="38" height="12" rx="6" fill="${p.green}"  opacity="0.2"/>
    <rect x="124" y="${H-34}" width="30" height="4"  rx="2" fill="${p.green}"  opacity="0.6"/>

    <!-- ── Editor pane ── -->
    <rect x="190" y="0" width="${W-190}" height="${H}" fill="${p.bg}"/>

    <!-- Tab bar -->
    <rect x="190" y="0" width="${W-190}" height="30" fill="${p.bg2}"/>
    <!-- Active tab -->
    <rect x="190" y="0" width="152" height="30" fill="${p.bg}"/>
    <rect x="196" y="9" width="10" height="10" rx="2" fill="${p.blue}" opacity="0.5"/>
    ${sans(212, 20, p.text, 'Color Theory', 11)}
    <text x="329" y="21" font-family="sans-serif" font-size="9" fill="${p.muted}">✕</text>
    <!-- Inactive tab -->
    <rect x="344" y="6" width="110" height="20" rx="4" fill="${p.bg2}"/>
    ${sans(358, 20, p.muted, 'Getting Started', 10)}

    <!-- Toolbar row -->
    <rect x="190" y="30" width="${W-190}" height="24" fill="${p.bg2}" opacity="0.45"/>
    <rect x="198" y="38" width="8" height="8" rx="1.5" fill="${p.muted}" opacity="0.3"/>
    <rect x="212" y="39" width="7" height="6" rx="1"   fill="${p.muted}" opacity="0.3"/>
    <rect x="224" y="39" width="7" height="6" rx="1"   fill="${p.muted}" opacity="0.3"/>
    <rect x="236" y="39" width="7" height="6" rx="1"   fill="${p.muted}" opacity="0.3"/>
    <line x1="252" y1="31" x2="252" y2="52" stroke="${p.border}" stroke-width="1" opacity="0.5"/>
    <rect x="258" y="39" width="7" height="6" rx="1"   fill="${p.muted}" opacity="0.3"/>
    <rect x="270" y="39" width="7" height="6" rx="1"   fill="${p.muted}" opacity="0.3"/>
    <rect x="282" y="39" width="7" height="6" rx="1"   fill="${p.muted}" opacity="0.3"/>
    <!-- Reading time -->
    ${sans(W-16, 42, p.muted, '3 min read', 9, 'text-anchor="end"')}

    <!-- ────────── Markdown content ────────── -->

    <!-- H1: "Color Theory Guide" -->
    ${sans(cx, 82, p.blue, 'Color Theory Guide', 17, 'font-weight="700"')}
    <!-- H1 underline decoration -->
    <line x1="${cx}" y1="88" x2="${cx+210}" y2="88" stroke="${p.blue}" stroke-width="1.5" opacity="0.25"/>

    <!-- Body paragraph — line 1 -->
    <text x="${cx}" y="107" font-family="sans-serif" font-size="12" fill="${p.text}" opacity="0.8">A <tspan font-weight="700">color scheme</tspan> defines the visual <tspan font-style="italic">language</tspan> of your workspace.</text>
    <!-- Body paragraph — line 2 -->
    <text x="${cx}" y="123" font-family="sans-serif" font-size="12" fill="${p.text}" opacity="0.72">It shapes focus, mood, and <tspan fill="${p.blue}">readability</tspan> across all tools.</text>

    <!-- H2: "Palette Structure" -->
    ${sans(cx, 147, p.purple, 'Palette Structure', 13, 'font-weight="700"')}

    <!-- Task list — unchecked -->
    <rect x="${cx}"   y="160" width="10" height="10" rx="2" fill="none" stroke="${p.border}" stroke-width="1.5"/>
    <text x="${cx+16}" y="170" font-family="sans-serif" font-size="11.5" fill="${p.text}" opacity="0.75">Define base background colors</text>
    <!-- Task list — checked -->
    <rect x="${cx}"   y="177" width="10" height="10" rx="2" fill="${p.green}" opacity="0.85"/>
    <text x="${cx+3}" y="186" font-family="sans-serif" font-size="9" fill="${p.bg}" font-weight="700">✓</text>
    <text x="${cx+16}" y="187" font-family="sans-serif" font-size="11.5" fill="${p.muted}" text-decoration="line-through">Configure accent palette</text>
    <!-- Task list — unchecked -->
    <rect x="${cx}"   y="194" width="10" height="10" rx="2" fill="none" stroke="${p.border}" stroke-width="1.5"/>
    <text x="${cx+16}" y="204" font-family="sans-serif" font-size="11.5" fill="${p.text}" opacity="0.75">Export as CSS variables</text>

    <!-- Blockquote -->
    <rect x="${cx}" y="216" width="3" height="32" rx="1.5" fill="${p.cyan}" opacity="0.6"/>
    <text x="${cx+12}" y="229" font-family="sans-serif" font-size="11.5" fill="${p.subtext}" font-style="italic">Well-designed schemes reduce eye strain</text>
    <text x="${cx+12}" y="244" font-family="sans-serif" font-size="11.5" fill="${p.subtext}" font-style="italic">during long creative sessions.</text>

    <!-- H2: "Code Sample" -->
    ${sans(cx, 268, p.purple, 'Code Sample', 13, 'font-weight="700"')}

    <!-- Code block -->
    <rect x="${cx}" y="274" width="${cxEnd - cx}" height="58" rx="5" fill="${p.bg2}"/>
    <rect x="${cx}" y="274" width="${cxEnd - cx}" height="18" rx="5" fill="${p.bg3}"/>
    <rect x="${cx}" y="281" width="${cxEnd - cx}" height="11" fill="${p.bg3}"/>
    ${sans(cx+8, 287, p.muted, 'javascript', 9)}

    ${mono(cx+10, 307, p.keyword,  'const')}
    ${mono(cx+44, 307, p.text,     ' scheme')}
    ${mono(cx+90, 307, p.operator, ' =')}
    ${mono(cx+103,307, p.text,     ' {')}
    ${mono(cx+10, 322, p.muted,   '  // bg')}
    ${mono(cx+50, 322, p.string,   '"#1e1e2e"')}

    <!-- Tags / wikilinks at bottom -->
    ${sans(cx, H-12, p.muted, 'Related:', 10)}
    <rect x="${cx+50}" y="${H-22}" width="82" height="13" rx="6" fill="${p.blue}" opacity="0.14"/>
    ${sans(cx+58, H-12, p.blue, '[[Dark Themes]]', 10)}
    <rect x="${cx+140}" y="${H-22}" width="68" height="13" rx="6" fill="${p.purple}" opacity="0.14"/>
    ${sans(cx+148, H-12, p.purple, '[[Catppuccin]]', 10)}
    ${sans(cx+218, H-12, p.muted, '#design', 10)}
    ${sans(cx+265, H-12, p.muted, '#tools', 10)}

    <!-- Status bar -->
    <rect x="190" y="${H-16}" width="${W-190}" height="16" fill="${p.bg2}"/>
    ${sans(200, H-5, p.muted, 'Editing', 9)}
    ${sans(240, H-5, p.muted, '·  Ln 28, Col 1', 9)}
    ${sans(W-10, H-5, p.blue, 'Markdown', 9, 'text-anchor="end"')}
  </svg>`;
}

// ── UI Showcase ───────────────────────────────────────────────────
// Semantic token panels (light & dark) + two UI component previews,
// matching the AquaDrive color system reference design.

function previewUi(p, colors) {
  // rgba helper
  const rgba = (hex, a) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  };

  // Re-sort the palette by luminance so we can derive positional tokens
  const sorted = [...colors].sort((a, b) => relativeLuminance(a.hex) - relativeLuminance(b.hex));
  const n      = sorted.length;
  const at     = f => sorted[Math.min(Math.floor(f * n), n - 1)].hex;
  const idx    = i => sorted[Math.min(Math.max(0, i), n - 1)].hex;

  // Determine readable text color on a given background
  const onBg = hex => relativeLuminance(hex) > 0.18 ? idx(0) : idx(n - 1);

  const accent = at(0.60);  // primary interactive color

  // ── Dark-end semantic tokens ──────────────────────────────────────
  const dk = {
    bg:                 idx(0),
    surface:            idx(Math.min(1, n - 1)),
    border:             at(0.25),
    textPrimary:        idx(n - 1),
    textSecondary:      at(0.42),
    interactivePrimary: accent,
    interactiveHover:   at(0.70),
    interactiveSubtle:  rgba(accent, 0.20),
  };

  // ── Light-end semantic tokens (bright side of the palette) ────────
  const lt = {
    bg:                 idx(n - 1),
    surface:            idx(Math.max(0, n - 2)),
    border:             at(0.80),
    textPrimary:        idx(0),
    textSecondary:      at(0.45),
    interactivePrimary: accent,
    interactiveHover:   at(0.52),
    interactiveSubtle:  rgba(accent, 0.12),
  };

  // ── Semantic status colors ────────────────────────────────────────
  const errBg  = rgba(p.red,    0.12);
  const warnBg = rgba(p.yellow, 0.13);
  const succBg = rgba(p.green,  0.13);
  const errDk  = rgba(p.red,    0.20);
  const warnDk = rgba(p.yellow, 0.16);
  const succDk = rgba(p.green,  0.15);

  // Token row: round swatch + name + value
  const tok = (dot, name, val, textCol, dotBorder = 'rgba(0,0,0,0.07)') => `
    <div style="display:flex;align-items:center;gap:12px;padding:7px 10px;border-radius:9px;">
      <div style="width:28px;height:28px;border-radius:7px;flex-shrink:0;background:${dot};border:1px solid ${dotBorder};"></div>
      <span style="font-size:11.5px;font-weight:600;flex:1;font-family:'DM Mono',monospace;color:${textCol};">${name}</span>
      <span style="font-family:'DM Mono',monospace;font-size:10px;opacity:.45;color:${textCol};">${val}</span>
    </div>`;

  // Page uses the brightest palette color as its background
  const pageBg   = lt.bg;
  const labelCol = lt.textSecondary;
  const lineCol  = rgba(idx(0), 0.14);
  const ltBorder = rgba(idx(0), 0.11);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@400;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Syne',sans-serif;background:${pageBg};padding:22px 26px 30px;min-height:100vh;}
.sl{font-family:'DM Mono',monospace;font-size:9.5px;letter-spacing:.25em;text-transform:uppercase;color:${labelCol};margin-bottom:14px;display:flex;align-items:center;gap:10px;}
.sl::after{content:'';flex:1;height:1px;background:${lineCol};}
.s{margin-bottom:24px;}
.panels{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.panel{border-radius:18px;padding:20px 18px 12px;border:1px solid;}
.pt{font-size:13px;font-weight:700;margin-bottom:10px;}
.pbox{border-radius:18px;padding:20px 22px;border:1px solid;}
.ph{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;}
.pt2{font-size:18px;font-weight:700;}
.bdg{font-size:10px;font-family:'DM Mono',monospace;padding:4px 12px;border-radius:100px;font-weight:500;letter-spacing:.04em;}
.btns{display:flex;gap:9px;flex-wrap:wrap;margin-bottom:16px;}
.btn{font-family:'Syne',sans-serif;font-size:13px;font-weight:600;padding:9px 18px;border-radius:10px;border:none;cursor:default;}
.cg{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
.mc{border-radius:12px;padding:13px 15px;font-size:13px;font-weight:700;}
.ml{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:.12em;opacity:.7;margin-bottom:5px;font-weight:400;text-transform:uppercase;}
</style>
</head>
<body>

<!-- ── Semantic Tokens ── -->
<div class="s">
  <div class="sl">Semantic Tokens — Light &amp; Dark</div>
  <div class="panels">
    <div class="panel" style="background:${lt.surface};border-color:${ltBorder};">
      <div class="pt" style="color:${lt.textPrimary};">&#9728;&#65039; Light Theme</div>
      ${tok(lt.bg,                 'background',          lt.bg,                 lt.textPrimary, ltBorder)}
      ${tok(lt.surface,            'surface',             lt.surface,            lt.textPrimary, ltBorder)}
      ${tok(lt.border,             'border',              lt.border,             lt.textPrimary)}
      ${tok(lt.textPrimary,        'text.primary',        lt.textPrimary,        lt.textPrimary)}
      ${tok(lt.textSecondary,      'text.secondary',      lt.textSecondary,      lt.textPrimary)}
      ${tok(lt.interactivePrimary, 'interactive.primary', lt.interactivePrimary, lt.textPrimary)}
      ${tok(lt.interactiveHover,   'interactive.hover',   lt.interactiveHover,   lt.textPrimary)}
      ${tok(lt.interactiveSubtle,  'interactive.subtle',  lt.interactiveSubtle,  lt.textPrimary, ltBorder)}
    </div>
    <div class="panel" style="background:${dk.bg};border-color:${dk.border};">
      <div class="pt" style="color:${dk.textPrimary};">&#127769; Dark Theme</div>
      ${tok(dk.bg,                 'background',          dk.bg,                 dk.textPrimary, dk.border)}
      ${tok(dk.surface,            'surface',             dk.surface,            dk.textPrimary, dk.border)}
      ${tok(dk.border,             'border',              dk.border,             dk.textPrimary)}
      ${tok(dk.textPrimary,        'text.primary',        dk.textPrimary,        dk.textPrimary)}
      ${tok(dk.textSecondary,      'text.secondary',      dk.textSecondary,      dk.textPrimary)}
      ${tok(dk.interactivePrimary, 'interactive.primary', dk.interactivePrimary, dk.textPrimary)}
      ${tok(dk.interactiveHover,   'interactive.hover',   dk.interactiveHover,   dk.textPrimary)}
      ${tok(dk.interactiveSubtle,  'interactive.subtle',  dk.interactiveSubtle,  dk.textPrimary)}
    </div>
  </div>
</div>

<!-- ── UI Preview Light ── -->
<div class="s">
  <div class="sl">UI Preview — Light</div>
  <div class="pbox" style="background:${lt.surface};border-color:${ltBorder};">
    <div class="ph">
      <div class="pt2" style="color:${lt.textPrimary};">Schedule a Wash</div>
      <span class="bdg" style="background:${succBg};color:${p.green};">&#11044; Confirmed</span>
    </div>
    <div class="btns">
      <button class="btn" style="background:${lt.interactivePrimary};color:${onBg(lt.interactivePrimary)};">Book Now</button>
      <button class="btn" style="background:${rgba(accent, 0.12)};color:${lt.interactiveHover};">View History</button>
      <button class="btn" style="background:${lt.bg};color:${lt.textSecondary};border:1px solid ${rgba(idx(0), 0.14)};">Cancel</button>
    </div>
    <div class="cg">
      <div class="mc" style="background:${errBg};color:${p.red};">
        <div class="ml" style="color:${p.red};">Payment</div>&#10005; Declined
      </div>
      <div class="mc" style="background:${warnBg};color:${p.yellow};">
        <div class="ml" style="color:${p.yellow};">Status</div>&#8987; In Progress
      </div>
      <div class="mc" style="background:${succBg};color:${p.green};">
        <div class="ml" style="color:${p.green};">Wash</div>&#10003; Complete
      </div>
    </div>
  </div>
</div>

<!-- ── UI Preview Dark ── -->
<div class="s">
  <div class="sl">UI Preview — Dark</div>
  <div class="pbox" style="background:${dk.surface};border-color:${dk.border};">
    <div class="ph">
      <div class="pt2" style="color:${dk.textPrimary};">Provider Dashboard</div>
      <span class="bdg" style="background:${rgba(accent, 0.22)};color:${dk.interactiveHover};">&#11044; 3 Incoming</span>
    </div>
    <div class="btns">
      <button class="btn" style="background:${dk.interactivePrimary};color:${onBg(dk.interactivePrimary)};">Accept Job</button>
      <button class="btn" style="background:${rgba(accent, 0.22)};color:${dk.interactiveHover};">View Earnings</button>
      <button class="btn" style="background:${dk.bg};color:${dk.textSecondary};border:1px solid ${dk.border};">Decline</button>
    </div>
    <div class="cg">
      <div class="mc" style="background:${errDk};color:${p.red};">
        <div class="ml" style="color:${p.red};">Alert</div>&#10005; No-show
      </div>
      <div class="mc" style="background:${warnDk};color:${p.yellow};">
        <div class="ml" style="color:${p.yellow};">ETA</div>&#8987; 12 min
      </div>
      <div class="mc" style="background:${succDk};color:${p.green};">
        <div class="ml" style="color:${p.green};">Payout</div>&#10003; $34.00
      </div>
    </div>
  </div>
</div>

</body>
</html>`;
}

// ── Entry point ───────────────────────────────────────────────────

// Returns { type: 'svg'|'html', content: string }
function generatePreview(mode, colors) {
  const p = deriveAll(colors);
  switch (mode) {
    case 'terminal': return { type: 'svg',  content: previewTerminal(p, colors) };
    case 'browser':  return { type: 'svg',  content: previewBrowser(p) };
    case 'html':     return { type: 'html', content: previewHtml(p) };
    case 'obsidian': return { type: 'svg',  content: previewObsidian(p) };
    case 'ui':       return { type: 'html', content: previewUi(p, colors) };
    default:         return { type: 'svg',  content: previewEditor(p) };
  }
}
