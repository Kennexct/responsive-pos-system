import { describe, it, expect } from 'vitest';
import { allocate, computeOrderTotals, type PricingLine, type PricingTaxRule } from '../pricing';

const line = (over: Partial<PricingLine> = {}): PricingLine => ({
  id: over.id ?? 'l1', unitPrice: 10000, qty: 1, taxable: true, discountable: true, ...over,
});
const PPN: PricingTaxRule = { id: 'ppn', name: 'PPN', rate: 11, isInclusive: false, order: 1 };

describe('allocate', () => {
  it('splits exactly with no lost rupiah', () => {
    const parts = allocate(100, [1, 1, 1]);
    expect(parts.reduce((s, p) => s + p, 0)).toBe(100);
    expect(parts).toEqual([34, 33, 33]);
  });
  it('returns zeros when there is nothing to weigh', () => {
    expect(allocate(500, [0, 0])).toEqual([0, 0]);
  });
});

describe('computeOrderTotals', () => {
  it('adds exclusive tax on the discounted base', () => {
    const r = computeOrderTotals({ lines: [line({ unitPrice: 100000, lineDiscountPercent: 10 })], taxRules: [PPN] });
    expect(r.netSubtotal).toBe(90000);
    expect(r.taxTotal).toBe(9900);
    expect(r.total).toBe(99900);
  });

  it('applies nominal line discount per unit and caps at gross', () => {
    const r = computeOrderTotals({ lines: [line({ unitPrice: 5000, qty: 3, lineDiscountNominal: 9000 })], taxRules: [] });
    expect(r.lineDiscountTotal).toBe(15000);
    expect(r.total).toBe(0);
  });

  it('a promo on non-taxable items does not reduce tax (old proportional bug)', () => {
    const r = computeOrderTotals({
      lines: [
        line({ id: 'coffee', unitPrice: 50000, categoryId: 'cat-coffee' }),
        line({ id: 'voucher', unitPrice: 50000, categoryId: 'cat-others', taxable: false }),
      ],
      taxRules: [PPN],
      promo: { type: 'nominal', value: 20000, categoryIds: ['cat-others'] },
    });
    expect(r.promoDiscount).toBe(20000);
    expect(r.taxTotal).toBe(5500); // 11% of the untouched 50.000 coffee line
    expect(r.total).toBe(80000 + 5500);
  });

  it('respects the promo cap and discountable flag', () => {
    const r = computeOrderTotals({
      lines: [line({ unitPrice: 200000 }), line({ id: 'l2', unitPrice: 100000, discountable: false })],
      taxRules: [],
      promo: { type: 'percent', value: 50, maxDiscountAmount: 25000 },
    });
    expect(r.promoEligibleBase).toBe(200000);
    expect(r.promoDiscount).toBe(25000);
  });

  it('stacks taxes additively by default and compounds only when asked', () => {
    const PB1: PricingTaxRule = { id: 'pb1', name: 'PB1', rate: 10, isInclusive: false, order: 2 };
    const base = { lines: [line({ unitPrice: 100000 })] };
    expect(computeOrderTotals({ ...base, taxRules: [PPN, PB1] }).taxTotal).toBe(21000);
    expect(computeOrderTotals({ ...base, taxRules: [PPN, { ...PB1, compound: true }] }).taxTotal).toBe(22100);
  });

  it('extracts inclusive tax without changing the total', () => {
    const r = computeOrderTotals({ lines: [line({ unitPrice: 111000 })], taxRules: [{ ...PPN, isInclusive: true }] });
    expect(r.taxTotal).toBe(11000);
    expect(r.exclusiveTaxTotal).toBe(0);
    expect(r.total).toBe(111000);
  });

  it('orders tier → promo → points and caps points at what is owed', () => {
    const r = computeOrderTotals({
      lines: [line({ unitPrice: 100000 })],
      taxRules: [],
      tierDiscountPercent: 10,
      promo: { type: 'percent', value: 10 },
      pointsValue: 1_000_000,
    });
    expect(r.tierDiscount).toBe(10000);
    expect(r.promoDiscount).toBe(9000); // 10% of 90.000, not of 100.000
    expect(r.pointsDiscount).toBe(81000);
    expect(r.total).toBe(0);
  });

  it('adds service charge before tax and taxes it only when configured', () => {
    const lines = [line({ unitPrice: 100000 })];
    const taxed = computeOrderTotals({ lines, taxRules: [PPN], serviceCharge: { enabled: true, rate: 5, taxable: true } });
    expect(taxed.serviceCharge).toBe(5000);
    expect(taxed.taxTotal).toBe(11550);
    expect(taxed.total).toBe(116550);
    const untaxed = computeOrderTotals({ lines, taxRules: [PPN], serviceCharge: { enabled: true, rate: 5, taxable: false } });
    expect(untaxed.taxTotal).toBe(11000);
  });

  it('keeps line allocations summing to order figures', () => {
    const r = computeOrderTotals({
      lines: [line({ unitPrice: 33333 }), line({ id: 'b', unitPrice: 33333 }), line({ id: 'c', unitPrice: 33334 })],
      taxRules: [PPN],
      promo: { type: 'nominal', value: 10001 },
      serviceCharge: { enabled: true, rate: 7, taxable: true },
    });
    expect(r.lines.reduce((s, l) => s + l.net, 0)).toBe(r.netSubtotal);
    expect(r.lines.reduce((s, l) => s + l.serviceCharge, 0)).toBe(r.serviceCharge);
    expect(r.lines.reduce((s, l) => s + l.tax, 0)).toBe(r.taxTotal);
  });

  it('ignores zero-qty lines and returns zeros for an empty cart', () => {
    const r = computeOrderTotals({ lines: [line({ qty: 0 })], taxRules: [PPN] });
    expect(r.total).toBe(0);
    expect(r.lines).toHaveLength(0);
  });
});
