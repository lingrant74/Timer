import { getDueStatus } from './dueWarningSettings';

export function dueTimestamp(value) {
  if (!value) return NaN;
  return new Date(value.includes('T') ? value : `${value}T23:59:59`).getTime();
}

export function compareRecordPriority(a, b, settings) {
  const aPaid = a.paid === true || a.paid === 'true';
  const bPaid = b.paid === true || b.paid === 'true';
  if (aPaid !== bPaid) return aPaid ? 1 : -1;
  const aRed = !aPaid && Boolean(getDueStatus(a.dueDate, settings));
  const bRed = !bPaid && Boolean(getDueStatus(b.dueDate, settings));
  return aRed === bRed ? 0 : aRed ? -1 : 1;
}

export function compareDueTime(a, b) {
  const first = dueTimestamp(a.dueDate);
  const second = dueTimestamp(b.dueDate);
  if (Number.isNaN(first)) return Number.isNaN(second) ? 0 : 1;
  if (Number.isNaN(second)) return -1;
  return first - second;
}
