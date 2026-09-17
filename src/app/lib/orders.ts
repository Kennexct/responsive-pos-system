import type { Customer, RecentOrder } from '../components/mockData';

/** Undo a completed order's effect on its customer: spend, visits and both sides of points. */
export function reverseCustomerForOrder(customer: Customer, order: RecentOrder): Customer {
  if (customer.id !== order.customerId) return customer;
  const totalSpend = Math.max(0, customer.totalSpend - order.total);
  const totalTransactions = Math.max(0, (customer.totalTransactions || 0) - 1);
  return {
    ...customer,
    totalSpend,
    totalTransactions,
    averageTransactionValue: totalTransactions > 0 ? Math.round(totalSpend / totalTransactions) : 0,
    pointsBalance: Math.max(0, customer.pointsBalance - (order.pointsEarned || 0) + (order.pointsRedeemed || 0)),
  };
}
