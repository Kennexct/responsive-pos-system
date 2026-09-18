import { describe, it, expect } from 'vitest';
import { defaultSelection, lineKey, lineUnitPrice, missingRequiredGroups, optionsSummary, sortSelection, toggleChoice } from '../lineItems';
import type { OptionGroup, Product, SelectedOption } from '../../components/mockData';

const size: OptionGroup = {
  id: 'g-size', name: 'Size', selection: 'single', required: true,
  choices: [
    { id: 'c-s', name: 'Small', priceDelta: -3000 },
    { id: 'c-m', name: 'Medium', priceDelta: 0, isDefault: true },
    { id: 'c-l', name: 'Large', priceDelta: 6000 },
  ],
};
const temp: OptionGroup = {
  id: 'g-temp', name: 'Temperature', selection: 'single', required: true,
  choices: [{ id: 'c-hot', name: 'Hot', priceDelta: 0 }, { id: 'c-ice', name: 'Ice', priceDelta: 2000 }],
};
const extras: OptionGroup = {
  id: 'g-extra', name: 'Extras', selection: 'multi', required: false, maxSelect: 2,
  choices: [
    { id: 'c-shot1', name: '+1 shot', priceDelta: 8000 },
    { id: 'c-shot2', name: '+2 shots', priceDelta: 15000 },
    { id: 'c-oat', name: 'Oat milk', priceDelta: 10000 },
  ],
};
const latte = { id: 'p1', name: 'Latte', price: 25000, optionGroups: [size, temp, extras] } as Product;
const pick = (s: SelectedOption[], id: string) => s.some(o => o.choiceId === id);

describe('line items', () => {
  it('adds variant and every option to the unit price', () => {
    const selected = [
      { groupId: 'g-size', groupName: 'Size', choiceId: 'c-l', choiceName: 'Large', priceDelta: 6000 },
      { groupId: 'g-extra', groupName: 'Extras', choiceId: 'c-shot1', choiceName: '+1 shot', priceDelta: 8000 },
    ];
    expect(lineUnitPrice(latte, undefined, selected)).toBe(39000);
    expect(lineUnitPrice(latte, { id: 'v1', name: 'Bottle', priceModifier: 5000 }, selected)).toBe(44000);
  });

  it('keeps a zero-price option at zero and lets a choice reduce the price', () => {
    expect(lineUnitPrice(latte, undefined, [{ groupId: 'g-temp', groupName: 'Temperature', choiceId: 'c-hot', choiceName: 'Hot', priceDelta: 0 }])).toBe(25000);
    expect(lineUnitPrice(latte, undefined, [{ groupId: 'g-size', groupName: 'Size', choiceId: 'c-s', choiceName: 'Small', priceDelta: -3000 }])).toBe(22000);
  });

  it('starts with the defaults, and with the first choice when a group is required', () => {
    const selection = defaultSelection(latte);
    expect(pick(selection, 'c-m')).toBe(true);   // marked default
    expect(pick(selection, 'c-hot')).toBe(true); // required, so first choice
    expect(selection.filter(o => o.groupId === 'g-extra')).toHaveLength(0);
  });

  it('replaces the choice in a single-select group', () => {
    const after = toggleChoice(defaultSelection(latte), size, size.choices[2]);
    expect(after.filter(o => o.groupId === 'g-size')).toHaveLength(1);
    expect(pick(after, 'c-l')).toBe(true);
  });

  it('will not clear a required group by tapping the same choice twice', () => {
    const once = toggleChoice([], temp, temp.choices[1]);
    expect(toggleChoice(once, temp, temp.choices[1]).filter(o => o.groupId === 'g-temp')).toHaveLength(1);
  });

  it('stacks multi-select choices up to maxSelect and untoggles them', () => {
    let s = toggleChoice([], extras, extras.choices[0]);
    s = toggleChoice(s, extras, extras.choices[2]);
    expect(s).toHaveLength(2);
    s = toggleChoice(s, extras, extras.choices[1]); // third: over the limit, ignored
    expect(s).toHaveLength(2);
    s = toggleChoice(s, extras, extras.choices[0]);
    expect(pick(s, 'c-shot1')).toBe(false);
  });

  it('reports required groups that are still empty', () => {
    expect(missingRequiredGroups(latte, []).map(g => g.name)).toEqual(['Size', 'Temperature']);
    expect(missingRequiredGroups(latte, defaultSelection(latte))).toHaveLength(0);
  });

  it('summarises and orders selections the way the groups are configured', () => {
    const messy = [
      { groupId: 'g-extra', groupName: 'Extras', choiceId: 'c-shot1', choiceName: '+1 shot', priceDelta: 8000 },
      { groupId: 'g-size', groupName: 'Size', choiceId: 'c-l', choiceName: 'Large', priceDelta: 6000 },
    ];
    const sorted = sortSelection(latte, messy);
    expect(optionsSummary({ selectedOptions: sorted })).toBe('Large, +1 shot');
    expect(optionsSummary({ variant: { id: 'v1', name: 'Bottle', priceModifier: 0 }, selectedOptions: sorted })).toBe('Bottle, Large, +1 shot');
  });

  it('merges only lines with the same options and note', () => {
    const base = { product: latte, variant: undefined, selectedOptions: defaultSelection(latte) };
    expect(lineKey(base)).toBe(lineKey({ ...base, selectedOptions: [...base.selectedOptions].reverse() }));
    expect(lineKey(base)).not.toBe(lineKey({ ...base, note: 'no straw' }));
    expect(lineKey(base)).not.toBe(lineKey({ ...base, selectedOptions: toggleChoice(base.selectedOptions, size, size.choices[2]) }));
  });
});
