import { useState, type ElementType } from 'react';
import { X, CheckCircle, Banknote, Smartphone, CreditCard, Building2, Printer } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { CartItem, OrderType, PaymentMethod } from './mockData';
import { formatIDR, TAX_RATE } from './mockData';

interface CheckoutModalProps {
  cart: CartItem[];
  orderType: OrderType;
  onClose: () => void;
  onConfirm: (method: PaymentMethod, amountPaid: number) => void;
}

const PAYMENT_OPTIONS: { id: PaymentMethod; label: string; icon: ElementType }[] = [
  { id: 'cash',          label: 'Cash',           icon: Banknote   },
  { id: 'qris',          label: 'QRIS',           icon: Smartphone },
  { id: 'card',          label: 'Debit / Credit', icon: CreditCard },
  { id: 'bank-transfer', label: 'Bank Transfer',  icon: Building2  },
];

let checkoutCounter = 1242;

export function CheckoutModal({ cart, orderType, onClose, onConfirm }: CheckoutModalProps) {
  // Generate order number once when modal mounts
  const [orderNumber] = useState(() => `INV-00${checkoutCounter++}`);
  const [step,       setStep]   = useState<'payment' | 'success'>('payment');
  const [method,     setMethod] = useState<PaymentMethod>('cash');
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
    .center  { text-align: center; }
    .right   { text-align: right; }
    .bold    { font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 8px 0; }
    .row     { display: flex; justify-content: space-between; margin: 2px 0; }
    .indent  { padding-left: 8px; color: #555; }
    .total   { font-size: 14px; font-weight: bold; }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="center bold" style="font-size:14px">WARUNG KOPI SANTAI</div>
  <div class="center" style="color:#555">Jl. Sudirman No. 123, Jakarta</div>
  <div class="center" style="color:#555">Tel: +62 812 3456 7890</div>
  <div class="divider"></div>
  <div class="row"><span>${orderNumber}</span><span>${now}</span></div>
  <div class="row"><span>Order type:</span><span>${orderTypeLabel}</span></div>
  <div class="row"><span>Cashier:</span><span>Budi Santoso</span></div>
  <div class="divider"></div>
  ${cart.map(item => {
    const linePrice = item.product.price * item.qty;
    const after     = linePrice - linePrice * (item.discount / 100);
    return `
      <div class="row"><span class="bold">${item.product.name}</span></div>
      <div class="row indent">
        <span>${item.qty} x ${formatIDR(item.product.price)}${item.discount > 0 ? ` (-${item.discount}%)` : ''}</span>
        <span>${formatIDR(after)}</span>
      </div>`;
  }).join('')}
  <div class="divider"></div>
  <div class="row"><span>Subtotal</span><span>${formatIDR(subtotal)}</span></div>
  <div class="row"><span>PPN 11%</span><span>${formatIDR(tax)}</span></div>
  <div class="divider"></div>
  <div class="row total"><span>TOTAL</span><span>${formatIDR(total)}</span></div>
  <div class="row" style="margin-top:4px"><span>Payment: ${paymentLabel}</span>${method === 'cash' && cashPaid >= total ? `<span>Change: ${formatIDR(change)}</span>` : ''}</div>
  <div class="divider"></div>
  <div class="center" style="margin-top:8px">** Thank you for your visit! **</div>
  <div class="center" style="color:#999;font-size:10px;margin-top:4px">Powered by WebPOS</div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=320,height=500');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 400);
    }
  };

  if (step === 'success') {
    return (
      <ModalShell onClose={onClose}>
        <div className="flex flex-col items-center py-2">
          {/* Thermal Receipt Preview */}
          <div className="w-full bg-white border border-slate-200 shadow-md p-6 font-mono text-xs text-slate-800 relative overflow-hidden mb-6" style={{ maxWidth: '300px' }}>
            {/* Jagged top edge effect */}
            <div className="absolute top-0 left-0 right-0 h-2 flex gap-1">
              {Array.from({ length: 30 }).map((_, i) => (
                <div key={i} className="w-2 h-2 bg-slate-50 rotate-45 -mt-1" />
              ))}
            </div>

            <div className="text-center mt-2 mb-4">
              <h2 className="text-sm font-bold">WARUNG KOPI SANTAI</h2>
              <p className="text-[10px] text-slate-500">Jl. Sudirman No. 123, Jakarta</p>
              <p className="text-[10px] text-slate-500">Tel: +62 812 3456 7890</p>
            </div>
            
            <div className="border-t border-dashed border-slate-300 my-3" />
            
            <div className="flex justify-between mb-1">
              <span>{orderNumber}</span>
              <span>{new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>Order type:</span>
              <span className="capitalize">{orderType.replace('-', ' ')}</span>
            </div>
            <div className="flex justify-between mb-3">
              <span>Cashier:</span>
              <span>Budi Santoso</span>
            </div>
            
            <div className="border-t border-dashed border-slate-300 my-3" />
            
            <div className="space-y-3">
              {cart.map(item => {
                const linePrice = item.product.price * item.qty;
                const after = linePrice - linePrice * (item.discount / 100);
                return (
                  <div key={item.product.id}>
                    <div className="font-bold">{item.product.name}</div>
                    <div className="flex justify-between pl-2 text-slate-600">
                      <span>{item.qty} x {formatIDR(item.product.price)}{item.discount > 0 ? ` (-${item.discount}%)` : ''}</span>
                      <span>{formatIDR(after)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="border-t border-dashed border-slate-300 my-3" />
            
            <div className="flex justify-between mb-1">
              <span>Subtotal</span>
              <span>{formatIDR(subtotal)}</span>
            </div>
            <div className="flex justify-between mb-3">
              <span>PPN 11%</span>
              <span>{formatIDR(tax)}</span>
            </div>
            
            <div className="border-t border-dashed border-slate-300 my-3" />
            
            <div className="flex justify-between font-bold text-sm mb-3">
              <span>TOTAL</span>
              <span>{formatIDR(total)}</span>
            </div>
            
            <div className="flex justify-between mb-1">
              <span>Payment: {PAYMENT_OPTIONS.find(p => p.id === method)?.label}</span>
              {method === 'cash' && cashPaid >= total && (
                <span>Change: {formatIDR(change)}</span>
              )}
            </div>
            
            <div className="border-t border-dashed border-slate-300 my-3" />
            
            <div className="text-center mt-4 mb-2 text-[10px]">
              <p className="font-bold">** Thank you for your visit! **</p>
              <p className="text-slate-400 mt-2">Powered by WebPOS</p>
            </div>
            
            {/* Jagged bottom edge effect */}
            <div className="absolute bottom-0 left-0 right-0 h-2 flex gap-1">
              {Array.from({ length: 30 }).map((_, i) => (
                <div key={i} className="w-2 h-2 bg-slate-50 rotate-45 -mb-1" />
              ))}
            </div>
          </div>

          <div className="flex gap-3 w-full">
            <button
              onClick={printReceipt}
              className="flex-1 flex items-center justify-center gap-2 border border-slate-200 rounded-xl py-3 text-slate-600 hover:bg-slate-50 transition-colors focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:outline-none"
            >
              <Printer size={16} />
              Print
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-blue-600 text-white rounded-xl py-3 hover:bg-blue-700 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none focus-visible:ring-offset-2"
            >
              New Order
            </button>
          </div>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell onClose={onClose}>
      <h2 className="text-slate-800 mb-4">Checkout</h2>

      {/* Order summary */}
      <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 mb-4">
        {cart.map(item => (
          <div key={item.product.id} className="flex justify-between text-sm">
            <span className="text-slate-600">
              {item.product.name} × <span className="tabular-nums">{item.qty}</span>
              {item.discount > 0 && (
                <span className="ml-1 text-xs text-orange-500 tabular-nums">-{item.discount}%</span>
              )}
            </span>
            <span className="text-slate-800 tabular-nums">
              {formatIDR(item.product.price * item.qty * (1 - item.discount / 100))}
            </span>
          </div>
        ))}
        <div className="border-t border-slate-200 pt-1.5 mt-1.5 space-y-1 tabular-nums">
          <div className="flex justify-between text-sm text-slate-500">
            <span>Subtotal</span><span>{formatIDR(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-slate-500">
            <span>Tax (PPN 11%)</span><span>{formatIDR(tax)}</span>
          </div>
          <div className="flex justify-between text-sm text-slate-800" style={{ fontWeight: 600 }}>
            <span>Total</span><span>{formatIDR(total)}</span>
          </div>
        </div>
      </div>

      {/* Payment method */}
      <p className="text-sm text-slate-500 mb-2">Payment Method</p>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {PAYMENT_OPTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setMethod(id)}
            className={[
              'flex items-center gap-2 border-2 rounded-xl px-3 py-3 transition-all text-left focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none',
              method === id
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-slate-200 text-slate-600 hover:border-slate-300',
            ].join(' ')}
          >
            <Icon size={18} className="shrink-0" />
            <span className="text-sm">{label}</span>
          </button>
        ))}
      </div>

      {/* Cash input */}
      {method === 'cash' && (
        <div className="mb-4 space-y-3">
          <div>
            <label className="text-sm text-slate-500 block mb-1">Amount Received</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                value={cashInput}
                onChange={e => setCashInput(e.target.value)}
                placeholder="0"
                className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-800 focus:outline-none focus:border-blue-400"
                autoFocus
              />
            </div>
          </div>
          {QUICK_AMOUNTS.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {QUICK_AMOUNTS.slice(0, 4).map(amt => (
                <button
                  key={amt}
                  onClick={() => setCashInput(String(amt))}
                  className="border border-slate-200 rounded-lg px-3 py-2 min-w-[70px] text-sm text-slate-600 hover:bg-slate-50 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none tabular-nums"
                >
                  {formatIDR(amt)}
                </button>
              ))}
            </div>
          )}
          {cashPaid > 0 && cashPaid >= total && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex justify-between text-sm">
              <span className="text-emerald-700">Change</span>
              <span className="text-emerald-700" style={{ fontWeight: 600 }}>{formatIDR(change)}</span>
            </div>
          )}
          {cashPaid > 0 && cashPaid < total && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex justify-between text-sm">
              <span className="text-red-600">Shortfall</span>
              <span className="text-red-600" style={{ fontWeight: 600 }}>{formatIDR(total - cashPaid)}</span>
            </div>
          )}
        </div>
      )}

      <button
        onClick={handleConfirm}
        disabled={!canConfirm}
        className={[
          'w-full py-4 rounded-xl transition-colors text-white focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none focus-visible:ring-offset-2 tabular-nums',
          canConfirm ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed',
        ].join(' ')}
      >
        Confirm Payment · {formatIDR(total)}
      </button>
    </ModalShell>
  );
}

function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-black/40"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full md:max-w-md bg-white rounded-t-2xl md:rounded-2xl p-5 md:p-6 max-h-[92vh] overflow-y-auto shadow-2xl"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:outline-none"
          >
            <X size={18} />
          </button>
          {children}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function Row({ label, value, bold, green, capitalize }: {
  label: string; value: string; bold?: boolean; green?: boolean; capitalize?: boolean;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span
        className={[capitalize ? 'capitalize' : '', bold ? 'text-slate-800' : green ? 'text-emerald-600' : 'text-slate-700', 'tabular-nums'].join(' ')}
        style={bold ? { fontWeight: 600 } : undefined}
      >
        {value}
      </span>
    </div>
  );
}
