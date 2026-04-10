(function universal(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PromptUtils = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function createPromptUtils() {
  function extractVariables(content) {
    const source = String(content || '');
    const matches = source.match(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g) || [];
    const seen = new Set();
    const list = [];

    for (const token of matches) {
      const key = token.slice(2, -2).trim();
      if (!seen.has(key)) {
        seen.add(key);
        list.push(key);
      }
    }

    return list;
  }

  function renderPrompt(template, { localValues = {}, globalValues = {} } = {}) {
    return String(template || '').replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (_, variable) => {
      if (Object.prototype.hasOwnProperty.call(localValues, variable)) {
        return String(localValues[variable] ?? '');
      }
      if (Object.prototype.hasOwnProperty.call(globalValues, variable)) {
        return String(globalValues[variable] ?? '');
      }
      return '';
    });
  }

  function normalizeGlobalVariables(list) {
    if (!Array.isArray(list)) return [];
    return list
      .filter(item => item && typeof item.key === 'string' && item.key.trim())
      .map(item => ({
        key: item.key.trim(),
        value: String(item.value ?? ''),
      }));
  }

  function normalizeTemplates(list) {
    if (!Array.isArray(list)) return [];
    return list
      .filter(item => item && typeof item.name === 'string' && typeof item.content === 'string')
      .map(item => {
        const content = item.content;
        return {
          id: typeof item.id === 'string' && item.id ? item.id : generateId(),
          name: item.name.trim() || 'Untitled Prompt',
          content,
          variables: extractVariables(content),
          createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
        };
      });
  }

  function normalizeImportPayload(payload) {
    const source = payload && typeof payload === 'object' ? payload : {};
    return {
      globalVariables: normalizeGlobalVariables(source.globalVariables),
      templates: normalizeTemplates(source.templates),
    };
  }

  function generateId() {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }

  function upsertTemplate(templates, draft) {
    const list = Array.isArray(templates) ? [...templates] : [];
    const existingIndex = list.findIndex(item => item.id === draft.id);
    const existing = existingIndex >= 0 ? list[existingIndex] : null;
    const content = String(draft.content || '');

    const template = {
      id: existing?.id || draft.id || generateId(),
      name: String(draft.name || '').trim() || 'Untitled Prompt',
      content,
      variables: extractVariables(content),
      createdAt: existing?.createdAt || Date.now(),
    };

    if (existingIndex >= 0) {
      list[existingIndex] = template;
      return list;
    }

    return [template, ...list];
  }

  return {
    extractVariables,
    renderPrompt,
    normalizeImportPayload,
    generateId,
    upsertTemplate,
  };
}));
