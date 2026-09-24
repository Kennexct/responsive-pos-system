import type { CashMovement, PaymentMethod, RecentOrder, RegisterSession } from '../components/mockData';

/** Notes and coins in circulation, largest first — the order a cashier counts them in. */
export const IDR_DENOMINATIONS = [100000, 50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100];

export type DenominationCount = Record<number, number>;

export function countedTotal(counts: DenominationCount): number {
  return IDR_DENOMINATIONS.reduce((sum, note) => sum + note * (counts[note] || 0), 0);
}

export interface MethodTotal {
  method: PaymentMethod | string;
  sales: number;
  refunds: number;
  net: number;
  orders: number;
}

export interface SessionSummary {
  openingFloat: number;
  cashSales: number;
  cashRefunds: number;
  paidIn: number;
  paidOut: number;
  /** What the drawer should hold right now. */
  expectedCash: number;
  /** Everything sold in the session, cash and non-cash. */
  totalSales: number;
  totalRefunds: number;
  orderCount: number;
  byMethod: MethodTotal[];
}

const isCash = (method: string) => method === 'cash';

/**
 * Everything the X and Z reports show, from the orders and cash movements of one session.
 *
 *   expected cash = opening float + cash sales − cash refunds + paid in − paid out
 *
 * Non-cash methods are never counted into the drawer; they are listed so the owner can tick them
 * off against the settlement report from their payment provider.
 */
export function summariseSession(session: RegisterSession, orders: RecentOrder[], movements: CashMovement[]): SessionSummary {
  const sessionOrders = orders.filter(o => o.sessionId === session.id);
  const sessionMovements = movements.filter(m => m.sessionId === session.id);

  const byMethod = new Map<string, MethodTotal>();
  let cashSales = 0, cashRefunds = 0, totalSales = 0, totalRefunds = 0;

  for (const order of sessionOrders) {
    const method = order.paymentMethod ?? 'cash';
    const entry = byMethod.get(method) ?? { method, sales: 0, refunds: 0, net: 0, orders: 0 };
    entry.orders += 1;

    // A voided order never took money; a refunded one took it and gave it back.
    if (order.status === 'voided') {
      byMethod.set(method, entry);
      continue;
    }
    entry.sales += order.total;
    totalSales += order.total;
    if (isCash(method)) cashSales += order.total;

    if (order.status === 'refunded') {
      entry.refunds += order.total;
      totalRefunds += order.total;
      if (isCash(method)) cashRefunds += order.total;
    }
    entry.net = entry.sales - entry.refunds;
    byMethod.set(method, entry);
  }

  const paidIn = sessionMovements.filter(m => m.type === 'in').reduce((s, m) => s + m.amount, 0);
  const paidOut = sessionMovements.filter(m => m.type === 'out').reduce((s, m) => s + m.amount, 0);

  return {
    openingFloat: session.openingFloat,
    cashSales,
    cashRefunds,
    paidIn,
    paidOut,
    expectedCash: session.openingFloat + cashSales - cashRefunds + paidIn - paidOut,
    totalSales,
    totalRefunds,
    orderCount: sessionOrders.length,
    byMethod: [...byMethod.values()].sort((a, b) => b.net - a.net),
  };
}

/** Counted minus expected. Positive means more money in the drawer than the system expects. */
export function cashVariance(summary: SessionSummary, countedCash: number): number {
  return countedCash - summary.expectedCash;
}

export function needsApproval(variance: number, threshold: number): boolean {
  return Math.abs(variance) > Math.max(0, threshold);
}

/** A session left open past its business day, which a cashier forgot to close. */
export function isStale(session: RegisterSession, now = new Date()): boolean {
  if (session.status !== 'open') return false;
  return now.getTime() - new Date(session.openedAt).getTime() > 20 * 60 * 60 * 1000;
}
