const MUPDF_CDNS = [
  'https://cdn.jsdelivr.net/npm/mupdf@1.27.0/dist/mupdf.js',
  'https://unpkg.com/mupdf@1.27.0/dist/mupdf.js',
];
const JSPDF_URL = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js';
const LOAD_TIMEOUT_MS = 90_000; // 90s for ~10MB WASM

let mupdfLib = null;

const state = {
  doc: null,
  docBuffer: null,
  fileName: '',
  currentPage: 0,
  totalPages: 0,
  zoom: 1.0,
  tool: 'freeform',
  color: '#E66260',
  strokeWidth: 3,
  fontSize: 18,
  annotations: {},
  undoStack: [],
  redoStack: [],
  drawing: false,
  currentPath: null,
  startPoint: null,
  textEditing: false,
};

const $ = (sel) => document.querySelector(sel);

let els;

function init() {
  els = {
    dropZone: $('#drop-zone'),
    dropInner: $('.drop-zone-inner'),
    fileInput: $('#file-input'),
    viewer: $('#viewer'),
    canvasArea: $('#canvas-area'),
    canvasContainer: $('#canvas-container'),
    bgCanvas: $('#bg-canvas'),
    annoCanvas: $('#anno-canvas'),
    textInput: $('#text-input'),
    toolbar: $('#toolbar'),
    pageInfo: $('#page-info'),
    prevBtn: $('#prev-page'),
    nextBtn: $('#next-page'),
    zoomIn: $('#zoom-in'),
    zoomOut: $('#zoom-out'),
    zoomLevel: $('#zoom-level'),
    downloadBtn: $('#download-btn'),
    colorPicker: $('#color-picker'),
    strokeWidth: $('#stroke-width'),
    fontSize: $('#font-size'),
    fontSizeWrap: $('#font-size-wrap'),
    undoBtn: $('#undo-btn'),
    redoBtn: $('#redo-btn'),
    loading: $('#loading'),
    loadingText: $('#loading-text'),
  };

  // File handling
  els.dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    els.dropZone.classList.add('drag-over');
  });
  els.dropZone.addEventListener('dragleave', () => {
    els.dropZone.classList.remove('drag-over');
  });
  els.dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    els.dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) openFile(file);
  });
  els.fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) openFile(file);
  });

  // Tool buttons
  document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => selectTool(btn.dataset.tool));
  });

  // Controls
  els.colorPicker.addEventListener('input', (e) => state.color = e.target.value);
  els.strokeWidth.addEventListener('input', () => {
    state.strokeWidth = parseInt(els.strokeWidth.value);
  });
  els.fontSize.addEventListener('input', () => {
    state.fontSize = parseInt(els.fontSize.value) || 18;
  });
  els.prevBtn.addEventListener('click', () => goToPage(state.currentPage - 1));
  els.nextBtn.addEventListener('click', () => goToPage(state.currentPage + 1));
  els.zoomIn.addEventListener('click', () => setZoom(state.zoom + 0.25));
  els.zoomOut.addEventListener('click', () => setZoom(state.zoom - 0.25));
  els.undoBtn.addEventListener('click', undo);
  els.redoBtn.addEventListener('click', redo);
  els.downloadBtn.addEventListener('click', downloadPDF);

  // Canvas mouse events
  els.annoCanvas.addEventListener('mousedown', onPointerDown);
  els.annoCanvas.addEventListener('mousemove', onPointerMove);
  els.annoCanvas.addEventListener('mouseup', onPointerUp);
  els.annoCanvas.addEventListener('mouseleave', onPointerUp);

  // Canvas touch events
  els.annoCanvas.addEventListener('touchstart', onTouchStart, { passive: false });
  els.annoCanvas.addEventListener('touchmove', onTouchMove, { passive: false });
  els.annoCanvas.addEventListener('touchend', onTouchEnd);

  // Keyboard shortcuts
  document.addEventListener('keydown', onKeyDown);
}

function selectTool(tool) {
  state.tool = tool;
  document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`.tool-btn[data-tool="${tool}"]`);
  if (btn) btn.classList.add('active');
  els.fontSizeWrap.hidden = tool !== 'text';
  updateCursor();
}

function updateCursor() {
  els.annoCanvas.style.cursor = state.tool === 'text' ? 'text' : 'crosshair';
}

// --- MuPDF ---

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(
        `${label} timed out after ${Math.round(ms / 1000)}s. ` +
        'The MuPDF library is ~10 MB — try refreshing on a faster connection.'
      )), ms)
    ),
  ]);
}

async function loadMuPDF() {
  if (mupdfLib) return mupdfLib;
  showLoading('Loading MuPDF library (~10 MB, first load may be slow)...');

  let lastErr;
  for (const url of MUPDF_CDNS) {
    try {
      console.log('[pdf-annotator] Trying', url);
      mupdfLib = await withTimeout(import(url), LOAD_TIMEOUT_MS, 'MuPDF import');
      console.log('[pdf-annotator] MuPDF loaded successfully');
      hideLoading();
      return mupdfLib;
    } catch (err) {
      console.warn('[pdf-annotator] Failed with', url, err);
      lastErr = err;
    }
  }

  hideLoading();
  throw new Error(
    'Failed to load MuPDF from any CDN. ' +
    (lastErr ? lastErr.message + ' ' : '') +
    'Check your internet connection and try refreshing.'
  );
}

function showLoading(msg) {
  els.loadingText.textContent = msg || 'Loading...';
  els.loading.hidden = false;
}

function hideLoading() {
  els.loading.hidden = true;
}

// --- File handling ---

async function openFile(file) {
  showLoading('Opening PDF...');
  try {
    const mupdf = await loadMuPDF();
    showLoading('Reading PDF...');
    const buffer = await file.arrayBuffer();
    state.docBuffer = buffer;
    state.doc = mupdf.Document.openDocument(buffer, file.name);
    state.fileName = file.name;
    state.totalPages = state.doc.countPages();
    state.currentPage = 0;
    state.annotations = {};
    state.undoStack = [];
    state.redoStack = [];
    state.zoom = 1.0;

    els.dropZone.hidden = true;
    els.viewer.hidden = false;
    els.downloadBtn.disabled = false;

    showLoading('Rendering page...');
    await renderCurrentPage();
    updateControls();
  } catch (err) {
    console.error('Failed to open PDF:', err);
    alert('Failed to open PDF: ' + err.message);
  } finally {
    hideLoading();
  }
}

// --- Rendering ---

async function renderCurrentPage() {
  const mupdf = await loadMuPDF();
  const page = state.doc.loadPage(state.currentPage);
  const bounds = page.getBounds();

  const dpr = window.devicePixelRatio || 1;
  const baseScale = 96 / 72;
  const scale = state.zoom * baseScale * dpr;

  const cssWidth = (bounds[2] - bounds[0]) * state.zoom * baseScale;
  const cssHeight = (bounds[3] - bounds[1]) * state.zoom * baseScale;
  const pxWidth = Math.floor(cssWidth * dpr);
  const pxHeight = Math.floor(cssHeight * dpr);

  // Set canvas sizes
  els.bgCanvas.width = pxWidth;
  els.bgCanvas.height = pxHeight;
  els.bgCanvas.style.width = cssWidth + 'px';
  els.bgCanvas.style.height = cssHeight + 'px';

  els.annoCanvas.width = pxWidth;
  els.annoCanvas.height = pxHeight;
  els.annoCanvas.style.width = cssWidth + 'px';
  els.annoCanvas.style.height = cssHeight + 'px';

  // Render page via mupdf
  const pixmap = page.toPixmap(
    [scale, 0, 0, scale, 0, 0],
    mupdf.ColorSpace.DeviceRGB
  );
  const png = pixmap.asPNG();
  const blob = new Blob([png], { type: 'image/png' });
  const url = URL.createObjectURL(blob);

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ctx = els.bgCanvas.getContext('2d');
      ctx.drawImage(img, 0, 0, pxWidth, pxHeight);
      URL.revokeObjectURL(url);
      drawAnnotations();
      resolve();
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    img.src = url;
  });
}

// --- Annotations drawing ---

function drawAnnotations() {
  const ctx = els.annoCanvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  ctx.clearRect(0, 0, els.annoCanvas.width, els.annoCanvas.height);
  ctx.setTransform(dpr * state.zoom, 0, 0, dpr * state.zoom, 0, 0);

  const annos = state.annotations[state.currentPage] || [];
  for (const anno of annos) {
    drawAnnotation(ctx, anno);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function drawAnnotation(ctx, anno) {
  ctx.strokeStyle = anno.color;
  ctx.fillStyle = anno.color;
  ctx.lineWidth = anno.strokeWidth || 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (anno.type) {
    case 'freeform': {
      if (anno.points.length < 2) break;
      ctx.beginPath();
      ctx.moveTo(anno.points[0].x, anno.points[0].y);
      for (let i = 1; i < anno.points.length; i++) {
        ctx.lineTo(anno.points[i].x, anno.points[i].y);
      }
      ctx.stroke();
      break;
    }
    case 'rect': {
      ctx.strokeRect(anno.x, anno.y, anno.w, anno.h);
      break;
    }
    case 'circle': {
      const rx = Math.abs(anno.w / 2);
      const ry = Math.abs(anno.h / 2);
      if (rx < 1 || ry < 1) break;
      ctx.beginPath();
      ctx.ellipse(anno.x + anno.w / 2, anno.y + anno.h / 2, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'line': {
      ctx.beginPath();
      ctx.moveTo(anno.x1, anno.y1);
      ctx.lineTo(anno.x2, anno.y2);
      ctx.stroke();
      break;
    }
    case 'arrow': {
      ctx.beginPath();
      ctx.moveTo(anno.x1, anno.y1);
      ctx.lineTo(anno.x2, anno.y2);
      ctx.stroke();
      const angle = Math.atan2(anno.y2 - anno.y1, anno.x2 - anno.x1);
      const headLen = Math.max(10, anno.strokeWidth * 4);
      ctx.beginPath();
      ctx.moveTo(anno.x2, anno.y2);
      ctx.lineTo(
        anno.x2 - headLen * Math.cos(angle - Math.PI / 6),
        anno.y2 - headLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(anno.x2, anno.y2);
      ctx.lineTo(
        anno.x2 - headLen * Math.cos(angle + Math.PI / 6),
        anno.y2 - headLen * Math.sin(angle + Math.PI / 6)
      );
      ctx.stroke();
      break;
    }
    case 'text': {
      ctx.font = `${anno.fontSize}px sans-serif`;
      ctx.fillText(anno.text, anno.x, anno.y);
      break;
    }
  }
}

// --- Pointer handling ---

function getCanvasPoint(e) {
  const rect = els.annoCanvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) / state.zoom,
    y: (e.clientY - rect.top) / state.zoom,
  };
}

function onPointerDown(e) {
  if (state.textEditing) return;

  if (state.tool === 'text') {
    startTextInput(e);
    return;
  }

  state.drawing = true;
  const pt = getCanvasPoint(e);
  state.startPoint = pt;

  if (state.tool === 'freeform') {
    state.currentPath = {
      type: 'freeform',
      points: [pt],
      color: state.color,
      strokeWidth: state.strokeWidth,
    };
  }
}

function onPointerMove(e) {
  if (!state.drawing) return;
  const pt = getCanvasPoint(e);

  if (state.tool === 'freeform' && state.currentPath) {
    state.currentPath.points.push(pt);
  }

  // Redraw with live preview
  drawAnnotations();
  const ctx = els.annoCanvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  ctx.save();
  ctx.setTransform(dpr * state.zoom, 0, 0, dpr * state.zoom, 0, 0);

  if (state.tool === 'freeform' && state.currentPath) {
    drawAnnotation(ctx, state.currentPath);
  } else if (state.startPoint) {
    const preview = createShapeAnnotation(state.startPoint, pt);
    if (preview) drawAnnotation(ctx, preview);
  }

  ctx.restore();
}

function onPointerUp(e) {
  if (!state.drawing) return;
  state.drawing = false;

  if (state.tool === 'freeform' && state.currentPath) {
    if (state.currentPath.points.length > 1) {
      addAnnotation(state.currentPath);
    }
    state.currentPath = null;
  } else if (state.startPoint && e) {
    const pt = getCanvasPoint(e);
    const shape = createShapeAnnotation(state.startPoint, pt);
    if (shape) addAnnotation(shape);
  }

  state.startPoint = null;
}

function createShapeAnnotation(start, end) {
  const common = { color: state.color, strokeWidth: state.strokeWidth };
  const dx = Math.abs(end.x - start.x);
  const dy = Math.abs(end.y - start.y);

  if (dx < 3 && dy < 3) return null; // too small

  switch (state.tool) {
    case 'rect':
      return { type: 'rect', x: Math.min(start.x, end.x), y: Math.min(start.y, end.y), w: dx, h: dy, ...common };
    case 'circle':
      return { type: 'circle', x: Math.min(start.x, end.x), y: Math.min(start.y, end.y), w: end.x - start.x, h: end.y - start.y, ...common };
    case 'line':
      return { type: 'line', x1: start.x, y1: start.y, x2: end.x, y2: end.y, ...common };
    case 'arrow':
      return { type: 'arrow', x1: start.x, y1: start.y, x2: end.x, y2: end.y, ...common };
    default:
      return null;
  }
}

// --- Text input ---

function startTextInput(e) {
  const rect = els.annoCanvas.getBoundingClientRect();
  const cssX = e.clientX - rect.left;
  const cssY = e.clientY - rect.top;

  const ti = els.textInput;
  ti.hidden = false;
  ti.style.left = cssX + 'px';
  ti.style.top = cssY + 'px';
  ti.style.fontSize = (state.fontSize * state.zoom) + 'px';
  ti.style.color = state.color;
  ti.value = '';
  ti.focus();
  state.textEditing = true;

  function finish() {
    const text = ti.value.trim();
    if (text) {
      const basePt = getCanvasPoint(e);
      addAnnotation({
        type: 'text',
        x: basePt.x,
        y: basePt.y + state.fontSize, // baseline offset
        text,
        color: state.color,
        fontSize: state.fontSize,
        strokeWidth: state.strokeWidth,
      });
    }
    ti.hidden = true;
    ti.value = '';
    state.textEditing = false;
    ti.removeEventListener('keydown', onKey);
    ti.removeEventListener('blur', onBlur);
  }

  function onKey(ev) {
    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      finish();
    }
    if (ev.key === 'Escape') {
      ti.hidden = true;
      ti.value = '';
      state.textEditing = false;
      ti.removeEventListener('keydown', onKey);
      ti.removeEventListener('blur', onBlur);
    }
  }

  function onBlur() {
    setTimeout(finish, 100);
  }

  ti.addEventListener('keydown', onKey);
  ti.addEventListener('blur', onBlur);
}

// --- Touch handlers ---

function onTouchStart(e) {
  e.preventDefault();
  const t = e.touches[0];
  onPointerDown({ clientX: t.clientX, clientY: t.clientY });
}

function onTouchMove(e) {
  e.preventDefault();
  const t = e.touches[0];
  onPointerMove({ clientX: t.clientX, clientY: t.clientY });
}

function onTouchEnd(e) {
  if (state.drawing && e.changedTouches.length) {
    const t = e.changedTouches[0];
    onPointerUp({ clientX: t.clientX, clientY: t.clientY });
  } else {
    onPointerUp(null);
  }
}

// --- Annotation management ---

function addAnnotation(anno) {
  const page = state.currentPage;
  if (!state.annotations[page]) state.annotations[page] = [];
  state.annotations[page].push(anno);
  state.undoStack.push({ page, index: state.annotations[page].length - 1 });
  state.redoStack = [];
  drawAnnotations();
  updateControls();
}

function undo() {
  const action = state.undoStack.pop();
  if (!action) return;
  const annos = state.annotations[action.page];
  if (annos && annos.length) {
    const removed = annos.pop();
    state.redoStack.push({ page: action.page, anno: removed });
  }
  if (action.page === state.currentPage) drawAnnotations();
  updateControls();
}

function redo() {
  const action = state.redoStack.pop();
  if (!action) return;
  if (!state.annotations[action.page]) state.annotations[action.page] = [];
  state.annotations[action.page].push(action.anno);
  state.undoStack.push({ page: action.page, index: state.annotations[action.page].length - 1 });
  if (action.page === state.currentPage) drawAnnotations();
  updateControls();
}

// --- Navigation ---

async function goToPage(n) {
  if (n < 0 || n >= state.totalPages) return;
  state.currentPage = n;
  await renderCurrentPage();
  updateControls();
}

async function setZoom(z) {
  z = Math.max(0.25, Math.min(4, z));
  state.zoom = z;
  await renderCurrentPage();
  updateControls();
}

function updateControls() {
  els.pageInfo.textContent = `${state.currentPage + 1} / ${state.totalPages}`;
  els.prevBtn.disabled = state.currentPage <= 0;
  els.nextBtn.disabled = state.currentPage >= state.totalPages - 1;
  els.zoomLevel.textContent = Math.round(state.zoom * 100) + '%';
  els.undoBtn.disabled = state.undoStack.length === 0;
  els.redoBtn.disabled = state.redoStack.length === 0;
}

// --- Keyboard ---

function onKeyDown(e) {
  if (state.textEditing) return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault();
    if (e.shiftKey) redo(); else undo();
    return;
  }

  switch (e.key) {
    case 'ArrowLeft': goToPage(state.currentPage - 1); break;
    case 'ArrowRight': goToPage(state.currentPage + 1); break;
    case 'd': selectTool('freeform'); break;
    case 't': selectTool('text'); break;
    case 'r': selectTool('rect'); break;
    case 'c': selectTool('circle'); break;
    case 'l': selectTool('line'); break;
    case 'a': selectTool('arrow'); break;
    case '+': case '=': setZoom(state.zoom + 0.25); break;
    case '-': setZoom(state.zoom - 0.25); break;
  }
}

// --- Download ---

async function downloadPDF() {
  showLoading('Preparing download...');

  // Load jsPDF if needed
  if (!window.jspdf) {
    try {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = JSPDF_URL;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    } catch {
      hideLoading();
      alert('Failed to load jsPDF library. Check your internet connection.');
      return;
    }
  }

  try {
    const mupdf = await loadMuPDF();
    const { jsPDF } = window.jspdf;

    const firstBounds = state.doc.loadPage(0).getBounds();
    const firstW = firstBounds[2] - firstBounds[0];
    const firstH = firstBounds[3] - firstBounds[1];

    const pdf = new jsPDF({
      orientation: firstW > firstH ? 'landscape' : 'portrait',
      unit: 'pt',
      format: [firstW, firstH],
    });

    for (let i = 0; i < state.totalPages; i++) {
      showLoading(`Rendering page ${i + 1} / ${state.totalPages}...`);

      const page = state.doc.loadPage(i);
      const bounds = page.getBounds();
      const pageW = bounds[2] - bounds[0];
      const pageH = bounds[3] - bounds[1];

      if (i > 0) {
        pdf.addPage([pageW, pageH], pageW > pageH ? 'landscape' : 'portrait');
      }

      // Render at 2x quality
      const exportScale = 2 * 96 / 72;
      const pxW = Math.floor(pageW * exportScale);
      const pxH = Math.floor(pageH * exportScale);

      const pixmap = page.toPixmap(
        [exportScale, 0, 0, exportScale, 0, 0],
        mupdf.ColorSpace.DeviceRGB
      );
      const png = pixmap.asPNG();
      const blob = new Blob([png], { type: 'image/png' });
      const url = URL.createObjectURL(blob);

      await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = pxW;
          canvas.height = pxH;
          const ctx = canvas.getContext('2d');

          // Draw page image
          ctx.drawImage(img, 0, 0, pxW, pxH);
          URL.revokeObjectURL(url);

          // Draw annotations scaled from base coords to export coords
          // Base coords are at (96/72) scale. Export is at (2 * 96/72) scale. Ratio = 2.
          const annoScale = 2;
          const annos = state.annotations[i] || [];
          if (annos.length) {
            ctx.save();
            ctx.scale(annoScale, annoScale);
            for (const anno of annos) {
              drawAnnotation(ctx, anno);
            }
            ctx.restore();
          }

          const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
          pdf.addImage(dataUrl, 'JPEG', 0, 0, pageW, pageH);
          resolve();
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        img.src = url;
      });
    }

    const outputName = state.fileName.replace(/\.pdf$/i, '') + '-annotated.pdf';
    pdf.save(outputName);
  } catch (err) {
    console.error('Download failed:', err);
    alert('Failed to generate PDF: ' + err.message);
  }

  hideLoading();
}

// --- Init ---
document.addEventListener('DOMContentLoaded', init);
