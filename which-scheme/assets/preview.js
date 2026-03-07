function generatePreviewSVG(p) {
  const W = 600, H = 375;
  const TITLEBAR = 34, SIDEBAR = 44, LINENUM = 38;
  const contentX = SIDEBAR + LINENUM;
  const lineH = 22;
  const startY = TITLEBAR + 14;

  const codeLines = [
    { indent: 0,  tokens: [{w:44,c:'keyword'},{w:8,c:'text'},{w:54,c:'func'},{w:8,c:'text'},{w:36,c:'type'},{w:6,c:'text'},{w:6,c:'text'},{w:6,c:'operator'}] },
    { indent: 16, tokens: [{w:10,c:'comment'},{w:48,c:'comment'},{w:50,c:'comment'}] },
    { indent: 16, tokens: [{w:36,c:'keyword'},{w:6,c:'text'},{w:40,c:'text'},{w:6,c:'operator'},{w:70,c:'string'},{w:6,c:'operator'},{w:40,c:'text'},{w:6,c:'operator'}] },
    { indent: 16, tokens: [{w:50,c:'keyword'},{w:6,c:'text'},{w:36,c:'text'},{w:6,c:'operator'}] },
    { indent: 0,  tokens: [{w:6,c:'text'}] },
    null,
    { indent: 0,  tokens: [{w:44,c:'keyword'},{w:6,c:'text'},{w:60,c:'func'},{w:6,c:'text'},{w:6,c:'text'},{w:6,c:'text'},{w:6,c:'operator'}] },
    { indent: 16, tokens: [{w:36,c:'keyword'},{w:6,c:'text'},{w:6,c:'operator'},{w:36,c:'number'},{w:6,c:'operator'},{w:36,c:'text'},{w:6,c:'operator'},{w:36,c:'number'},{w:6,c:'operator'}] },
    { indent: 32, tokens: [{w:50,c:'keyword'},{w:6,c:'text'},{w:54,c:'string'},{w:6,c:'operator'}] },
    { indent: 16, tokens: [{w:6,c:'text'}] },
    { indent: 0,  tokens: [{w:6,c:'text'}] },
    null,
    { indent: 0,  tokens: [{w:50,c:'keyword'},{w:6,c:'text'},{w:44,c:'func'},{w:6,c:'text'},{w:6,c:'text'},{w:6,c:'operator'}] },
    { indent: 16, tokens: [{w:50,c:'type'},{w:6,c:'text'},{w:60,c:'func'},{w:6,c:'text'},{w:6,c:'text'},{w:6,c:'text'}] },
    { indent: 0,  tokens: [{w:6,c:'text'}] },
  ];

  const cmap = {
    keyword: p.keyword, func: p.func, string: p.string, number: p.number,
    operator: p.operator, type: p.type, comment: p.comment, text: p.text,
  };

  let codeRects = '';
  codeLines.forEach((line, i) => {
    if (!line) return;
    const y = startY + i * lineH;
    let x = contentX + line.indent;
    line.tokens.forEach(t => {
      codeRects += `<rect x="${x}" y="${y+5}" width="${t.w}" height="10" rx="2" fill="${cmap[t.c] || p.text}" opacity="0.88"/>`;
      x += t.w + 5;
    });
  });

  let lineNums = '';
  codeLines.forEach((_, i) => {
    lineNums += `<text x="${SIDEBAR + LINENUM - 6}" y="${startY + i * lineH + 14}" text-anchor="end" fill="${p.comment}" font-family="monospace" font-size="10.5" opacity="0.7">${i + 1}</text>`;
  });

  const sideIcons = [0,1,2,3,4].map(i => `
    <rect x="12" y="${TITLEBAR + 18 + i * 28}" width="20" height="3" rx="1.5" fill="${p.comment}" opacity="0.35"/>
    <rect x="12" y="${TITLEBAR + 23 + i * 28}" width="13" height="2.5" rx="1.25" fill="${p.comment}" opacity="0.2"/>
  `).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${p.bg}"/>
    <rect width="${W}" height="${TITLEBAR}" fill="${p.bg2}"/>
    <circle cx="18" cy="17" r="5.5" fill="#ff5f57"/>
    <circle cx="34" cy="17" r="5.5" fill="#febc2e"/>
    <circle cx="50" cy="17" r="5.5" fill="#28c840"/>
    <text x="${W/2}" y="22" text-anchor="middle" fill="${p.comment}" font-family="sans-serif" font-size="12" opacity="0.7">main.ts — editor</text>
    <rect width="${SIDEBAR}" height="${H - TITLEBAR}" y="${TITLEBAR}" fill="${p.bg2}" opacity="0.85"/>
    ${sideIcons}
    <rect x="${SIDEBAR}" y="${TITLEBAR}" width="${LINENUM}" height="${H - TITLEBAR}" fill="${p.bg}" opacity="0.25"/>
    <rect x="${SIDEBAR}" y="${startY + 2 * lineH - 3}" width="${W - SIDEBAR}" height="${lineH}" fill="${p.highlight || p.bg2}" opacity="0.55"/>
    ${lineNums}
    ${codeRects}
    <rect x="${contentX + 6}" y="${startY + 3 * lineH + 4}" width="2" height="13" fill="${p.text}" opacity="0.75"/>
  </svg>`;
}
