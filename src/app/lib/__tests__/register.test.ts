import { describe, it, expect } from 'vitest';
import { cashVariance, countedTotal, isStale, needsApproval, summariseSession } from '../register';
import { DEFAULT_RECEIPT_FORMAT, formatReceiptNumber, nextReceiptNumber, receiptPrefix } from '../receiptNumber';
import type { CashMovement, RecentOrder, RegisterSession } from '../../components/mockData';

const session: RegisterSession = {
  id: 's1', openedAt: '2026-09-24T01:00:00.000Z', openedById: 'u1', openedByName: 'Ayu',
  openingFloat: 200000, status: 'open',
};
const order = (over: Partial<RecentOrder>): RecentOrder => ({
  id: over.id ?? 'o', orderNumber: 'INV-0001', sessionId: 's1', total: 100000,
  paymentMethod: 'cash', status: 'completed', ...over,
} as RecentOrder);

describe('register session', () => {
  const orders = [
    order({ id: 'o1' }),
    order({ id: 'o2', total: 50000, paymentMethod: 'qris' }),
    order({ id: 'o3', total: 30000, status: 'refunded' }),
    order({ id: 'o4', total: 70000, status: 'voided' }),
    order({ id: 'o5', total: 999999, sessionId: 's2' }), // another shift
  ];
  const movements: CashMovement[] = [
    { id: 'm1', sessionId: 's1', type: 'out', amount: 25000, reason: 'Ice delivery', at: '', byName: 'Ayu' },
    { id: 'm2', sessionId: 's1', type: 'in', amount: 10000, reason: 'Change added', at: '', byName: 'Ayu' },
    { id: 'm3', sessionId: 's2', type: 'out', amount: 500000, reason: 'Other shift', at: '', byName: 'Budi' },
  ];

  it('expects float plus cash sales, less refunds and cash taken out', () => {
    const s = summariseSession(session, orders, movements);
    expect(s.cashSales).toBe(130000);   // 100.000 + the 30.000 that was later refunded
    expect(s.cashRefunds).toBe(30000);
    expect(s.paidOut).toBe(25000);
    expect(s.paidIn).toBe(10000);
    expect(s.expectedCash).toBe(285000);
  });

  it('ignores voided orders and other sessions', () => {
    const s = summariseSession(session, orders, movements);
    expect(s.totalSales).toBe(180000);  // cash 130.000 + qris 50.000, void excluded
    expect(s.orderCount).toBe(4);
  });

  it('breaks takings down by payment method', () => {
    const byMethod = summariseSession(session, orders, movements).byMethod;
    expect(byMethod.find(m => m.method === 'cash')).toMatchObject({ sales: 130000, refunds: 30000, net: 100000 });
    expect(byMethod.find(m => m.method === 'qris')).toMatchObject({ sales: 50000, net: 50000 });
  });

  it('counts notes and flags a variance over the threshold', () => {
    const counts = { 100000: 2, 50000: 1, 20000: 1, 10000: 1, 5000: 1 };
    expect(countedTotal(counts)).toBe(285000);
    const summary = summariseSession(session, orders, movements);
    expect(cashVariance(summary, countedTotal(counts))).toBe(0);
    expect(cashVariance(summary, 275000)).toBe(-10000);
    expect(needsApproval(-10000, 5000)).toBe(true);
    expect(needsApproval(-4000, 5000)).toBe(false);
  });

  it('marks a session left open overnight as stale', () => {
    expect(isStale(session, new Date('2026-09-24T12:00:00.000Z'))).toBe(false);
    expect(isStale(session, new Date('2026-09-25T02:00:00.000Z'))).toBe(true);
    expect(isStale({ ...session, status: 'closed' }, new Date('2026-09-26T00:00:00.000Z'))).toBe(false);
  });
});

describe('receipt numbering', () => {
  const day = new Date('2026-09-24T03:00:00.000Z');

  it('builds a padded number from the merchant format', () => {
    const format = { ...DEFAULT_RECEIPT_FORMAT, prefix: 'DC', separator: '', padding: 4 };
    expect(formatReceiptNumber(format, 1, day)).toBe('DC0001');
    expect(formatReceiptNumber({ ...format, separator: '-' }, 42, day)).toBe('DC-0042');
  });

  it('continues from the highest stored number', () => {
    const format = { ...DEFAULT_RECEIPT_FORMAT, prefix: 'DC', separator: '' };
    const orders = [{ orderNumber: 'DC0001' }, { orderNumber: 'DC0009' }, { orderNumber: 'DC0003' }];
    expect(nextReceiptNumber(orders, format, day)).toBe('DC0010');
    expect(nextReceiptNumber([], format, day)).toBe('DC0001');
  });

  it('restarts each day but never inside the same day', () => {
    const format = { ...DEFAULT_RECEIPT_FORMAT, prefix: 'DC', separator: '-', resetCycle: 'daily' as const };
    const today = nextReceiptNumber([], format, day);
    expect(today).toBe('DC-20260924-0001');
    expect(nextReceiptNumber([{ orderNumber: today }], format, day)).toBe('DC-20260924-0002');
    // yesterday's numbers do not raise today's counter
    expect(nextReceiptNumber([{ orderNumber: 'DC-20260923-0099' }], format, day)).toBe('DC-20260924-0001');
  });

  it('keeps two terminals apart with a device code', () => {
    const t2 = { ...DEFAULT_RECEIPT_FORMAT, prefix: 'DC', separator: '-', deviceCode: 'T2' };
    expect(receiptPrefix(t2, day)).toBe('DC-T2');
    expect(nextReceiptNumber([{ orderNumber: 'DC-0007' }], t2, day)).toBe('DC-T2-0001');
  });
});
