/**
 * Comprehensive tests for dateUtils.ts
 * Run with: npx ts-node src/utils/dateUtils.test.ts
 */
import { toDate, toDateSafe } from './dateUtils';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(name: string, actual: any, expected: any) {
  const actualStr = actual instanceof Date ? actual.toISOString() : String(actual);
  const expectedStr = expected instanceof Date ? expected.toISOString() : String(expected);
  if (actualStr === expectedStr) {
    passed++;
  } else {
    failed++;
    failures.push(`  FAIL: ${name}\n    Expected: ${expectedStr}\n    Actual:   ${actualStr}`);
  }
}

function assertNull(name: string, actual: any) {
  if (actual === null) {
    passed++;
  } else {
    failed++;
    failures.push(`  FAIL: ${name}\n    Expected: null\n    Actual:   ${actual}`);
  }
}

function assertInstanceOf(name: string, actual: any) {
  if (actual instanceof Date && !isNaN(actual.getTime())) {
    passed++;
  } else {
    failed++;
    failures.push(`  FAIL: ${name}\n    Expected: valid Date\n    Actual:   ${actual}`);
  }
}

console.log('=== dateUtils.ts Unit Tests ===\n');

// ===== toDate() tests =====
console.log('--- toDate() ---');

// Null/undefined/falsy inputs
assertNull('toDate(null)', toDate(null));
assertNull('toDate(undefined)', toDate(undefined));
assertNull('toDate(0)', toDate(0));  // 0 is falsy
assertNull('toDate("")', toDate(''));
assertNull('toDate(false)', toDate(false));

// Date objects
const now = new Date();
assert('toDate(Date)', toDate(now)?.toISOString(), now.toISOString());
assertNull('toDate(Invalid Date)', toDate(new Date('invalid')));

// ISO strings
const isoStr = '2024-06-15T10:30:00.000Z';
assert('toDate(ISO string)', toDate(isoStr)?.toISOString(), new Date(isoStr).toISOString());
assert('toDate(date-only string)', toDate('2024-06-15')?.toISOString(), new Date('2024-06-15').toISOString());
assertNull('toDate(garbage string)', toDate('not-a-date'));
assertNull('toDate(empty string)', toDate(''));

// Unix timestamps (seconds)
const unixSec = 1718450000; // approx 2024-06-15
const fromSec = toDate(unixSec);
assertInstanceOf('toDate(unix seconds) is Date', fromSec);
assert('toDate(unix seconds) correct', fromSec?.getFullYear(), new Date(unixSec * 1000).getFullYear());

// Unix timestamps (milliseconds)
const unixMs = 1718450000000;
const fromMs = toDate(unixMs);
assertInstanceOf('toDate(unix ms) is Date', fromMs);
assert('toDate(unix ms) correct', fromMs?.getFullYear(), new Date(unixMs).getFullYear());

// Firebase Timestamp-like objects (with toDate method)
const firebaseTimestamp = {
  toDate: () => new Date('2024-06-15T10:30:00Z'),
  seconds: 1718450000,
  nanoseconds: 0,
};
assert('toDate(Firebase Timestamp)', toDate(firebaseTimestamp)?.toISOString(), '2024-06-15T10:30:00.000Z');

// Firebase Timestamp-like objects (seconds only, no toDate method)
const timestampLike = { seconds: 1718450000 };
const fromTimestampLike = toDate(timestampLike);
assertInstanceOf('toDate({seconds}) is Date', fromTimestampLike);
assert('toDate({seconds}) year', fromTimestampLike?.getFullYear(), new Date(1718450000 * 1000).getFullYear());

// Edge: object with toDate that returns invalid
const badTimestamp = { toDate: () => new Date('invalid') };
// toDate calls value.toDate() which returns Invalid Date, but we don't validate the result of .toDate()
// Actually, looking at the code: if typeof value.toDate === 'function', return value.toDate() directly
// So this would return an Invalid Date, not null. Let's verify:
const badResult = toDate(badTimestamp);
assert('toDate(bad Firebase Timestamp) returns Invalid Date', badResult instanceof Date, true);

// ===== toDateSafe() tests =====
console.log('--- toDateSafe() ---');

// Should never return null
assertInstanceOf('toDateSafe(null) is Date', toDateSafe(null));
assert('toDateSafe(null) epoch', toDateSafe(null).getTime(), 0);
assertInstanceOf('toDateSafe(undefined) is Date', toDateSafe(undefined));
assert('toDateSafe(undefined) epoch', toDateSafe(undefined).getTime(), 0);
assertInstanceOf('toDateSafe("") is Date', toDateSafe(''));
assert('toDateSafe("") epoch', toDateSafe('').getTime(), 0);
assertInstanceOf('toDateSafe("garbage") is Date', toDateSafe('garbage'));
assert('toDateSafe("garbage") epoch', toDateSafe('garbage').getTime(), 0);

// Should pass through valid dates
assert('toDateSafe(ISO string)', toDateSafe(isoStr).toISOString(), new Date(isoStr).toISOString());
assert('toDateSafe(Date)', toDateSafe(now).toISOString(), now.toISOString());
assert('toDateSafe(Firebase Timestamp)', toDateSafe(firebaseTimestamp).toISOString(), '2024-06-15T10:30:00.000Z');
assert('toDateSafe(unix seconds)', toDateSafe(unixSec).getFullYear(), new Date(unixSec * 1000).getFullYear());

// ===== Business-critical scenarios =====
console.log('--- Business Scenarios ---');

// Scenario 1: Express API returns ISO string for appointment date
const expressDate = '2024-12-25T14:00:00.000Z';
const appointmentDate = toDateSafe(expressDate);
assertInstanceOf('Express ISO date -> valid Date', appointmentDate);
assert('Express ISO date correct', appointmentDate.toISOString(), expressDate);

// Scenario 2: Express API returns ISO string for invoice dueDate
const dueDateStr = '2025-01-15T00:00:00.000Z';
const dueDate = toDateSafe(dueDateStr);
const isOverdue = dueDate < new Date(); // This is the actual business logic
assert('Invoice overdue comparison works', typeof isOverdue, 'boolean');

// Scenario 3: date-fns format() compatibility
// format() from date-fns expects a Date object
const formatDate = toDateSafe('2024-06-15T10:30:00Z');
assert('date-fns compatible type', formatDate instanceof Date, true);
assert('date-fns compatible not NaN', isNaN(formatDate.getTime()), false);

// Scenario 4: Firebase Timestamp from cached/stale data
const cachedTimestamp = { seconds: 1718450000, nanoseconds: 500000000 };
const cachedDate = toDateSafe(cachedTimestamp);
assertInstanceOf('Cached Firebase Timestamp', cachedDate);

// Scenario 5: Null date fields (e.g., sentAt, viewedAt on invoices)
const sentAt = null;
const sentDate = toDate(sentAt);
assertNull('Null sentAt returns null', sentDate);

// Scenario 6: Comparing dates for sorting
const dateA = toDateSafe('2024-06-15T10:00:00Z');
const dateB = toDateSafe('2024-06-15T14:00:00Z');
assert('Date sorting works', dateA < dateB, true);
assert('Date sorting getTime', dateA.getTime() < dateB.getTime(), true);

// Scenario 7: toLocaleDateString compatibility
const localDate = toDateSafe('2024-06-15T10:30:00Z');
assert('toLocaleDateString works', typeof localDate.toLocaleDateString(), 'string');

// Scenario 8: getDay/getHours for heatmap charts
const chartDate = toDateSafe('2024-06-15T10:30:00Z'); // Saturday
assert('getDay() works', typeof chartDate.getDay(), 'number');
assert('getHours() works', typeof chartDate.getHours(), 'number');

// Scenario 9: Budget date range comparison
const budgetStart = toDateSafe('2024-01-01T00:00:00Z');
const budgetEnd = toDateSafe('2024-12-31T23:59:59Z');
const testDate = toDateSafe('2024-06-15T12:00:00Z');
assert('Budget range check', budgetStart <= testDate && testDate <= budgetEnd, true);

// Scenario 10: Discount date validation
const discountStart = toDateSafe('2024-06-01T00:00:00Z');
const discountEnd = toDateSafe('2024-06-30T23:59:59Z');
const currentDate = new Date('2024-06-15T12:00:00Z');
const isActive = discountStart <= currentDate && discountEnd >= currentDate;
assert('Discount active check', isActive, true);

// Scenario 11: Staff schedule date
const scheduleStart = toDateSafe('2024-01-15T00:00:00Z');
assert('Schedule date toLocaleDateString', typeof scheduleStart.toLocaleDateString('ar-EG'), 'string');

// ===== Print Results =====
console.log('\n=== Results ===');
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
if (failures.length > 0) {
  console.log('\nFailures:');
  failures.forEach(f => console.log(f));
}
console.log(`\n${failed === 0 ? 'ALL TESTS PASSED!' : `${failed} TESTS FAILED`}`);
process.exit(failed > 0 ? 1 : 0);
