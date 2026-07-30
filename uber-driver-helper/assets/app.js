/* Uber Driver Helper — UI layer
 *
 * Owns state, persistence wiring, routing and rendering only; all arithmetic
 * and value transformations live in trip-utils.js / checklist-utils.js.
 */

const Trips = window.TripUtils;
const Checklists = window.ChecklistUtils;

const tripStore = window.ToolStore.createStore('uber-driver-helper-trips', {
  normalize: Trips.normalizeTrips,
});
const checklistStore = window.ToolStore.createStore('uber-driver-helper-checklists', {
  normalize: Checklists.normalizeChecklists,
});

const state = {
  tab: 'trip',
  trips: [],
  activeTripId: null,
  checklists: [],
  shared: null,
};

/* ── Persistence ── */

function saveTrips() {
  tripStore.write(state.trips);
}

function saveChecklists() {
  checklistStore.write(state.checklists);
}

function touchTrip(trip) {
  trip.updatedAt = new Date().toISOString();
  saveTrips();
}

/* ── DOM helpers ── */

const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'className') node.className = value;
    else if (key === 'value') node.value = value;
    else if (key === 'checked') node.checked = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
    else node.setAttribute(key, value);
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;
    node.appendChild(typeof child === 'object' ? child : document.createTextNode(String(child)));
  }
  return node;
}

function clear(node) {
  node.textContent = '';
  return node;
}

function icon(path) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.innerHTML = path;
  return svg;
}

let toastTimer;
function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}

function copyText(text, message) {
  const done = () => showToast(message);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
    return;
  }
  fallbackCopy(text, done);
}

function fallbackCopy(text, done) {
  const area = el('textarea', { value: text, style: 'position:fixed;opacity:0' });
  document.body.appendChild(area);
  area.select();
  try {
    document.execCommand('copy');
    done();
  } catch {
    showToast('Copy failed — copy it manually');
  }
  area.remove();
}

function select(options, selected, onChange) {
  const node = el('select', { className: 'field', onChange });
  for (const option of options) {
    node.appendChild(el('option', { value: option.id, selected: option.id === selected }, [option.label]));
  }
  return node;
}

function numberField(value, placeholder, onInput, extraClass = '') {
  return el('input', {
    type: 'text',
    inputmode: 'decimal',
    className: `field field-num ${extraClass}`.trim(),
    value,
    placeholder,
    onInput,
  });
}

function iconButton(title, path, onClick, className = 'btn-icon-ghost') {
  return el('button', { className, type: 'button', title, 'aria-label': title, onClick }, [icon(path)]);
}

const ICONS = {
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
  up: '<polyline points="18 15 12 9 6 15"/>',
  down: '<polyline points="6 9 12 15 18 9"/>',
  share: '<path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>',
  duplicate: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 012-2h10"/>',
  reset: '<path d="M3 12a9 9 0 019-9 9 9 0 018 5"/><polyline points="20 3 20 8 15 8"/><path d="M21 12a9 9 0 01-9 9 9 9 0 01-8-5"/><polyline points="4 21 4 16 9 16"/>',
};

/* ── Routing ── */

function parseHash() {
  const hash = location.hash.replace(/^#/, '');
  if (hash.startsWith('s=')) return { tab: 'trip', shareCode: hash.slice(2) };
  if (hash === 'checklists') return { tab: 'checklists', shareCode: null };
  return { tab: 'trip', shareCode: null };
}

function applyHash() {
  const { tab, shareCode } = parseHash();
  state.tab = tab;
  state.shared = shareCode ? Trips.decodeTrip(shareCode) : null;
  if (shareCode && !state.shared) {
    history.replaceState(null, '', location.pathname);
    showToast('That shared link could not be read');
  }
  render();
}

function goToTab(tab) {
  if (tab === 'checklists') {
    location.hash = 'checklists';
    return;
  }
  history.replaceState(null, '', location.pathname);
  state.tab = 'trip';
  render();
}

function dismissShared() {
  state.shared = null;
  history.replaceState(null, '', location.pathname);
  render();
}

/* ── Render: shell ── */

function render() {
  $$('.tab').forEach(button => {
    const active = button.dataset.tab === state.tab;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  $('#panel-trip').classList.toggle('hidden', state.tab !== 'trip');
  $('#panel-checklists').classList.toggle('hidden', state.tab !== 'checklists');

  if (state.tab === 'trip') renderTripPanel();
  else renderChecklistPanel();
}

/* ── Render: shared stats (used by editor and shared preview) ── */

function statCard(label, value, sub, tone) {
  return el('div', { className: `stat ${tone ? `stat-${tone}` : ''}`.trim() }, [
    el('span', { className: 'stat-label' }, [label]),
    el('span', { className: 'stat-value' }, [value]),
    el('span', { className: 'stat-sub' }, [sub || ' ']),
  ]);
}

function statsGrid(trip) {
  const totals = Trips.tripTotals(trip);
  const legLabel = `${totals.legCount} leg${totals.legCount === 1 ? '' : 's'}`;
  const perKm = totals.netPerKm === null ? 'no distance yet' : `${Trips.formatRate(totals.netPerKm, 'km')} net`;
  const timeSub = totals.durationMinutes === null
    ? 'set start/end time'
    : `${Trips.formatRate(totals.netPerHour, 'h')} net`;

  return el('div', { className: 'stats' }, [
    statCard('Distance', Trips.formatKm(totals.totalKm), legLabel, 'info'),
    statCard('Earnings', Trips.formatCurrency(totals.totalEarnings), earningsSub(totals), 'success'),
    statCard('Expenses', Trips.formatCurrency(totals.totalExpenses), totals.costPerKm === null
      ? 'no expenses logged'
      : `${Trips.formatRate(totals.costPerKm, 'km')} cost`, 'error'),
    statCard('Net', Trips.formatCurrency(totals.net), perKm, totals.net < 0 ? 'error' : 'net'),
    statCard('Time online', Trips.formatDuration(totals.durationMinutes), timeSub, 'warning'),
    statCard('Rides', String(totals.rides || 0), totals.netPerRide === null
      ? 'add ride counts'
      : `${Trips.formatCurrency(totals.netPerRide)} net each`, 'info'),
  ]);
}

function earningsSub(totals) {
  const parts = Object.entries(totals.earningsByPlatform)
    .filter(([, amount]) => amount > 0)
    .map(([platform, amount]) => `${Trips.platformLabel(platform)} ${Trips.formatCurrency(amount)}`);
  return parts.length ? parts.join(' · ') : 'no earnings yet';
}

function section(title, hint, rows, footer) {
  return el('section', { className: 'card' }, [
    el('div', { className: 'card-head' }, [
      el('h2', { className: 'card-title' }, [title]),
      hint ? el('span', { className: 'card-hint' }, [hint]) : null,
    ]),
    el('div', { className: 'rows' }, rows),
    footer || null,
  ]);
}

function rowHeader(labels, className) {
  return el('div', { className: `row row-header ${className}` }, labels.map(label => el('span', {}, [label])));
}

function emptyRow(message) {
  return el('p', { className: 'empty' }, [message]);
}

/* ── Render: trip panel ── */

function sortedTrips() {
  return [...state.trips].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.createdAt < b.createdAt ? 1 : -1;
  });
}

function activeTrip() {
  return state.trips.find(trip => trip.id === state.activeTripId) || null;
}

function renderTripPanel() {
  renderTripList();
  const main = clear($('#trip-main'));

  if (state.shared) {
    main.appendChild(renderSharedCard(state.shared));
    return;
  }

  const trip = activeTrip();
  if (!trip) {
    main.appendChild(el('div', { className: 'card empty-state' }, [
      el('h2', { className: 'card-title' }, ['No trip card selected']),
      el('p', { className: 'empty' }, [
        'Create a card for a shift, log the odometer at the start and end of each trip, then add what you earned on Uber and 99 and what you spent.',
      ]),
      el('button', { className: 'btn btn-primary', type: 'button', onClick: createTrip }, ['+ New trip card']),
    ]));
    return;
  }

  main.appendChild(renderTripEditor(trip));
}

function renderTripList() {
  const list = clear($('#trip-list'));
  const trips = sortedTrips();

  if (!trips.length) {
    list.appendChild(emptyRow('No cards yet.'));
  }

  for (const trip of trips) {
    const totals = Trips.tripTotals(trip);
    const active = !state.shared && trip.id === state.activeTripId;
    list.appendChild(el('button', {
      className: `trip-item ${active ? 'active' : ''}`.trim(),
      type: 'button',
      onClick: () => selectTrip(trip.id),
    }, [
      el('span', { className: 'trip-item-date' }, [trip.date]),
      el('span', { className: 'trip-item-name' }, [Trips.tripTitle(trip)]),
      el('span', { className: 'trip-item-meta' }, [
        `${Trips.formatKm(totals.totalKm)} · `,
        el('strong', { className: totals.net < 0 ? 'negative' : 'positive' }, [Trips.formatCurrency(totals.net)]),
      ]),
    ]));
  }

  const overall = Trips.sumTrips(state.trips);
  const footer = clear($('#trip-list-total'));
  if (overall.trips) {
    footer.appendChild(el('span', {}, [`${overall.trips} card${overall.trips === 1 ? '' : 's'}`]));
    footer.appendChild(el('span', {}, [Trips.formatKm(overall.totalKm)]));
    footer.appendChild(el('strong', { className: overall.net < 0 ? 'negative' : 'positive' }, [
      Trips.formatCurrency(overall.net),
    ]));
  }
}

function renderTripEditor(trip) {
  const editor = el('div', { className: 'editor' });

  const nameInput = el('input', {
    type: 'text',
    className: 'title-input',
    value: trip.name,
    placeholder: 'Friday night shift',
    onInput: event => { trip.name = event.target.value; touchTrip(trip); renderTripList(); },
  });

  editor.appendChild(el('div', { className: 'card editor-head' }, [
    nameInput,
    el('div', { className: 'editor-meta' }, [
      labelled('Date', el('input', {
        type: 'date',
        className: 'field',
        value: trip.date,
        onChange: event => { trip.date = event.target.value || Trips.today(); touchTrip(trip); renderTripPanel(); },
      })),
      labelled('Start', el('input', {
        type: 'time',
        className: 'field',
        value: trip.startedAt,
        onChange: event => { trip.startedAt = event.target.value; touchTrip(trip); refreshStats(trip); },
      })),
      labelled('End', el('input', {
        type: 'time',
        className: 'field',
        value: trip.endedAt,
        onChange: event => { trip.endedAt = event.target.value; touchTrip(trip); refreshStats(trip); },
      })),
    ]),
    el('div', { className: 'editor-actions' }, [
      el('button', { className: 'btn btn-secondary btn-sm', type: 'button', onClick: () => shareTrip(trip) }, [
        icon(ICONS.share), 'Share link',
      ]),
      el('button', { className: 'btn btn-ghost btn-sm', type: 'button', onClick: () => copySummary(trip) }, [
        icon(ICONS.copy), 'Copy summary',
      ]),
      el('button', { className: 'btn btn-ghost btn-sm', type: 'button', onClick: () => duplicateTrip(trip) }, [
        icon(ICONS.duplicate), 'Duplicate',
      ]),
      el('button', { className: 'btn btn-ghost btn-sm danger', type: 'button', onClick: () => deleteTrip(trip) }, [
        icon(ICONS.trash), 'Delete',
      ]),
    ]),
  ]));

  const stats = el('div', { id: 'trip-stats' }, [statsGrid(trip)]);
  editor.appendChild(stats);

  editor.appendChild(renderLegsSection(trip));
  editor.appendChild(renderEarningsSection(trip));
  editor.appendChild(renderExpensesSection(trip));

  return editor;
}

function labelled(label, field) {
  return el('label', { className: 'field-label' }, [el('span', {}, [label]), field]);
}

/** Recomputes only the stats block, so typing never loses input focus. */
function refreshStats(trip) {
  const holder = $('#trip-stats');
  if (holder) clear(holder).appendChild(statsGrid(trip));
  renderTripList();
}

function renderLegsSection(trip) {
  const rows = [rowHeader(['Start km', 'End km', 'Note', 'Distance', ''], 'row-leg')];

  trip.legs.forEach((leg, index) => {
    const distance = el('span', { className: 'row-total' }, [Trips.formatKm(Trips.legDistance(leg))]);
    const row = el('div', { className: 'row row-leg' });

    const onKmInput = () => {
      distance.textContent = Trips.formatKm(Trips.legDistance(leg));
      row.classList.toggle('row-error', Trips.legHasError(leg));
      touchTrip(trip);
      refreshStats(trip);
    };

    row.appendChild(numberField(leg.startKm, 'e.g. 45210', event => { leg.startKm = event.target.value; onKmInput(); }));
    row.appendChild(numberField(leg.endKm, 'e.g. 45268', event => { leg.endKm = event.target.value; onKmInput(); }));
    row.appendChild(el('input', {
      type: 'text',
      className: 'field',
      value: leg.note,
      placeholder: `Leg ${index + 1} note (optional)`,
      onInput: event => { leg.note = event.target.value; touchTrip(trip); },
    }));
    row.appendChild(distance);
    row.appendChild(iconButton('Remove leg', ICONS.trash, () => {
      trip.legs = trip.legs.filter(item => item.id !== leg.id);
      if (!trip.legs.length) trip.legs.push(Trips.createLeg(null));
      touchTrip(trip);
      renderTripPanel();
    }));

    if (Trips.legHasError(leg)) row.classList.add('row-error');
    rows.push(row);
  });

  const addLeg = el('button', { className: 'btn btn-secondary btn-sm', type: 'button', onClick: () => {
    trip.legs.push(Trips.createLeg(trip.legs[trip.legs.length - 1]));
    touchTrip(trip);
    renderTripPanel();
  } }, ['+ Add leg']);

  return section(
    'Trips (odometer)',
    'A new leg starts where the previous one ended.',
    rows,
    el('div', { className: 'card-foot' }, [addLeg]),
  );
}

function renderEarningsSection(trip) {
  const rows = [rowHeader(['Platform', 'Amount', 'Rides', ''], 'row-money')];

  if (!trip.earnings.length) rows.push(emptyRow('No earnings logged for this shift yet.'));

  for (const earning of trip.earnings) {
    const row = el('div', { className: 'row row-money' }, [
      select(Trips.PLATFORMS, earning.platform, event => {
        earning.platform = event.target.value;
        touchTrip(trip);
        refreshStats(trip);
      }),
      numberField(earning.amount, 'R$ 0,00', event => {
        earning.amount = event.target.value;
        touchTrip(trip);
        refreshStats(trip);
      }),
      numberField(earning.rides, 'rides', event => {
        earning.rides = event.target.value;
        touchTrip(trip);
        refreshStats(trip);
      }),
      iconButton('Remove earning', ICONS.trash, () => {
        trip.earnings = trip.earnings.filter(item => item.id !== earning.id);
        touchTrip(trip);
        renderTripPanel();
      }),
    ]);
    rows.push(row);
  }

  const addEarning = el('button', { className: 'btn btn-secondary btn-sm', type: 'button', onClick: () => {
    trip.earnings.push(Trips.createEarning('uber'));
    touchTrip(trip);
    renderTripPanel();
  } }, ['+ Add earning']);

  return section('Gains', 'One row per platform payout.', rows, el('div', { className: 'card-foot' }, [addEarning]));
}

function renderExpensesSection(trip) {
  const rows = [rowHeader(['Description', 'Category', 'Amount', ''], 'row-money')];

  if (!trip.expenses.length) rows.push(emptyRow('No expenses logged for this shift yet.'));

  for (const expense of trip.expenses) {
    rows.push(el('div', { className: 'row row-money' }, [
      el('input', {
        type: 'text',
        className: 'field',
        value: expense.label,
        placeholder: 'Fuel at Shell',
        onInput: event => { expense.label = event.target.value; touchTrip(trip); },
      }),
      select(Trips.EXPENSE_CATEGORIES, expense.category, event => {
        expense.category = event.target.value;
        touchTrip(trip);
        refreshStats(trip);
      }),
      numberField(expense.amount, 'R$ 0,00', event => {
        expense.amount = event.target.value;
        touchTrip(trip);
        refreshStats(trip);
      }),
      iconButton('Remove expense', ICONS.trash, () => {
        trip.expenses = trip.expenses.filter(item => item.id !== expense.id);
        touchTrip(trip);
        renderTripPanel();
      }),
    ]));
  }

  const addExpense = el('button', { className: 'btn btn-secondary btn-sm', type: 'button', onClick: () => {
    trip.expenses.push(Trips.createExpense('fuel'));
    touchTrip(trip);
    renderTripPanel();
  } }, ['+ Add expense']);

  return section('Expenses', 'Fuel, tolls, food, car wash…', rows, el('div', { className: 'card-foot' }, [addExpense]));
}

/* ── Render: shared card (read-only) ── */

function renderSharedCard(trip) {
  const wrapper = el('div', { className: 'editor' });

  wrapper.appendChild(el('div', { className: 'banner' }, [
    el('div', {}, [
      el('strong', {}, ['Shared trip card']),
      el('p', { className: 'empty' }, ['Read-only preview from a shared link. Save it to edit your own copy.']),
    ]),
    el('div', { className: 'banner-actions' }, [
      el('button', { className: 'btn btn-primary btn-sm', type: 'button', onClick: () => importShared(trip) }, ['Save to my cards']),
      el('button', { className: 'btn btn-ghost btn-sm', type: 'button', onClick: dismissShared }, ['Dismiss']),
    ]),
  ]));

  wrapper.appendChild(el('div', { className: 'card editor-head' }, [
    el('h2', { className: 'shared-title' }, [Trips.tripTitle(trip)]),
    el('span', { className: 'card-hint' }, [
      [trip.date, trip.startedAt && trip.endedAt ? `${trip.startedAt}–${trip.endedAt}` : null]
        .filter(Boolean).join(' · '),
    ]),
    el('div', { className: 'editor-actions' }, [
      el('button', {
        className: 'btn btn-ghost btn-sm',
        type: 'button',
        onClick: () => copyText(Trips.tripSummaryText(trip), 'Summary copied'),
      }, [icon(ICONS.copy), 'Copy summary']),
    ]),
  ]));

  wrapper.appendChild(statsGrid(trip));

  const legRows = [rowHeader(['Start km', 'End km', 'Note', 'Distance'], 'row-leg-read')];
  for (const leg of trip.legs) {
    legRows.push(el('div', { className: 'row row-leg-read' }, [
      el('span', {}, [leg.startKm || '—']),
      el('span', {}, [leg.endKm || '—']),
      el('span', { className: 'muted' }, [leg.note || '—']),
      el('span', { className: 'row-total' }, [Trips.formatKm(Trips.legDistance(leg))]),
    ]));
  }
  wrapper.appendChild(section('Trips (odometer)', null, legRows));

  const earningRows = [rowHeader(['Platform', 'Rides', 'Amount'], 'row-read-3')];
  for (const earning of trip.earnings) {
    earningRows.push(el('div', { className: 'row row-read-3' }, [
      el('span', {}, [Trips.platformLabel(earning.platform)]),
      el('span', { className: 'muted' }, [earning.rides || '—']),
      el('span', { className: 'row-total positive' }, [Trips.formatCurrency(earning.amount)]),
    ]));
  }
  wrapper.appendChild(section('Gains', null, trip.earnings.length ? earningRows : [emptyRow('No earnings logged.')]));

  const expenseRows = [rowHeader(['Description', 'Category', 'Amount'], 'row-read-3')];
  for (const expense of trip.expenses) {
    expenseRows.push(el('div', { className: 'row row-read-3' }, [
      el('span', {}, [expense.label || '—']),
      el('span', { className: 'muted' }, [Trips.categoryLabel(expense.category)]),
      el('span', { className: 'row-total negative' }, [Trips.formatCurrency(expense.amount)]),
    ]));
  }
  wrapper.appendChild(section('Expenses', null, trip.expenses.length ? expenseRows : [emptyRow('No expenses logged.')]));

  return wrapper;
}

/* ── Trip actions ── */

function selectTrip(id) {
  state.activeTripId = id;
  state.shared = null;
  if (location.hash) history.replaceState(null, '', location.pathname);
  renderTripPanel();
}

function createTrip() {
  const trip = Trips.createTrip();
  state.trips.push(trip);
  saveTrips();
  selectTrip(trip.id);
}

function duplicateTrip(trip) {
  const copy = Trips.cloneTrip(trip, { date: Trips.today() });
  copy.legs = [Trips.createLeg(trip.legs[trip.legs.length - 1])];
  copy.earnings = copy.earnings.map(earning => ({ ...earning, amount: '', rides: '' }));
  copy.expenses = copy.expenses.map(expense => ({ ...expense, amount: '' }));
  state.trips.push(copy);
  saveTrips();
  selectTrip(copy.id);
  showToast('Card duplicated — amounts cleared');
}

function deleteTrip(trip) {
  if (!confirm(`Delete "${Trips.tripTitle(trip)}"?`)) return;
  state.trips = state.trips.filter(item => item.id !== trip.id);
  if (state.activeTripId === trip.id) {
    state.activeTripId = state.trips.length ? sortedTrips()[0].id : null;
  }
  saveTrips();
  renderTripPanel();
  showToast('Card deleted');
}

function shareUrlFor(trip) {
  return `${location.origin}${location.pathname}#s=${Trips.encodeTrip(trip)}`;
}

function shareTrip(trip) {
  copyText(shareUrlFor(trip), 'Share link copied');
}

function copySummary(trip) {
  copyText(Trips.tripSummaryText(trip, shareUrlFor(trip)), 'Summary copied');
}

function importShared(trip) {
  const copy = Trips.cloneTrip(trip);
  state.trips.push(copy);
  saveTrips();
  state.shared = null;
  history.replaceState(null, '', location.pathname);
  selectTrip(copy.id);
  showToast('Shared card saved');
}

/* ── Render: checklists panel ── */

function renderChecklistPanel() {
  const grid = clear($('#checklist-grid'));

  if (!state.checklists.length) {
    grid.appendChild(el('div', { className: 'card empty-state' }, [
      el('h2', { className: 'card-title' }, ['No checklists yet']),
      el('p', { className: 'empty' }, [
        'Build the routine you run before and after every shift. Steps stay put — reset clears the ticks only.',
      ]),
      el('div', { className: 'card-foot' }, [
        el('button', { className: 'btn btn-primary btn-sm', type: 'button', onClick: createChecklist }, ['+ New checklist']),
        el('button', { className: 'btn btn-secondary btn-sm', type: 'button', onClick: loadStarters }, ['Load starter checklists']),
      ]),
    ]));
    return;
  }

  for (const checklist of state.checklists) {
    grid.appendChild(renderChecklistCard(checklist));
  }
}

function renderChecklistCard(checklist) {
  const stats = Checklists.progress(checklist);

  const card = el('section', { className: `card checklist ${stats.complete ? 'complete' : ''}`.trim() }, [
    el('div', { className: 'checklist-head' }, [
      el('input', {
        type: 'text',
        className: 'title-input title-input-sm',
        value: checklist.name,
        placeholder: 'Checklist name',
        onInput: event => {
          state.checklists = Checklists.renameChecklist(state.checklists, checklist.id, event.target.value);
          saveChecklists();
        },
      }),
      select(Checklists.PHASES, checklist.phase, event => {
        state.checklists = Checklists.setChecklistPhase(state.checklists, checklist.id, event.target.value);
        saveChecklists();
        renderChecklistPanel();
      }),
    ]),
    el('div', { className: 'progress' }, [
      el('div', { className: 'progress-bar' }, [
        el('span', { className: 'progress-fill', style: `width:${stats.percent}%` }),
      ]),
      el('span', { className: 'progress-text' }, [`${stats.done}/${stats.total}`]),
    ]),
  ]);

  const items = el('div', { className: 'check-items' });
  if (!checklist.items.length) items.appendChild(emptyRow('No steps yet — add the first one below.'));

  checklist.items.forEach((item, index) => {
    const row = el('div', { className: `check-item ${item.done ? 'done' : ''}`.trim() }, [
      el('input', {
        type: 'checkbox',
        className: 'check-box',
        checked: item.done,
        'aria-label': item.text || `Step ${index + 1}`,
        onChange: event => {
          state.checklists = Checklists.toggleItem(state.checklists, checklist.id, item.id, event.target.checked);
          saveChecklists();
          renderChecklistPanel();
        },
      }),
      el('input', {
        type: 'text',
        className: 'check-text',
        value: item.text,
        placeholder: `Step ${index + 1}`,
        onInput: event => {
          state.checklists = Checklists.renameItem(state.checklists, checklist.id, item.id, event.target.value);
          saveChecklists();
        },
      }),
      iconButton('Move up', ICONS.up, () => moveChecklistItem(checklist.id, item.id, -1)),
      iconButton('Move down', ICONS.down, () => moveChecklistItem(checklist.id, item.id, 1)),
      iconButton('Remove step', ICONS.trash, () => {
        state.checklists = Checklists.removeItem(state.checklists, checklist.id, item.id);
        saveChecklists();
        renderChecklistPanel();
      }),
    ]);
    items.appendChild(row);
  });
  card.appendChild(items);

  const addInput = el('input', {
    type: 'text',
    className: 'field',
    placeholder: 'Add a step…',
    onKeydown: event => {
      if (event.key !== 'Enter') return;
      addChecklistItem(checklist.id, event.target);
    },
  });

  card.appendChild(el('div', { className: 'check-add' }, [
    addInput,
    el('button', {
      className: 'btn btn-secondary btn-sm',
      type: 'button',
      onClick: () => addChecklistItem(checklist.id, addInput),
    }, ['Add']),
  ]));

  card.appendChild(el('div', { className: 'card-foot checklist-foot' }, [
    el('span', { className: 'card-hint' }, [
      checklist.resetAt ? `Reset ${formatRelative(checklist.resetAt)}` : 'Never reset',
    ]),
    el('div', { className: 'checklist-foot-actions' }, [
      el('button', {
        className: 'btn btn-secondary btn-sm',
        type: 'button',
        onClick: () => {
          state.checklists = Checklists.resetChecklist(state.checklists, checklist.id);
          saveChecklists();
          renderChecklistPanel();
          showToast('Checklist reset');
        },
      }, [icon(ICONS.reset), 'Reset']),
      iconButton('Duplicate checklist', ICONS.duplicate, () => {
        state.checklists = Checklists.addChecklist(state.checklists, Checklists.duplicateChecklist(checklist));
        saveChecklists();
        renderChecklistPanel();
      }),
      iconButton('Delete checklist', ICONS.trash, () => {
        if (!confirm(`Delete "${Checklists.checklistTitle(checklist)}"?`)) return;
        state.checklists = Checklists.removeChecklist(state.checklists, checklist.id);
        saveChecklists();
        renderChecklistPanel();
      }),
    ]),
  ]));

  return card;
}

function addChecklistItem(checklistId, input) {
  const text = input.value.trim();
  if (!text) return;
  state.checklists = Checklists.addItem(state.checklists, checklistId, text);
  saveChecklists();
  input.value = '';
  renderChecklistPanel();
}

function moveChecklistItem(checklistId, itemId, delta) {
  state.checklists = Checklists.moveItem(state.checklists, checklistId, itemId, delta);
  saveChecklists();
  renderChecklistPanel();
}

function createChecklist() {
  const checklist = Checklists.createChecklist({ name: '' });
  state.checklists = Checklists.addChecklist(state.checklists, checklist);
  saveChecklists();
  renderChecklistPanel();
}

function loadStarters() {
  state.checklists = [...state.checklists, ...Checklists.starterChecklists()];
  saveChecklists();
  renderChecklistPanel();
  showToast('Starter checklists added');
}

function resetAllChecklists() {
  if (!state.checklists.length) return;
  state.checklists = Checklists.resetAll(state.checklists);
  saveChecklists();
  renderChecklistPanel();
  showToast('All checklists reset');
}

function formatRelative(iso) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return 'recently';
  const diff = Date.now() - then;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return new Date(iso).toLocaleDateString();
}

/* ── Init ── */

function init() {
  state.trips = tripStore.read([]);
  state.checklists = checklistStore.read([]);
  state.activeTripId = state.trips.length ? sortedTrips()[0].id : null;

  $$('.tab').forEach(button => button.addEventListener('click', () => goToTab(button.dataset.tab)));
  $('#btn-new-trip').addEventListener('click', createTrip);
  $('#btn-new-checklist').addEventListener('click', createChecklist);
  $('#btn-reset-all').addEventListener('click', resetAllChecklists);

  window.addEventListener('hashchange', applyHash);
  applyHash();
}

document.addEventListener('DOMContentLoaded', init);
