/**
 * Date conversion utilities for Firebase Timestamp -> Express API migration.
 * Handles Firebase Timestamps, ISO strings, Unix timestamps, and Date objects.
 */

export function toDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value.toDate === 'function') return value.toDate(); // Firebase Timestamp
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'number') {
    const ms = value < 1e12 ? value * 1000 : value;
    return new Date(ms);
  }
  return null;
}

export function toDateSafe(value: any): Date {
  return toDate(value) ?? new Date(0);
}
