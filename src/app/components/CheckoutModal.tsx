import { useState, type ElementType } from 'react';
import { X, Banknote, Smartphone, CreditCard, Building2, Printer, Delete, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { CartItem, OrderType, PaymentMethod } from './mockData';
import { formatIDR, TAX_RATE } from './mockData';

interface CheckoutModalProps {
  cart: CartItem[];
  orderType: OrderType;
  cashierName: string;
  bizName: string;
  darkMode: boolean;
  onClose: () => void;
  onConfirm: (method: PaymentMethod, amountPaid: number) => void;
}

const PAYMENT_OPTIONS: { id: PaymentMethod; label: string; icon: ElementType }[] = [
  { id: 'cash',          label: 'Cash',           icon: Banknote   },
  { id: 'qris',          label: 'QRIS',           icon: Smartphone },
  { id: 'card',          label: 'Debit / Credit', icon: CreditCard },
  { id: 'bank-transfer', label: 'Bank Transfer',  icon: Building2  },
];

export function CheckoutModal({ cart, orderType, cashierName, bizName, darkMode, onClose, onConfirm }: CheckoutModalProps) {
  const [orderNumber] = useState(() => `INV-${Date.now().toString().slice(-6)}`);
  const [step,       setStep]      = useState<'payment' | 'success'>('payment');
  const [method,     setMethod]    = useState<PaymentMethod>('cash');
  const [cashInput,  setCashInput] = useState('');

  const subtotal = cart.reduce((sum, item) => {
    const line = item.product.price * item.qty;
    return sum + line - line * (item.discount / 100);
  }, 0);
  const tax    = Math.round(subtotal * TAX_RATE);
  const total  = subtotal + tax;

  const cashPaid   = parseInt(cashInput.replace(/\D/g, ''), 10) || 0;
  const change     = cashPaid - total;
  const canConfirm = method !== 'cash' || cashPaid >= total;

  const QUICK_AMOUNTS = [50000, 100000, 150000, 200000, 250000, 500000].filter(a => a >= total);

  const handleConfirm = () => {
    onConfirm(method, method === 'cash' ? cashPaid : total);
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
        const next = (prev + key).replace(/^0+(?!$)/, ''); // strip leading zeros
        return next;
      });
    }
  };

  const NUMPAD = ['7','8','9','4','5','6','1','2','3','C','0','⌫'];

  // ── Print receipt ─────────────────────────────────────────────────────
  const printReceipt = () => {
    const paymentLabel = PAYMENT_OPTIONS.find(p => p.id === method)?.label ?? method;
    const orderTypeLabel = { 'dine-in': 'Dine-in', 'takeaway': 'Takeaway', 'delivery': 'Delivery' }[orderType];
    const now = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt ${orderNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: 12px; max-width: 280px; margin: 0 auto; padding: 12px; }
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
    const linePrice = item.product.price * item.qty;
    const after     = linePrice - linePrice * (item.discount / 100);
    return `<div class="row"><span class="bold">${item.product.name}</span></div>
      <div class="row indent"><span>${item.qty} x ${formatIDR(item.product.price)}${item.discount > 0 ? ` (-${item.discount}%)` : ''}</span><span>${formatIDR(after)}</span></div>`;
  }).join('')}
  <div class="div"></div>
  <div class="row"><span>Subtotal</span><span>${formatIDR(subtotal)}</span></div>
  <div class="row"><span>PPN 11%</span><span>${formatIDR(tax)}</span></div>
  <div class="div"></div>
  <div class="row total"><span>TOTAL</span><span>${formatIDR(total)}</span></div>
  <div class="row" style="margin-top:4px"><span>Payment: ${paymentLabel}</span>${method === 'cash' && cashPaid >= total ? `<span>Change: ${formatIDR(change)}</span>` : ''}</div>
  <div class="div"></div>
  <div class="center" style="margin-top:8px"><strong>** Thank you! **</strong></div>
  <div class="center" style="color:#999;font-size:10px;margin-top:4px">Powered by POS Pro</div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=320,height=500');
    if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 400); }
  };

  const dm = darkMode;
  const modalBg = dm ? 'bg-slate-900' : 'bg-white';
  const t1      = dm ? 'text-slate-100' : 'text-slate-800';
  const t2      = dm ? 'text-slate-400' : 'text-slate-500';
  const card    = dm ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200';
  const inputCls = dm ? 'bg-slate-800 border-slate-700 text-slate-100' : 'border-slate-200 text-slate-800';

  if (step === 'success') {
    return (
      <ModalShell onClose={onClose} darkMode={dm}>
        <div className="flex flex-col items-center">
          {/* Success icon */}
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mb-4">
            <CheckCircle size={32} className="text-emerald-600" />
          </div>
          <h2 className={`text-xl font-bold mb-1 ${t1}`}>Payment Received</h2>
          <p className={`text-sm mb-6 ${t2}`}>{orderNumber}</p>

          {/* Thermal Receipt Preview */}
          <div className={`w-full max-w-[280px] border rounded-lg font-mono text-xs mb-6 overflow-hidden ${dm ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'}`}
            style={{ boxShadow: dm ? '0 0 0 1px rgba(255,255,255,0.05)' : '0 2px 8px rgba(0,0,0,0.08)' }}>

            {/* Perforated top */}
            <div className="flex">
              {Array.from({length: 20}).map((_, i) => (
                <div key={i} className={`flex-1 h-2 ${dm ? 'bg-slate-900' : 'bg-slate-50'}`} style={{ clipPath: 'ellipse(40% 100% at 50% 0%)' }} />
              ))}
            </div>

            <div className="p-4">
              <div className="text-center mb-3">
                <p className="font-bold text-sm">{bizName.toUpperCase()}</p>
                <p className={`text-[10px] mt-0.5 ${t2}`}>{cashierName}</p>
              </div>
              <div className="border-t border-dashed mb-3 mt-3" style={{ borderColor: dm ? '#334155' : '#E2E8F0' }} />
              <div className="flex justify-between mb-1"><span>{orderNumber}</span><span>{new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span></div>
              <div className="flex justify-between mb-3"><span>Type:</span><span className="capitalize">{orderType.replace('-', ' ')}</span></div>
              <div className="border-t border-dashed mb-3" style={{ borderColor: dm ? '#334155' : '#E2E8F0' }} />
              <div className="space-y-2">
                {cart.map(item => {
                  const linePrice = item.product.price * item.qty;
                  const after = linePrice - linePrice * (item.discount / 100);
                  return (
                    <div key={item.product.id}>
                      <p className="font-semibold">{item.product.name}</p>
                      <div className={`flex justify-between pl-2 ${t2}`}>
                        <span>{item.qty} × {formatIDR(item.product.price)}{item.discount > 0 ? ` (-${item.discount}%)` : ''}</span>
                        <span>{formatIDR(after)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-dashed my-3" style={{ borderColor: dm ? '#334155' : '#E2E8F0' }} />
              <div className={`flex justify-between mb-1 ${t2}`}><span>Subtotal</span><span>{formatIDR(subtotal)}</span></div>
              <div className={`flex justify-between mb-2 ${t2}`}><span>PPN 11%</span><span>{formatIDR(tax)}</span></div>
              <div className="border-t border-dashed mb-2" style={{ borderColor: dm ? '#334155' : '#E2E8F0' }} />
              <div className={`flex justify-between font-bold text-sm mb-2 ${t1}`}><span>TOTAL</span><span>{formatIDR(total)}</span></div>
              {method === 'cash' && cashPaid >= total && (
                <div className="flex justify-between text-emerald-600">
                  <span>Change</span><span>{formatIDR(change)}</span>
                </div>
              )}
              <div className="border-t border-dashed mt-3 mb-3" style={{ borderColor: dm ? '#334155' : '#E2E8F0' }} />
              <p className="text-center font-bold">** Thank you! **</p>
              <p className={`text-center text-[10px] mt-1 ${t2}`}>Powered by POS Pro</p>
            </div>

            {/* Perforated bottom */}
            <div className="flex">
              {Array.from({length: 20}).map((_, i) => (
                <div key={i} className={`flex-1 h-2 ${dm ? 'bg-slate-900' : 'bg-slate-50'}`} style={{ clipPath: 'ellipse(40% 100% at 50% 100%)' }} />
              ))}
            </div>
          </div>

          <div className="flex gap-3 w-full">
            <button
              onClick={printReceipt}
              className={`flex-1 flex items-center justify-center gap-2 border rounded-xl py-3 text-sm font-medium transition-colors ${dm ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              <Printer size={16} /> Print
            </button>
            <button
              onClick={onClose}
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
        {cart.map(item => (
          <div key={item.product.id} className="flex justify-between text-sm">
            <span className={t2}>
              {item.product.name} × <span className="tabular-nums">{item.qty}</span>
              {item.discount > 0 && <span className="ml-1 text-xs text-orange-500 tabular-nums">-{item.discount}%</span>}
            </span>
            <span className={`tabular-nums ${t1}`}>{formatIDR(item.product.price * item.qty * (1 - item.discount / 100))}</span>
          </div>
        ))}
        <div className={`border-t pt-1.5 mt-1.5 space-y-1 tabular-nums ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className={`flex justify-between text-sm ${t2}`}><span>Subtotal</span><span>{formatIDR(subtotal)}</span></div>
          <div className={`flex justify-between text-sm ${t2}`}><span>Tax (PPN 11%)</span><span>{formatIDR(tax)}</span></div>
          <div className={`flex justify-between text-sm font-bold ${t1}`}><span>Total</span><span className="text-blue-500">{formatIDR(total)}</span></div>
        </div>
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
          {/* Amount display */}
          <div className={`rounded-xl px-4 py-3 mb-3 border ${dm ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <p className={`text-xs font-semibold mb-1 ${t2}`}>AMOUNT RECEIVED</p>
            <div className="flex items-baseline gap-1">
              <span className={`text-sm ${t2}`}>Rp</span>
              <span className={`text-2xl font-bold tabular-nums ${cashInput ? (cashPaid >= total ? 'text-emerald-600' : 'text-red-500') : t1}`}>
                {cashInput ? Number(cashInput).toLocaleString('id-ID') : '0'}
              </span>
            </div>
            {cashInput && cashPaid >= total && (
              <p className="text-emerald-600 text-sm font-semibold mt-1">Change: {formatIDR(change)}</p>
            )}
            {cashInput && cashPaid < total && (
              <p className="text-red-500 text-sm font-semibold mt-1">Short: {formatIDR(total - cashPaid)}</p>
            )}
          </div>

          {/* Quick denominations */}
          {QUICK_AMOUNTS.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-3">
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
          )}

          {/* Numpad grid */}
          <div className="grid grid-cols-3 gap-2">
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
