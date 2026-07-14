import { TrendingUp, ShoppingBag, AlertTriangle, ArrowUp, DollarSign } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { WEEKLY_SALES, formatIDR } from './mockData';
import type { RecentOrder, Product } from './mockData';

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash', qris: 'QRIS', card: 'Card', 'bank-transfer': 'Bank Transfer',
};

interface Props {
  orders: RecentOrder[];
  products: Product[];
  darkMode: boolean;
}

export function MobileOwnerView({ orders, products, darkMode }: Props) {
  const lowStockItems  = products.filter(p => p.stock <= p.lowStockThreshold);
  const sessionSales   = orders.filter(o => o.status === 'completed').reduce((s, o) => s + o.total, 0);
  const todaySales     = 2847500 + sessionSales;
  const todayOrders    = 38 + orders.length;

  const recentOrders = orders.length > 0 ? orders.slice(0, 6) : [];
  const dynamicDate  = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const dm = darkMode;

  const bg = dm ? 'bg-slate-900' : 'bg-slate-50';
  const surface = dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100';
  const t1 = dm ? 'text-slate-100' : 'text-slate-800';
  const t2 = dm ? 'text-slate-400' : 'text-slate-500';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  const tooltipStyle = { borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 11, background: dm ? '#1E2330' : '#fff', color: dm ? '#F1F5F9' : '#1E293B' };

  return (
    <div className={`min-h-full pb-24 overflow-y-auto ${bg}`}>
      {/* Header */}
      <div className={`px-4 pt-6 pb-8 ${dm ? 'bg-slate-800 border-b border-slate-700' : 'bg-white border-b border-slate-200 shadow-sm'}`}>
        <p className={`text-xs mb-1 ${t2}`}>{dynamicDate}</p>
        <h1 className={`text-xl font-bold ${t1}`}>{greeting} 👋</h1>
        <p className={`text-sm mt-0.5 ${t2}`}>POS Pro Dashboard</p>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* Alerts */}
        <div className="flex flex-col gap-3">
          <div className={`flex items-center gap-3 ${dm ? 'bg-amber-900/20 border border-amber-800' : 'bg-amber-50 border border-amber-200'} rounded-xl p-3 shadow-sm`}>
            <div className={`p-2 ${dm ? 'bg-amber-900/40 text-amber-400' : 'bg-amber-100 text-amber-600'} rounded-lg`}>
              <TrendingUp size={16} />
            </div>
            <div>
              <p className={`text-xs font-bold ${dm ? 'text-amber-400' : 'text-amber-800'}`}>High Void Rate</p>
              <p className={`text-[10px] ${dm ? 'text-amber-500' : 'text-amber-700'}`}>Void rate is 4.5% today.</p>
            </div>
          </div>
          <div className={`flex items-center gap-3 ${dm ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'} rounded-xl p-3 shadow-sm`}>
            <div className={`p-2 ${dm ? 'bg-red-900/40 text-red-400' : 'bg-red-100 text-red-600'} rounded-lg`}>
              <DollarSign size={16} />
            </div>
            <div>
              <p className={`text-xs font-bold ${dm ? 'text-red-400' : 'text-red-800'}`}>High Liability</p>
              <p className={`text-[10px] ${dm ? 'text-red-500' : 'text-red-700'}`}>Unredeemed points &gt; Rp 1.5M.</p>
            </div>
          </div>
        </div>

        {/* Sales + orders cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`rounded-2xl p-4 shadow-sm border ${surface}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${dm ? 'bg-blue-900/40' : 'bg-blue-100'}`}>
                <DollarSign size={15} className="text-blue-600" />
              </div>
              <span className={`text-xs ${t2}`}>Today's Sales</span>
            </div>
            <p className={`font-bold ${t1}`}>{formatIDR(todaySales)}</p>
            <p className="text-xs text-emerald-600 mt-1 flex items-center gap-0.5">
              <ArrowUp size={10} /> 12.5% vs yesterday
            </p>
          </div>
          <div className={`rounded-2xl p-4 shadow-sm border ${surface}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${dm ? 'bg-emerald-900/40' : 'bg-emerald-100'}`}>
                <ShoppingBag size={15} className="text-emerald-600" />
              </div>
              <span className={`text-xs ${t2}`}>Orders</span>
            </div>
            <p className={`font-bold ${t1}`}>{todayOrders}</p>
            <p className="text-xs text-emerald-600 mt-1 flex items-center gap-0.5">
              <ArrowUp size={10} /> 8.3% vs yesterday
            </p>
          </div>
        </div>

        {/* Weekly sales mini chart */}
        <div className={`rounded-2xl p-4 shadow-sm border ${surface}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-sm font-semibold ${t1}`}>Weekly Sales</h3>
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
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: dm ? '#64748B' : '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number) => [formatIDR(v), 'Sales']}
              />
              <Area type="monotone" dataKey="sales" stroke="#3B82F6" strokeWidth={2} fill="url(#mobileGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Live session orders */}
        {recentOrders.length > 0 && (
          <div className={`rounded-2xl shadow-sm border overflow-hidden ${surface}`}>
            <div className={`px-4 py-3 border-b flex items-center justify-between ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
              <h3 className={`text-sm font-semibold ${t1}`}>Live Orders This Session</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full ${dm ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                {recentOrders.length} new
              </span>
            </div>
            <div className={`divide-y ${dm ? 'divide-slate-700' : 'divide-slate-100'}`}>
              {recentOrders.map(order => (
                <div key={order.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${dm ? 'bg-blue-900/40' : 'bg-blue-50'}`}>
                    <ShoppingBag size={13} className="text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${t1}`}>{order.orderNumber}</p>
                    <p className={`text-xs capitalize ${t2}`}>
                      {order.orderType} · {PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${t1}`}>{formatIDR(order.total)}</p>
                    <p className={`text-xs ${t2}`}>
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
          <div className={`rounded-2xl shadow-sm border overflow-hidden ${surface}`}>
            <div className={`flex items-center gap-2 px-4 py-3 border-b ${dm ? 'bg-amber-900/20 border-slate-700' : 'bg-amber-50 border-slate-100'}`}>
              <AlertTriangle size={16} className={dm ? 'text-amber-400' : 'text-amber-600'} />
              <h3 className={`text-sm font-semibold ${dm ? 'text-amber-400' : 'text-amber-700'}`}>Low Stock Alerts ({lowStockItems.length})</h3>
            </div>
            <div className={`divide-y ${dm ? 'divide-slate-700' : 'divide-slate-100'}`}>
              {lowStockItems.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span>{p.emoji}</span>
                    <span className={`text-sm ${t1}`}>{p.name}</span>
                  </div>
                  <span className={[
                    'text-xs px-2 py-0.5 rounded-full',
                    p.stock <= 3
                      ? (dm ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-600')
                      : (dm ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-600'),
                  ].join(' ')}>
                    {p.stock} left
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* POS notice */}
        <div className={`rounded-2xl p-4 flex items-start gap-3 border ${dm ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}`}>
          <ShoppingBag size={18} className={`mt-0.5 shrink-0 ${dm ? 'text-blue-400' : 'text-blue-600'}`} />
          <div>
            <p className={`text-sm font-semibold ${dm ? 'text-blue-300' : 'text-blue-800'}`}>POS Terminal</p>
            <p className={`text-xs mt-0.5 ${dm ? 'text-blue-400' : 'text-blue-600'}`}>
              For checkout, please use a tablet or desktop. The POS terminal is optimized for larger screens.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
