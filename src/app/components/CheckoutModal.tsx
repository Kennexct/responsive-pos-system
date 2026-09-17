import { useState, type ElementType } from 'react';
import { X, Banknote, Smartphone, CreditCard, Building2, Printer, Delete, CheckCircle, Ticket, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { CartItem, OrderType, PaymentMethod, DiscountSettings, PromoCode, Customer, LoyaltySettings, PaymentMethodEntry, TaxRule, ServiceChargeSettings, CheckoutResult } from './mockData';
import { computeOrderTotals, type PricingLine } from '../lib/pricing';
import { promoToPricing } from '../lib/cartPricing';
import { escapeHtml } from '../lib/escapeHtml';
import { formatIDR } from './mockData';
import { ConfirmationModal } from './ConfirmationModal';

interface CheckoutModalProps {
  cart: CartItem[];
  orderType: OrderType;
  cashierName: string;
  bizName: string;
  darkMode: boolean;
  discountSettings: DiscountSettings;
  categories: { id: string; name: string }[];
  pricingLines: PricingLine[];
  taxRules: TaxRule[];
  tierDiscountPercent: number;
  serviceCharge?: ServiceChargeSettings;
  customers?: Customer[];
  loyaltySettings?: LoyaltySettings;
  selectedCustomerId?: string | null;
  paymentMethods: PaymentMethodEntry[];
  onClose: (completed?: boolean) => void;
  onConfirm: (result: CheckoutResult) => string | void;
}

const PAYMENT_OPTIONS: { id: PaymentMethod; label: string; icon: ElementType }[] = [
  { id: 'cash',          label: 'Cash',           icon: Banknote   },
  { id: 'qris',          label: 'QRIS',           icon: Smartphone },
  { id: 'card',          label: 'Debit / Credit', icon: CreditCard },
  { id: 'bank-transfer', label: 'Bank Transfer',  icon: Building2  },
];

export function CheckoutModal({ cart, orderType, cashierName, bizName, darkMode, discountSettings, categories, pricingLines, taxRules, tierDiscountPercent, serviceCharge, customers, loyaltySettings, selectedCustomerId, paymentMethods, onClose, onConfirm }: CheckoutModalProps) {
  const availableMethods = PAYMENT_OPTIONS.filter(po => paymentMethods.find(pm => pm.id === po.id)?.enabled);
  const [orderNumber, setOrderNumber] = useState('');
  const [step,       setStep]      = useState<'payment' | 'success'>('payment');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [method,     setMethod]    = useState<PaymentMethod>(availableMethods[0]?.id || 'cash');
  const [cashInput,  setCashInput] = useState('');
  
  // Promo Code State
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [promoError, setPromoError] = useState('');
  
  // Points state
  const [pointsToRedeem, setPointsToRedeem] = useState<string>('');

  // Split payment state
  const [isSplit, setIsSplit] = useState(false);
  const [method2, setMethod2] = useState<PaymentMethod>(availableMethods.length > 1 ? availableMethods[1].id : availableMethods[0]?.id || 'cash');
  const [splitAmount, setSplitAmount] = useState<string>('');

  const [confirmCancelModal, setConfirmCancelModal] = useState(false);

  // Before promo/points: the base a promo's minimum spend is checked against.
  const basePricing = computeOrderTotals({ lines: pricingLines, taxRules, tierDiscountPercent, serviceCharge });
  const subtotalBeforePromo = basePricing.netSubtotal;

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

  const handleSelectPromo = (promo: PromoCode) => {
    setPromoError('');
    if (!promo.active) {
      setPromoError('Promo code is currently inactive');
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
      setPromoError(`Minimum spend of Rp ${promo.minSpend.toLocaleString('id-ID')} required for "${promo.name || promo.code}"`);
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
    setPromoInput(promo.code);
  };

  const removePromo = () => {
    setAppliedPromo(null);
    setPromoInput('');
  };

  // Recalculate totals with the shared engine (tax is recomputed per line after every discount)
  const customer = customers?.find(c => c.id === selectedCustomerId);
  const withPromo = computeOrderTotals({
    lines: pricingLines, taxRules, tierDiscountPercent, serviceCharge,
    promo: promoToPricing(appliedPromo),
  });
  const promoDiscountAmt = withPromo.promoDiscount;

  let pointsRedeemed = 0;
  if (Number(pointsToRedeem) > 0 && customer && loyaltySettings?.enabled && loyaltySettings.redemptionValue > 0) {
    const requestedPoints = Math.min(Math.floor(Number(pointsToRedeem)), customer.pointsBalance);
    // Points can cover the goods, never more — service charge and tax are still paid.
    const maxPointsUsable = Math.floor(withPromo.netSubtotal / loyaltySettings.redemptionValue);
    pointsRedeemed = Math.max(0, Math.min(requestedPoints, maxPointsUsable));
  }

  const pricing = pointsRedeemed > 0
    ? computeOrderTotals({
        lines: pricingLines, taxRules, tierDiscountPercent, serviceCharge,
        promo: promoToPricing(appliedPromo),
        pointsValue: pointsRedeemed * (loyaltySettings?.redemptionValue ?? 0),
      })
    : withPromo;
  const pointsDiscountAmt = pricing.pointsDiscount;
  const finalTax = pricing.taxTotal;
  const total = pricing.total;

  const pointsEarnedPreview = (customer && loyaltySettings?.enabled && loyaltySettings.earnRateSpend > 0) 
    ? Math.floor(pricing.netSubtotal / loyaltySettings.earnRateSpend) * loyaltySettings.earnRatePoints 
    : 0;

  const cashPaid   = parseInt(cashInput.replace(/\D/g, ''), 10) || 0;
  const change     = cashPaid - total;
  const cashRequired = isSplit ? ((method === 'cash' ? (Number(splitAmount) || 0) : 0) + (method2 === 'cash' ? (total - (Number(splitAmount) || 0)) : 0)) : (method === 'cash' ? total : 0);
  const isCash = (!isSplit && method === 'cash') || (isSplit && (method === 'cash' || method2 === 'cash'));
  const canConfirm = !isCash || cashPaid >= cashRequired;

  const QUICK_AMOUNTS = [50000, 100000, 150000, 200000, 250000, 500000].filter(a => a >= total);

  const handleConfirm = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const invoiceNum = onConfirm({ paymentMethod: method, amountPaid: method === 'cash' ? cashPaid : total, promoCode: appliedPromo?.code, pointsRedeemed, pricing });
      if (invoiceNum) setOrderNumber(invoiceNum);
      setStep('success');
    } catch (e) {
      console.error('Checkout error:', e);
      setIsSubmitting(false);
    }
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
    let paymentLabel = PAYMENT_OPTIONS.find(p => p.id === method)?.label ?? method;
    if (pointsRedeemed > 0) {
      if (total === 0) paymentLabel = 'Points';
      else paymentLabel += ' + Points';
    }
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
  <div class="center bold" style="font-size:15px">${escapeHtml(bizName.toUpperCase())}</div>
  <div class="center" style="color:#555">${escapeHtml(cashierName)}</div>
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
    
    return `<div class="row"><span class="bold">${escapeHtml(item.product.name)} ${item.variant ? `(${escapeHtml(item.variant.name)})` : ''}</span></div>
      <div class="row indent"><span>${item.qty} x ${formatIDR(basePrice)}${item.discount > 0 ? ` (-${item.discount}%)` : item.itemDiscountNominal ? ` (-Rp${item.itemDiscountNominal})` : ''}</span><span>${formatIDR(after)}</span></div>`;
  }).join('')}
  <div class="div"></div>
  <div class="row"><span>Subtotal</span><span>${formatIDR(subtotalBeforePromo)}</span></div>
  ${appliedPromo ? `<div class="row"><span>Promo (${escapeHtml(appliedPromo.code)})</span><span>-${formatIDR(promoDiscountAmt)}</span></div>` : ''}
  ${pointsDiscountAmt > 0 ? `<div class="row"><span>Points Redeemed (${pointsRedeemed})</span><span>-${formatIDR(pointsDiscountAmt)}</span></div>` : ''}
  ${pricing.serviceCharge > 0 ? `<div class="row"><span>Service charge</span><span>${formatIDR(pricing.serviceCharge)}</span></div>` : ''}
  ${pricing.taxes.filter(t => t.amount > 0).map(t => `<div class="row"><span>${escapeHtml(t.name)} ${t.rate}%${t.isInclusive ? ' (incl.)' : ''}</span><span>${formatIDR(t.amount)}</span></div>`).join('')}
  <div class="div"></div>
  <div class="row total"><span>TOTAL</span><span>${formatIDR(total)}</span></div>
  <div class="row" style="margin-top:4px"><span>Payment: ${paymentLabel}</span>${method === 'cash' && cashPaid >= total ? `<span>Change: ${formatIDR(change)}</span>` : ''}</div>
  <div class="div"></div>
  <div class="center" style="margin-top:8px"><strong>** Thank you! **</strong></div>
  <div class="center" style="color:#999;font-size:10px;margin-top:4px">Powered by VPos</div>
</body>
</html>`;
  };

  const printReceipt = () => {
    const html = getReceiptHtml();
    const win = window.open('', '_blank', 'width=320,height=500');
    if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 400); }
  };

  const dm = darkMode;
  const modalBg = dm ? 'bg-ink-900' : 'bg-white';
  const t1      = dm ? 'text-ink-100' : 'text-ink-800';
  const t2      = dm ? 'text-ink-400' : 'text-ink-500';
  const card    = dm ? 'bg-ink-800 border-ink-700' : 'bg-ink-50 border-ink-200';
  const inputCls = dm ? 'bg-ink-700 border-ink-600 text-ink-100 placeholder-ink-500 focus:border-brand-400' : 'bg-white border-ink-200 text-ink-700 focus:border-brand-400';

  if (step === 'success') {
    return (
      <ModalShell onClose={() => onClose(true)} darkMode={dm}>
        <div className="flex flex-col items-center">
          <div className={`w-16 h-16 rounded-full ${dm ? 'bg-leaf-900/40' : 'bg-leaf-100'} flex items-center justify-center mb-4`}>
            <CheckCircle size={32} className="text-leaf-600" />
          </div>
          <h2 className={`text-xl font-bold mb-1 ${t1}`}>Payment Received</h2>
          <p className={`text-sm mb-4 ${t2}`}>Order: {orderNumber}</p>

          <div className="w-full h-64 border rounded-xl overflow-hidden bg-white shadow-inner mb-2">
            <iframe srcDoc={getReceiptHtml()} className="w-full h-full border-0" title="Receipt Preview" />
          </div>

          <div className="flex gap-3 w-full mt-4">
            <button
              onClick={printReceipt}
              className={`flex-1 flex items-center justify-center gap-2 border rounded-xl py-3 text-sm font-medium transition-colors ${dm ? 'border-ink-700 text-ink-300 hover:bg-ink-800' : 'border-ink-200 text-ink-600 hover:bg-ink-50'}`}
            >
              <Printer size={16} /> Print Receipt
            </button>
            <button
              onClick={() => onClose(true)}
              className="flex-1 bg-brand-600 text-white rounded-xl py-3 hover:bg-brand-700 transition-colors text-sm font-semibold"
            >
              New Order
            </button>
          </div>
        </div>
      </ModalShell>
    );
  }

  return (
    <>
      <ModalShell onClose={() => setConfirmCancelModal(true)} darkMode={dm}>
      <h2 className={`font-bold mb-4 ${t1}`}>Checkout</h2>

      {/* Order summary */}
      <div className={`rounded-xl p-3 space-y-1.5 mb-4 border ${card}`}>
        <div className={`border-b pb-1.5 mb-1.5 space-y-1 tabular-nums ${dm ? 'border-ink-700' : 'border-ink-200'}`}>
          <div className={`flex justify-between text-sm ${t2}`}><span>Subtotal</span><span>{formatIDR(subtotalBeforePromo)}</span></div>
          {appliedPromo && (
            <div className={`flex justify-between text-sm text-leaf-500 font-medium`}>
              <span>Promo ({appliedPromo.code})</span><span>-{formatIDR(promoDiscountAmt)}</span>
            </div>
          )}
          {pointsDiscountAmt > 0 && (
            <div className={`flex justify-between text-sm text-turmeric-500 font-medium`}>
              <span>Points Redeemed ({pointsRedeemed})</span><span>-{formatIDR(pointsDiscountAmt)}</span>
            </div>
          )}
          {pricing.serviceCharge > 0 && (
            <div className={`flex justify-between text-sm ${t2}`}><span>Service charge</span><span>{formatIDR(pricing.serviceCharge)}</span></div>
          )}
          <div className={`flex justify-between text-sm ${t2}`}><span>Tax</span><span>{formatIDR(finalTax)}</span></div>
          <div className={`flex justify-between text-sm font-bold ${t1} pt-1 mt-1 border-t ${dm ? 'border-ink-700' : 'border-ink-200'}`}>
            <span>Total</span><span className="text-brand-500">{formatIDR(total)}</span>
          </div>
          {pointsEarnedPreview > 0 && (
            <div className={`flex justify-between text-xs text-turmeric-500 font-medium pt-1`}>
              <span>Points to earn</span><span>+{pointsEarnedPreview} pts</span>
            </div>
          )}
        </div>

        {/* Points Input */}
        {customer && loyaltySettings?.enabled && customer.pointsBalance > 0 && (
          <div className="mt-2 mb-3">
            <div className={`p-3 rounded-xl border transition-colors ${Number(pointsToRedeem) > 0 ? 'border-turmeric-500 bg-turmeric-500/5' : dm ? 'border-ink-700 bg-ink-800' : 'border-ink-200 bg-ink-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className={`text-sm font-medium ${Number(pointsToRedeem) > 0 ? (dm ? 'text-turmeric-500' : 'text-turmeric-600') : t1}`}>
                    Redeem Points
                  </div>
                  <div className={`text-xs ${t2}`}>
                    {customer.pointsBalance} pts available (max {formatIDR(customer.pointsBalance * loyaltySettings.redemptionValue)})
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  placeholder="Points to redeem"
                  value={pointsToRedeem}
                  onChange={e => setPointsToRedeem(e.target.value)}
                  max={customer.pointsBalance}
                  min="0"
                  className={`flex-1 w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-turmeric-400 ${dm ? 'bg-ink-900 border-ink-700 text-ink-100' : 'bg-white border-ink-200 text-ink-900'}`}
                />
                <button 
                  onClick={() => setPointsToRedeem(String(customer.pointsBalance))}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${dm ? 'border-ink-700 text-ink-300 hover:bg-ink-700' : 'border-ink-200 text-ink-600 hover:bg-ink-100'}`}
                >
                  Max
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Promo Code Input & Available Discounts */}
        {discountSettings.enabled && (
          <div className="mt-2 space-y-2">
            {!appliedPromo ? (
              <div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Ticket size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${t2}`} />
                    <input 
                      type="text" placeholder="Enter promo code" value={promoInput} onChange={e => setPromoInput(e.target.value.toUpperCase())}
                      className={`w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:outline-none ${inputCls}`}
                    />
                  </div>
                  <button onClick={applyPromo} disabled={!promoInput.trim()} className="px-3 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 hover:bg-brand-700 transition-colors">Apply</button>
                </div>
                {promoError && <p className="text-xs text-chili-500 mt-1 pl-1">{promoError}</p>}

                {/* Available Discounts List */}
                {discountSettings.promoCodes.filter(p => p.active).length > 0 && (
                  <div className="mt-2.5">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Tag size={12} className="text-brand-500" />
                      <span className={`text-[11px] font-semiboldr ${t2}`}>Available Discounts</span>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {discountSettings.promoCodes
                        .filter(promo => promo.active)
                        .map(promo => {
                          const isEligible = !promo.minSpend || subtotalBeforePromo >= promo.minSpend;
                          return (
                            <button
                              key={promo.id}
                              type="button"
                              onClick={() => handleSelectPromo(promo)}
                              className={`w-full text-left p-2 rounded-lg border transition-all flex items-center justify-between gap-2 group ${
                                dm 
                                  ? 'bg-ink-900 border-ink-700 hover:border-brand-500 hover:bg-ink-800/80' 
                                  : 'bg-white border-ink-200 hover:border-brand-400 hover:bg-brand-50/50'
                              } ${!isEligible ? 'opacity-60' : ''}`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`text-xs font-semibold truncate ${t1}`}>
                                    {promo.name || promo.code}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-brand-500/10 text-brand-600 border border-brand-500/20">
                                    {promo.code}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                                  <span className="text-leaf-600 font-medium">
                                    {promo.type === 'percent' ? `${promo.value}% OFF` : `Rp ${promo.value.toLocaleString('id-ID')} OFF`}
                                  </span>
                                  {promo.type === 'percent' && promo.maxDiscountAmount && promo.maxDiscountAmount > 0 && (
                                    <span className={`text-[10px] ${t2}`}>
                                      (Max Rp {promo.maxDiscountAmount.toLocaleString('id-ID')})
                                    </span>
                                  )}
                                  {promo.minSpend && promo.minSpend > 0 && (
                                    <span className={`text-[10px] ${t2}`}>
                                      • Min Rp {promo.minSpend.toLocaleString('id-ID')}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="shrink-0 text-xs font-medium px-2 py-1 rounded bg-brand-600/10 text-brand-600 group-hover:bg-brand-600 group-hover:text-white transition-colors">
                                Apply
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className={`flex items-center justify-between p-2.5 rounded-lg border border-leaf-500/30 bg-leaf-500/10`}>
                <div className="flex items-center gap-2 text-leaf-600 text-sm font-medium">
                  <Ticket size={16} />
                  <div>
                    <span className="font-bold">{appliedPromo.name || appliedPromo.code}</span>
                    <span className="text-xs opacity-90 ml-1.5">
                      ({appliedPromo.code} • {appliedPromo.type === 'percent' ? `${appliedPromo.value}% OFF` : `Rp ${appliedPromo.value.toLocaleString('id-ID')} OFF`}{appliedPromo.maxDiscountAmount ? `, Max Rp ${appliedPromo.maxDiscountAmount.toLocaleString('id-ID')}` : ''})
                    </span>
                  </div>
                </div>
                <button onClick={removePromo} className="text-leaf-700 hover:text-leaf-900 p-1 rounded hover:bg-leaf-500/20"><X size={15} /></button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment method */}
      <div className="flex items-center justify-between mb-2">
        <p className={`text-xs font-semibold ${t2}`}>PAYMENT METHOD</p>
        <button onClick={() => setIsSplit(!isSplit)} className="text-xs font-medium text-brand-600 hover:text-brand-700">
          {isSplit ? 'Single Payment' : 'Split Payment'}
        </button>
      </div>

      <div className="space-y-3 mb-4">
        <div>
          {isSplit && <p className={`text-xs mb-1 ${t2}`}>Payment 1</p>}
          <div className="grid grid-cols-2 gap-2">
            {availableMethods.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setMethod(id)}
                className={[
                  'flex items-center gap-2 border-2 rounded-xl px-3 py-2.5 transition-all text-left text-sm font-medium',
                  method === id
                    ? 'border-brand-600 bg-brand-600/10 text-brand-600'
                    : dm ? 'border-ink-700 text-ink-400 hover:border-ink-600' : 'border-ink-200 text-ink-600 hover:border-ink-300',
                ].join(' ')}
              >
                <Icon size={17} className="shrink-0" />
                {label}
              </button>
            ))}
          </div>
          {isSplit && (
            <input
              type="text"
              placeholder={`Amount for Payment 1 (Max ${total})`}
              value={splitAmount ? Number(splitAmount).toLocaleString('id-ID') : ''}
              onChange={e => {
                const val = Number(e.target.value.replace(/\D/g, ''));
                if (val <= total) setSplitAmount(String(val));
              }}
              className={`mt-2 w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500 ${dm ? 'bg-ink-900 border-ink-700 text-ink-100' : 'bg-white border-ink-200 text-ink-900'}`}
            />
          )}
        </div>

        {isSplit && (
          <div>
            <p className={`text-xs mb-1 ${t2}`}>Payment 2 (Remaining: {formatIDR(total - (Number(splitAmount) || 0))})</p>
            <div className="grid grid-cols-2 gap-2">
              {availableMethods.map(({ id, label, icon: Icon }) => (
                <button
                  key={`m2-${id}`}
                  onClick={() => setMethod2(id)}
                  className={[
                    'flex items-center gap-2 border-2 rounded-xl px-3 py-2.5 transition-all text-left text-sm font-medium',
                    method2 === id
                      ? 'border-brand-600 bg-brand-600/10 text-brand-600'
                      : dm ? 'border-ink-700 text-ink-400 hover:border-ink-600' : 'border-ink-200 text-ink-600 hover:border-ink-300',
                  ].join(' ')}
                >
                  <Icon size={17} className="shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Cash: numpad */}
      {((!isSplit && method === 'cash') || (isSplit && (method === 'cash' || method2 === 'cash'))) && (
        <div className="mb-4">
          <div className={`rounded-xl px-4 py-3 mb-3 border ${dm ? 'bg-ink-800 border-ink-700' : 'bg-ink-50 border-ink-200'}`}>
            <p className={`text-xs font-semibold mb-1 ${t2}`}>AMOUNT RECEIVED</p>
            <div className="flex items-center gap-2">
              <span className={`text-sm ${t2} pb-1`}>Rp</span>
              <input
                type="text"
                autoFocus
                placeholder="0"
                value={cashInput ? Number(cashInput).toLocaleString('id-ID') : ''}
                onChange={e => setCashInput(e.target.value.replace(/\D/g, ''))}
                className={`w-full bg-transparent text-2xl font-bold tabular-nums focus:outline-none ${cashInput ? (cashPaid >= total ? 'text-leaf-600' : 'text-chili-500') : t1}`}
              />
            </div>
            {cashInput && cashPaid >= total && (
              <p className="text-leaf-600 text-sm font-semibold mt-1">Change: {formatIDR(change)}</p>
            )}
            {cashInput && cashPaid < total && (
              <p className="text-chili-500 text-sm font-semibold mt-1">Short: {formatIDR(total - cashPaid)}</p>
            )}
          </div>

          <div className="flex gap-2 flex-wrap mb-3">
            <button
              onClick={() => setCashInput(String(total))}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors tabular-nums ${
                cashInput === String(total)
                  ? 'bg-brand-600 text-white border-brand-600'
                  : dm ? 'border-ink-700 text-ink-300 hover:bg-ink-700' : 'border-ink-200 text-ink-600 hover:bg-ink-50'
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
                    ? 'bg-brand-600 text-white border-brand-600'
                    : dm ? 'border-ink-700 text-ink-300 hover:bg-ink-700' : 'border-ink-200 text-ink-600 hover:bg-ink-50'
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
                    ? dm ? 'bg-ink-700 text-ink-300 hover:bg-ink-600' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
                    : dm ? 'bg-ink-800 text-ink-100 hover:bg-ink-700 border border-ink-700' : 'bg-white text-ink-800 hover:bg-ink-50 border border-ink-200 shadow-sm',
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
        disabled={!canConfirm || isSubmitting}
        className={[
          'w-full py-4 rounded-xl transition-colors text-white font-semibold tabular-nums',
          canConfirm ? 'bg-leaf-600 hover:bg-leaf-700' : (dm ? 'bg-ink-700 text-ink-400 cursor-not-allowed' : 'bg-ink-300 text-ink-400 cursor-not-allowed'),
        ].join(' ')}
      >
        Charge {formatIDR(total)}
      </button>
      </ModalShell>

      <ConfirmationModal
        isOpen={confirmCancelModal}
        title="Cancel Checkout?"
        message="Are you sure you want to cancel payment and return to cart?"
        confirmText="Cancel Checkout"
        cancelText="Continue Payment"
        isDestructive={true}
        darkMode={dm}
        onCancel={() => setConfirmCancelModal(false)}
        onConfirm={() => {
          setConfirmCancelModal(false);
          onClose();
        }}
      />
    </>
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
            darkMode ? 'bg-ink-900 border border-ink-800' : 'bg-white'
          }`}
        >
          <button
            onClick={onClose}
            className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-ink-800 text-ink-400' : 'hover:bg-ink-100 text-ink-400'}`}
          >
            <X size={18} />
          </button>
          {children}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
