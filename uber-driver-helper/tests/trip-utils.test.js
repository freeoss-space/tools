const test = require('node:test');
const assert = require('node:assert/strict');

const {
  toNumber,
  createTrip,
  createLeg,
  normalizeTrip,
  cloneTrip,
  legDistance,
  legHasError,
  durationMinutes,
  tripTotals,
  sumTrips,
  tripTitle,
  tripSummaryText,
  encodeTrip,
  decodeTrip,
} = require('../assets/trip-utils.js');

test('toNumber accepts comma decimals and rejects junk', () => {
  assert.equal(toNumber('12,5'), 12.5);
  assert.equal(toNumber(' 40 '), 40);
  assert.equal(toNumber(''), null);
  assert.equal(toNumber('abc'), null);
  assert.equal(toNumber(undefined), null);
});

test('legDistance uses the odometer delta and ignores incomplete or reversed legs', () => {
  assert.equal(legDistance({ startKm: '45210', endKm: '45268,5' }), 58.5);
  assert.equal(legDistance({ startKm: '45210', endKm: '' }), 0);
  assert.equal(legDistance({ startKm: '100', endKm: '90' }), 0);
});

test('legHasError only flags a reversed odometer', () => {
  assert.equal(legHasError({ startKm: '100', endKm: '90' }), true);
  assert.equal(legHasError({ startKm: '100', endKm: '' }), false);
  assert.equal(legHasError({ startKm: '100', endKm: '120' }), false);
});

test('createLeg carries the previous end reading into the next start', () => {
  const leg = createLeg({ endKm: '45268' });
  assert.equal(leg.startKm, '45268');
  assert.equal(leg.endKm, '');
});

test('durationMinutes rolls over midnight', () => {
  assert.equal(durationMinutes({ startedAt: '18:00', endedAt: '23:30' }), 330);
  assert.equal(durationMinutes({ startedAt: '22:00', endedAt: '02:15' }), 255);
  assert.equal(durationMinutes({ startedAt: '22:00', endedAt: '' }), null);
});

test('tripTotals aggregates km, gains, expenses and derived rates', () => {
  const totals = tripTotals({
    startedAt: '18:00',
    endedAt: '23:00',
    legs: [
      { startKm: '1000', endKm: '1060' },
      { startKm: '1060', endKm: '1100' },
      { startKm: '1100', endKm: '' },
    ],
    earnings: [
      { platform: 'uber', amount: '180', rides: '9' },
      { platform: '99', amount: '120,50', rides: '5' },
    ],
    expenses: [
      { category: 'fuel', amount: '90' },
      { category: 'toll', amount: '10,50' },
    ],
  });

  assert.equal(totals.totalKm, 100);
  assert.equal(totals.totalEarnings, 300.5);
  assert.equal(totals.totalExpenses, 100.5);
  assert.equal(totals.net, 200);
  assert.equal(totals.rides, 14);
  assert.equal(totals.legCount, 3);
  assert.equal(totals.netPerKm, 2);
  assert.equal(totals.grossPerKm, 3.005);
  assert.equal(totals.durationMinutes, 300);
  assert.equal(totals.netPerHour, 40);
  assert.deepEqual(totals.earningsByPlatform, { uber: 180, '99': 120.5 });
  assert.deepEqual(totals.expensesByCategory, { fuel: 90, toll: 10.5 });
});

test('tripTotals leaves rates null when there is nothing to divide by', () => {
  const totals = tripTotals({ legs: [], earnings: [], expenses: [] });
  assert.equal(totals.totalKm, 0);
  assert.equal(totals.netPerKm, null);
  assert.equal(totals.netPerHour, null);
  assert.equal(totals.netPerRide, null);
});

test('normalizeTrip repairs partial data and keeps at least one leg', () => {
  const trip = normalizeTrip({
    date: 'not-a-date',
    startedAt: '99:99',
    legs: 'nope',
    earnings: [{ platform: 'lyft', amount: 25 }],
    expenses: [{ category: 'unknown', amount: 5 }],
  });

  assert.match(trip.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(trip.startedAt, '');
  assert.equal(trip.legs.length, 1);
  assert.equal(trip.earnings[0].platform, 'other');
  assert.equal(trip.earnings[0].amount, '25');
  assert.equal(trip.expenses[0].category, 'other');
});

test('cloneTrip produces fresh ids without touching the source', () => {
  const trip = createTrip({ name: 'Friday', legs: [{ startKm: '10', endKm: '20' }] });
  const copy = cloneTrip(trip);

  assert.notEqual(copy.id, trip.id);
  assert.notEqual(copy.legs[0].id, trip.legs[0].id);
  assert.equal(copy.legs[0].startKm, '10');
  assert.equal(trip.name, 'Friday');
});

test('encodeTrip and decodeTrip survive a URL round trip', () => {
  const trip = createTrip({
    name: 'Sábado à noite ✅',
    date: '2026-07-25',
    startedAt: '19:00',
    endedAt: '01:30',
    legs: [{ startKm: '45210', endKm: '45268' }],
    earnings: [{ platform: '99', amount: '75,25', rides: '4' }],
    expenses: [{ label: 'Fuel', category: 'fuel', amount: '50' }],
  });

  const code = encodeTrip(trip);
  assert.doesNotMatch(code, /[+/=]/);

  const decoded = decodeTrip(code);
  assert.equal(decoded.name, 'Sábado à noite ✅');
  assert.equal(decoded.date, '2026-07-25');
  assert.equal(decoded.endedAt, '01:30');
  assert.equal(decoded.legs[0].endKm, '45268');
  assert.equal(decoded.earnings[0].platform, '99');
  assert.equal(decoded.expenses[0].label, 'Fuel');
  assert.equal(tripTotals(decoded).net, 25.25);
});

test('decodeTrip returns null for garbage or unknown versions', () => {
  assert.equal(decodeTrip('not-base64!!'), null);
  assert.equal(decodeTrip(Buffer.from('{"v":99}').toString('base64url')), null);
});

test('tripTitle falls back to the date', () => {
  assert.equal(tripTitle({ name: '  ', date: '2026-07-25' }), 'Trip 2026-07-25');
  assert.equal(tripTitle({ name: 'Night shift', date: '2026-07-25' }), 'Night shift');
});

test('tripSummaryText reports distance, gains, expenses and net', () => {
  const summary = tripSummaryText({
    name: 'Night shift',
    date: '2026-07-25',
    legs: [{ startKm: '0', endKm: '100' }],
    earnings: [{ platform: 'uber', amount: '200' }],
    expenses: [{ label: 'Fuel', category: 'fuel', amount: '50' }],
  }, 'https://example.test/#s=abc');

  assert.match(summary, /^Night shift — 2026-07-25$/m);
  assert.match(summary, /Distance: 100 km \(1 leg\)/);
  assert.match(summary, /Uber/);
  assert.match(summary, /Net:/);
  assert.match(summary, /https:\/\/example\.test\/#s=abc/);
});

test('sumTrips totals every card', () => {
  const overall = sumTrips([
    { legs: [{ startKm: '0', endKm: '50' }], earnings: [{ amount: '100' }], expenses: [{ amount: '20' }] },
    { legs: [{ startKm: '0', endKm: '30' }], earnings: [{ amount: '60' }], expenses: [] },
  ]);

  assert.deepEqual(overall, { totalKm: 80, totalEarnings: 160, totalExpenses: 20, net: 140, trips: 2 });
});
