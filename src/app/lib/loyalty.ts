import type { Customer, LoyaltySettings } from '../components/mockData';

export interface RedeemPreview {
  /** Points that will actually be taken. Always a multiple of the step and within every cap. */
  points: number;
  /** Rupiah those points are worth. */
  value: number;
  /** Most points this bill can absorb right now. */
  maxPoints: number;
  /** Why the requested amount was reduced or refused, for the cashier to read out. */
  reason?: string;
}

const floorToStep = (points: number, step: number) => (step > 1 ? Math.floor(points / step) * step : Math.floor(points));

/**
 * The single place redemption rules are applied: on/off, minimum, step, share of the bill,
 * the customer's balance and what is still owed. The cart, checkout and settings preview all use it,
 * so a rule set in Settings cannot be bypassed at the till.
 */
export function redeemPreview(
  customer: Customer | undefined,
  loyalty: LoyaltySettings | undefined,
  /** Goods total after discounts, before service charge and tax. */
  redeemableBase: number,
  requestedPoints: number,
): RedeemPreview {
  const none = (reason?: string): RedeemPreview => ({ points: 0, value: 0, maxPoints: 0, reason });

  if (!loyalty?.enabled || loyalty.redeemEnabled === false) return none('Redeeming points is switched off.');
  if (!customer) return none('Add a customer to redeem points.');
  if (loyalty.redemptionValue <= 0) return none('Set what one point is worth in Settings.');
  if (customer.pointsBalance <= 0) return none('This customer has no points yet.');

  const step = Math.max(1, loyalty.redeemStepPoints || 1);
  const capPercent = loyalty.maxRedeemPercent && loyalty.maxRedeemPercent > 0 ? loyalty.maxRedeemPercent : 100;
  const capValue = Math.floor(redeemableBase * (Math.min(100, capPercent) / 100));
  const maxPoints = floorToStep(Math.min(customer.pointsBalance, Math.floor(capValue / loyalty.redemptionValue)), step);

  if (maxPoints <= 0) return none(capPercent < 100 ? `This bill allows at most ${capPercent}% to be paid with points.` : 'This bill is too small to redeem points.');

  const minPoints = Math.max(0, loyalty.minRedeemPoints || 0);
  if (minPoints > 0 && maxPoints < minPoints) {
    return { points: 0, value: 0, maxPoints, reason: `At least ${minPoints} points are needed to redeem.` };
  }

  const wanted = floorToStep(Math.max(0, requestedPoints), step);
  if (wanted <= 0) return { points: 0, value: 0, maxPoints };
  if (minPoints > 0 && wanted < minPoints) {
    return { points: 0, value: 0, maxPoints, reason: `At least ${minPoints} points are needed to redeem.` };
  }

  const points = Math.min(wanted, maxPoints);
  const reason = points < floorToStep(requestedPoints, step)
    ? `Reduced to ${points} points, the most this bill and balance allow.`
    : undefined;
  return { points, value: points * loyalty.redemptionValue, maxPoints, reason };
}

/** Points earned on the goods actually paid for — never on tax or service charge. */
export function pointsEarnedFor(netSubtotal: number, loyalty: LoyaltySettings | undefined): number {
  if (!loyalty?.enabled || loyalty.earnRateSpend <= 0) return 0;
  return Math.floor(netSubtotal / loyalty.earnRateSpend) * loyalty.earnRatePoints;
}
