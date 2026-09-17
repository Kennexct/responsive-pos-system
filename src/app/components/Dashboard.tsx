import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, ShoppingBag, Users, DollarSign, ArrowUp, ArrowDown } from 'lucide-react';
import { WEEKLY_SALES, TOP_PRODUCTS, PAYMENT_BREAKDOWN, formatIDR } from './mockData';
import type { RecentOrder, Product, Customer, LoyaltySettings } from './mockData';

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash', qris: 'QRIS', card: 'Card', 'bank-transfer': 'Bank Transfer',
};

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function getDynamicDate(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

interface Props {
  orders: RecentOrder[];
  products: Product[];
  customers: Customer[];
  loyaltySettings: LoyaltySettings;
  darkMode: boolean;
}

export function Dashboard({ orders, products, customers, loyaltySettings, darkMode }: Props) {
  const dm = darkMode;

  const sessionSales  = orders.filter(o => o.status === 'completed').reduce((s, o) => s + o.total, 0);
  const sessionOrders = orders.filter(o => o.status === 'completed').length;

  const todaySales    = sessionSales;
  const todayOrders   = sessionOrders;
  const avgOrderValue = Math.round(todaySales / (todayOrders || 1));

  const bg        = dm ? 'bg-ink-900' : 'bg-ink-50';
  const surface   = dm ? 'bg-ink-800 border-ink-700' : 'bg-white border-ink-100';
  const t1        = dm ? 'text-ink-100' : 'text-ink-800';
  const t2        = dm ? 'text-ink-400' : 'text-ink-500';
  const gridLine  = dm ? '#181B25' : '#ECEEF2';
  const tickColor = dm ? '#646A7E' : '#8D93A5';
  const tooltipStyle = { borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', fontSize: 12, background: dm ? '#181B25' : '#fff', color: dm ? '#ECEEF2' : '#252937' };

  const STAT_CARDS = [
    { label: "Today's Revenue",  value: formatIDR(todaySales),    change: '+12.5%', up: true,  icon: DollarSign,  iconBg: dm ? 'bg-brand-900/40'    : 'bg-brand-50',    iconColor: 'text-brand-500',    accent: 'border-l-brand-500'    },
    { label: 'Orders Today',     value: String(todayOrders),      change: '+8.3%',  up: true,  icon: ShoppingBag, iconBg: dm ? 'bg-leaf-900/40' : 'bg-leaf-50', iconColor: 'text-leaf-500', accent: 'border-l-leaf-500' },
    { label: 'Avg Order Value',  value: formatIDR(avgOrderValue), change: '+3.8%',  up: true,  icon: TrendingUp,  iconBg: dm ? 'bg-brand-900/40'  : 'bg-brand-50',  iconColor: 'text-brand-500',  accent: 'border-l-brand-500'  },
    { label: 'Customers',        value: String(customers.length), change: '+2.1%',  up: true,  icon: Users,       iconBg: dm ? 'bg-turmeric-900/40'  : 'bg-turmeric-50',  iconColor: 'text-turmeric-500',  accent: 'border-l-turmeric-500'  },
  ];

  const displayOrders = orders.slice(0, 6);
  
  const lowStockProducts = products.filter(p => p.trackInventory && p.stock <= p.lowStockThreshold);
  const totalPointsLiability = customers.reduce((sum, c) => sum + c.pointsBalance, 0) * loyaltySettings.redemptionValue;
  const isSalesDrop = todaySales < 2000000 && new Date().getHours() > 15;

  return (
    <div className={`flex-1 overflow-y-auto ${bg}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div>
          <h1 className={`text-xl sm:text-2xl font-bold ${t1}`}>Dashboard</h1>
          <p className={`text-sm mt-0.5 ${t2}`}>
            {getDynamicDate()}
            {sessionOrders > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-leaf-500/10 text-leaf-600 text-xs font-semibold">
                {sessionOrders} live order{sessionOrders > 1 ? 's' : ''} this session
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-2">
          {lowStockProducts.length > 0 && (
            <div className="flex items-center gap-3 bg-turmeric-500/10 border border-turmeric-500/20 rounded-xl p-3 flex-1">
              <div className={`p-2 rounded-lg ${dm ? 'bg-turmeric-900/20 text-turmeric-500' : 'bg-turmeric-500/20 text-turmeric-600'}`}>
                <ShoppingBag size={20} />
              </div>
              <div>
                <p className={`text-sm font-semibold ${dm ? 'text-turmeric-400' : 'text-turmeric-700'}`}>Low Stock Alert</p>
                <p className={`text-xs ${dm ? 'text-turmeric-500' : 'text-turmeric-600'}`}>{lowStockProducts.length} product(s) below reorder threshold.</p>
              </div>
            </div>
          )}
          {totalPointsLiability > 500000 && (
            <div className="flex items-center gap-3 bg-chili-500/10 border border-chili-500/20 rounded-xl p-3 flex-1">
              <div className={`p-2 rounded-lg ${dm ? 'bg-chili-900/20 text-chili-500' : 'bg-chili-500/20 text-chili-600'}`}>
                <DollarSign size={20} />
              </div>
              <div>
                <p className={`text-sm font-semibold ${dm ? 'text-chili-400' : 'text-chili-700'}`}>High Points Liability</p>
                <p className={`text-xs ${dm ? 'text-chili-500' : 'text-chili-600'}`}>Unredeemed points value exceeds {formatIDR(500000)} (Current: {formatIDR(totalPointsLiability)}).</p>
              </div>
            </div>
          )}
          {isSalesDrop && (
            <div className="flex items-center gap-3 bg-chili-500/10 border border-chili-500/20 rounded-xl p-3 flex-1">
              <div className={`p-2 rounded-lg ${dm ? 'bg-chili-900/20 text-chili-500' : 'bg-chili-500/20 text-chili-600'}`}>
                <TrendingDown size={20} />
              </div>
              <div>
                <p className={`text-sm font-semibold ${dm ? 'text-chili-400' : 'text-chili-700'}`}>Sales Pacing Alert</p>
                <p className={`text-xs ${dm ? 'text-chili-500' : 'text-chili-600'}`}>Today's revenue is pacing heavily below average.</p>
              </div>
            </div>
          )}
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STAT_CARDS.map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} className={`rounded-2xl p-4 shadow-sm border border-l-4 ${surface} ${card.accent}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                    <Icon size={18} className={card.iconColor} />
                  </div>
                  <span className={`text-xs flex items-center gap-0.5 font-semibold ${card.up ? 'text-leaf-500' : 'text-chili-400'}`}>
                    {card.up ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                    {card.change}
                  </span>
                </div>
                <h3 className={`text-xs mb-1 ${t2}`}>{card.label}</h3>
                <p className={`text-base font-bold ${t1}`}>{card.value}</p>
              </div>
            );
          })}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className={`lg:col-span-2 rounded-2xl p-5 shadow-sm border ${surface}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-semibold ${t1}`}>Weekly Sales</h3>
              <span className={`text-xs px-2 py-1 rounded-full ${dm ? 'bg-ink-700 text-ink-400' : 'bg-ink-100 text-ink-400'}`}>Last 7 days</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={WEEKLY_SALES} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3445AB" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3445AB" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridLine} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} tickFormatter={v => formatCompact(v)} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatIDR(v), 'Sales']} />
                <Area type="monotone" dataKey="sales" stroke="#3445AB" strokeWidth={2} fill="url(#salesGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className={`rounded-2xl p-5 shadow-sm border ${surface}`}>
            <h3 className={`font-semibold ${t1} mb-4`}>Payment Mix</h3>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={PAYMENT_BREAKDOWN} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                  {PAYMENT_BREAKDOWN.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, '']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {PAYMENT_BREAKDOWN.map(item => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className={t2}>{item.name}</span>
                  </div>
                  <span className={`font-semibold ${t1}`}>{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top products + recent orders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className={`rounded-2xl p-5 shadow-sm border ${surface}`}>
            <h3 className={`font-semibold ${t1} mb-4`}>Top Products</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={TOP_PRODUCTS} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridLine} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} width={90} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v, 'Sold']} />
                <Bar dataKey="sold" fill="#3445AB" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className={`rounded-2xl p-5 shadow-sm border ${surface}`}>
            <h3 className={`font-semibold ${t1} mb-4`}>
              Recent Transactions
              {displayOrders.length > 0 && (
                <span className={`ml-2 text-xs font-normal ${t2}`}>({displayOrders.length} shown)</span>
              )}
            </h3>
            <div className="space-y-3">
              {displayOrders.map(order => (
                <div key={order.id} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${dm ? 'bg-brand-900/40' : 'bg-brand-50'}`}>
                    <ShoppingBag size={13} className="text-brand-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${t1}`}>{order.orderNumber}</p>
                    <p className={`text-xs flex items-center gap-1 capitalize ${t2}`}>
                      <span>{order.orderType}</span>
                      <span>·</span>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${dm ? 'bg-ink-700 text-ink-400' : 'bg-ink-100 text-ink-500'}`}>
                        {PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}
                      </span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-semibold ${t1}`}>{formatIDR(order.total)}</p>
                    <p className={`text-xs ${t2}`}>
                      {new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {displayOrders.length === 0 && (
                <p className={`text-sm text-center py-4 ${t2}`}>No transactions yet today</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
