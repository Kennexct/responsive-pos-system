import type { ReceiptNumberFormat } from '../components/mockData';

export const DEFAULT_RECEIPT_FORMAT: ReceiptNumberFormat = {
  prefix: 'INV',
  separator: '-',
  padding: 4,
  resetCycle: 'never',
  includeDate: false,
};

const datePart = (date: Date, cycle: ReceiptNumberFormat['resetCycle']) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  if (cycle === 'daily') return `${y}${m}${d}`;
  if (cycle === 'monthly') return `${y}${m}`;
  return String(y);
};

/** The unchanging left-hand side of a number, e.g. "DC-T2-20260924". Numbers reset when this changes. */
export function receiptPrefix(format: ReceiptNumberFormat, date = new Date()): string {
  const sep = format.separator ?? '';
  const parts = [format.prefix?.trim() || 'INV'];
  if (format.deviceCode?.trim()) parts.push(format.deviceCode.trim());
  if (format.includeDate || format.resetCycle !== 'never') parts.push(datePart(date, format.resetCycle));
  return parts.join(sep);
}

export function formatReceiptNumber(format: ReceiptNumberFormat, sequence: number, date = new Date()): string {
  const sep = format.separator ?? '';
  const padding = Math.min(10, Math.max(1, format.padding || 4));
  return `${receiptPrefix(format, date)}${sep}${String(sequence).padStart(padding, '0')}`;
}

/**
 * Next number for this merchant, derived from the numbers already stored rather than a counter in memory
 * (the old counter restarted at 1242 on every reload). Only numbers sharing the current prefix count,
 * so a daily or monthly reset starts again at 1 without ever reusing a number inside the same cycle.
 */
export function nextReceiptNumber(existing: { orderNumber?: string }[], format: ReceiptNumberFormat, date = new Date()): string {
  const prefix = receiptPrefix(format, date);
  const highest = existing.reduce((max, order) => {
    const number = order.orderNumber ?? '';
    if (!number.startsWith(prefix)) return max;
    const tail = Number(/(\d+)$/.exec(number)?.[1] ?? 0);
    return Number.isFinite(tail) && tail > max ? tail : max;
  }, 0);
  return formatReceiptNumber(format, highest + 1, date);
}
