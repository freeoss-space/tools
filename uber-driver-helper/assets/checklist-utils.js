/* Uber Driver Helper — checklist domain logic
 *
 * Pure functions over immutable checklist values: every mutation helper returns
 * a new list, so the UI layer only has to re-render and persist.
 */
(function universal(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ChecklistUtils = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function createChecklistUtils() {
  const PHASES = [
    { id: 'before', label: 'Before trip' },
    { id: 'after', label: 'After trip' },
    { id: 'anytime', label: 'Anytime' },
  ];

  const PHASE_IDS = PHASES.map(phase => phase.id);

  function generateId() {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }

  function toText(value) {
    return String(value ?? '');
  }

  function phaseLabel(id) {
    const match = PHASES.find(phase => phase.id === id);
    return match ? match.label : 'Anytime';
  }

  /* ── Factories & normalization ── */

  function createItem(text = '') {
    return { id: generateId(), text: toText(text), done: false };
  }

  function createChecklist(overrides = {}) {
    return normalizeChecklist({
      id: generateId(),
      name: '',
      phase: 'before',
      items: [],
      resetAt: null,
      ...overrides,
    });
  }

  function normalizeItem(raw) {
    const item = raw && typeof raw === 'object' ? raw : {};
    return {
      id: toText(item.id) || generateId(),
      text: toText(item.text),
      done: item.done === true,
    };
  }

  function normalizeChecklist(raw) {
    const checklist = raw && typeof raw === 'object' ? raw : {};
    const phase = toText(checklist.phase);
    return {
      id: toText(checklist.id) || generateId(),
      name: toText(checklist.name),
      phase: PHASE_IDS.includes(phase) ? phase : 'before',
      items: Array.isArray(checklist.items) ? checklist.items.map(normalizeItem) : [],
      resetAt: checklist.resetAt ? toText(checklist.resetAt) : null,
    };
  }

  function normalizeChecklists(value) {
    return Array.isArray(value) ? value.map(normalizeChecklist) : [];
  }

  function checklistTitle(checklist) {
    const source = normalizeChecklist(checklist);
    return source.name.trim() || `${phaseLabel(source.phase)} checklist`;
  }

  /* ── Progress ── */

  function progress(checklist) {
    const items = (checklist && Array.isArray(checklist.items)) ? checklist.items : [];
    const total = items.length;
    const done = items.filter(item => item.done).length;
    return {
      done,
      total,
      percent: total ? Math.round((done / total) * 100) : 0,
      complete: total > 0 && done === total,
    };
  }

  /* ── Mutations (all return new values) ── */

  function replaceById(list, id, transform) {
    return (Array.isArray(list) ? list : []).map(entry => (entry.id === id ? transform(entry) : entry));
  }

  function updateChecklist(checklists, checklistId, transform) {
    return replaceById(checklists, checklistId, checklist => normalizeChecklist(transform(checklist)));
  }

  function addChecklist(checklists, checklist) {
    return [...(Array.isArray(checklists) ? checklists : []), normalizeChecklist(checklist)];
  }

  function removeChecklist(checklists, checklistId) {
    return (Array.isArray(checklists) ? checklists : []).filter(checklist => checklist.id !== checklistId);
  }

  /** Fresh copy of a checklist with new ids and every step unchecked. */
  function duplicateChecklist(checklist) {
    const source = normalizeChecklist(checklist);
    return normalizeChecklist({
      ...source,
      id: generateId(),
      name: `${checklistTitle(source)} (copy)`,
      items: source.items.map(item => ({ ...item, id: generateId(), done: false })),
      resetAt: null,
    });
  }

  function renameChecklist(checklists, checklistId, name) {
    return updateChecklist(checklists, checklistId, checklist => ({ ...checklist, name: toText(name) }));
  }

  function setChecklistPhase(checklists, checklistId, phase) {
    return updateChecklist(checklists, checklistId, checklist => ({ ...checklist, phase }));
  }

  function addItem(checklists, checklistId, text) {
    const value = toText(text).trim();
    if (!value) return Array.isArray(checklists) ? checklists : [];
    return updateChecklist(checklists, checklistId, checklist => ({
      ...checklist,
      items: [...checklist.items, createItem(value)],
    }));
  }

  function removeItem(checklists, checklistId, itemId) {
    return updateChecklist(checklists, checklistId, checklist => ({
      ...checklist,
      items: checklist.items.filter(item => item.id !== itemId),
    }));
  }

  function renameItem(checklists, checklistId, itemId, text) {
    return updateChecklist(checklists, checklistId, checklist => ({
      ...checklist,
      items: replaceById(checklist.items, itemId, item => ({ ...item, text: toText(text) })),
    }));
  }

  function toggleItem(checklists, checklistId, itemId, done) {
    return updateChecklist(checklists, checklistId, checklist => ({
      ...checklist,
      items: replaceById(checklist.items, itemId, item => ({
        ...item,
        done: done === undefined ? !item.done : done === true,
      })),
    }));
  }

  /** Moves a step by `delta` positions, clamped to the list bounds. */
  function moveItem(checklists, checklistId, itemId, delta) {
    return updateChecklist(checklists, checklistId, checklist => {
      const items = [...checklist.items];
      const from = items.findIndex(item => item.id === itemId);
      if (from < 0) return checklist;
      const to = Math.min(Math.max(from + delta, 0), items.length - 1);
      if (to === from) return checklist;
      const [moved] = items.splice(from, 1);
      items.splice(to, 0, moved);
      return { ...checklist, items };
    });
  }

  /** Unchecks every step but keeps them — the pilot-checklist reset. */
  function resetChecklist(checklists, checklistId, now = new Date().toISOString()) {
    return updateChecklist(checklists, checklistId, checklist => ({
      ...checklist,
      items: checklist.items.map(item => ({ ...item, done: false })),
      resetAt: now,
    }));
  }

  function resetAll(checklists, now = new Date().toISOString()) {
    return (Array.isArray(checklists) ? checklists : []).map(checklist => normalizeChecklist({
      ...checklist,
      items: (checklist.items || []).map(item => ({ ...item, done: false })),
      resetAt: now,
    }));
  }

  /* ── Starter content ── */

  function starterChecklists() {
    return [
      createChecklist({
        name: 'Pre-shift',
        phase: 'before',
        items: [
          'Fuel level / charge OK',
          'Tyre pressure checked',
          'Oil and water levels OK',
          'Documents in the car (CNH, CRLV)',
          'Phone charger and mount working',
          'Interior clean, no smell',
          'Water bottles and mints stocked',
          'Uber and 99 apps online',
          'Odometer start reading noted',
        ].map(createItem),
      }),
      createChecklist({
        name: 'Post-shift',
        phase: 'after',
        items: [
          'Odometer end reading noted',
          'Earnings from Uber and 99 recorded',
          'Fuel and toll receipts logged',
          'Lost items check (back seat, trunk)',
          'Trash removed, seats wiped',
          'Apps offline, phone charging',
        ].map(createItem),
      }),
    ];
  }

  return {
    PHASES,
    generateId,
    phaseLabel,
    createItem,
    createChecklist,
    normalizeChecklist,
    normalizeChecklists,
    checklistTitle,
    progress,
    addChecklist,
    removeChecklist,
    duplicateChecklist,
    renameChecklist,
    setChecklistPhase,
    addItem,
    removeItem,
    renameItem,
    toggleItem,
    moveItem,
    resetChecklist,
    resetAll,
    starterChecklists,
  };
}));
