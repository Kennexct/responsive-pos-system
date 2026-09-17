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
  const todaySales     = sessionSales;
  const todayOrders    = orders.filter(o => o.status === 'completed').length;

  const recentOrders = orders.length > 0 ? orders.slice(0, 6) : [];
  const dynamicDate  = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const dm = darkMode;

  const bg = dm ? 'bg-ink-900' : 'bg-ink-50';
  const surface = dm ? 'bg-ink-800 border-ink-700' : 'bg-white border-ink-100';
  const t1 = dm ? 'text-ink-100' : 'text-ink-800';
  const t2 = dm ? 'text-ink-400' : 'text-ink-500';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  const tooltipStyle = { borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 11, background: dm ? '#181B25' : '#fff', color: dm ? '#ECEEF2' : '#252937' };

  return (
    <div className={`min-h-full pb-24 overflow-y-auto ${bg}`}>
      {/* Header */}
      <div className={`px-4 pt-6 pb-8 ${dm ? 'bg-ink-800 border-b border-ink-700' : 'bg-white border-b border-ink-200 shadow-sm'}`}>
        <p className={`text-xs mb-1 ${t2}`}>{dynamicDate}</p>
        <h1 className={`text-xl font-bold ${t1}`}>{greeting} 👋</h1>
        <p className={`text-sm mt-0.5 ${t2}`}>VPos Dashboard</p>
      </div>

      <div className="px-4 -mt-4 space-y-4">

        {/* Sales + orders cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`rounded-2xl p-4 shadow-sm border ${surface}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${dm ? 'bg-brand-900/40' : 'bg-brand-100'}`}>
                <DollarSign size={15} className="text-brand-600" />
              </div>
              <span className={`text-xs ${t2}`}>Today's Sales</span>
            </div>
            <p className={`font-bold ${t1}`}>{formatIDR(todaySales)}</p>
            <p className="text-xs text-leaf-600 mt-1 flex items-center gap-0.5">
              <ArrowUp size={10} /> 12.5% vs yesterday
            </p>
          </div>
          <div className={`rounded-2xl p-4 shadow-sm border ${surface}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${dm ? 'bg-leaf-900/40' : 'bg-leaf-100'}`}>
                <ShoppingBag size={15} className="text-leaf-600" />
              </div>
              <span className={`text-xs ${t2}`}>Orders</span>
            </div>
            <p className={`font-bold ${t1}`}>{todayOrders}</p>
            <p className="text-xs text-leaf-600 mt-1 flex items-center gap-0.5">
              <ArrowUp size={10} /> 8.3% vs yesterday
            </p>
          </div>
        </div>

        {/* Weekly sales mini chart */}
        <div className={`rounded-2xl p-4 shadow-sm border ${surface}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-sm font-semibold ${t1}`}>Weekly Sales</h3>
            <TrendingUp size={15} className="text-brand-500" />
          </div>
          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={WEEKLY_SALES} margin={{ top: 2, right: 2, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="mobileGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3445AB" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3445AB" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: dm ? '#646A7E' : '#8D93A5' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number) => [formatIDR(v), 'Sales']}
              />
              <Area type="monotone" dataKey="sales" stroke="#3445AB" strokeWidth={2} fill="url(#mobileGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Live session orders */}
        {recentOrders.length > 0 && (
          <div className={`rounded-2xl shadow-sm border overflow-hidden ${surface}`}>
            <div className={`px-4 py-3 border-b flex items-center justify-between ${dm ? 'border-ink-700' : 'border-ink-100'}`}>
              <h3 className={`text-sm font-semibold ${t1}`}>Live Orders This Session</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full ${dm ? 'bg-leaf-900/40 text-leaf-400' : 'bg-leaf-100 text-leaf-700'}`}>
                {recentOrders.length} new
              </span>
            </div>
            <div className={`divide-y ${dm ? 'divide-ink-700' : 'divide-ink-100'}`}>
              {recentOrders.map(order => (
                <div key={order.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${dm ? 'bg-brand-900/40' : 'bg-brand-50'}`}>
                    <ShoppingBag size={13} className="text-brand-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${t1}`}>{order.orderNumber}</p>
                    <p className={`text-xs capitalize ${t2}`}>
                      {order.orderType}, {PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}
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
            <div className={`flex items-center gap-2 px-4 py-3 border-b ${dm ? 'bg-turmeric-900/20 border-ink-700' : 'bg-turmeric-50 border-ink-100'}`}>
              <AlertTriangle size={16} className={dm ? 'text-turmeric-400' : 'text-turmeric-600'} />
              <h3 className={`text-sm font-semibold ${dm ? 'text-turmeric-400' : 'text-turmeric-700'}`}>Low Stock Alerts ({lowStockItems.length})</h3>
            </div>
            <div className={`divide-y ${dm ? 'divide-ink-700' : 'divide-ink-100'}`}>
              {lowStockItems.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span>{p.emoji}</span>
                    <span className={`text-sm ${t1}`}>{p.name}</span>
                  </div>
                  <span className={[
                    'text-xs px-2 py-0.5 rounded-full',
                    p.stock <= 3
                      ? (dm ? 'bg-chili-900/30 text-chili-400' : 'bg-chili-100 text-chili-600')
                      : (dm ? 'bg-turmeric-900/30 text-turmeric-400' : 'bg-turmeric-100 text-turmeric-600'),
                  ].join(' ')}>
                    {p.stock} left
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* POS notice */}
        <div className={`rounded-2xl p-4 flex items-start gap-3 border ${dm ? 'bg-brand-900/20 border-brand-800' : 'bg-brand-50 border-brand-200'}`}>
          <ShoppingBag size={18} className={`mt-0.5 shrink-0 ${dm ? 'text-brand-400' : 'text-brand-600'}`} />
          <div>
            <p className={`text-sm font-semibold ${dm ? 'text-brand-300' : 'text-brand-800'}`}>POS Terminal</p>
            <p className={`text-xs mt-0.5 ${dm ? 'text-brand-400' : 'text-brand-600'}`}>
              For checkout, please use a tablet or desktop. The POS terminal is optimized for larger screens.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
