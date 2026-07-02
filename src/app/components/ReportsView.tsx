import { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { Download, Calendar } from 'lucide-react';
import { WEEKLY_SALES, TOP_PRODUCTS, PAYMENT_BREAKDOWN, formatIDR } from './mockData';
import type { RecentOrder, Category } from './mockData';

const MONTHLY_SALES = [
  { month: 'Jan', sales: 48500000 }, { month: 'Feb', sales: 52300000 },
  { month: 'Mar', sales: 61000000 }, { month: 'Apr', sales: 58700000 },
  { month: 'May', sales: 71200000 }, { month: 'Jun', sales: 68900000 },
  { month: 'Jul', sales: 18400000 },
];

const PAYMENT_LABELS: Record<string, string> = {
  'cash': 'Cash', 'qris': 'QRIS', 'card': 'Card', 'bank-transfer': 'Bank Transfer',
};

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

type Period = 'week' | 'month';

interface Props {
  orders: RecentOrder[];
  categories: Category[];
  darkMode: boolean;
}

export function ReportsView({ orders, categories, darkMode }: Props) {
  const [period, setPeriod] = useState<Period>('week');
  const [reportTab, setReportTab] = useState<'sales'|'inventory'|'crm'|'staff'>('sales');

  const dm = darkMode;

  const salesData = period === 'week' ? WEEKLY_SALES : MONTHLY_SALES;
  const salesKey  = period === 'week' ? 'day' : 'month';

  const totalSales  = orders.reduce((s, o) => s + o.total, 0) || salesData.reduce((s, d) => s + d.sales, 0);
  const totalTax    = orders.reduce((s, o) => s + o.tax, 0) || salesData.reduce((s, d) => s + Math.round(d.sales * 0.11 / 1.11), 0);
  const totalOrders = orders.length;

  const totalCost = orders.length > 0
    ? orders.reduce((s, o) => s + (o.totalCost || 0), 0)
    : salesData.reduce((s, d) => s + (d.sales * 0.45), 0);

  const grossProfit  = totalSales - totalTax - totalCost;
  const profitMargin = totalSales > 0 ? Math.round((grossProfit / (totalSales - totalTax)) * 100) : 0;

  // ── Dark mode tokens ──────────────────────────────────────────────────────
  const bg        = dm ? 'bg-slate-900'                  : 'bg-slate-50';
  const surface   = dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100';
  const t1        = dm ? 'text-slate-100'                : 'text-slate-800';
  const t2        = dm ? 'text-slate-400'                : 'text-slate-500';
  const t3        = dm ? 'text-slate-500'                : 'text-slate-400';
  const divider   = dm ? 'border-slate-700'              : 'border-slate-100';
  const rowHover  = dm ? 'hover:bg-slate-700/40'         : 'hover:bg-slate-50';
  const theadBg   = dm ? 'bg-slate-700/50'               : 'bg-slate-50';
  const barBg     = dm ? 'bg-slate-700'                  : 'bg-slate-100';
  const gridLine  = dm ? '#1E2330' : '#F1F5F9';
  const tickColor = dm ? '#64748B' : '#94A3B8';
  const tooltipStyle = {
    borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    fontSize: 12, background: dm ? '#1E2330' : '#fff', color: dm ? '#F1F5F9' : '#1E293B',
  };

  // ── CSV export ────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['Order #', 'Items', 'Type', 'Payment', 'Subtotal (IDR)', 'Tax (IDR)', 'Total (IDR)', 'Cashier', 'Date'];
    const rows = orders.map(o => [
      o.orderNumber, o.itemCount, o.orderType,
      PAYMENT_LABELS[o.paymentMethod] ?? o.paymentMethod,
      o.subtotal, o.tax, o.total, o.cashier,
      new Date(o.createdAt).toLocaleString('id-ID'),
    ]);
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `sales-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ── Summary cards data ────────────────────────────────────────────────────
  const SUMMARY = [
    { label: 'Total Sales',   value: formatIDR(totalSales),  sub: period === 'week' ? 'This week' : 'This month', accent: 'border-l-blue-500'    },
    { label: 'Gross Profit',  value: formatIDR(grossProfit), sub: `${profitMargin}% margin`,                       accent: 'border-l-emerald-500' },
    { label: 'Total Orders',  value: String(totalOrders || (period === 'week' ? 214 : 892)), sub: 'Completed',     accent: 'border-l-violet-500'  },
    { label: 'Top Category',  value: 'Coffee',               sub: '38% of sales',                                  accent: 'border-l-orange-500'  },
  ];

  return (
    <div className={`flex-1 overflow-y-auto ${bg}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className={t1}>Reports</h1>
            <p className={`text-sm mt-0.5 ${t2}`}>Sales & tax collected · {totalOrders} orders</p>
          </div>
          <div className="flex gap-3">
            <div className={`flex border rounded-xl overflow-hidden ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
              {(['week', 'month'] as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={[
                    'px-4 py-2 text-sm font-medium transition-colors',
                    period === p ? 'bg-blue-600 text-white' : dm ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-50',
                  ].join(' ')}
                >
                  {p === 'week' ? 'This Week' : 'This Month'}
                </button>
              ))}
            </div>
            <button
              onClick={exportCSV}
              className={`flex items-center gap-2 border rounded-xl px-4 py-2 text-sm font-medium transition-colors ${dm ? 'border-slate-700 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50 bg-white'}`}
            >
              <Download size={15} />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>

        <div className={`flex gap-2 overflow-x-auto pb-2 border-b ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
          {(['sales', 'inventory', 'crm', 'staff'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setReportTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors capitalize ${reportTab === tab ? (dm ? 'bg-slate-800 text-blue-400 border-b-2 border-blue-500' : 'bg-white text-blue-600 border-b-2 border-blue-600') : (dm ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}
            >
              {tab} Analytics
            </button>
          ))}
        </div>

        {reportTab === 'sales' && (
          <div className="space-y-6">
            {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {SUMMARY.map(card => (
            <div key={card.label} className={`rounded-2xl p-4 shadow-sm border border-l-4 ${surface} ${card.accent}`}>
              <p className={`text-xs mb-2 ${t2}`}>{card.label}</p>
              <p className={`font-bold ${t1}`}>{card.value}</p>
              <p className={`text-xs mt-1 ${t3}`}>{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Sales trend chart */}
        <div className={`rounded-2xl p-5 shadow-sm border ${surface}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={t1}>Sales Trend</h3>
            <div className={`flex items-center gap-2 text-xs ${t3}`}>
              <Calendar size={13} />
              {period === 'week' ? 'Last 7 days' : 'Last 7 months'}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={salesData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridLine} />
              <XAxis dataKey={salesKey} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} tickFormatter={v => formatCompact(v)} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatIDR(v), 'Sales']} />
              <Line type="monotone" dataKey="sales" stroke="#3B82F6" strokeWidth={2.5} dot={{ fill: '#3B82F6', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top products + Payment split */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Top Products */}
          <div className={`rounded-2xl p-5 shadow-sm border ${surface}`}>
            <h3 className={`mb-4 ${t1}`}>Top Products by Revenue</h3>
            <div className="space-y-3">
              {TOP_PRODUCTS.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className={`text-sm w-4 ${t3}`}>{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className={t2}>{p.name}</span>
                      <span className={`font-semibold ${t1}`}>{formatIDR(p.revenue)}</span>
                    </div>
                    <div className={`w-full h-1.5 rounded-full overflow-hidden ${barBg}`}>
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${(p.revenue / TOP_PRODUCTS[0].revenue) * 100}%` }}
                      />
                    </div>
                    <p className={`text-xs mt-0.5 ${t3}`}>{p.sold} units sold</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment breakdown */}
          <div className={`rounded-2xl p-5 shadow-sm border ${surface}`}>
            <h3 className={`mb-4 ${t1}`}>Payment Method Breakdown</h3>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={PAYMENT_BREAKDOWN} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                    {PAYMENT_BREAKDOWN.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {PAYMENT_BREAKDOWN.map(item => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className={`text-xs ${t2}`}>{item.name}</span>
                    </div>
                    <span className={`text-xs font-semibold ${t1}`}>{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>

            {orders.length > 0 && (
              <div className={`mt-4 border-t pt-4 ${divider}`}>
                <h4 className={`text-sm mb-3 ${t2}`}>Session Orders</h4>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {orders.slice(0, 6).map(o => (
                    <div key={o.id} className="flex justify-between text-xs">
                      <span className={t3}>{o.orderNumber}</span>
                      <span className={t1}>{formatIDR(o.total)}</span>
                    </div>
                  ))}
                </div>
                <div className={`flex justify-between text-xs border-t pt-1.5 mt-1.5 ${divider}`}>
                  <span className={`font-semibold ${t2}`}>Session total</span>
                  <span className={`font-bold ${t1}`}>{formatIDR(orders.reduce((s, o) => s + o.total, 0))}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Full orders table */}
        {orders.length > 0 && (
          <div className={`rounded-2xl shadow-sm border overflow-hidden ${surface}`}>
            <div className={`px-5 py-4 border-b flex items-center justify-between ${divider}`}>
              <h3 className={t1}>All Transactions</h3>
              <span className={`text-xs ${t3}`}>{orders.length} orders</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`text-left border-b ${theadBg} ${divider}`}>
                    <th className={`px-5 py-3 text-xs font-semibold ${t2}`}>Order #</th>
                    <th className={`px-5 py-3 text-xs font-semibold ${t2}`}>Items</th>
                    <th className={`px-5 py-3 text-xs font-semibold ${t2}`}>Type</th>
                    <th className={`px-5 py-3 text-xs font-semibold hidden sm:table-cell ${t2}`}>Payment</th>
                    <th className={`px-5 py-3 text-xs font-semibold hidden md:table-cell ${t2}`}>Tax</th>
                    <th className={`px-5 py-3 text-xs font-semibold text-right ${t2}`}>Total</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${dm ? 'divide-slate-700' : 'divide-slate-50'}`}>
                  {orders.map(order => (
                    <tr key={order.id} className={`transition-colors ${rowHover}`}>
                      <td className={`px-5 py-3 font-medium ${t1}`}>{order.orderNumber}</td>
                      <td className={`px-5 py-3 ${t2}`}>{order.itemCount}</td>
                      <td className="px-5 py-3">
                        <span className={[
                          'inline-flex px-2 py-0.5 rounded-full text-xs font-semibold capitalize',
                          order.orderType === 'dine-in'  ? 'bg-blue-500/10 text-blue-600'    :
                          order.orderType === 'takeaway' ? 'bg-amber-500/10 text-amber-600'  :
                                                           'bg-purple-500/10 text-purple-600',
                        ].join(' ')}>
                          {order.orderType}
                        </span>
                      </td>
                      <td className={`px-5 py-3 hidden sm:table-cell capitalize ${t2}`}>
                        {PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}
                      </td>
                      <td className={`px-5 py-3 hidden md:table-cell ${t2}`}>{formatIDR(order.tax)}</td>
                      <td className={`px-5 py-3 text-right font-semibold ${t1}`}>{formatIDR(order.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          </div>
        )}

        {reportTab === 'inventory' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className={`rounded-2xl p-5 shadow-sm border ${surface}`}>
              <h3 className={`mb-4 ${t1}`}>Best Sellers by Margin</h3>
              <div className="space-y-4">
                {[
                  { name: 'Americano', margin: '75%', revenue: 2436000 },
                  { name: 'Mineral Water', margin: '80%', revenue: 500000 },
                  { name: 'Nasi Goreng', margin: '45%', revenue: 2052000 },
                ].map((p, i) => (
                  <div key={p.name} className="flex justify-between items-center">
                    <div>
                      <p className={`text-sm font-medium ${t1}`}>{p.name}</p>
                      <p className={`text-xs ${t3}`}>Margin: {p.margin}</p>
                    </div>
                    <span className={`text-sm font-semibold text-emerald-500`}>{formatIDR(p.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className={`rounded-2xl p-5 shadow-sm border ${surface}`}>
              <h3 className={`mb-4 ${t1}`}>Low Stock Alerts</h3>
              <p className={`text-sm ${t2}`}>All items are well stocked.</p>
            </div>
          </div>
        )}

        {reportTab === 'crm' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={`rounded-2xl p-4 shadow-sm border border-l-4 ${surface} border-l-purple-500`}>
                <p className={`text-xs mb-2 ${t2}`}>Points Liability</p>
                <p className={`font-bold ${t1}`}>{formatIDR(150000)}</p>
                <p className={`text-xs mt-1 ${t3}`}>Unredeemed Value</p>
              </div>
              <div className={`rounded-2xl p-4 shadow-sm border border-l-4 ${surface} border-l-blue-500`}>
                <p className={`text-xs mb-2 ${t2}`}>New Signups</p>
                <p className={`font-bold ${t1}`}>24</p>
                <p className={`text-xs mt-1 ${t3}`}>This week</p>
              </div>
            </div>
          </div>
        )}

        {reportTab === 'staff' && (
          <div className={`rounded-2xl p-5 shadow-sm border ${surface}`}>
            <h3 className={`mb-4 ${t1}`}>Staff Performance</h3>
            <p className={`text-sm ${t2}`}>Detailed staff reports are coming soon.</p>
          </div>
        )}
      </div>
    </div>
  );
}
