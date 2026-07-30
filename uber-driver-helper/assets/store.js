/* Uber Driver Helper — localStorage repository
 *
 * One tiny abstraction shared by trips and checklists so persistence concerns
 * (JSON, quota errors, private-mode failures) live in exactly one place.
 */
(function universal(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ToolStore = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function createToolStore() {
  function createStore(key, { normalize = value => value, backend } = {}) {
    const storage = backend || (typeof localStorage !== 'undefined' ? localStorage : null);

    function read(fallback) {
      if (!storage) return normalize(fallback);
      try {
        const raw = storage.getItem(key);
        if (raw === null) return normalize(fallback);
        return normalize(JSON.parse(raw));
      } catch {
        return normalize(fallback);
      }
    }

    function write(value) {
      if (!storage) return false;
      try {
        storage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    }

    return { read, write };
  }

  return { createStore };
}));
