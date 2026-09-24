import { describe, it, expect } from 'vitest';
import { pointsEarnedFor, redeemPreview } from '../loyalty';
import { INITIAL_LOYALTY_SETTINGS } from '../../components/mockData';
import type { Customer, LoyaltySettings } from '../../components/mockData';

const loyalty: LoyaltySettings = { ...INITIAL_LOYALTY_SETTINGS, redemptionValue: 100, minRedeemPoints: 50, redeemStepPoints: 10, maxRedeemPercent: 50 };
const customer = { id: 'c1', name: 'Andi', phone: '0812', pointsBalance: 500, totalSpend: 0, registrationDate: '' } as Customer;

describe('points redemption', () => {
  it('redeems the requested points when every rule allows it', () => {
    const r = redeemPreview(customer, loyalty, 100000, 200);
    expect(r.points).toBe(200);
    expect(r.value).toBe(20000);
  });

  it('never lets points cover more than the configured share of the bill', () => {
    const r = redeemPreview(customer, loyalty, 100000, 500);
    expect(r.maxPoints).toBe(500); // 50% of 100.000 = 50.000 = 500 points
    const small = redeemPreview(customer, loyalty, 20000, 500);
    expect(small.points).toBe(100); // 50% of 20.000 = 10.000 = 100 points
    expect(small.reason).toContain('Reduced to 100 points');
  });

  it('rounds down to the step and respects the minimum', () => {
    expect(redeemPreview(customer, loyalty, 100000, 137).points).toBe(130);
    const tooFew = redeemPreview(customer, loyalty, 100000, 30);
    expect(tooFew.points).toBe(0);
    expect(tooFew.reason).toContain('At least 50 points');
  });

  it('never exceeds the balance', () => {
    const r = redeemPreview({ ...customer, pointsBalance: 80 }, loyalty, 1000000, 500);
    expect(r.points).toBe(80);
  });

  it('explains why nothing can be redeemed', () => {
    expect(redeemPreview(customer, { ...loyalty, redeemEnabled: false }, 100000, 100).reason).toContain('switched off');
    expect(redeemPreview(undefined, loyalty, 100000, 100).reason).toContain('Add a customer');
    expect(redeemPreview({ ...customer, pointsBalance: 0 }, loyalty, 100000, 100).reason).toContain('no points');
    // 50% of 5.000 is 2.500, which is only 20 points — under the 50-point minimum
    expect(redeemPreview(customer, loyalty, 5000, 100).reason).toContain('At least 50 points');
    // 50% of 100 rupiah is not even one point
    expect(redeemPreview(customer, loyalty, 100, 100).reason).toContain('at most 50%');
  });

  it('earns on goods only, rounded down', () => {
    expect(pointsEarnedFor(25500, loyalty)).toBe(2);
    expect(pointsEarnedFor(25500, { ...loyalty, enabled: false })).toBe(0);
  });
});
