import { describe, it, expect } from 'vitest';
import { reverseCustomerForOrder } from '../orders';
import type { Customer, RecentOrder } from '../../components/mockData';

const customer: Customer = {
  id: 'c1', name: 'Andi', phone: '0812', pointsBalance: 120, totalSpend: 300000,
  registrationDate: '2026-01-01', totalTransactions: 3, averageTransactionValue: 100000,
};
const order = { id: 'o1', customerId: 'c1', total: 100000, pointsEarned: 10, pointsRedeemed: 50 } as RecentOrder;

describe('reverseCustomerForOrder', () => {
  it('takes back earned points, returns redeemed points and reduces spend', () => {
    const r = reverseCustomerForOrder(customer, order);
    expect(r.pointsBalance).toBe(160);
    expect(r.totalSpend).toBe(200000);
    expect(r.totalTransactions).toBe(2);
    expect(r.averageTransactionValue).toBe(100000);
  });
  it('never goes negative', () => {
    const r = reverseCustomerForOrder({ ...customer, pointsBalance: 0, totalSpend: 0, totalTransactions: 0 }, { ...order, pointsRedeemed: 0 });
    expect(r.pointsBalance).toBe(0);
    expect(r.totalSpend).toBe(0);
    expect(r.averageTransactionValue).toBe(0);
  });
  it('leaves other customers untouched', () => {
    expect(reverseCustomerForOrder({ ...customer, id: 'c2' }, order).pointsBalance).toBe(120);
  });
});
