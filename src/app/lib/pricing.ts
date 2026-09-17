/**
 * Pricing engine — the single source of truth for order totals.
 *
 * Calculation order (explicit, never assumed — see additionalfeature2.md §9.2 / §10.4):
 *   1. Line gross        = unit price × qty
 *   2. Line discount     = nominal-per-unit × qty, else percent (capped at gross)
 *   3. Tier discount     = % of discountable lines
 *   4. Promo discount    = % (with cap) or nominal, on discountable lines in the promo's categories
 *   5. Points discount   = currency value, capped at what is left, spread across all lines
 *   6. Service charge    = % of net subtotal (optional, may itself be taxable)
 *   7. Tax               = per line, on the discounted base; inclusive taxes are extracted,
 *                          exclusive taxes are added; a rule marked `compound` also taxes
 *                          the exclusive taxes before it (sorted by `order`)
 *
 * All money is handled in whole currency units (IDR has no minor unit). Every order-level
 * discount is allocated to lines with a largest-remainder split, so line values always sum
 * exactly to the order values and tax is never charged on money the customer didn't pay.
 */

export interface PricingLine {
  id: string;
  unitPrice: number;
  qty: number;
  /** Per-unit nominal discount. Takes precedence over `lineDiscountPercent`. */
  lineDiscountNominal?: number;
  lineDiscountPercent?: number;
  categoryId?: string;
  taxable: boolean;
  discountable: boolean;
}

export interface PricingTaxRule {
  id: string;
  name: string;
  rate: number;
  isInclusive: boolean;
  order: number;
  /** When true, this exclusive tax is charged on the base plus earlier exclusive taxes. Default: additive. */
  compound?: boolean;
}

export interface PricingPromo {
  type: 'percent' | 'nominal';
  value: number;
  maxDiscountAmount?: number;
  /** Empty or undefined = every discountable line qualifies. */
  categoryIds?: string[];
}

export interface ServiceChargeConfig {
  enabled: boolean;
  rate: number;
  taxable: boolean;
}

export interface PricingInput {
  lines: PricingLine[];
  taxRules: PricingTaxRule[];
  tierDiscountPercent?: number;
  promo?: PricingPromo | null;
  /** Currency value of points the customer wants to redeem. Capped automatically. */
  pointsValue?: number;
  serviceCharge?: ServiceChargeConfig | null;
}

export interface PricedLine {
  id: string;
  gross: number;
  lineDiscount: number;
  orderDiscount: number;
  net: number;
  serviceCharge: number;
  tax: number;
}

export interface TaxBreakdown {
  id: string;
  name: string;
  rate: number;
  isInclusive: boolean;
  amount: number;
}

export interface PricingResult {
  grossSubtotal: number;
  lineDiscountTotal: number;
  /** Subtotal after line discounts, before any order-level discount. */
  subtotal: number;
  tierDiscount: number;
  promoDiscount: number;
  /** Base the promo was evaluated on — use for min-spend checks. */
  promoEligibleBase: number;
  pointsDiscount: number;
  /** After every discount; excludes service charge and exclusive tax. */
  netSubtotal: number;
  serviceCharge: number;
  taxes: TaxBreakdown[];
  /** Inclusive + exclusive — the figure for the tax report. */
  taxTotal: number;
  /** Only what is added on top of prices. */
  exclusiveTaxTotal: number;
  total: number;
  lines: PricedLine[];
}

const clampNonNeg = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

/**
 * Split `amount` across `weights` so that the parts are integers summing exactly to `amount`.
 * Largest-remainder method; ties go to the earlier index for determinism.
 */
export function allocate(amount: number, weights: number[]): number[] {
  const total = weights.reduce((s, w) => s + clampNonNeg(w), 0);
  const target = Math.round(clampNonNeg(amount));
  if (total <= 0 || target === 0) return weights.map(() => 0);

  const raw = weights.map(w => (clampNonNeg(w) / total) * target);
  const parts = raw.map(Math.floor);
  let remainder = target - parts.reduce((s, p) => s + p, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; remainder > 0 && k < order.length; k++, remainder--) {
    parts[order[k].i] += 1;
  }
  return parts;
}

export function computeOrderTotals(input: PricingInput): PricingResult {
  const lines = input.lines.filter(l => l.qty > 0);

  // 1–2. Line level
  const gross = lines.map(l => Math.round(clampNonNeg(l.unitPrice) * l.qty));
  const lineDisc = lines.map((l, i) => {
    const d = l.lineDiscountNominal && l.lineDiscountNominal > 0
      ? l.lineDiscountNominal * l.qty
      : gross[i] * (clampNonNeg(l.lineDiscountPercent ?? 0) / 100);
    return Math.min(gross[i], Math.round(d));
  });
  const running = gross.map((g, i) => g - lineDisc[i]);
  const subtotal = running.reduce((s, v) => s + v, 0);
  const orderDisc = lines.map(() => 0);

  const applyDiscount = (amount: number, eligible: boolean[]) => {
    const weights = running.map((v, i) => (eligible[i] ? v : 0));
    const base = weights.reduce((s, v) => s + v, 0);
    const capped = Math.min(Math.round(clampNonNeg(amount)), base);
    const parts = allocate(capped, weights);
    parts.forEach((p, i) => { running[i] -= p; orderDisc[i] += p; });
    return capped;
  };

  // 3. Tier
  const discountable = lines.map(l => l.discountable);
  const tierBase = running.reduce((s, v, i) => s + (discountable[i] ? v : 0), 0);
  const tierDiscount = applyDiscount(tierBase * (clampNonNeg(input.tierDiscountPercent ?? 0) / 100), discountable);

  // 4. Promo
  let promoDiscount = 0;
  let promoEligibleBase = 0;
  if (input.promo) {
    const cats = input.promo.categoryIds ?? [];
    const eligible = lines.map(l => l.discountable && (cats.length === 0 || (!!l.categoryId && cats.includes(l.categoryId))));
    promoEligibleBase = running.reduce((s, v, i) => s + (eligible[i] ? v : 0), 0);
    let amount = input.promo.type === 'percent'
      ? promoEligibleBase * (clampNonNeg(input.promo.value) / 100)
      : clampNonNeg(input.promo.value);
    if (input.promo.type === 'percent' && input.promo.maxDiscountAmount && input.promo.maxDiscountAmount > 0) {
      amount = Math.min(amount, input.promo.maxDiscountAmount);
    }
    promoDiscount = applyDiscount(amount, eligible);
  }

  // 5. Points — act as a discount on anything still owed
  const pointsDiscount = applyDiscount(clampNonNeg(input.pointsValue ?? 0), lines.map(() => true));

  const netSubtotal = running.reduce((s, v) => s + v, 0);

  // 6. Service charge
  const sc = input.serviceCharge;
  const serviceCharge = sc?.enabled ? Math.round(netSubtotal * (clampNonNeg(sc.rate) / 100)) : 0;
  const scParts = allocate(serviceCharge, running);

  // 7. Tax, per line
  const rules = [...input.taxRules].filter(r => r.rate > 0).sort((a, b) => a.order - b.order);
  const inclusiveRate = rules.filter(r => r.isInclusive).reduce((s, r) => s + r.rate, 0) / 100;
  const taxRaw = new Map<string, number>(rules.map(r => [r.id, 0]));
  const lineTaxRaw = lines.map(() => 0);

  lines.forEach((l, i) => {
    if (!l.taxable) return;
    const base = running[i] + (sc?.taxable ? scParts[i] : 0);
    const preTax = base / (1 + inclusiveRate);
    let exclusiveSoFar = 0;
    for (const r of rules) {
      const amt = r.isInclusive
        ? preTax * (r.rate / 100)
        : (preTax + (r.compound ? exclusiveSoFar : 0)) * (r.rate / 100);
      if (!r.isInclusive) exclusiveSoFar += amt;
      taxRaw.set(r.id, (taxRaw.get(r.id) ?? 0) + amt);
      lineTaxRaw[i] += amt;
    }
  });

  const taxes: TaxBreakdown[] = rules.map(r => ({
    id: r.id, name: r.name, rate: r.rate, isInclusive: r.isInclusive,
    amount: Math.round(taxRaw.get(r.id) ?? 0),
  }));
  const taxTotal = taxes.reduce((s, t) => s + t.amount, 0);
  const exclusiveTaxTotal = taxes.filter(t => !t.isInclusive).reduce((s, t) => s + t.amount, 0);
  const lineTax = allocate(taxTotal, lineTaxRaw);

  return {
    grossSubtotal: gross.reduce((s, v) => s + v, 0),
    lineDiscountTotal: lineDisc.reduce((s, v) => s + v, 0),
    subtotal,
    tierDiscount,
    promoDiscount,
    promoEligibleBase,
    pointsDiscount,
    netSubtotal,
    serviceCharge,
    taxes,
    taxTotal,
    exclusiveTaxTotal,
    total: netSubtotal + serviceCharge + exclusiveTaxTotal,
    lines: lines.map((l, i) => ({
      id: l.id,
      gross: gross[i],
      lineDiscount: lineDisc[i],
      orderDiscount: orderDisc[i],
      net: running[i],
      serviceCharge: scParts[i],
      tax: lineTax[i],
    })),
  };
}
