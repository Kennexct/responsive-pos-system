import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { X, Minus, Plus, Check } from 'lucide-react';
import type { Product, ProductVariant, SelectedOption } from './mockData';
import { formatIDR } from './mockData';
import { defaultSelection, lineUnitPrice, missingRequiredGroups, sortSelection, toggleChoice } from '../lib/lineItems';

interface ItemBuilderModalProps {
  product: Product;
  darkMode: boolean;
  onAdd: (args: { variant?: ProductVariant; options: SelectedOption[]; note?: string; qty: number }) => void;
  onClose: () => void;
}

/**
 * One sheet for everything that changes a line: which variant, which options, how many.
 * Cashiers work top to bottom and never have to guess the price — the footer shows the line total live.
 */
export function ItemBuilderModal({ product, darkMode, onAdd, onClose }: ItemBuilderModalProps) {
  const dm = darkMode;
  const variants = product.variants ?? [];
  const groups = product.optionGroups ?? [];

  const [variant, setVariant] = useState<ProductVariant | undefined>(variants[0]);
  const [selected, setSelected] = useState<SelectedOption[]>(() => defaultSelection(product));
  const [note, setNote] = useState('');
  const [qty, setQty] = useState(1);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const missing = useMemo(() => missingRequiredGroups(product, selected), [product, selected]);
  const unitPrice = lineUnitPrice(product, variant, selected);
  const maxQty = product.trackInventory ? Math.max(0, product.stock) : Infinity;

  const submit = () => {
    if (missing.length > 0) return setShowErrors(true);
    onAdd({ variant, options: sortSelection(product, selected), note: note.trim() || undefined, qty });
  };

  const surface = dm ? 'bg-ink-900' : 'bg-white';
  const t1 = dm ? 'text-ink-100' : 'text-ink-900';
  const t2 = dm ? 'text-ink-400' : 'text-ink-500';
  const divider = dm ? 'border-ink-800' : 'border-ink-200';

  const choiceClass = (active: boolean, disabled: boolean) => [
    'flex items-center justify-between gap-3 w-full rounded-md border px-3 min-h-12 text-left cursor-pointer',
    disabled ? 'opacity-40 cursor-not-allowed' : '',
    active
      ? 'border-brand-600 bg-brand-50 text-brand-800 dark:border-brand-400 dark:bg-brand-500/15 dark:text-brand-100'
      : dm ? 'border-ink-700 bg-ink-800 text-ink-200 hover:border-ink-600' : 'border-ink-200 bg-white text-ink-800 hover:border-ink-300',
  ].join(' ');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={`Add ${product.name}`}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
        className="absolute inset-0 bg-ink-950/60" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.2, ease: [0.2, 0.7, 0.2, 1] }}
        className={`relative w-full sm:max-w-md max-h-[92dvh] flex flex-col rounded-t-2xl sm:rounded-xl ${surface}`}
      >
        <header className={`flex items-start gap-3 p-4 border-b shrink-0 ${divider}`}>
          <div className={`w-11 h-11 rounded-lg flex items-center justify-center overflow-hidden shrink-0 ${dm ? 'bg-ink-800' : 'bg-ink-100'}`}>
            {product.image ? <img src={product.image} alt="" className="w-full h-full object-cover" /> : <span className="text-xl">{product.emoji}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className={`font-semibold leading-tight ${t1}`}>{product.name}</h2>
            <p className={`text-sm tabular-nums ${t2}`}>{formatIDR(product.price)} base</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            className={`p-2 -mr-1 -mt-1 rounded-md cursor-pointer ${dm ? 'text-ink-400 hover:bg-ink-800' : 'text-ink-400 hover:bg-ink-100'}`}>
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {variants.length > 0 && (
            <fieldset>
              <legend className={`text-sm font-semibold mb-2 ${t1}`}>
                Variant <span className={`font-normal ${t2}`}>— separate item, own stock</span>
              </legend>
              <div className="space-y-2">
                {variants.map(v => {
                  const active = variant?.id === v.id;
                  return (
                    <label key={v.id} className={choiceClass(active, false)}>
                      <input type="radio" name="variant" className="sr-only" checked={active} onChange={() => setVariant(v)} />
                      <span className="text-[15px] font-medium">{v.name}</span>
                      <span className="flex items-center gap-2 text-sm tabular-nums">
                        {formatIDR(product.price + v.priceModifier)}
                        {active && <Check size={16} className="text-brand-600 dark:text-brand-300" />}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          {groups.map(group => {
            const chosen = selected.filter(o => o.groupId === group.id);
            const atLimit = group.selection === 'multi' && !!group.maxSelect && chosen.length >= group.maxSelect;
            const isMissing = showErrors && missing.some(g => g.id === group.id);
            return (
              <fieldset key={group.id} aria-describedby={isMissing ? `${group.id}-error` : undefined}>
                <legend className={`flex items-baseline gap-2 text-sm font-semibold mb-2 ${t1}`}>
                  {group.name}
                  <span className={`text-xs font-normal ${t2}`}>
                    {group.required ? 'Required' : 'Optional'}
                    {group.selection === 'multi' && group.maxSelect ? `, up to ${group.maxSelect}` : ''}
                  </span>
                </legend>
                <div className="space-y-2">
                  {group.choices.map(choice => {
                    const active = chosen.some(o => o.choiceId === choice.id);
                    const soldOut = choice.isAvailable === false;
                    const blocked = soldOut || (atLimit && !active);
                    return (
                      <label key={choice.id} className={choiceClass(active, blocked)}>
                        <input
                          type={group.selection === 'single' ? 'radio' : 'checkbox'}
                          name={group.id}
                          className="sr-only"
                          checked={active}
                          disabled={blocked}
                          onChange={() => { setSelected(prev => toggleChoice(prev, group, choice)); setShowErrors(false); }}
                        />
                        <span className="text-[15px] font-medium">
                          {choice.name}
                          {soldOut && <span className={`ml-2 text-xs ${t2}`}>sold out</span>}
                        </span>
                        <span className="flex items-center gap-2 text-sm tabular-nums">
                          {choice.priceDelta === 0 ? '' : `${choice.priceDelta > 0 ? '+' : '−'}${formatIDR(Math.abs(choice.priceDelta))}`}
                          {active && <Check size={16} className="text-brand-600 dark:text-brand-300" />}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {isMissing && (
                  <p id={`${group.id}-error`} role="alert" className="mt-1.5 text-sm text-chili-600 dark:text-chili-300">
                    Choose one to continue.
                  </p>
                )}
              </fieldset>
            );
          })}

          <label className="block">
            <span className={`text-sm font-semibold block mb-2 ${t1}`}>Note <span className={`font-normal ${t2}`}>— optional</span></span>
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. less ice, no straw"
              maxLength={80}
              className={`w-full h-11 rounded-md border px-3 text-[15px] focus:outline-none focus:border-brand-500 ${
                dm ? 'bg-ink-800 border-ink-700 text-ink-100 placeholder:text-ink-500' : 'bg-white border-ink-200 text-ink-900 placeholder:text-ink-400'
              }`}
            />
          </label>
        </div>

        <footer className={`p-4 border-t shrink-0 space-y-3 ${divider} ${dm ? 'bg-ink-900' : 'bg-ink-50'}`}>
          <div className="flex items-center justify-between">
            <div className={`flex items-center border rounded-md overflow-hidden ${dm ? 'border-ink-700' : 'border-ink-300 bg-white'}`}>
              <button type="button" onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="One less"
                className={`w-11 h-11 flex items-center justify-center cursor-pointer ${dm ? 'text-ink-300 hover:bg-ink-800' : 'text-ink-600 hover:bg-ink-100'}`}>
                <Minus size={16} />
              </button>
              <span className={`w-10 text-center font-semibold tabular-nums ${t1}`} aria-live="polite">{qty}</span>
              <button type="button" onClick={() => setQty(q => Math.min(maxQty, q + 1))} disabled={qty >= maxQty} aria-label="One more"
                className={`w-11 h-11 flex items-center justify-center cursor-pointer disabled:opacity-40 ${dm ? 'text-ink-300 hover:bg-ink-800' : 'text-ink-600 hover:bg-ink-100'}`}>
                <Plus size={16} />
              </button>
            </div>
            <div className="text-right">
              <p className={`text-xs ${t2}`}>{formatIDR(unitPrice)} each</p>
              <p className={`text-xl font-extrabold tabular-nums leading-tight ${t1}`}>{formatIDR(unitPrice * qty)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={submit}
            className={`w-full h-12 rounded-md font-semibold cursor-pointer ${
              dm ? 'bg-brand-400 text-ink-950 hover:bg-brand-300' : 'bg-brand-600 text-white hover:bg-brand-700'
            }`}
          >
            Add to order
          </button>
        </footer>
      </motion.div>
    </div>
  );
}
