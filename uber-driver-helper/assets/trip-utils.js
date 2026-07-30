/* Uber Driver Helper — trip domain logic
 *
 * Pure, framework-free functions: no DOM, no storage, no globals.
 * Numeric fields are kept as raw strings (exactly what the driver typed) and
 * coerced on demand, so partially typed values like "12," never break totals.
 */
(function universal(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TripUtils = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function createTripUtils() {
  const SHARE_VERSION = 1;

  const PLATFORMS = [
    { id: 'uber', label: 'Uber' },
    { id: '99', label: '99' },
    { id: 'other', label: 'Other' },
  ];

  const EXPENSE_CATEGORIES = [
    { id: 'fuel', label: 'Fuel' },
    { id: 'food', label: 'Food' },
    { id: 'toll', label: 'Toll' },
    { id: 'parking', label: 'Parking' },
    { id: 'carwash', label: 'Car wash' },
    { id: 'maintenance', label: 'Maintenance' },
    { id: 'other', label: 'Other' },
  ];

  const PLATFORM_IDS = PLATFORMS.map(p => p.id);
  const CATEGORY_IDS = EXPENSE_CATEGORIES.map(c => c.id);

  const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
  const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

  /* ── Primitives ── */

  function generateId() {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }

  /** Parses user input into a finite number, or null when not usable. */
  function toNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const text = String(value ?? '').trim().replace(',', '.');
    if (!text) return null;
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : null;
  }

  /** Same as toNumber, but money-shaped: missing/invalid means zero. */
  function toAmount(value) {
    return toNumber(value) ?? 0;
  }

  function toText(value) {
    return String(value ?? '');
  }

  function today() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
  }

  function pickId(value, allowed, fallback) {
    return allowed.includes(value) ? value : fallback;
  }

  function sanitizeTime(value) {
    const text = toText(value).trim();
    return TIME_PATTERN.test(text) ? text : '';
  }

  function sanitizeDate(value) {
    const text = toText(value).trim();
    return DATE_PATTERN.test(text) ? text : today();
  }

  /* ── Factories ── */

  function createLeg(previousLeg) {
    return {
      id: generateId(),
      startKm: previousLeg ? toText(previousLeg.endKm) : '',
      endKm: '',
      note: '',
    };
  }

  function createEarning(platform) {
    return {
      id: generateId(),
      platform: pickId(platform, PLATFORM_IDS, 'uber'),
      amount: '',
      rides: '',
    };
  }

  function createExpense(category) {
    return {
      id: generateId(),
      label: '',
      category: pickId(category, CATEGORY_IDS, 'fuel'),
      amount: '',
    };
  }

  function createTrip(overrides = {}) {
    const now = new Date().toISOString();
    return normalizeTrip({
      id: generateId(),
      name: '',
      date: today(),
      startedAt: '',
      endedAt: '',
      legs: [createLeg(null)],
      earnings: [createEarning('uber'), createEarning('99')],
      expenses: [],
      createdAt: now,
      updatedAt: now,
      ...overrides,
    });
  }

  /* ── Normalization (localStorage, shared links, imports) ── */

  function normalizeLeg(raw) {
    const leg = raw && typeof raw === 'object' ? raw : {};
    return {
      id: toText(leg.id) || generateId(),
      startKm: toText(leg.startKm),
      endKm: toText(leg.endKm),
      note: toText(leg.note),
    };
  }

  function normalizeEarning(raw) {
    const earning = raw && typeof raw === 'object' ? raw : {};
    return {
      id: toText(earning.id) || generateId(),
      platform: pickId(toText(earning.platform), PLATFORM_IDS, 'other'),
      amount: toText(earning.amount),
      rides: toText(earning.rides),
    };
  }

  function normalizeExpense(raw) {
    const expense = raw && typeof raw === 'object' ? raw : {};
    return {
      id: toText(expense.id) || generateId(),
      label: toText(expense.label),
      category: pickId(toText(expense.category), CATEGORY_IDS, 'other'),
      amount: toText(expense.amount),
    };
  }

  function normalizeList(value, normalizeItem) {
    return Array.isArray(value) ? value.map(normalizeItem) : [];
  }

  function normalizeTrip(raw) {
    const trip = raw && typeof raw === 'object' ? raw : {};
    const createdAt = toText(trip.createdAt) || new Date().toISOString();
    const legs = normalizeList(trip.legs, normalizeLeg);

    return {
      id: toText(trip.id) || generateId(),
      name: toText(trip.name),
      date: sanitizeDate(trip.date),
      startedAt: sanitizeTime(trip.startedAt),
      endedAt: sanitizeTime(trip.endedAt),
      legs: legs.length ? legs : [createLeg(null)],
      earnings: normalizeList(trip.earnings, normalizeEarning),
      expenses: normalizeList(trip.expenses, normalizeExpense),
      createdAt,
      updatedAt: toText(trip.updatedAt) || createdAt,
    };
  }

  function normalizeTrips(value) {
    return Array.isArray(value) ? value.map(normalizeTrip) : [];
  }

  /** Copy of a trip with fresh ids — used by "duplicate" and "import shared". */
  function cloneTrip(trip, overrides = {}) {
    const source = normalizeTrip(trip);
    const now = new Date().toISOString();
    return normalizeTrip({
      ...source,
      id: generateId(),
      legs: source.legs.map(leg => ({ ...leg, id: generateId() })),
      earnings: source.earnings.map(item => ({ ...item, id: generateId() })),
      expenses: source.expenses.map(item => ({ ...item, id: generateId() })),
      createdAt: now,
      updatedAt: now,
      ...overrides,
    });
  }

  /* ── Calculations ── */

  function legDistance(leg) {
    const start = toNumber(leg && leg.startKm);
    const end = toNumber(leg && leg.endKm);
    if (start === null || end === null) return 0;
    const distance = end - start;
    return distance > 0 ? distance : 0;
  }

  /** A leg is invalid (not just incomplete) when the odometer runs backwards. */
  function legHasError(leg) {
    const start = toNumber(leg && leg.startKm);
    const end = toNumber(leg && leg.endKm);
    if (start === null || end === null) return false;
    return end < start;
  }

  /** Minutes between startedAt and endedAt, rolling past midnight. */
  function durationMinutes(trip) {
    const start = sanitizeTime(trip && trip.startedAt);
    const end = sanitizeTime(trip && trip.endedAt);
    if (!start || !end) return null;
    const toMinutes = time => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };
    const startMinutes = toMinutes(start);
    const endMinutes = toMinutes(end);
    const span = endMinutes - startMinutes;
    return span >= 0 ? span : span + 24 * 60;
  }

  function sumBy(list, key, resolveKey) {
    const totals = {};
    for (const item of list || []) {
      const group = resolveKey(item);
      totals[group] = (totals[group] || 0) + toAmount(item[key]);
    }
    return totals;
  }

  function tripTotals(trip) {
    const source = trip && typeof trip === 'object' ? trip : {};
    const legs = Array.isArray(source.legs) ? source.legs : [];
    const earnings = Array.isArray(source.earnings) ? source.earnings : [];
    const expenses = Array.isArray(source.expenses) ? source.expenses : [];

    const totalKm = legs.reduce((sum, leg) => sum + legDistance(leg), 0);
    const totalEarnings = earnings.reduce((sum, item) => sum + toAmount(item.amount), 0);
    const totalExpenses = expenses.reduce((sum, item) => sum + toAmount(item.amount), 0);
    const rides = earnings.reduce((sum, item) => sum + (toNumber(item.rides) ?? 0), 0);
    const net = totalEarnings - totalExpenses;
    const minutes = durationMinutes(source);
    const ratio = (value, divisor) => (divisor > 0 ? value / divisor : null);

    return {
      totalKm,
      totalEarnings,
      totalExpenses,
      net,
      rides,
      legCount: legs.length,
      earningsByPlatform: sumBy(earnings, 'amount', item => pickId(item.platform, PLATFORM_IDS, 'other')),
      expensesByCategory: sumBy(expenses, 'amount', item => pickId(item.category, CATEGORY_IDS, 'other')),
      durationMinutes: minutes,
      grossPerKm: ratio(totalEarnings, totalKm),
      costPerKm: ratio(totalExpenses, totalKm),
      netPerKm: ratio(net, totalKm),
      netPerHour: minutes ? ratio(net, minutes / 60) : null,
      netPerRide: ratio(net, rides),
    };
  }

  function sumTrips(trips) {
    const list = Array.isArray(trips) ? trips : [];
    return list.reduce((acc, trip) => {
      const totals = tripTotals(trip);
      acc.totalKm += totals.totalKm;
      acc.totalEarnings += totals.totalEarnings;
      acc.totalExpenses += totals.totalExpenses;
      acc.net += totals.net;
      acc.trips += 1;
      return acc;
    }, { totalKm: 0, totalEarnings: 0, totalExpenses: 0, net: 0, trips: 0 });
  }

  /* ── Formatting ── */

  const currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const kmFormatter = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });

  function formatCurrency(value) {
    return currencyFormatter.format(toAmount(value));
  }

  function formatKm(value) {
    return `${kmFormatter.format(toAmount(value))} km`;
  }

  function formatRate(value, unit) {
    if (value === null || value === undefined) return '—';
    return `${formatCurrency(value)}/${unit}`;
  }

  function formatDuration(minutes) {
    if (minutes === null || minutes === undefined) return '—';
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return hours ? `${hours}h ${String(rest).padStart(2, '0')}m` : `${rest}m`;
  }

  function platformLabel(id) {
    const match = PLATFORMS.find(p => p.id === id);
    return match ? match.label : 'Other';
  }

  function categoryLabel(id) {
    const match = EXPENSE_CATEGORIES.find(c => c.id === id);
    return match ? match.label : 'Other';
  }

  function tripTitle(trip) {
    const source = normalizeTrip(trip);
    return source.name.trim() || `Trip ${source.date}`;
  }

  /** Plain-text recap, handy for pasting into a message or a spreadsheet note. */
  function tripSummaryText(trip, shareUrl) {
    const source = normalizeTrip(trip);
    const totals = tripTotals(source);
    const breakdown = Object.entries(totals.earningsByPlatform)
      .filter(([, amount]) => amount > 0)
      .map(([platform, amount]) => `${platformLabel(platform)} ${formatCurrency(amount)}`)
      .join(' · ');

    const lines = [
      `${tripTitle(source)} — ${source.date}`,
      `Distance: ${formatKm(totals.totalKm)} (${totals.legCount} leg${totals.legCount === 1 ? '' : 's'})`,
      `Earnings: ${formatCurrency(totals.totalEarnings)}${breakdown ? ` (${breakdown})` : ''}`,
      `Expenses: ${formatCurrency(totals.totalExpenses)}`,
      `Net: ${formatCurrency(totals.net)}`,
    ];

    if (totals.netPerKm !== null) lines.push(`Net per km: ${formatRate(totals.netPerKm, 'km')}`);
    if (totals.durationMinutes !== null) {
      lines.push(`Time online: ${formatDuration(totals.durationMinutes)}${
        totals.netPerHour !== null ? ` (${formatRate(totals.netPerHour, 'h')})` : ''}`);
    }
    if (shareUrl) lines.push(shareUrl);

    return lines.join('\n');
  }

  /* ── Share codes (URL-safe base64 of a compact payload) ── */

  function toBase64Url(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function fromBase64Url(code) {
    const base64 = String(code).replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function encodeTrip(trip) {
    const source = normalizeTrip(trip);
    const payload = {
      v: SHARE_VERSION,
      n: source.name,
      d: source.date,
      s: source.startedAt,
      e: source.endedAt,
      l: source.legs.map(leg => [leg.startKm, leg.endKm, leg.note]),
      g: source.earnings.map(item => [item.platform, item.amount, item.rides]),
      x: source.expenses.map(item => [item.label, item.category, item.amount]),
    };
    return toBase64Url(JSON.stringify(payload));
  }

  function decodeTrip(code) {
    try {
      const payload = JSON.parse(fromBase64Url(code));
      if (!payload || payload.v !== SHARE_VERSION) return null;
      return normalizeTrip({
        name: payload.n,
        date: payload.d,
        startedAt: payload.s,
        endedAt: payload.e,
        legs: (payload.l || []).map(([startKm, endKm, note]) => ({ startKm, endKm, note })),
        earnings: (payload.g || []).map(([platform, amount, rides]) => ({ platform, amount, rides })),
        expenses: (payload.x || []).map(([label, category, amount]) => ({ label, category, amount })),
      });
    } catch {
      return null;
    }
  }

  return {
    PLATFORMS,
    EXPENSE_CATEGORIES,
    generateId,
    toNumber,
    toAmount,
    today,
    createLeg,
    createEarning,
    createExpense,
    createTrip,
    normalizeTrip,
    normalizeTrips,
    cloneTrip,
    legDistance,
    legHasError,
    durationMinutes,
    tripTotals,
    sumTrips,
    formatCurrency,
    formatKm,
    formatRate,
    formatDuration,
    platformLabel,
    categoryLabel,
    tripTitle,
    tripSummaryText,
    encodeTrip,
    decodeTrip,
  };
}));
