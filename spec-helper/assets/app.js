/* Spec Helper – localStorage-backed task/issue tracker */

const STORAGE_KEY = 'spec-helper-data';

const STATUSES = ['todo', 'in-progress', 'done', 'blocked'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];

const STATUS_LABELS = { 'todo': 'To Do', 'in-progress': 'In Progress', 'done': 'Done', 'blocked': 'Blocked' };
const PRIORITY_LABELS = { 'low': 'Low', 'medium': 'Medium', 'high': 'High', 'critical': 'Critical' };

/* ── State ── */
let state = {
  projectName: '',
  tasks: [],
  filter: 'all',
  search: '',
  currentTaskId: null,
  descTab: 'write',
};

/* ── Persistence ── */
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      state.projectName = saved.projectName || '';
      state.tasks = saved.tasks || [];
    }
  } catch { /* ignore */ }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    projectName: state.projectName,
    tasks: state.tasks,
  }));
}

/* ── ID generation ── */
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ── Markdown renderer (simple) ── */
function renderMarkdown(md) {
  if (!md) return '';
  let html = md;

  // Escape HTML (but preserve image/link markdown)
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
    `<pre><code>${code.trim()}</code></pre>`);

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Images (before links)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr>');

  // Bold / Italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');

  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

  // Unordered lists
  html = html.replace(/^(?:- |\* )(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`);

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Tables
  html = html.replace(/^(\|.+\|)\n(\|[-| :]+\|)\n((?:\|.+\|\n?)+)/gm, (_, hdr, sep, body) => {
    const headers = hdr.split('|').filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join('');
    const rows = body.trim().split('\n').map(row => {
      const cells = row.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('');
    return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
  });

  // Paragraphs: wrap loose lines
  html = html.replace(/^(?!<[a-z])((?!<\/)[^\n]+)$/gm, '<p>$1</p>');

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');

  return html;
}

/* ── URL hash routing ── */
function readHash() {
  const hash = location.hash.slice(1);
  if (!hash) return { view: 'list' };
  if (hash.startsWith('task/')) {
    return { view: 'detail', taskId: hash.slice(5) };
  }
  return { view: 'list' };
}

function setHash(view, taskId) {
  if (view === 'detail' && taskId) {
    location.hash = `task/${taskId}`;
  } else {
    history.pushState(null, '', location.pathname);
  }
}

/* ── DOM helpers ── */
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

function el(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'className') e.className = v;
    else if (k === 'innerHTML') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k, v);
  }
  for (const c of children) {
    if (typeof c === 'string') e.appendChild(document.createTextNode(c));
    else if (c) e.appendChild(c);
  }
  return e;
}

/* ── Toast ── */
let toastTimer;
function showToast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

/* ── Render: Task list ── */
function renderList() {
  const listView = $('.view-list');
  const detailView = $('.view-detail');
  listView.classList.remove('hidden');
  detailView.classList.remove('active');
  state.currentTaskId = null;

  // Project name
  const projEl = $('#project-name');
  if (state.projectName) {
    projEl.textContent = state.projectName;
    projEl.style.display = '';
  } else {
    projEl.style.display = 'none';
  }

  // Filters
  $$('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === state.filter);
  });

  // Filter & search tasks
  let tasks = state.tasks;
  if (state.filter !== 'all') {
    tasks = tasks.filter(t => t.status === state.filter);
  }
  if (state.search) {
    const q = state.search.toLowerCase();
    tasks = tasks.filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q)
    );
  }

  const container = $('#task-list');
  container.innerHTML = '';

  if (tasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
          <rect x="9" y="3" width="6" height="4" rx="2"/>
          <line x1="9" y1="12" x2="15" y2="12"/>
          <line x1="9" y1="16" x2="13" y2="16"/>
        </svg>
        <p>${state.tasks.length === 0 ? 'No tasks yet. Create your first task to get started.' : 'No tasks match the current filter.'}</p>
        ${state.tasks.length === 0 ? '<button class="btn-primary" onclick="openNewTask()">New Task</button>' : ''}
      </div>`;
    return;
  }

  for (const task of tasks) {
    const doneSubtasks = (task.subtasks || []).filter(s => s.done).length;
    const totalSubtasks = (task.subtasks || []).length;

    const card = el('div', { className: 'task-card', draggable: 'true', 'data-id': task.id, onClick: () => openTask(task.id) }, [
      el('div', { className: 'task-card-header' }, [
        el('span', { className: 'task-title' }, [task.title || 'Untitled']),
      ]),
      el('div', { className: 'task-meta' }, [
        el('span', { className: `badge badge-${task.status}` }, [STATUS_LABELS[task.status]]),
        el('span', { className: `badge badge-${task.priority}` }, [PRIORITY_LABELS[task.priority]]),
        totalSubtasks > 0
          ? el('span', { className: 'subtask-count' }, [`${doneSubtasks}/${totalSubtasks} subtasks`])
          : null,
        el('span', { className: 'task-date' }, [formatDate(task.createdAt)]),
      ]),
    ]);

    // Drag support for reordering
    card.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', task.id);
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
    card.addEventListener('dragover', e => e.preventDefault());
    card.addEventListener('drop', e => {
      e.preventDefault();
      const fromId = e.dataTransfer.getData('text/plain');
      reorderTask(fromId, task.id);
    });

    container.appendChild(card);
  }
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString();
}

function reorderTask(fromId, toId) {
  if (fromId === toId) return;
  const fromIdx = state.tasks.findIndex(t => t.id === fromId);
  const toIdx = state.tasks.findIndex(t => t.id === toId);
  if (fromIdx < 0 || toIdx < 0) return;
  const [moved] = state.tasks.splice(fromIdx, 1);
  state.tasks.splice(toIdx, 0, moved);
  saveState();
  renderList();
}

/* ── Render: Task detail ── */
function openTask(id) {
  state.currentTaskId = id;
  state.descTab = 'write';
  setHash('detail', id);
  renderDetail();
}

function renderDetail() {
  const task = state.tasks.find(t => t.id === state.currentTaskId);
  if (!task) { renderList(); return; }

  const listView = $('.view-list');
  const detailView = $('.view-detail');
  listView.classList.add('hidden');
  detailView.classList.add('active');

  detailView.innerHTML = '';

  // Header
  const header = el('div', { className: 'detail-header' }, [
    el('button', { className: 'back-btn', onClick: () => { setHash('list'); renderList(); } }, [
      '\u2190 Back',
    ]),
    el('span', { className: 'task-date', style: 'font-size:12px' }, [
      'Created ' + new Date(task.createdAt).toLocaleString(),
    ]),
    el('div', { className: 'detail-actions' }, [
      el('button', { className: 'btn-secondary btn-sm', onClick: () => shareTask(task.id) }, [
        'Share Link',
      ]),
      el('button', { className: 'btn-danger btn-sm', onClick: () => deleteTask(task.id) }, [
        'Delete',
      ]),
    ]),
  ]);

  // Body
  const body = el('div', { className: 'detail-body' });

  // Title
  const titleInput = el('input', {
    className: 'detail-title-input',
    type: 'text',
    value: task.title,
    placeholder: 'Task title...',
  });
  titleInput.addEventListener('input', () => {
    task.title = titleInput.value;
    saveState();
  });
  body.appendChild(el('div', { className: 'detail-title-row' }, [titleInput]));

  // Controls
  const statusSelect = el('select');
  for (const s of STATUSES) {
    const opt = el('option', { value: s }, [STATUS_LABELS[s]]);
    if (s === task.status) opt.selected = true;
    statusSelect.appendChild(opt);
  }
  statusSelect.addEventListener('change', () => {
    task.status = statusSelect.value;
    saveState();
  });

  const prioritySelect = el('select');
  for (const p of PRIORITIES) {
    const opt = el('option', { value: p }, [PRIORITY_LABELS[p]]);
    if (p === task.priority) opt.selected = true;
    prioritySelect.appendChild(opt);
  }
  prioritySelect.addEventListener('change', () => {
    task.priority = prioritySelect.value;
    saveState();
  });

  body.appendChild(el('div', { className: 'detail-controls' }, [
    el('label', { style: 'font-size:12px;color:var(--text-muted);margin-right:-4px;align-self:center' }, ['Status']),
    statusSelect,
    el('label', { style: 'font-size:12px;color:var(--text-muted);margin-right:-4px;align-self:center;margin-left:8px' }, ['Priority']),
    prioritySelect,
  ]));

  // Description with tabs
  const descSection = el('div', { className: 'desc-section' });
  const tabWrite = el('button', {
    className: `desc-tab ${state.descTab === 'write' ? 'active' : ''}`,
    onClick: () => { state.descTab = 'write'; renderDetail(); },
  }, ['Write']);
  const tabPreview = el('button', {
    className: `desc-tab ${state.descTab === 'preview' ? 'active' : ''}`,
    onClick: () => { state.descTab = 'preview'; renderDetail(); },
  }, ['Preview']);
  descSection.appendChild(el('div', { className: 'desc-tabs' }, [tabWrite, tabPreview]));

  if (state.descTab === 'write') {
    const textarea = el('textarea', {
      className: 'desc-textarea',
      placeholder: 'Describe the task... (Markdown supported)',
    });
    textarea.value = task.description || '';
    textarea.addEventListener('input', () => {
      task.description = textarea.value;
      saveState();
    });
    descSection.appendChild(textarea);

    // Image drop/paste zone
    const dropZone = el('div', { className: 'img-drop' });
    dropZone.innerHTML = 'Drop or paste an image, or <u>click to upload</u>';
    const fileInput = el('input', { type: 'file', accept: 'image/*' });
    dropZone.appendChild(fileInput);
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) embedImage(file, textarea, task);
    });
    fileInput.addEventListener('change', () => {
      if (fileInput.files[0]) embedImage(fileInput.files[0], textarea, task);
    });

    // Paste handler on textarea
    textarea.addEventListener('paste', e => {
      const items = e.clipboardData.items;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          embedImage(item.getAsFile(), textarea, task);
          return;
        }
      }
    });

    descSection.appendChild(dropZone);
  } else {
    const preview = el('div', {
      className: 'desc-preview',
      innerHTML: renderMarkdown(task.description || '*No description yet.*'),
    });
    descSection.appendChild(preview);
  }

  body.appendChild(descSection);

  // Subtasks
  const subtaskSection = el('div', { className: 'subtasks-section' });
  const doneCount = (task.subtasks || []).filter(s => s.done).length;
  subtaskSection.appendChild(el('h3', {}, [`Subtasks (${doneCount}/${(task.subtasks || []).length})`]));

  const subtaskList = el('div', { className: 'subtask-list' });
  for (const sub of task.subtasks || []) {
    const checkbox = el('input', { type: 'checkbox' });
    checkbox.checked = sub.done;
    checkbox.addEventListener('change', () => {
      sub.done = checkbox.checked;
      saveState();
      renderDetail();
    });

    const textInput = el('input', {
      type: 'text',
      className: `subtask-text ${sub.done ? 'completed' : ''}`,
      value: sub.text,
    });
    textInput.addEventListener('input', () => {
      sub.text = textInput.value;
      saveState();
    });

    const removeBtn = el('button', {
      className: 'remove-subtask',
      onClick: () => {
        task.subtasks = task.subtasks.filter(s => s.id !== sub.id);
        saveState();
        renderDetail();
      },
    }, ['\u00d7']);

    subtaskList.appendChild(el('div', { className: 'subtask-item' }, [checkbox, textInput, removeBtn]));
  }
  subtaskSection.appendChild(subtaskList);

  const addInput = el('input', {
    type: 'text',
    className: 'add-subtask-input',
    placeholder: 'Add a subtask...',
  });
  const addBtn = el('button', { className: 'btn-secondary btn-sm', onClick: () => addSubtask(task, addInput) }, ['Add']);
  addInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') addSubtask(task, addInput);
  });
  subtaskSection.appendChild(el('div', { className: 'add-subtask-row' }, [addInput, addBtn]));

  body.appendChild(subtaskSection);
  detailView.appendChild(header);
  detailView.appendChild(body);
}

function addSubtask(task, input) {
  const text = input.value.trim();
  if (!text) return;
  if (!task.subtasks) task.subtasks = [];
  task.subtasks.push({ id: genId(), text, done: false });
  saveState();
  renderDetail();
}

function embedImage(file, textarea, task) {
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    const md = `\n![${file.name}](${dataUrl})\n`;
    const pos = textarea.selectionStart;
    task.description = (task.description || '').slice(0, pos) + md + (task.description || '').slice(pos);
    textarea.value = task.description;
    saveState();
    showToast('Image embedded');
  };
  reader.readAsDataURL(file);
}

/* ── Actions ── */
function openNewTask() {
  const task = {
    id: genId(),
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    subtasks: [],
    createdAt: new Date().toISOString(),
  };
  state.tasks.unshift(task);
  saveState();
  openTask(task.id);
}

function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveState();
  setHash('list');
  renderList();
  showToast('Task deleted');
}

function shareTask(id) {
  const url = location.origin + location.pathname + '#task/' + id;
  navigator.clipboard.writeText(url).then(() => showToast('Link copied to clipboard'));
}

function shareGlobal() {
  const url = location.origin + location.pathname;
  navigator.clipboard.writeText(url).then(() => showToast('Link copied to clipboard'));
}

/* ── Export / Import ── */
function openExportModal() {
  const modal = $('#export-modal');
  const nameInput = $('#export-project-name');
  nameInput.value = state.projectName || '';
  modal.classList.add('active');
}

function doExport() {
  const nameInput = $('#export-project-name');
  state.projectName = nameInput.value.trim();
  saveState();

  const data = {
    projectName: state.projectName,
    exportedAt: new Date().toISOString(),
    tasks: state.tasks,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${state.projectName || 'spec-helper'}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);

  $('#export-modal').classList.remove('active');
  renderList();
  showToast('Exported successfully');
}

function openImportModal() {
  const modal = $('#import-modal');
  $('#import-file').value = '';
  $('#import-info').innerHTML = '';
  modal.classList.add('active');
}

function handleImportFile(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      const info = $('#import-info');
      const name = data.projectName || '(unnamed project)';
      const count = (data.tasks || []).length;
      const date = data.exportedAt ? new Date(data.exportedAt).toLocaleString() : 'unknown';
      info.innerHTML = `<strong>Project:</strong> ${escHtml(name)}<br><strong>Tasks:</strong> ${count}<br><strong>Exported:</strong> ${date}`;
      input.dataset.parsed = reader.result;
    } catch {
      $('#import-info').innerHTML = '<span style="color:var(--red)">Invalid JSON file</span>';
      input.dataset.parsed = '';
    }
  };
  reader.readAsText(file);
}

function doImport() {
  const input = $('#import-file');
  const raw = input.dataset.parsed;
  if (!raw) { showToast('No valid file selected'); return; }

  try {
    const data = JSON.parse(raw);
    state.projectName = data.projectName || '';
    state.tasks = data.tasks || [];
    saveState();
    $('#import-modal').classList.remove('active');
    renderList();
    showToast(`Imported ${state.tasks.length} tasks`);
  } catch {
    showToast('Import failed');
  }
}

function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function closeModals() {
  $$('.modal-overlay').forEach(m => m.classList.remove('active'));
}

/* ── Init ── */
function init() {
  loadState();

  // Event: filters
  $$('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.filter = btn.dataset.filter;
      renderList();
    });
  });

  // Event: search
  $('#search').addEventListener('input', e => {
    state.search = e.target.value;
    renderList();
  });

  // Event: new task
  $('#btn-new').addEventListener('click', openNewTask);

  // Event: export/import
  $('#btn-export').addEventListener('click', openExportModal);
  $('#btn-import').addEventListener('click', openImportModal);
  $('#btn-share').addEventListener('click', shareGlobal);

  // Modal events
  $('#export-confirm').addEventListener('click', doExport);
  $('#import-file').addEventListener('change', function() { handleImportFile(this); });
  $('#import-confirm').addEventListener('click', doImport);

  // Close modals on overlay click
  $$('.modal-overlay').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) closeModals(); });
  });
  $$('.modal-close').forEach(b => b.addEventListener('click', closeModals));

  // Hash routing
  const route = readHash();
  if (route.view === 'detail' && route.taskId) {
    const task = state.tasks.find(t => t.id === route.taskId);
    if (task) {
      openTask(route.taskId);
      return;
    }
  }
  renderList();

  window.addEventListener('hashchange', () => {
    const route = readHash();
    if (route.view === 'detail' && route.taskId) {
      openTask(route.taskId);
    } else {
      renderList();
    }
  });
}

document.addEventListener('DOMContentLoaded', init);

// Expose for inline onclick
window.openNewTask = openNewTask;
