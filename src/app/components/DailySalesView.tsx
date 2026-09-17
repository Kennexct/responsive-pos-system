import { useState } from 'react';
import { Search, RefreshCcw, XCircle, ArrowLeft, X, ChevronRight, AlertTriangle, Printer } from 'lucide-react';
import type { RecentOrder, RefundSettings, CartItem, User } from './mockData';
import { escapeHtml } from '../lib/escapeHtml';
import { verifyManagerPin } from '../lib/auth';
import { formatIDR } from './mockData';

interface DailySalesViewProps {
  orders: RecentOrder[];
  darkMode: boolean;
  refundSettings: RefundSettings;
  onRefund: (orderId: string, reason: string) => void;
  onVoid: (orderId: string, reason: string) => void;
  users: User[];
  merchantId: string;
}

export function DailySalesView({ orders, darkMode, refundSettings, onRefund, onVoid, users, merchantId }: DailySalesViewProps) {
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<RecentOrder | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [modalOrder, setModalOrder] = useState<RecentOrder | null>(null);
  
  // Refund/Void Modals
  const [refundModal, setRefundModal] = useState(false);
  const [voidModal, setVoidModal] = useState(false);
  const [reason, setReason] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const [dateRange, setDateRange] = useState<'today' | '7days' | '30days'>('today');

  const today = new Date();
  const startDate = new Date();
  if (dateRange === '7days') startDate.setDate(today.getDate() - 7);
  if (dateRange === '30days') startDate.setDate(today.getDate() - 30);
  const startStr = startDate.toISOString().slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);

  const periodOrdersRaw = orders.filter(o => {
    const orderDate = o.createdAt.slice(0, 10);
    if (dateRange === 'today') return orderDate === todayStr;
    return orderDate >= startStr && orderDate <= todayStr;
  });
  
  // Only include completed orders in revenue metrics
  const periodOrders = periodOrdersRaw.filter(o => o.status === 'completed');
  
  const totalRevenue = periodOrders.reduce((sum, o) => sum + o.total, 0);
  const totalItems = periodOrders.reduce((sum, o) => sum + o.itemCount, 0);
  const totalOrders = periodOrders.length;
  
  const paymentBreakdown = periodOrders.reduce((acc, o) => {
    acc[o.paymentMethod] = (acc[o.paymentMethod] || 0) + o.total;
    return acc;
  }, {} as Record<string, number>);

  const filteredOrders = periodOrdersRaw
    .filter(o => {
      const q = search.toLowerCase();
      return o.orderNumber.toLowerCase().includes(q) || o.cashier.toLowerCase().includes(q) || (o.paymentMethod && o.paymentMethod.toLowerCase().includes(q));
    });

  const handleAction = async (action: 'refund' | 'void') => {
    setError('');
    if (!reason.trim()) {
      setError('Add a reason. It is kept in the audit trail.');
      return;
    }

    if (refundSettings.managerPinRequired) {
      const check = await verifyManagerPin(pin, { merchantId, localUsers: users });
      if (!check.ok) {
        setError(check.error);
        return;
      }
    }

    if (modalOrder) {
      if (action === 'refund') onRefund(modalOrder.id, reason);
      else onVoid(modalOrder.id, reason);
    }
    
    setRefundModal(false);
    setVoidModal(false);
    setModalOrder(null);
    setReason('');
    setPin('');
  };

  const getReceiptHtml = (order: RecentOrder) => {
    const now = new Date(order.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
    const orderTypeLabel = { 'dine-in': 'Dine-in', 'takeaway': 'Takeaway', 'delivery': 'Delivery' }[order.orderType] || order.orderType;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt ${order.orderNumber}</title>
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
  <div class="center bold" style="font-size:15px">POS PRO REPRINT</div>
  <div class="center" style="color:#555">${escapeHtml(order.cashier)}</div>
  <div class="div"></div>
  <div class="row"><span>${order.orderNumber}</span><span>${now}</span></div>
  <div class="row"><span>Order type:</span><span>${orderTypeLabel}</span></div>
  <div class="div"></div>
  ${(order.items || []).map(item => {
    const basePrice = item.product.price + (item.variant?.priceModifier || 0);
    const linePrice = basePrice * item.qty;
    let after = linePrice;
    if (item.itemDiscountNominal) after -= (item.itemDiscountNominal * item.qty);
    else if (item.discount) after -= linePrice * (item.discount / 100);
    
    return `<div class="row"><span class="bold">${escapeHtml(item.product.name)} ${item.variant ? `(${escapeHtml(item.variant.name)})` : ''}</span></div>
      <div class="row indent"><span>${item.qty} x ${formatIDR(basePrice)}${item.discount > 0 ? ` (-${item.discount}%)` : item.itemDiscountNominal ? ` (-Rp${item.itemDiscountNominal})` : ''}</span><span>${formatIDR(after)}</span></div>`;
  }).join('')}
  <div class="div"></div>
  <div class="row"><span>Subtotal</span><span>${formatIDR(order.subtotalBeforeDiscount || order.subtotal)}</span></div>
  ${order.promoCode ? `<div class="row"><span>Promo (${escapeHtml(order.promoCode)})</span><span>-${formatIDR(order.promoDiscountAmt ?? 0)}</span></div>` : ''}
  ${order.pointsDiscountAmt ? `<div class="row"><span>Points redeemed</span><span>-${formatIDR(order.pointsDiscountAmt)}</span></div>` : ''}
  ${order.serviceCharge ? `<div class="row"><span>Service charge</span><span>${formatIDR(order.serviceCharge)}</span></div>` : ''}
  ${order.taxBreakdown?.length
    ? order.taxBreakdown.filter(t => t.amount > 0).map(t => `<div class="row"><span>${escapeHtml(t.name)} ${t.rate}%${t.isInclusive ? ' (incl.)' : ''}</span><span>${formatIDR(t.amount)}</span></div>`).join('')
    : `<div class="row"><span>Tax</span><span>${formatIDR(order.tax)}</span></div>`}
  <div class="div"></div>
  <div class="row total"><span>TOTAL</span><span>${formatIDR(order.total)}</span></div>
  <div class="row" style="margin-top:4px"><span class="capitalize">Payment: ${escapeHtml(order.paymentMethod)}${order.pointsRedeemed && order.pointsRedeemed > 0 ? (order.total === 0 ? ' (Points)' : ' + Points') : ''}</span></div>
  ${order.status !== 'completed' ? `<div class="div"></div><div class="center bold" style="font-size:16px;margin-top:8px;text-transform:uppercase;">** ${order.status} **</div><div class="center" style="margin-top:4px;">Reason: ${escapeHtml(order.refundReason || '')}</div>` : ''}
  <div class="div"></div>
  <div class="center" style="margin-top:8px"><strong>** Thank you! **</strong></div>
</body>
</html>`;
  };

  const printReceipt = (order: RecentOrder) => {
    const html = getReceiptHtml(order);

    const win = window.open('', '_blank', 'width=320,height=500');
    if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 400); }
  };

  const dm = darkMode;
  const bg      = dm ? 'bg-ink-900' : 'bg-ink-50';
  const surface = dm ? 'bg-ink-800 border-ink-700' : 'bg-white border-ink-100';
  const t1      = dm ? 'text-ink-100' : 'text-ink-800';
  const t2      = dm ? 'text-ink-400' : 'text-ink-500';
  const inputCls = dm ? 'bg-ink-700 border-ink-600 text-ink-100 placeholder-ink-500 focus:border-brand-400' : 'bg-white border-ink-200 text-ink-700 focus:border-brand-400';

  if (selectedOrder) {
    return (
      <div className={`flex flex-col h-full flex-1 w-full ${bg}`}>
        <div className={`flex items-center gap-3 px-4 py-3 border-b ${surface}`}>
          <button onClick={() => setSelectedOrder(null)} className={`p-1.5 -ml-1.5 rounded-lg transition-colors ${dm ? 'hover:bg-ink-700 text-ink-400' : 'hover:bg-ink-100 text-ink-600'}`}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className={`font-semibold ${t1}`}>Invoice {selectedOrder.orderNumber}</h2>
            <p className={`text-xs ${t2}`}>{new Date(selectedOrder.createdAt).toLocaleString('id-ID')}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-3xl mx-auto w-full">
          {/* Status Badge */}
          {selectedOrder.status !== 'completed' && (
            <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 ${selectedOrder.status === 'refunded' ? 'bg-turmeric-500/10 border border-turmeric-500/20 text-turmeric-600' : 'bg-chili-500/10 border border-chili-500/20 text-chili-600'}`}>
              <AlertTriangle size={20} className="shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold capitalize">Order {selectedOrder.status}</h3>
                {selectedOrder.refundReason && <p className="text-sm mt-1">Reason: {selectedOrder.refundReason}</p>}
              </div>
            </div>
          )}

          <div className="w-full max-w-sm mx-auto h-[500px] border rounded-xl overflow-hidden bg-white shadow-inner mb-6 shrink-0">
            <iframe srcDoc={getReceiptHtml(selectedOrder)} className="w-full h-full border-0" title="Receipt Preview" />
          </div>

          <div className="flex flex-col gap-3 max-w-sm mx-auto w-full">
            <button
              onClick={() => printReceipt(selectedOrder)}
              className={`w-full flex items-center justify-center gap-2 border rounded-xl py-3.5 font-semibold transition-colors ${dm ? 'border-ink-700 text-ink-300 hover:bg-ink-700' : 'border-ink-200 text-ink-600 hover:bg-ink-50'}`}
            >
              <Printer size={18} /> Reprint Receipt
            </button>
            
            {selectedOrder.status === 'completed' && (
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => { setModalOrder(selectedOrder); setRefundModal(true); }}
                  className="flex-1 flex items-center justify-center gap-2 bg-turmeric-500/10 text-turmeric-600 border border-turmeric-500/20 rounded-xl py-3 font-semibold hover:bg-turmeric-500/20 transition-colors"
                >
                  <RefreshCcw size={16} /> Refund
                </button>
                <button
                  onClick={() => { setModalOrder(selectedOrder); setVoidModal(true); }}
                  className="flex-1 flex items-center justify-center gap-2 bg-chili-500/10 text-chili-600 border border-chili-500/20 rounded-xl py-3 font-semibold hover:bg-chili-500/20 transition-colors"
                >
                  <XCircle size={16} /> Void
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Refund / Void Modals */}
        {refundModal && (
          <Modal title="Refund Order" onClose={() => setRefundModal(false)} darkMode={dm}>
            <p className={`text-sm mb-4 ${t2}`}>Refunding will revert the payment and <strong>restock</strong> the inventory for tracked items.</p>
            <div className="mb-4">
              <label className={`text-sm block mb-1 ${t2}`}>Reason for Refund *</label>
              <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Customer changed mind" autoFocus
                className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-turmeric-400 ${inputCls}`} />
            </div>
            {refundSettings.managerPinRequired && (
              <div className="mb-4">
                <label className={`text-sm block mb-1 ${t2}`}>Manager PIN *</label>
                <input type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="Enter PIN"
                  className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-turmeric-400 ${inputCls}`} />
              </div>
            )}
            {error && <p className="text-sm text-chili-500 mb-4">{error}</p>}
            <button onClick={() => handleAction('refund')} className="w-full bg-turmeric-500 hover:bg-turmeric-600 text-white rounded-xl py-3 font-semibold transition-colors">Confirm Refund</button>
          </Modal>
        )}

        {voidModal && (
          <Modal title="Void Order" onClose={() => setVoidModal(false)} darkMode={dm}>
            <p className={`text-sm mb-4 ${t2}`}>Voiding will cancel the order <strong>without restocking</strong> the inventory (e.g., waste/spoilage).</p>
            <div className="mb-4">
              <label className={`text-sm block mb-1 ${t2}`}>Reason for Void *</label>
              <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Spilled drink" autoFocus
                className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-chili-400 ${inputCls}`} />
            </div>
            {refundSettings.managerPinRequired && (
              <div className="mb-4">
                <label className={`text-sm block mb-1 ${t2}`}>Manager PIN *</label>
                <input type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="Enter PIN"
                  className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-chili-400 ${inputCls}`} />
              </div>
            )}
            {error && <p className="text-sm text-chili-500 mb-4">{error}</p>}
            <button onClick={() => handleAction('void')} className="w-full bg-chili-600 hover:bg-chili-700 text-white rounded-xl py-3 font-semibold transition-colors">Confirm Void</button>
          </Modal>
        )}
      </div>
    );
  }

  return (
    <div className={`flex-1 overflow-y-auto ${bg}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className={`text-xl sm:text-2xl font-bold ${t1}`}>Sales History</h1>
              <p className={`text-sm mt-0.5 ${t2}`}>Shift summary & invoice lookup</p>
            </div>
            <div className={`flex items-center gap-1 p-1 rounded-xl border w-fit ${dm ? 'bg-ink-800 border-ink-700' : 'bg-white border-ink-200'}`}>
              {(['today', '7days', '30days'] as const).map(range => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    dateRange === range
                      ? 'bg-brand-600 text-white shadow-sm'
                      : dm ? 'text-ink-400 hover:text-ink-200 hover:bg-ink-700/50' : 'text-ink-500 hover:text-ink-700 hover:bg-ink-50'
                  }`}
                >
                  {range === 'today' ? 'Today' : range === '7days' ? 'Last 7 Days' : 'Last 30 Days'}
                </button>
              ))}
            </div>
          </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className={`p-5 rounded-2xl border shadow-sm ${surface}`}>
            <p className={`text-sm font-medium ${t2} mb-1`}>Revenue</p>
            <p className={`text-2xl font-bold text-leaf-600`}>{formatIDR(totalRevenue)}</p>
          </div>
          <div className={`p-5 rounded-2xl border shadow-sm ${surface}`}>
            <p className={`text-sm font-medium ${t2} mb-1`}>Total Orders</p>
            <p className={`text-2xl font-bold ${t1}`}>{totalOrders}</p>
          </div>
          <div className={`p-5 rounded-2xl border shadow-sm ${surface}`}>
            <p className={`text-sm font-medium ${t2} mb-1`}>Total Items Sold</p>
            <p className={`text-2xl font-bold ${t1}`}>{totalItems}</p>
          </div>
        </div>
        
        {/* Payment Breakdown */}
        {Object.keys(paymentBreakdown).length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {Object.entries(paymentBreakdown).map(([method, amount]) => (
              <div key={method} className={`shrink-0 px-4 py-2 rounded-xl border flex items-center gap-2 ${dm ? 'border-ink-700 bg-ink-800' : 'border-ink-200 bg-white'}`}>
                <span className={`text-xs font-semibold ${t2}`}>{method}</span>
                <span className={`text-sm font-bold ${t1}`}>{formatIDR(amount)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Invoice List */}
        <div className={`rounded-2xl shadow-sm border overflow-hidden ${surface}`}>
          <div className={`p-4 border-b ${dm ? 'border-ink-700' : 'border-ink-200'}`}>
            <div className="relative max-w-sm">
              <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${t2}`} />
              <input
                type="text"
                placeholder="Search invoice or cashier..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className={`w-full pl-9 pr-4 py-2 border rounded-xl text-sm focus:outline-none transition-colors ${inputCls}`}
              />
            </div>
          </div>
          
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-sm">
              <thead>
                <tr className={`text-left border-b ${dm ? 'bg-ink-800 border-ink-700' : 'bg-ink-50 border-ink-100'}`}>
                  <th className={`px-5 py-3 text-xs font-semibold ${t2}`}>Invoice</th>
                  <th className={`px-5 py-3 text-xs font-semibold ${t2}`}>Time</th>
                  <th className={`px-5 py-3 text-xs font-semibold ${t2}`}>Total</th>
                  <th className={`px-5 py-3 text-xs font-semibold ${t2}`}>Method</th>
                  <th className={`px-5 py-3 text-xs font-semibold ${t2}`}>Status</th>
                  <th className={`px-5 py-3 text-xs font-semibold text-right ${t2}`}>Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${dm ? 'divide-ink-700' : 'divide-ink-100'}`}>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={`px-5 py-8 text-center ${t2}`}>No invoices found for today.</td>
                  </tr>
                ) : (
                  filteredOrders.map((order, index) => (
                    <tr 
                      key={order.id} 
                      className={`transition-colors ${dm ? 'hover:bg-ink-700/40' : 'hover:bg-ink-50'}`}
                    >
                      <td className="px-5 py-3">
                        <button 
                          onClick={() => setSelectedOrder(order)}
                          className={`font-semibold hover:underline ${dm ? 'text-brand-400' : 'text-brand-600'}`}
                        >
                          {order.orderNumber}
                        </button>
                        <p className={`text-xs ${t2}`}>{order.cashier}</p>
                      </td>
                      <td className={`px-5 py-3 ${t2}`}>
                        {new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className={`px-5 py-3 font-semibold tabular-nums ${t1}`}>
                        {formatIDR(order.total)}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-md ${dm ? 'bg-ink-700 text-ink-300' : 'bg-ink-100 text-ink-600'}`}>
                          {order.paymentMethod}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {order.status === 'completed' && <span className="inline-flex px-2 py-0.5 rounded-full bg-leaf-500/10 text-leaf-600 text-[10px] font-bold">Paid</span>}
                        {order.status === 'refunded' && <span className="inline-flex px-2 py-0.5 rounded-full bg-turmeric-500/10 text-turmeric-600 text-[10px] font-bold">Refunded</span>}
                        {order.status === 'voided' && <span className="inline-flex px-2 py-0.5 rounded-full bg-chili-500/10 text-chili-600 text-[10px] font-bold">Voided</span>}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="relative inline-block text-left">
                          <button
                            onClick={() => setActionMenuOpen(actionMenuOpen === order.id ? null : order.id)}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${dm ? 'border-ink-600 text-ink-300 hover:bg-ink-700' : 'border-ink-200 text-ink-700 hover:bg-ink-100'}`}
                          >
                            Actions <ChevronRight size={14} className={actionMenuOpen === order.id ? "rotate-90 transition-transform" : "transition-transform"} />
                          </button>
                          
                          {actionMenuOpen === order.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setActionMenuOpen(null)}></div>
                              <div className={`absolute right-0 ${index >= filteredOrders.length - 2 && filteredOrders.length > 2 ? 'bottom-full mb-1' : 'mt-1'} w-36 rounded-xl shadow-lg border z-20 overflow-hidden ${dm ? 'bg-ink-800 border-ink-700' : 'bg-white border-ink-200'}`}>
                                <div className="p-1">
                                  <button
                                    onClick={() => { setSelectedOrder(order); setActionMenuOpen(null); }}
                                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${dm ? 'hover:bg-ink-700 text-ink-200' : 'hover:bg-ink-100 text-ink-700'}`}
                                  >
                                    View Details
                                  </button>
                                  {order.status === 'completed' && (
                                    <>
                                      <button
                                        onClick={() => { setModalOrder(order); setRefundModal(true); setActionMenuOpen(null); }}
                                        className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors text-turmeric-600 ${dm ? 'hover:bg-ink-700' : 'hover:bg-turmeric-50'}`}
                                      >
                                        Refund Order
                                      </button>
                                      <button
                                        onClick={() => { setModalOrder(order); setVoidModal(true); setActionMenuOpen(null); }}
                                        className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors text-chili-600 ${dm ? 'hover:bg-ink-700' : 'hover:bg-chili-50'}`}
                                      >
                                        Void Order
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Modal({ title, children, onClose, darkMode }: { title: string; children: React.ReactNode; onClose: () => void; darkMode: boolean; }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative rounded-2xl p-5 w-full max-w-sm shadow-2xl ${darkMode ? 'bg-ink-800 border border-ink-700' : 'bg-white'}`}>
        <button onClick={onClose} className={`absolute top-4 right-4 transition-colors ${darkMode ? 'text-ink-400 hover:text-ink-200' : 'text-ink-400 hover:text-ink-600'}`}><X size={18} /></button>
        <h3 className={`mb-4 font-semibold ${darkMode ? 'text-ink-100' : 'text-ink-800'}`}>{title}</h3>
        {children}
      </div>
    </div>
  );
}
