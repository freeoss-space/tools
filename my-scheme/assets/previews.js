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

function previewTerminal(p) {
  const W = 600, H = 375;
  const e = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const t = (x, y, fill, content, extra='') =>
    `<text x="${x}" y="${y}" font-family="'SF Mono','Fira Code',monospace" font-size="12" fill="${fill}" ${extra}>${e(content)}</text>`;
  const s = (x, y, fill, content, extra='') =>
    `<text x="${x}" y="${y}" font-family="'SF Mono','Fira Code',monospace" font-size="11" fill="${fill}" ${extra}>${e(content)}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${p.bg}"/>
    <rect width="${W}" height="34" fill="${p.bg2}"/>
    <circle cx="18" cy="17" r="5.5" fill="#ff5f57"/>
    <circle cx="34" cy="17" r="5.5" fill="#febc2e"/>
    <circle cx="50" cy="17" r="5.5" fill="#28c840"/>
    <text x="${W/2}" y="22" text-anchor="middle" fill="${p.comment}" font-family="sans-serif" font-size="12" opacity="0.7">bash — terminal</text>

    ${t(16, 66, p.green, 'user')}
    ${t(55, 66, p.subtext, '@')}
    ${t(64, 66, p.blue, 'hostname')}
    ${t(138, 66, p.purple, '~/projects/my-scheme')}
    ${t(16, 84, p.green, '$')}
    ${t(28, 84, p.text, ' npm run dev')}

    ${s(16, 106, p.muted, '> my-scheme@1.0.0 dev')}
    ${s(16, 121, p.muted, '> vite')}
    ${s(16, 142, p.green, '  VITE v5.4.0')}
    ${s(108, 142, p.text, '  ready in 187 ms')}
    ${s(16, 157, p.muted, '  ➜  Local:   ')}
    ${s(104, 157, p.cyan, 'http://localhost:5173/')}
    ${s(16, 172, p.muted, '  ➜  Network: ')}
    ${s(104, 172, p.muted, 'use --host to expose')}
    ${s(16, 187, p.muted, '  ➜  press ')}
    ${s(81, 187, p.yellow, 'h')}
    ${s(89, 187, p.muted, ' + enter to show help')}

    <line x1="16" y1="205" x2="${W-16}" y2="205" stroke="${p.border}" stroke-width="1" opacity="0.4"/>

    ${t(16, 225, p.green, 'user')}
    ${t(55, 225, p.subtext, '@')}
    ${t(64, 225, p.blue, 'hostname')}
    ${t(138, 225, p.purple, '~/projects/my-scheme')}
    ${t(16, 243, p.green, '$')}
    ${t(28, 243, p.text, ' git status')}

    ${s(16, 263, p.text, 'On branch ')}
    ${s(84, 263, p.green, 'main')}
    ${s(16, 278, p.text, 'Changes not staged for commit:')}
    ${s(24, 296, p.red, '  modified:   src/main.ts')}
    ${s(24, 311, p.green, '  new file:   src/theme.ts')}
    ${s(24, 326, p.red, '  deleted:    src/legacy.ts')}

    ${t(16, 353, p.green, 'user')}
    ${t(55, 353, p.subtext, '@')}
    ${t(64, 353, p.blue, 'hostname')}
    ${t(138, 353, p.purple, '~/projects/my-scheme')}
    <rect x="16" y="359" width="9" height="13" fill="${p.text}" opacity="0.75"/>
  </svg>`;
}

// ── Browser ───────────────────────────────────────────────────────

function previewBrowser(p) {
  const W = 600, H = 375;

  // button helper: filled rect with centered text-rect
  const btn = (x, y, w, h, fill, rx=6) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"/>
     <rect x="${x+(w-w*0.55)/2}" y="${y+(h-8)/2}" width="${w*0.55}" height="8" rx="2" fill="${p.bg}" opacity="0.7"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${p.bg}"/>

    <!-- Tab bar -->
    <rect width="${W}" height="30" fill="${p.bg3}"/>
    <rect x="0" y="4" width="155" height="26" rx="6" fill="${p.bg2}"/>
    <rect x="10" y="12" width="10" height="10" rx="2" fill="${p.blue}" opacity="0.7"/>
    <rect x="26" y="15" width="74" height="7" rx="2" fill="${p.subtext}" opacity="0.55"/>
    <text x="146" y="21" font-family="sans-serif" font-size="10" fill="${p.muted}">✕</text>
    <rect x="163" y="8" width="115" height="20" rx="4" fill="${p.bg3}"/>
    <rect x="171" y="13" width="65" height="6" rx="2" fill="${p.muted}" opacity="0.45"/>
    <text x="287" y="21" font-family="sans-serif" font-size="14" fill="${p.muted}">+</text>

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

    <!-- Bookmarks -->
    <rect width="${W}" height="22" y="64" fill="${p.bg2}" opacity="0.6"/>
    <rect x="10" y="70" width="50" height="9" rx="3" fill="${p.muted}" opacity="0.35"/>
    <rect x="68" y="70" width="66" height="9" rx="3" fill="${p.muted}" opacity="0.35"/>
    <rect x="142" y="70" width="44" height="9" rx="3" fill="${p.muted}" opacity="0.35"/>
    <rect x="194" y="70" width="76" height="9" rx="3" fill="${p.muted}" opacity="0.35"/>

    <!-- Webpage nav -->
    <rect x="0" y="86" width="${W}" height="42" fill="${p.bg2}"/>
    <rect x="16" y="97" width="24" height="22" rx="5" fill="${p.blue}" opacity="0.75"/>
    <rect x="48" y="103" width="56" height="9" rx="2" fill="${p.text}" opacity="0.65"/>
    <rect x="175" y="105" width="38" height="8" rx="2" fill="${p.subtext}" opacity="0.45"/>
    <rect x="223" y="105" width="46" height="8" rx="2" fill="${p.subtext}" opacity="0.45"/>
    <rect x="279" y="105" width="42" height="8" rx="2" fill="${p.subtext}" opacity="0.45"/>
    <rect x="331" y="105" width="38" height="8" rx="2" fill="${p.subtext}" opacity="0.45"/>
    ${btn(498, 96, 84, 26, p.blue, 13)}

    <!-- Hero -->
    <rect x="0" y="128" width="${W}" height="100" fill="${p.bg}"/>
    <rect x="76" y="142" width="240" height="16" rx="4" fill="${p.text}" opacity="0.85"/>
    <rect x="76" y="164" width="188" height="16" rx="4" fill="${p.text}" opacity="0.55"/>
    <rect x="76" y="190" width="270" height="7" rx="2" fill="${p.muted}" opacity="0.6"/>
    <rect x="76" y="202" width="230" height="7" rx="2" fill="${p.muted}" opacity="0.45"/>
    <rect x="76" y="216" width="96" height="26" rx="13" fill="${p.blue}"/>
    <rect x="83" y="224" width="82" height="9" rx="3" fill="${p.bg}" opacity="0.7"/>
    <rect x="182" y="216" width="96" height="26" rx="13" fill="none" stroke="${p.border}" stroke-width="1.5"/>
    <rect x="189" y="224" width="82" height="9" rx="3" fill="${p.subtext}" opacity="0.45"/>
    <!-- Hero illustration -->
    <rect x="376" y="134" width="192" height="88" rx="8" fill="${p.bg2}" opacity="0.7"/>
    <rect x="392" y="146" width="76" height="8" rx="2" fill="${p.blue}" opacity="0.4"/>
    <rect x="392" y="160" width="144" height="6" rx="2" fill="${p.muted}" opacity="0.3"/>
    <rect x="392" y="172" width="118" height="6" rx="2" fill="${p.muted}" opacity="0.3"/>
    <rect x="392" y="185" width="56" height="20" rx="4" fill="${p.purple}" opacity="0.45"/>
    <rect x="456" y="185" width="56" height="20" rx="4" fill="${p.border}" opacity="0.4"/>

    <!-- Cards -->
    <rect x="0" y="228" width="${W}" height="147" fill="${p.bg3}" opacity="0.3"/>
    <rect x="16" y="240" width="116" height="8" rx="2" fill="${p.text}" opacity="0.45"/>

    <rect x="16" y="256" width="174" height="104" rx="8" fill="${p.bg2}"/>
    <rect x="16" y="256" width="174" height="44" rx="8" fill="${p.blue}" opacity="0.25"/>
    <rect x="16" y="278" width="174" height="22" fill="${p.blue}" opacity="0.12"/>
    <rect x="28" y="310" width="80" height="7" rx="2" fill="${p.text}" opacity="0.55"/>
    <rect x="28" y="322" width="110" height="6" rx="2" fill="${p.muted}" opacity="0.4"/>
    <rect x="28" y="338" width="58" height="16" rx="8" fill="${p.blue}" opacity="0.65"/>

    <rect x="208" y="256" width="174" height="104" rx="8" fill="${p.bg2}"/>
    <rect x="208" y="256" width="174" height="44" rx="8" fill="${p.purple}" opacity="0.22"/>
    <rect x="208" y="278" width="174" height="22" fill="${p.purple}" opacity="0.10"/>
    <rect x="220" y="310" width="80" height="7" rx="2" fill="${p.text}" opacity="0.55"/>
    <rect x="220" y="322" width="110" height="6" rx="2" fill="${p.muted}" opacity="0.4"/>
    <rect x="220" y="338" width="58" height="16" rx="8" fill="${p.purple}" opacity="0.65"/>

    <rect x="400" y="256" width="184" height="104" rx="8" fill="${p.bg2}"/>
    <rect x="400" y="256" width="184" height="44" rx="8" fill="${p.green}" opacity="0.18"/>
    <rect x="400" y="278" width="184" height="22" fill="${p.green}" opacity="0.09"/>
    <rect x="412" y="310" width="80" height="7" rx="2" fill="${p.text}" opacity="0.55"/>
    <rect x="412" y="322" width="110" height="6" rx="2" fill="${p.muted}" opacity="0.4"/>
    <rect x="412" y="338" width="58" height="16" rx="8" fill="${p.green}" opacity="0.65"/>
  </svg>`;
}

// ── HTML Components ───────────────────────────────────────────────

function previewHtml(p) {
  const W = 600, H = 375;
  const lbl = (x, y, text) =>
    `<text x="${x}" y="${y}" font-family="sans-serif" font-size="10" fill="${p.muted}" letter-spacing="1.4" opacity="0.9">${text}</text>`;
  const divider = y =>
    `<line x1="22" y1="${y}" x2="${W-22}" y2="${y}" stroke="${p.bg3}" stroke-width="1"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${p.bg}"/>

    ${lbl(22, 30, 'BUTTONS')}
    ${divider(34)}

    <!-- Primary -->
    <rect x="22" y="44" width="96" height="32" rx="6" fill="${p.blue}"/>
    <rect x="34" y="55" width="72" height="9" rx="3" fill="${p.bg}" opacity="0.7"/>
    <!-- Secondary -->
    <rect x="128" y="44" width="96" height="32" rx="6" fill="${p.purple}" opacity="0.85"/>
    <rect x="140" y="55" width="72" height="9" rx="3" fill="${p.bg}" opacity="0.7"/>
    <!-- Outlined -->
    <rect x="234" y="44" width="96" height="32" rx="6" fill="none" stroke="${p.blue}" stroke-width="1.5"/>
    <rect x="248" y="55" width="68" height="9" rx="3" fill="${p.blue}" opacity="0.8"/>
    <!-- Ghost -->
    <rect x="340" y="44" width="96" height="32" rx="6" fill="${p.bg2}"/>
    <rect x="354" y="55" width="68" height="9" rx="3" fill="${p.subtext}" opacity="0.65"/>
    <!-- Danger -->
    <rect x="446" y="44" width="96" height="32" rx="6" fill="${p.red}" opacity="0.85"/>
    <rect x="460" y="55" width="68" height="9" rx="3" fill="${p.bg}" opacity="0.7"/>

    ${lbl(22, 104, 'FORM INPUTS')}
    ${divider(108)}

    <!-- Text input -->
    <text x="22" y="126" font-family="sans-serif" font-size="10" fill="${p.subtext}">Email address</text>
    <rect x="22" y="130" width="236" height="32" rx="6" fill="${p.bg2}" stroke="${p.border}" stroke-width="1"/>
    <rect x="36" y="142" width="100" height="8" rx="2" fill="${p.muted}" opacity="0.5"/>
    <!-- Password input -->
    <text x="274" y="126" font-family="sans-serif" font-size="10" fill="${p.subtext}">Password</text>
    <rect x="274" y="130" width="236" height="32" rx="6" fill="${p.bg2}" stroke="${p.border}" stroke-width="1"/>
    <circle cx="290" cy="147" r="3" fill="${p.muted}" opacity="0.5"/>
    <circle cx="302" cy="147" r="3" fill="${p.muted}" opacity="0.5"/>
    <circle cx="314" cy="147" r="3" fill="${p.muted}" opacity="0.5"/>
    <circle cx="326" cy="147" r="3" fill="${p.muted}" opacity="0.5"/>
    <circle cx="338" cy="147" r="3" fill="${p.muted}" opacity="0.5"/>
    <rect x="486" y="139" width="16" height="12" rx="3" fill="${p.muted}" opacity="0.35"/>

    <!-- Select -->
    <text x="22" y="182" font-family="sans-serif" font-size="10" fill="${p.subtext}">Color scheme</text>
    <rect x="22" y="186" width="236" height="32" rx="6" fill="${p.bg2}" stroke="${p.border}" stroke-width="1"/>
    <rect x="36" y="197" width="126" height="8" rx="2" fill="${p.text}" opacity="0.6"/>
    <text x="238" y="207" font-family="sans-serif" font-size="12" fill="${p.muted}">▾</text>
    <!-- Focused input (accent ring) -->
    <text x="274" y="182" font-family="sans-serif" font-size="10" fill="${p.subtext}">Search</text>
    <rect x="274" y="186" width="236" height="32" rx="6" fill="${p.bg2}" stroke="${p.blue}" stroke-width="2"/>
    <rect x="290" y="197" width="2" height="11" fill="${p.blue}" opacity="0.85"/>

    ${lbl(22, 240, 'BADGES & STATUS')}
    ${divider(244)}

    <!-- Badges -->
    <rect x="22" y="252" width="50" height="18" rx="9" fill="${p.blue}" opacity="0.18"/>
    <rect x="28" y="258" width="38" height="6" rx="2" fill="${p.blue}" opacity="0.75"/>
    <rect x="80" y="252" width="56" height="18" rx="9" fill="${p.green}" opacity="0.18"/>
    <rect x="86" y="258" width="44" height="6" rx="2" fill="${p.green}" opacity="0.75"/>
    <rect x="144" y="252" width="50" height="18" rx="9" fill="${p.red}" opacity="0.18"/>
    <rect x="150" y="258" width="38" height="6" rx="2" fill="${p.red}" opacity="0.75"/>
    <rect x="202" y="252" width="62" height="18" rx="9" fill="${p.yellow}" opacity="0.18"/>
    <rect x="208" y="258" width="50" height="6" rx="2" fill="${p.yellow}" opacity="0.75"/>
    <rect x="272" y="252" width="56" height="18" rx="9" fill="${p.purple}" opacity="0.18"/>
    <rect x="278" y="258" width="44" height="6" rx="2" fill="${p.purple}" opacity="0.75"/>

    <!-- Alert info -->
    <rect x="22" y="280" width="398" height="44" rx="7" fill="${p.blue}" opacity="0.07" stroke="${p.blue}" stroke-width="1" stroke-opacity="0.3"/>
    <rect x="22" y="280" width="4" height="44" rx="2" fill="${p.blue}" opacity="0.55"/>
    <rect x="34" y="290" width="9" height="9" rx="2" fill="${p.blue}" opacity="0.6"/>
    <rect x="50" y="291" width="114" height="7" rx="2" fill="${p.text}" opacity="0.65"/>
    <rect x="50" y="305" width="264" height="6" rx="2" fill="${p.muted}" opacity="0.45"/>

    <!-- Toggles -->
    <rect x="438" y="282" width="38" height="18" rx="9" fill="${p.blue}"/>
    <circle cx="467" cy="291" r="7" fill="${p.bg}"/>
    <rect x="438" y="308" width="38" height="18" rx="9" fill="${p.border}"/>
    <circle cx="447" cy="317" r="7" fill="${p.subtext}" opacity="0.6"/>

    <!-- Progress bars -->
    <rect x="486" y="286" width="88" height="7" rx="3.5" fill="${p.bg2}"/>
    <rect x="486" y="286" width="56" height="7" rx="3.5" fill="${p.blue}"/>
    <rect x="486" y="312" width="88" height="7" rx="3.5" fill="${p.bg2}"/>
    <rect x="486" y="312" width="22" height="7" rx="3.5" fill="${p.red}"/>

    ${lbl(22, 346, 'CARD')}
    ${divider(350)}
    <rect x="22" y="358" width="80" height="10" rx="2" fill="${p.text}" opacity="0.7"/>
    <rect x="22" y="358" width="4" height="10" rx="2" fill="${p.blue}"/>
    <rect x="110" y="358" width="120" height="10" rx="2" fill="${p.muted}" opacity="0.4"/>
  </svg>`;
}

// ── Obsidian ──────────────────────────────────────────────────────

function previewObsidian(p) {
  const W = 600, H = 375;
  const e = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const tx = (x, y, fill, content, size=11, extra='') =>
    `<text x="${x}" y="${y}" font-family="sans-serif" font-size="${size}" fill="${fill}" ${extra}>${e(content)}</text>`;
  const mono = (x, y, fill, content, size=11) =>
    `<text x="${x}" y="${y}" font-family="'SF Mono','Fira Code',monospace" font-size="${size}" fill="${fill}">${e(content)}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${p.bg}"/>

    <!-- Ribbon -->
    <rect width="34" height="${H}" fill="${p.bg3}" opacity="0.7"/>
    <rect x="9" y="16" width="16" height="16" rx="3" fill="${p.blue}" opacity="0.55"/>
    <rect x="9" y="40" width="16" height="16" rx="3" fill="${p.muted}" opacity="0.3"/>
    <rect x="9" y="64" width="16" height="16" rx="3" fill="${p.muted}" opacity="0.3"/>
    <rect x="9" y="88" width="16" height="16" rx="3" fill="${p.muted}" opacity="0.3"/>
    <rect x="9" y="${H-38}" width="16" height="16" rx="3" fill="${p.muted}" opacity="0.3"/>
    <rect x="9" y="${H-18}" width="16" height="16" rx="3" fill="${p.purple}" opacity="0.45"/>

    <!-- File explorer -->
    <rect x="34" y="0" width="156" height="${H}" fill="${p.bg2}" opacity="0.7"/>
    <!-- Explorer header -->
    <rect x="34" y="0" width="156" height="32" fill="${p.bg2}"/>
    ${tx(46, 20, p.text, 'My Vault', 12, 'font-weight="600"')}
    <!-- Search -->
    <rect x="42" y="38" width="140" height="20" rx="4" fill="${p.bg3}" opacity="0.6"/>
    <rect x="52" y="45" width="68" height="6" rx="2" fill="${p.muted}" opacity="0.4"/>
    <!-- File tree -->
    ${tx(48, 78, p.subtext, '▾ Notes', 10)}
    <rect x="56" y="84" width="1" height="56" fill="${p.border}" opacity="0.4"/>
    <rect x="58" y="86" width="114" height="17" rx="3" fill="${p.blue}" opacity="0.15"/>
    ${tx(68, 98, p.blue, '📝 Color Theory', 10)}
    ${tx(68, 115, p.muted, '   Daily Note', 10)}
    ${tx(68, 130, p.muted, '   Ideas', 10)}
    ${tx(68, 145, p.muted, '   References', 10)}
    ${tx(48, 162, p.subtext, '▸ Projects', 10)}
    ${tx(48, 178, p.subtext, '▸ Resources', 10)}
    ${tx(48, 194, p.subtext, '▸ Templates', 10)}
    ${tx(48, 212, p.subtext, '▸ Archive', 10)}

    <!-- Editor area -->
    <rect x="190" y="0" width="${W-190}" height="${H}" fill="${p.bg}"/>

    <!-- Tab bar -->
    <rect x="190" y="0" width="${W-190}" height="32" fill="${p.bg2}"/>
    <rect x="190" y="0" width="146" height="32" fill="${p.bg}"/>
    <rect x="200" y="9" width="10" height="10" rx="2" fill="${p.blue}" opacity="0.55"/>
    <rect x="216" y="12" width="78" height="7" rx="2" fill="${p.text}" opacity="0.65"/>
    <rect x="344" y="8" width="116" height="20" rx="4" fill="${p.bg2}"/>
    <rect x="352" y="14" width="68" height="6" rx="2" fill="${p.muted}" opacity="0.45"/>

    <!-- Toolbar -->
    <rect x="190" y="32" width="${W-190}" height="26" fill="${p.bg2}" opacity="0.5"/>
    <rect x="200" y="41" width="9" height="9" rx="2" fill="${p.muted}" opacity="0.35"/>
    <rect x="215" y="42" width="8" height="7" rx="1" fill="${p.muted}" opacity="0.35"/>
    <rect x="229" y="42" width="8" height="7" rx="1" fill="${p.muted}" opacity="0.35"/>
    <rect x="243" y="42" width="8" height="7" rx="1" fill="${p.muted}" opacity="0.35"/>
    <line x1="260" y1="34" x2="260" y2="56" stroke="${p.border}" stroke-width="1"/>
    <rect x="268" y="42" width="8" height="7" rx="1" fill="${p.muted}" opacity="0.35"/>
    <rect x="282" y="42" width="8" height="7" rx="1" fill="${p.muted}" opacity="0.35"/>

    <!-- Markdown content -->
    <!-- H1 -->
    <rect x="206" y="68" width="218" height="15" rx="3" fill="${p.blue}" opacity="0.8"/>
    <!-- Paragraph -->
    <rect x="206" y="98" width="372" height="7" rx="2" fill="${p.text}" opacity="0.5"/>
    <rect x="206" y="110" width="350" height="7" rx="2" fill="${p.text}" opacity="0.5"/>
    <rect x="206" y="122" width="280" height="7" rx="2" fill="${p.text}" opacity="0.5"/>

    <!-- H2 -->
    <rect x="206" y="146" width="136" height="11" rx="3" fill="${p.purple}" opacity="0.75"/>

    <!-- List items -->
    <circle cx="216" cy="170" r="2.5" fill="${p.muted}" opacity="0.6"/>
    <rect x="226" y="165" width="196" height="7" rx="2" fill="${p.text}" opacity="0.45"/>
    <circle cx="216" cy="185" r="2.5" fill="${p.muted}" opacity="0.6"/>
    <rect x="226" y="180" width="236" height="7" rx="2" fill="${p.text}" opacity="0.45"/>
    <circle cx="216" cy="200" r="2.5" fill="${p.muted}" opacity="0.6"/>
    <rect x="226" y="195" width="176" height="7" rx="2" fill="${p.text}" opacity="0.45"/>

    <!-- Callout -->
    <rect x="206" y="218" width="366" height="52" rx="6" fill="${p.blue}" opacity="0.06" stroke="${p.blue}" stroke-width="1.5" stroke-opacity="0.3"/>
    <rect x="206" y="218" width="4" height="52" rx="2" fill="${p.blue}" opacity="0.55"/>
    <rect x="218" y="227" width="78" height="7" rx="2" fill="${p.blue}" opacity="0.65"/>
    <rect x="218" y="239" width="300" height="6" rx="2" fill="${p.text}" opacity="0.4"/>
    <rect x="218" y="251" width="258" height="6" rx="2" fill="${p.text}" opacity="0.3"/>

    <!-- Code block -->
    <rect x="206" y="282" width="366" height="66" rx="6" fill="${p.bg2}"/>
    <rect x="206" y="282" width="366" height="20" rx="6" fill="${p.bg3}"/>
    <rect x="206" y="290" width="366" height="12" fill="${p.bg3}"/>
    <rect x="220" y="284" width="56" height="7" rx="2" fill="${p.muted}" opacity="0.5"/>
    ${mono(218, 320, p.keyword, 'const', 11)}
    <rect x="258" y="312" width="50" height="8" rx="2" fill="${p.text}" opacity="0.65"/>
    <rect x="315" y="312" width="7" height="8" rx="2" fill="${p.operator}" opacity="0.7"/>
    <rect x="330" y="312" width="66" height="8" rx="2" fill="${p.string}" opacity="0.8"/>
    ${mono(218, 338, p.func, 'deriveAll', 11)}
    <rect x="278" y="330" width="7" height="8" rx="2" fill="${p.text}" opacity="0.55"/>
    <rect x="293" y="330" width="46" height="8" rx="2" fill="${p.type}" opacity="0.7"/>
    <rect x="346" y="330" width="7" height="8" rx="2" fill="${p.text}" opacity="0.55"/>

    <!-- Status bar -->
    <rect x="190" y="${H-18}" width="${W-190}" height="18" fill="${p.bg2}"/>
    <rect x="200" y="${H-13}" width="56" height="6" rx="2" fill="${p.muted}" opacity="0.4"/>
    <rect x="${W-80}" y="${H-13}" width="38" height="6" rx="2" fill="${p.muted}" opacity="0.35"/>
    <rect x="${W-36}" y="${H-13}" width="28" height="6" rx="2" fill="${p.blue}" opacity="0.45"/>
  </svg>`;
}

// ── Entry point ───────────────────────────────────────────────────

function generatePreview(mode, colors) {
  const p = deriveAll(colors);
  switch (mode) {
    case 'terminal': return previewTerminal(p);
    case 'browser':  return previewBrowser(p);
    case 'html':     return previewHtml(p);
    case 'obsidian': return previewObsidian(p);
    default:         return previewEditor(p);
  }
}
