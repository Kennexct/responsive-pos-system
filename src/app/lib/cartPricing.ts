import type { CartItem, Category, Customer, LoyaltySettings, LoyaltyTier, PromoCode } from '../components/mockData';
import type { PricingLine, PricingPromo } from './pricing';

/** Products reference categories by name; categories carry the tax/discount flags. */
export function cartToPricingLines(cart: CartItem[], categories: Category[]): PricingLine[] {
  const byName = new Map(categories.map(c => [c.name, c]));
  return cart.map(item => {
    const cat = byName.get(item.product.category);
    return {
      id: item.id,
      unitPrice: item.product.price + (item.variant?.priceModifier ?? 0),
      qty: item.qty,
      lineDiscountNominal: item.itemDiscountNominal,
      lineDiscountPercent: item.discount,
      categoryId: cat?.id,
      // Unknown category → taxable, matching a conservative default for tax reporting
      taxable: cat ? cat.isTaxable : true,
      discountable: item.product.allowDiscount !== false && cat?.isDiscountable !== false,
    };
  });
}

/**
 * One rule for both the cart and checkout: an explicitly assigned tier wins,
 * otherwise the highest tier whose spend threshold the customer has reached.
 */
export function resolveCustomerTier(customer: Customer | undefined, loyalty: LoyaltySettings | undefined): LoyaltyTier | undefined {
  if (!customer || !loyalty?.enabled) return undefined;
  const assigned = customer.tierId ? loyalty.tiers.find(t => t.id === customer.tierId) : undefined;
  if (assigned) return assigned;
  return [...loyalty.tiers].sort((a, b) => b.minSpend - a.minSpend).find(t => customer.totalSpend >= t.minSpend);
}

export function promoToPricing(promo: PromoCode | null | undefined): PricingPromo | null {
  if (!promo) return null;
  return {
    type: promo.type,
    value: promo.value,
    maxDiscountAmount: promo.maxDiscountAmount,
    categoryIds: promo.categories,
  };
}
