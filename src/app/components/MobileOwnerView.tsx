import { TrendingUp, ShoppingBag, AlertTriangle, ArrowUp, DollarSign } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { PRODUCTS, WEEKLY_SALES, formatIDR } from './mockData';
import type { RecentOrder } from './mockData';

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash', qris: 'QRIS', card: 'Card', 'bank-transfer': 'Bank Transfer',
};

interface Props {
  orders: RecentOrder[];
}

export function MobileOwnerView({ orders }: Props) {
  const lowStockItems  = PRODUCTS.filter(p => p.stock <= p.lowStockThreshold);
  const sessionSales   = orders.reduce((s, o) => s + o.total, 0);
  const todaySales     = 2847500 + sessionSales;
  const todayOrders    = 38 + orders.length;

  const recentOrders = orders.length > 0 ? orders.slice(0, 6) : [];

  return (
    <div className="min-h-full bg-slate-50 pb-24 overflow-y-auto">
      {/* Header */}
      <div className="bg-slate-900 text-white px-4 pt-6 pb-8">
        <p className="text-slate-400 text-xs mb-1">Tuesday, 1 July 2026</p>
        <h1 className="text-white text-xl" style={{ fontWeight: 700 }}>Good Morning, Owner 👋</h1>
        <p className="text-slate-400 text-sm mt-0.5">Warung Kopi Santai</p>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* Sales + orders cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
                <DollarSign size={15} className="text-blue-600" />
              </div>
              <span className="text-xs text-slate-500">Today's Sales</span>
            </div>
            <p className="text-slate-800" style={{ fontWeight: 700 }}>{formatIDR(todaySales)}</p>
            <p className="text-xs text-emerald-600 mt-1 flex items-center gap-0.5">
              <ArrowUp size={10} /> 12.5% vs yesterday
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                <ShoppingBag size={15} className="text-emerald-600" />
              </div>
              <span className="text-xs text-slate-500">Orders</span>
            </div>
            <p className="text-slate-800" style={{ fontWeight: 700 }}>{todayOrders}</p>
            <p className="text-xs text-emerald-600 mt-1 flex items-center gap-0.5">
              <ArrowUp size={10} /> 8.3% vs yesterday
            </p>
          </div>
        </div>

        {/* Weekly sales mini chart */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-slate-700 text-sm">Weekly Sales</h3>
            <TrendingUp size={15} className="text-blue-500" />
          </div>
          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={WEEKLY_SALES} margin={{ top: 2, right: 2, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="mobileGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 11 }}
                formatter={(v: number) => [formatIDR(v), 'Sales']}
              />
              <Area type="monotone" dataKey="sales" stroke="#3B82F6" strokeWidth={2} fill="url(#mobileGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Live session orders */}
        {recentOrders.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-slate-700 text-sm">Live Orders This Session</h3>
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                {recentOrders.length} new
              </span>
            </div>
            <div className="divide-y divide-slate-50">
              {recentOrders.map(order => (
                <div key={order.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <ShoppingBag size={13} className="text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">{order.orderNumber}</p>
                    <p className="text-xs text-slate-400 capitalize">
                      {order.orderType} · {PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-800" style={{ fontWeight: 500 }}>{formatIDR(order.total)}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Low stock alerts */}
        {lowStockItems.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-amber-50">
              <AlertTriangle size={16} className="text-amber-600" />
              <h3 className="text-amber-700 text-sm">Low Stock Alerts ({lowStockItems.length})</h3>
            </div>
            <div className="divide-y divide-slate-50">
              {lowStockItems.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span>{p.emoji}</span>
                    <span className="text-sm text-slate-700">{p.name}</span>
                  </div>
                  <span className={[
                    'text-xs px-2 py-0.5 rounded-full',
                    p.stock <= 3 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600',
                  ].join(' ')}>
                    {p.stock} left
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* POS notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
          <ShoppingBag size={18} className="text-blue-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-blue-800" style={{ fontWeight: 600 }}>POS Terminal</p>
            <p className="text-xs text-blue-600 mt-0.5">
              For checkout, please use a tablet or desktop. The POS terminal is optimized for larger screens.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
