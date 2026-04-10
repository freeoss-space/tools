const STORAGE_KEY = 'prompt-foundry-state-v1';

const {
  extractVariables,
  renderPrompt,
  normalizeImportPayload,
  generateId,
} = window.PromptUtils;

const state = {
  globalVariables: [],
  templates: [],
  selectedTemplateId: null,
  localValues: {},
};

const $ = (selector) => document.querySelector(selector);

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 1800);
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    globalVariables: state.globalVariables,
    templates: state.templates,
  }));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    const normalized = normalizeImportPayload(parsed);
    state.globalVariables = normalized.globalVariables;
    state.templates = normalized.templates;
  } catch {
    showToast('Saved data could not be loaded');
  }
}

function renderBuilderVariables() {
  const vars = extractVariables($('#builder-content').value);
  const container = $('#builder-vars');
  container.innerHTML = '';
  if (!vars.length) {
    container.innerHTML = '<span class="help">No variables detected.</span>';
    return;
  }
  for (const variable of vars) {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = `{{${variable}}}`;
    container.appendChild(chip);
  }
}

function renderGlobalVariables() {
  const list = $('#global-list');
  list.innerHTML = '';
  for (const entry of state.globalVariables) {
    const row = document.createElement('div');
    row.className = 'kv-row';

    const keyInput = document.createElement('input');
    keyInput.value = entry.key;
    keyInput.placeholder = 'variable_name';
    keyInput.addEventListener('input', () => {
      entry.key = keyInput.value.trim();
      saveState();
      if (state.selectedTemplateId) renderWorkspace();
    });

    const valueInput = document.createElement('input');
    valueInput.value = entry.value;
    valueInput.placeholder = 'Default value';
    valueInput.addEventListener('input', () => {
      entry.value = valueInput.value;
      saveState();
      if (state.selectedTemplateId) renderWorkspace();
    });

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-secondary';
    removeBtn.type = 'button';
    removeBtn.textContent = 'Delete';
    removeBtn.addEventListener('click', () => {
      state.globalVariables = state.globalVariables.filter(v => v !== entry);
      saveState();
      renderGlobalVariables();
      if (state.selectedTemplateId) renderWorkspace();
    });

    row.append(keyInput, valueInput, removeBtn);
    list.appendChild(row);
  }
}

function renderTemplates() {
  const list = $('#template-list');
  list.innerHTML = '';
  $('#prompt-count').textContent = String(state.templates.length);

  if (!state.templates.length) {
    list.innerHTML = '<div class="empty">No saved prompts yet.</div>';
    return;
  }

  for (const template of state.templates) {
    const card = document.createElement('article');
    card.className = 'template-item';

    const titleRow = document.createElement('div');
    titleRow.className = 'template-title';
    const title = document.createElement('strong');
    title.textContent = template.name;
    const actions = document.createElement('div');
    actions.className = 'template-actions';

    const useBtn = document.createElement('button');
    useBtn.className = 'btn-primary';
    useBtn.type = 'button';
    useBtn.textContent = 'Use';
    useBtn.addEventListener('click', () => {
      state.selectedTemplateId = template.id;
      state.localValues = {};
      renderWorkspace();
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-secondary';
    deleteBtn.type = 'button';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => {
      state.templates = state.templates.filter(item => item.id !== template.id);
      if (state.selectedTemplateId === template.id) {
        state.selectedTemplateId = null;
        state.localValues = {};
      }
      saveState();
      renderTemplates();
      renderWorkspace();
    });

    actions.append(useBtn, deleteBtn);
    titleRow.append(title, actions);

    const preview = document.createElement('p');
    preview.textContent = template.content;

    const variables = document.createElement('div');
    variables.className = 'chips';
    for (const variable of template.variables) {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = variable;
      variables.appendChild(chip);
    }

    card.append(titleRow, preview, variables);
    list.appendChild(card);
  }
}

function mapGlobals() {
  const entries = state.globalVariables
    .filter(item => item.key)
    .map(item => [item.key, item.value]);
  return Object.fromEntries(entries);
}

function renderWorkspace() {
  const empty = $('#workspace-empty');
  const workspace = $('#workspace');
  const template = state.templates.find(item => item.id === state.selectedTemplateId);

  if (!template) {
    workspace.classList.add('hidden');
    empty.classList.remove('hidden');
    $('#generated-output').value = '';
    return;
  }

  empty.classList.add('hidden');
  workspace.classList.remove('hidden');

  $('#workspace-name').textContent = template.name;

  const varsContainer = $('#workspace-vars');
  varsContainer.innerHTML = '';

  for (const variable of template.variables) {
    const row = document.createElement('label');
    row.className = 'kv-row';
    const fieldLabel = document.createElement('span');
    fieldLabel.textContent = variable;

    const input = document.createElement('input');
    input.value = state.localValues[variable] ?? '';
    input.placeholder = mapGlobals()[variable] || 'Enter value';
    input.addEventListener('input', () => {
      state.localValues[variable] = input.value;
      updateGeneratedOutput();
    });

    row.append(fieldLabel, input);
    varsContainer.appendChild(row);
  }

  updateGeneratedOutput();
}

function updateGeneratedOutput() {
  const template = state.templates.find(item => item.id === state.selectedTemplateId);
  if (!template) return;
  const output = renderPrompt(template.content, {
    localValues: state.localValues,
    globalValues: mapGlobals(),
  });
  $('#generated-output').value = output;
}

function saveTemplateFromBuilder() {
  const name = $('#builder-name').value.trim();
  const content = $('#builder-content').value;
  if (!name || !content.trim()) {
    showToast('Name and template are required');
    return;
  }

  const template = {
    id: generateId(),
    name,
    content,
    variables: extractVariables(content),
    createdAt: Date.now(),
  };

  state.templates.unshift(template);
  saveState();
  renderTemplates();

  $('#builder-name').value = '';
  $('#builder-content').value = '';
  renderBuilderVariables();
  showToast('Prompt saved');
}

function exportJson() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    globalVariables: state.globalVariables,
    templates: state.templates,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'prompt-foundry-export.json';
  link.click();
  URL.revokeObjectURL(url);
  showToast('Exported prompts');
}

async function importJson(file) {
  if (!file) return;
  try {
    const raw = await file.text();
    const parsed = JSON.parse(raw);
    const normalized = normalizeImportPayload(parsed);
    state.globalVariables = normalized.globalVariables;
    state.templates = normalized.templates;
    state.selectedTemplateId = null;
    state.localValues = {};
    saveState();
    renderGlobalVariables();
    renderTemplates();
    renderWorkspace();
    showToast('Imported prompts');
  } catch {
    showToast('Invalid JSON file');
  }
}

function bindEvents() {
  $('#builder-content').addEventListener('input', renderBuilderVariables);
  $('#save-template-btn').addEventListener('click', saveTemplateFromBuilder);

  $('#add-global-btn').addEventListener('click', () => {
    state.globalVariables.push({ key: '', value: '' });
    saveState();
    renderGlobalVariables();
  });

  $('#copy-output-btn').addEventListener('click', async () => {
    const text = $('#generated-output').value;
    if (!text) return;
    await navigator.clipboard.writeText(text);
    showToast('Prompt copied');
  });

  $('#export-btn').addEventListener('click', exportJson);
  $('#import-input').addEventListener('change', (event) => {
    const [file] = event.target.files;
    importJson(file);
    event.target.value = '';
  });
}

function init() {
  loadState();
  renderBuilderVariables();
  renderGlobalVariables();
  renderTemplates();
  renderWorkspace();
  bindEvents();
}

init();
