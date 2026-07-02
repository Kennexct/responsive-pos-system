import { useState, type ElementType } from 'react';
import { X, Banknote, Smartphone, CreditCard, Building2, Printer, Delete, CheckCircle, Ticket } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { CartItem, OrderType, PaymentMethod, DiscountSettings, PromoCode, Customer, LoyaltySettings } from './mockData';
import { formatIDR } from './mockData';

interface CheckoutModalProps {
  cart: CartItem[];
  orderType: OrderType;
  cashierName: string;
  bizName: string;
  darkMode: boolean;
  discountSettings: DiscountSettings;
  categories: { id: string; name: string }[];
  subtotalBeforePromo: number;
  taxAmount: number;
  customers?: Customer[];
  loyaltySettings?: LoyaltySettings;
  selectedCustomerId?: string | null;
  onClose: (completed?: boolean) => void;
  onConfirm: (method: PaymentMethod, amountPaid: number, promoCode?: string, pointsRedeemed?: number, pointsDiscountAmt?: number) => void;
}

const PAYMENT_OPTIONS: { id: PaymentMethod; label: string; icon: ElementType }[] = [
  { id: 'cash',          label: 'Cash',           icon: Banknote   },
  { id: 'qris',          label: 'QRIS',           icon: Smartphone },
  { id: 'card',          label: 'Debit / Credit', icon: CreditCard },
  { id: 'bank-transfer', label: 'Bank Transfer',  icon: Building2  },
];

export function CheckoutModal({ cart, orderType, cashierName, bizName, darkMode, discountSettings, categories, subtotalBeforePromo, taxAmount, customers, loyaltySettings, selectedCustomerId, onClose, onConfirm }: CheckoutModalProps) {
  const [orderNumber] = useState(() => `INV-${Date.now().toString().slice(-6)}`);
  const [step,       setStep]      = useState<'payment' | 'success'>('payment');
  const [method,     setMethod]    = useState<PaymentMethod>('cash');
  const [cashInput,  setCashInput] = useState('');
  
  // Promo Code State
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [promoError, setPromoError] = useState('');
  
  // Points state
  const [usePoints, setUsePoints] = useState(false);

  const applyPromo = () => {
    setPromoError('');
    if (!promoInput.trim()) return;
    
    const promo = discountSettings.promoCodes.find(p => p.code.toUpperCase() === promoInput.toUpperCase());
    if (!promo || !promo.active) {
      setPromoError('Invalid or inactive promo code');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    if (promo.activeDate && today < promo.activeDate) {
      setPromoError('Promo code is not yet active');
      return;
    }
    if (promo.expiryDate && today > promo.expiryDate) {
      setPromoError('Promo code has expired');
      return;
    }
    if (promo.minSpend && subtotalBeforePromo < promo.minSpend) {
      setPromoError(`Minimum spend of Rp ${promo.minSpend.toLocaleString('id-ID')} required`);
      return;
    }
    if (promo.cannotCombine) {
      const hasItemDiscount = cart.some(item => (item.discount || 0) > 0 || (item.itemDiscountNominal || 0) > 0);
      if (hasItemDiscount) {
        setPromoError('Cannot be combined with item discounts');
        return;
      }
    }

    setAppliedPromo(promo);
  };

  const removePromo = () => {
    setAppliedPromo(null);
    setPromoInput('');
  };

  // Recalculate totals
  let promoDiscountAmt = 0;
  if (appliedPromo) {
    let applicableSubtotal = subtotalBeforePromo;
    
    if (appliedPromo.categories && appliedPromo.categories.length > 0) {
      const allowedCategoryNames = categories
        .filter(c => appliedPromo.categories!.includes(c.id))
        .map(c => c.name);
        
      applicableSubtotal = cart
        .filter(item => allowedCategoryNames.includes(item.product.category))
        .reduce((sum, item) => {
          const basePrice = item.product.price + (item.variant?.priceModifier || 0);
          const linePrice = basePrice * item.qty;
          let after = linePrice;
          if (item.itemDiscountNominal) after -= (item.itemDiscountNominal * item.qty);
          else if (item.discount) after -= linePrice * (item.discount / 100);
          return sum + after;
        }, 0);
    }

    if (applicableSubtotal > 0) {
      if (appliedPromo.type === 'percent') {
        promoDiscountAmt = applicableSubtotal * (appliedPromo.value / 100);
      } else {
        promoDiscountAmt = Math.min(appliedPromo.value, applicableSubtotal);
      }
    }
  }

  const finalSubtotalAfterPromo = Math.max(0, subtotalBeforePromo - promoDiscountAmt);
  
  let pointsDiscountAmt = 0;
  let pointsRedeemed = 0;
  const customer = customers?.find(c => c.id === selectedCustomerId);

  if (usePoints && customer && loyaltySettings?.enabled) {
    const maxPointsValue = customer.pointsBalance * loyaltySettings.redemptionValue;
    pointsDiscountAmt = Math.min(finalSubtotalAfterPromo, maxPointsValue);
    pointsRedeemed = Math.ceil(pointsDiscountAmt / loyaltySettings.redemptionValue);
  }

  const finalSubtotal = Math.max(0, finalSubtotalAfterPromo - pointsDiscountAmt);
  const effectiveRatio = subtotalBeforePromo > 0 ? (finalSubtotal / subtotalBeforePromo) : 1;
  const finalTax = Math.round(taxAmount * effectiveRatio);
  const total = finalSubtotal + finalTax;

  const cashPaid   = parseInt(cashInput.replace(/\D/g, ''), 10) || 0;
  const change     = cashPaid - total;
  const canConfirm = method !== 'cash' || cashPaid >= total;

  const QUICK_AMOUNTS = [50000, 100000, 150000, 200000, 250000, 500000].filter(a => a >= total);

  const handleConfirm = () => {
    onConfirm(method, method === 'cash' ? cashPaid : total, appliedPromo?.code, pointsRedeemed, pointsDiscountAmt);
    setStep('success');
  };

  // ── Numpad handlers ─────────────────────────────────────────────────────
  const numpadPress = (key: string) => {
    if (key === '⌫') {
      setCashInput(prev => prev.slice(0, -1));
    } else if (key === 'C') {
      setCashInput('');
    } else {
      setCashInput(prev => {
        const next = (prev + key).replace(/^0+(?!$)/, '');
        return next;
      });
    }
  };

  const NUMPAD = ['7','8','9','4','5','6','1','2','3','C','0','⌫'];

  // ── Print receipt ─────────────────────────────────────────────────────
  const getReceiptHtml = () => {
    const paymentLabel = PAYMENT_OPTIONS.find(p => p.id === method)?.label ?? method;
    const orderTypeLabel = { 'dine-in': 'Dine-in', 'takeaway': 'Takeaway', 'delivery': 'Delivery' }[orderType];
    const now = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt ${orderNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: 12px; max-width: 280px; margin: 0 auto; padding: 12px; background: white; color: black; }
    .center { text-align: center; }
    .bold   { font-weight: bold; }
    .div    { border-top: 1px dashed #000; margin: 8px 0; }
    .row    { display: flex; justify-content: space-between; margin: 2px 0; }
    .indent { padding-left: 8px; color: #555; }
    .total  { font-size: 14px; font-weight: bold; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="center bold" style="font-size:15px">${bizName.toUpperCase()}</div>
  <div class="center" style="color:#555">${cashierName}</div>
  <div class="div"></div>
  <div class="row"><span>${orderNumber}</span><span>${now}</span></div>
  <div class="row"><span>Order type:</span><span>${orderTypeLabel}</span></div>
  <div class="div"></div>
  ${cart.map(item => {
    const basePrice = item.product.price + (item.variant?.priceModifier || 0);
    const linePrice = basePrice * item.qty;
    let after = linePrice;
    if (item.itemDiscountNominal) after -= (item.itemDiscountNominal * item.qty);
    else if (item.discount) after -= linePrice * (item.discount / 100);
    
    return `<div class="row"><span class="bold">${item.product.name} ${item.variant ? `(${item.variant.name})` : ''}</span></div>
      <div class="row indent"><span>${item.qty} x ${formatIDR(basePrice)}${item.discount > 0 ? ` (-${item.discount}%)` : item.itemDiscountNominal ? ` (-Rp${item.itemDiscountNominal})` : ''}</span><span>${formatIDR(after)}</span></div>`;
  }).join('')}
  <div class="div"></div>
  <div class="row"><span>Subtotal</span><span>${formatIDR(subtotalBeforePromo)}</span></div>
  ${appliedPromo ? `<div class="row"><span>Promo (${appliedPromo.code})</span><span>-${formatIDR(promoDiscountAmt)}</span></div>` : ''}
  ${pointsDiscountAmt > 0 ? `<div class="row"><span>Points Redeemed (${pointsRedeemed})</span><span>-${formatIDR(pointsDiscountAmt)}</span></div>` : ''}
  <div class="row"><span>Tax</span><span>${formatIDR(finalTax)}</span></div>
  <div class="div"></div>
  <div class="row total"><span>TOTAL</span><span>${formatIDR(total)}</span></div>
  <div class="row" style="margin-top:4px"><span>Payment: ${paymentLabel}</span>${method === 'cash' && cashPaid >= total ? `<span>Change: ${formatIDR(change)}</span>` : ''}</div>
  <div class="div"></div>
  <div class="center" style="margin-top:8px"><strong>** Thank you! **</strong></div>
  <div class="center" style="color:#999;font-size:10px;margin-top:4px">Powered by POS Pro</div>
</body>
</html>`;
  };

  const printReceipt = () => {
    const html = getReceiptHtml();
    const win = window.open('', '_blank', 'width=320,height=500');
    if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 400); }
  };

  const dm = darkMode;
  const modalBg = dm ? 'bg-slate-900' : 'bg-white';
  const t1      = dm ? 'text-slate-100' : 'text-slate-800';
  const t2      = dm ? 'text-slate-400' : 'text-slate-500';
  const card    = dm ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200';
  const inputCls = dm ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-500 focus:border-blue-400' : 'bg-white border-slate-200 text-slate-700 focus:border-blue-400';

  if (step === 'success') {
    return (
      <ModalShell onClose={() => onClose(true)} darkMode={dm}>
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mb-4">
            <CheckCircle size={32} className="text-emerald-600" />
          </div>
          <h2 className={`text-xl font-bold mb-1 ${t1}`}>Payment Received</h2>
          <p className={`text-sm mb-4 ${t2}`}>Order: {orderNumber}</p>

          <div className="w-full h-64 border rounded-xl overflow-hidden bg-white shadow-inner mb-2">
            <iframe srcDoc={getReceiptHtml()} className="w-full h-full border-0" title="Receipt Preview" />
          </div>

          <div className="flex gap-3 w-full mt-4">
            <button
              onClick={printReceipt}
              className={`flex-1 flex items-center justify-center gap-2 border rounded-xl py-3 text-sm font-medium transition-colors ${dm ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              <Printer size={16} /> Print Receipt
            </button>
            <button
              onClick={() => onClose(true)}
              className="flex-1 bg-blue-600 text-white rounded-xl py-3 hover:bg-blue-700 transition-colors text-sm font-semibold"
            >
              New Order
            </button>
          </div>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell onClose={onClose} darkMode={dm}>
      <h2 className={`font-bold mb-4 ${t1}`}>Checkout</h2>

      {/* Order summary */}
      <div className={`rounded-xl p-3 space-y-1.5 mb-4 border ${card}`}>
        <div className={`border-b pb-1.5 mb-1.5 space-y-1 tabular-nums ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className={`flex justify-between text-sm ${t2}`}><span>Subtotal</span><span>{formatIDR(subtotalBeforePromo)}</span></div>
          {appliedPromo && (
            <div className={`flex justify-between text-sm text-emerald-500 font-medium`}>
              <span>Promo ({appliedPromo.code})</span><span>-{formatIDR(promoDiscountAmt)}</span>
            </div>
          )}
          {pointsDiscountAmt > 0 && (
            <div className={`flex justify-between text-sm text-amber-500 font-medium`}>
              <span>Points Redeemed ({pointsRedeemed})</span><span>-{formatIDR(pointsDiscountAmt)}</span>
            </div>
          )}
          <div className={`flex justify-between text-sm ${t2}`}><span>Tax</span><span>{formatIDR(finalTax)}</span></div>
          <div className={`flex justify-between text-sm font-bold ${t1} pt-1 mt-1 border-t ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
            <span>Total</span><span className="text-blue-500">{formatIDR(total)}</span>
          </div>
        </div>

        {/* Points Input */}
        {customer && loyaltySettings?.enabled && customer.pointsBalance > 0 && (
          <div className="mt-2 mb-3">
            <label className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors ${usePoints ? 'border-amber-500 bg-amber-500/10' : dm ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={usePoints} onChange={e => setUsePoints(e.target.checked)} className="w-4 h-4 text-amber-500" />
                <div>
                  <div className={`text-sm font-medium ${usePoints ? 'text-amber-600 dark:text-amber-500' : t1}`}>
                    Redeem Points
                  </div>
                  <div className={`text-xs ${t2}`}>
                    {customer.pointsBalance} pts available (max {formatIDR(customer.pointsBalance * loyaltySettings.redemptionValue)})
                  </div>
                </div>
              </div>
            </label>
          </div>
        )}

        {/* Promo Code Input */}
        {discountSettings.enabled && (
          <div className="mt-2">
            {!appliedPromo ? (
              <div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Ticket size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${t2}`} />
                    <input 
                      type="text" placeholder="Promo code" value={promoInput} onChange={e => setPromoInput(e.target.value.toUpperCase())}
                      className={`w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:outline-none uppercase ${inputCls}`}
                    />
                  </div>
                  <button onClick={applyPromo} disabled={!promoInput.trim()} className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg disabled:opacity-50">Apply</button>
                </div>
                {promoError && <p className="text-xs text-red-500 mt-1 pl-1">{promoError}</p>}
              </div>
            ) : (
              <div className={`flex items-center justify-between p-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10`}>
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
                  <Ticket size={14} /> Code {appliedPromo.code} applied!
                </div>
                <button onClick={removePromo} className="text-emerald-700 hover:text-emerald-900"><X size={14} /></button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment method */}
      <p className={`text-xs font-semibold mb-2 ${t2}`}>PAYMENT METHOD</p>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {PAYMENT_OPTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setMethod(id)}
            className={[
              'flex items-center gap-2 border-2 rounded-xl px-3 py-2.5 transition-all text-left text-sm font-medium',
              method === id
                ? 'border-blue-600 bg-blue-600/10 text-blue-600'
                : dm ? 'border-slate-700 text-slate-400 hover:border-slate-600' : 'border-slate-200 text-slate-600 hover:border-slate-300',
            ].join(' ')}
          >
            <Icon size={17} className="shrink-0" />
            {label}
          </button>
        ))}
      </div>

      {/* Cash: numpad */}
      {method === 'cash' && (
        <div className="mb-4">
          <div className={`rounded-xl px-4 py-3 mb-3 border ${dm ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <p className={`text-xs font-semibold mb-1 ${t2}`}>AMOUNT RECEIVED</p>
            <div className="flex items-center gap-2">
              <span className={`text-sm ${t2} pb-1`}>Rp</span>
              <input
                type="text"
                autoFocus
                placeholder="0"
                value={cashInput ? Number(cashInput).toLocaleString('id-ID') : ''}
                onChange={e => setCashInput(e.target.value.replace(/\D/g, ''))}
                className={`w-full bg-transparent text-2xl font-bold tabular-nums focus:outline-none ${cashInput ? (cashPaid >= total ? 'text-emerald-600' : 'text-red-500') : t1}`}
              />
            </div>
            {cashInput && cashPaid >= total && (
              <p className="text-emerald-600 text-sm font-semibold mt-1">Change: {formatIDR(change)}</p>
            )}
            {cashInput && cashPaid < total && (
              <p className="text-red-500 text-sm font-semibold mt-1">Short: {formatIDR(total - cashPaid)}</p>
            )}
          </div>

          <div className="flex gap-2 flex-wrap mb-3">
            <button
              onClick={() => setCashInput(String(total))}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors tabular-nums ${
                cashInput === String(total)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : dm ? 'border-slate-700 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Exact: {formatIDR(total)}
            </button>
            {QUICK_AMOUNTS.slice(0, 4).map(amt => (
              <button
                key={amt}
                onClick={() => setCashInput(String(amt))}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors tabular-nums ${
                  cashInput === String(amt)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : dm ? 'border-slate-700 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {formatIDR(amt)}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 md:hidden">
            {NUMPAD.map(key => (
              <button
                key={key}
                onClick={() => numpadPress(key)}
                className={[
                  'numpad-btn rounded-xl py-3.5 text-lg font-semibold transition-all active:scale-95 select-none',
                  key === '⌫' || key === 'C'
                    ? dm ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    : dm ? 'bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700' : 'bg-white text-slate-800 hover:bg-slate-50 border border-slate-200 shadow-sm',
                ].join(' ')}
              >
                {key === '⌫' ? <Delete size={18} className="mx-auto" /> : key}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleConfirm}
        disabled={!canConfirm}
        className={[
          'w-full py-4 rounded-xl transition-colors text-white font-semibold tabular-nums',
          canConfirm ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-300 dark:bg-slate-700 text-slate-400 cursor-not-allowed',
        ].join(' ')}
      >
        Confirm Payment · {formatIDR(total)}
      </button>
    </ModalShell>
  );
}

function ModalShell({ children, onClose, darkMode }: { children: React.ReactNode; onClose: () => void; darkMode: boolean }) {
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
          className="absolute inset-0 bg-black/50" onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={`relative w-full md:max-w-md rounded-t-2xl md:rounded-2xl p-5 md:p-6 max-h-[96vh] overflow-y-auto shadow-2xl ${
            darkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white'
          }`}
        >
          <button
            onClick={onClose}
            className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-400'}`}
          >
            <X size={18} />
          </button>
          {children}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
