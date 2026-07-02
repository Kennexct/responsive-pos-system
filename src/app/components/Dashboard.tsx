import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, ShoppingBag, Users, DollarSign, ArrowUp, ArrowDown } from 'lucide-react';
import { WEEKLY_SALES, TOP_PRODUCTS, PAYMENT_BREAKDOWN, formatIDR } from './mockData';
import type { RecentOrder } from './mockData';

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash', qris: 'QRIS', card: 'Card', 'bank-transfer': 'Bank Transfer',
};

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

interface Props {
  orders: RecentOrder[];
}

export function Dashboard({ orders }: Props) {
  const sessionSales  = orders.reduce((s, o) => s + o.total, 0);
  const sessionOrders = orders.length;

  // Merge session data into baseline numbers for display
  const todaySales    = 2847500 + sessionSales;
  const todayOrders   = 38 + sessionOrders;
  const avgOrderValue = Math.round(todaySales / (todayOrders || 1));

  const STAT_CARDS = [
    { label: "Today's Sales",   value: formatIDR(todaySales),    change: '+12.5%', up: true,  icon: DollarSign, iconBg: 'bg-blue-100',    iconColor: 'text-blue-600'    },
    { label: 'Orders Today',    value: String(todayOrders),      change: '+8.3%',  up: true,  icon: ShoppingBag, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
    { label: 'Avg Order Value', value: formatIDR(avgOrderValue), change: '+3.8%',  up: true,  icon: TrendingUp,  iconBg: 'bg-violet-100',  iconColor: 'text-violet-600'  },
    { label: 'Customers',       value: '34',                     change: '-2.1%',  up: false, icon: Users,       iconBg: 'bg-orange-100',  iconColor: 'text-orange-600'  },
  ];

  // Show live session orders at top, then historical mock orders below
  const displayOrders = [...orders.slice(0, 8)];

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div>
          <h1 className="text-slate-800">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Tuesday, 1 July 2026
            {sessionOrders > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs">
                {sessionOrders} live order{sessionOrders > 1 ? 's' : ''} this session
              </span>
            )}
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STAT_CARDS.map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                    <Icon size={20} className={card.iconColor} />
                  </div>
                  <span className={`text-xs flex items-center gap-0.5 ${card.up ? 'text-emerald-600' : 'text-red-500'}`}>
                    {card.up ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                    {card.change}
                  </span>
                </div>
                <p className="text-slate-500 text-xs mb-1">{card.label}</p>
                <p className="text-slate-800 text-base" style={{ fontWeight: 600 }}>{card.value}</p>
              </div>
            );
          })}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-700">Weekly Sales</h3>
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">Last 7 days</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={WEEKLY_SALES} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={v => formatCompact(v)} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
                  formatter={(v: number) => [formatIDR(v), 'Sales']}
                />
                <Area type="monotone" dataKey="sales" stroke="#3B82F6" strokeWidth={2} fill="url(#salesGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h3 className="text-slate-700 mb-4">Payment Methods</h3>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={PAYMENT_BREAKDOWN} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                  {PAYMENT_BREAKDOWN.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
                  formatter={(v: number) => [`${v}%`, '']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {PAYMENT_BREAKDOWN.map(item => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-500">{item.name}</span>
                  </div>
                  <span className="text-slate-700" style={{ fontWeight: 500 }}>{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top products + recent orders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h3 className="text-slate-700 mb-4">Top Products</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={TOP_PRODUCTS} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} width={90} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
                  formatter={(v: number) => [v, 'Sold']}
                />
                <Bar dataKey="sold" fill="#3B82F6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h3 className="text-slate-700 mb-4">
              Recent Transactions
              {displayOrders.length > 0 && (
                <span className="ml-2 text-xs text-slate-400" style={{ fontWeight: 400 }}>
                  ({displayOrders.length} shown)
                </span>
              )}
            </h3>
            <div className="space-y-3">
              {(displayOrders.length > 0 ? displayOrders : []).slice(0, 5).map(order => (
                <div key={order.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <ShoppingBag size={14} className="text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 truncate">{order.orderNumber}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1 capitalize">
                      <span>{order.orderType}</span>
                      <span>·</span>
                      <span>{PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm text-slate-800" style={{ fontWeight: 500 }}>{formatIDR(order.total)}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {displayOrders.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">No transactions yet today</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
