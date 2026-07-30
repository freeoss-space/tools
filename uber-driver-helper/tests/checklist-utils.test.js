const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createChecklist,
  createItem,
  normalizeChecklists,
  checklistTitle,
  progress,
  addItem,
  removeItem,
  renameItem,
  toggleItem,
  moveItem,
  resetChecklist,
  resetAll,
  duplicateChecklist,
  starterChecklists,
} = require('../assets/checklist-utils.js');

function sample() {
  return [createChecklist({
    id: 'list-1',
    name: 'Pre-shift',
    phase: 'before',
    items: [createItem('Fuel'), createItem('Tyres'), createItem('Documents')],
  })];
}

test('progress counts completed steps', () => {
  const checklist = createChecklist({ items: [createItem('a'), createItem('b')] });
  assert.deepEqual(progress(checklist), { done: 0, total: 2, percent: 0, complete: false });

  const [toggled] = toggleItem([checklist], checklist.id, checklist.items[0].id);
  assert.deepEqual(progress(toggled), { done: 1, total: 2, percent: 50, complete: false });
});

test('progress of an empty checklist is never complete', () => {
  assert.deepEqual(progress(createChecklist()), { done: 0, total: 0, percent: 0, complete: false });
});

test('toggleItem is immutable and honours an explicit value', () => {
  const lists = sample();
  const itemId = lists[0].items[1].id;

  const next = toggleItem(lists, 'list-1', itemId, true);
  assert.equal(next[0].items[1].done, true);
  assert.equal(lists[0].items[1].done, false, 'source list must not change');

  const back = toggleItem(next, 'list-1', itemId);
  assert.equal(back[0].items[1].done, false);
});

test('resetChecklist keeps the steps and clears only the ticks', () => {
  let lists = sample();
  lists = toggleItem(lists, 'list-1', lists[0].items[0].id, true);
  lists = toggleItem(lists, 'list-1', lists[0].items[2].id, true);

  const reset = resetChecklist(lists, 'list-1', '2026-07-30T12:00:00.000Z');
  assert.deepEqual(reset[0].items.map(item => item.text), ['Fuel', 'Tyres', 'Documents']);
  assert.deepEqual(reset[0].items.map(item => item.done), [false, false, false]);
  assert.equal(reset[0].resetAt, '2026-07-30T12:00:00.000Z');
});

test('resetAll clears every checklist', () => {
  const lists = [
    createChecklist({ items: [{ id: 'a', text: 'a', done: true }] }),
    createChecklist({ items: [{ id: 'b', text: 'b', done: true }] }),
  ];

  const reset = resetAll(lists, '2026-07-30T12:00:00.000Z');
  assert.deepEqual(reset.flatMap(list => list.items.map(item => item.done)), [false, false]);
  assert.equal(reset[1].resetAt, '2026-07-30T12:00:00.000Z');
});

test('addItem trims input and skips empty steps', () => {
  const lists = addItem(sample(), 'list-1', '  Phone mount  ');
  assert.equal(lists[0].items.length, 4);
  assert.equal(lists[0].items[3].text, 'Phone mount');

  assert.equal(addItem(lists, 'list-1', '   ')[0].items.length, 4);
});

test('renameItem and removeItem target a single step', () => {
  let lists = sample();
  const itemId = lists[0].items[0].id;

  lists = renameItem(lists, 'list-1', itemId, 'Fuel level OK');
  assert.equal(lists[0].items[0].text, 'Fuel level OK');

  lists = removeItem(lists, 'list-1', itemId);
  assert.deepEqual(lists[0].items.map(item => item.text), ['Tyres', 'Documents']);
});

test('moveItem reorders and clamps at the list bounds', () => {
  const lists = sample();
  const firstId = lists[0].items[0].id;

  const moved = moveItem(lists, 'list-1', firstId, 1);
  assert.deepEqual(moved[0].items.map(item => item.text), ['Tyres', 'Fuel', 'Documents']);

  const clamped = moveItem(lists, 'list-1', firstId, -1);
  assert.deepEqual(clamped[0].items.map(item => item.text), ['Fuel', 'Tyres', 'Documents']);
});

test('duplicateChecklist copies steps unchecked with new ids', () => {
  const lists = toggleItem(sample(), 'list-1', sample()[0].items[0].id, true);
  const copy = duplicateChecklist(lists[0]);

  assert.notEqual(copy.id, lists[0].id);
  assert.equal(copy.name, 'Pre-shift (copy)');
  assert.deepEqual(copy.items.map(item => item.done), [false, false, false]);
  assert.equal(copy.items.some(item => lists[0].items.some(original => original.id === item.id)), false);
});

test('normalizeChecklists repairs unknown phases and item shapes', () => {
  const lists = normalizeChecklists([
    { name: 'Weird', phase: 'during', items: [{ text: 'ok', done: 'yes' }, 'nonsense'] },
    'not a checklist',
  ]);

  assert.equal(lists[0].phase, 'before');
  assert.equal(lists[0].items[0].done, false, 'only a real boolean counts as done');
  assert.equal(lists[0].items[1].text, '');
  assert.equal(lists[1].items.length, 0);
});

test('checklistTitle falls back to the phase label', () => {
  assert.equal(checklistTitle({ name: '', phase: 'after' }), 'After trip checklist');
  assert.equal(checklistTitle({ name: 'Pre-shift', phase: 'after' }), 'Pre-shift');
});

test('starterChecklists ships a before and an after routine with steps', () => {
  const starters = starterChecklists();
  assert.deepEqual(starters.map(list => list.phase), ['before', 'after']);
  assert.ok(starters.every(list => list.items.length > 0));
  assert.ok(starters.every(list => list.items.every(item => item.done === false)));
});
