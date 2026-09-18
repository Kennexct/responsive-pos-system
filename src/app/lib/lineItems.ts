import type { CartItem, OptionChoice, OptionGroup, Product, ProductVariant, SelectedOption } from '../components/mockData';

/**
 * One rule for what a line costs: base price + variant + every selected option.
 * Used by the cart, the item builder, the pricing engine and receipts, so they cannot disagree.
 */
export function unitPriceOf(item: Pick<CartItem, 'product' | 'variant' | 'selectedOptions'>): number {
  return lineUnitPrice(item.product, item.variant, item.selectedOptions);
}

export function lineUnitPrice(product: Product, variant?: ProductVariant, options?: SelectedOption[]): number {
  return product.price
    + (variant?.priceModifier ?? 0)
    + (options ?? []).reduce((sum, o) => sum + o.priceDelta, 0);
}

/** "Large, Ice, +1 shot" — shown under the product name in the cart and on receipts. */
export function optionsSummary(item: Pick<CartItem, 'variant' | 'selectedOptions'>): string {
  return [item.variant?.name, ...(item.selectedOptions ?? []).map(o => o.choiceName)].filter(Boolean).join(', ');
}

/** Two lines merge only when the product, the variant, the options and the note all match. */
export function lineKey(item: Pick<CartItem, 'product' | 'variant' | 'selectedOptions' | 'note'>): string {
  const options = (item.selectedOptions ?? []).map(o => o.choiceId).sort().join('|');
  return [item.product.id, item.variant?.id ?? '', options, item.note?.trim() ?? ''].join('::');
}

export function toSelectedOption(group: OptionGroup, choice: OptionChoice): SelectedOption {
  return { groupId: group.id, groupName: group.name, choiceId: choice.id, choiceName: choice.name, priceDelta: choice.priceDelta };
}

/** Choices ticked when the builder opens: every default, respecting each group's rules. */
export function defaultSelection(product: Product): SelectedOption[] {
  return (product.optionGroups ?? []).flatMap(group => {
    const available = group.choices.filter(c => c.isAvailable !== false);
    const defaults = available.filter(c => c.isDefault);
    if (group.selection === 'single') {
      const pick = defaults[0] ?? (group.required ? available[0] : undefined);
      return pick ? [toSelectedOption(group, pick)] : [];
    }
    const limited = group.maxSelect ? defaults.slice(0, group.maxSelect) : defaults;
    return limited.map(c => toSelectedOption(group, c));
  });
}

/** Toggle a choice, keeping the group's single/multi and maxSelect rules. */
export function toggleChoice(selected: SelectedOption[], group: OptionGroup, choice: OptionChoice): SelectedOption[] {
  const isSelected = selected.some(o => o.choiceId === choice.id);
  const others = selected.filter(o => o.groupId !== group.id);
  const inGroup = selected.filter(o => o.groupId === group.id);

  if (group.selection === 'single') {
    // Tapping the chosen one again clears it, unless the group is required.
    if (isSelected && !group.required) return others;
    return [...others, toSelectedOption(group, choice)];
  }
  if (isSelected) return [...others, ...inGroup.filter(o => o.choiceId !== choice.id)];
  if (group.maxSelect && inGroup.length >= group.maxSelect) return selected;
  return [...others, ...inGroup, toSelectedOption(group, choice)];
}

/** Groups still waiting for a choice. The builder's Add button stays disabled while this is non-empty. */
export function missingRequiredGroups(product: Product, selected: SelectedOption[]): OptionGroup[] {
  return (product.optionGroups ?? []).filter(g => g.required && !selected.some(o => o.groupId === g.id));
}

/** Keeps selections in the order the groups are configured, so the summary always reads the same. */
export function sortSelection(product: Product, selected: SelectedOption[]): SelectedOption[] {
  const order = new Map((product.optionGroups ?? []).map((g, i) => [g.id, i]));
  return [...selected].sort((a, b) => (order.get(a.groupId) ?? 0) - (order.get(b.groupId) ?? 0));
}
