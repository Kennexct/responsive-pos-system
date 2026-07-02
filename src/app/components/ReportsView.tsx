import { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { Download, Calendar } from 'lucide-react';
import { WEEKLY_SALES, TOP_PRODUCTS, PAYMENT_BREAKDOWN, formatIDR } from './mockData';
import type { RecentOrder } from './mockData';

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
}

export function ReportsView({ orders }: Props) {
  const [period, setPeriod] = useState<Period>('week');

  const salesData = period === 'week' ? WEEKLY_SALES : MONTHLY_SALES;
  const salesKey  = period === 'week' ? 'day' : 'month';

  const totalSales  = orders.reduce((s, o) => s + o.total, 0) || salesData.reduce((s, d) => s + d.sales, 0);
  const totalTax    = orders.reduce((s, o) => s + o.tax, 0) || salesData.reduce((s, d) => s + Math.round(d.sales * 0.11 / 1.11), 0);
  const totalOrders = orders.length;

  const totalCost = orders.length > 0
    ? orders.reduce((s, o) => s + (o.totalCost || 0), 0)
    : salesData.reduce((s, d) => s + (d.sales * 0.45), 0); // Fake 55% margin for empty state
  
  const grossProfit = totalSales - totalTax - totalCost;
  const profitMargin = totalSales > 0 ? Math.round((grossProfit / (totalSales - totalTax)) * 100) : 0;

  const exportCSV = () => {
    const headers = ['Order #', 'Items', 'Type', 'Payment', 'Subtotal (IDR)', 'Tax (IDR)', 'Total (IDR)', 'Cashier', 'Date'];
    const rows = orders.map(o => [
      o.orderNumber,
      o.itemCount,
      o.orderType,
      PAYMENT_LABELS[o.paymentMethod] ?? o.paymentMethod,
      o.subtotal,
      o.tax,
      o.total,
      o.cashier,
      new Date(o.createdAt).toLocaleString('id-ID'),
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');

    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = `sales-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-slate-800">Reports</h1>
            <p className="text-slate-500 text-sm mt-0.5">Sales & tax collected · {totalOrders} orders</p>
          </div>
          <div className="flex gap-3">
            <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-white">
              {(['week', 'month'] as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={[
                    'px-4 py-2 text-sm transition-colors',
                    period === p ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50',
                  ].join(' ')}
                >
                  {p === 'week' ? 'This Week' : 'This Month'}
                </button>
              ))}
            </div>
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 border border-slate-200 bg-white rounded-xl px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Download size={15} />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Sales',   value: formatIDR(totalSales),  sub: period === 'week' ? 'This week' : 'This month' },
            { label: 'Gross Profit',  value: formatIDR(grossProfit), sub: `${profitMargin}% Margin`                      },
            { label: 'Total Orders',  value: String(totalOrders || (period === 'week' ? 214 : 892)), sub: 'Completed'   },
            { label: 'Top Category',  value: 'Coffee',               sub: '38% of sales'                                },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <p className="text-xs text-slate-500 mb-2">{card.label}</p>
              <p className="text-slate-800" style={{ fontWeight: 600 }}>{card.value}</p>
              <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Sales trend chart */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-700">Sales Trend</h3>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Calendar size={13} />
              {period === 'week' ? 'Last 7 days' : 'Last 7 months'}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={salesData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey={salesKey} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => formatCompact(v)}
              />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
                formatter={(v: number) => [formatIDR(v), 'Sales']}
              />
              <Line type="monotone" dataKey="sales" stroke="#3B82F6" strokeWidth={2.5} dot={{ fill: '#3B82F6', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top products + Payment split */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h3 className="text-slate-700 mb-4">Top Products by Revenue</h3>
            <div className="space-y-3">
              {TOP_PRODUCTS.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="text-sm text-slate-400 w-4">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-700">{p.name}</span>
                      <span className="text-slate-800" style={{ fontWeight: 500 }}>{formatIDR(p.revenue)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${(p.revenue / TOP_PRODUCTS[0].revenue) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{p.sold} units sold</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h3 className="text-slate-700 mb-4">Payment Method Breakdown</h3>
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
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-600 text-xs">{item.name}</span>
                    </div>
                    <span className="text-slate-800 text-xs" style={{ fontWeight: 500 }}>{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live order summary */}
            {orders.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <h4 className="text-slate-600 text-sm mb-3">Recent Session Orders</h4>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {orders.slice(0, 6).map(o => (
                    <div key={o.id} className="flex justify-between text-xs">
                      <span className="text-slate-400">{o.orderNumber}</span>
                      <span className="text-slate-700">{formatIDR(o.total)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xs border-t border-slate-100 pt-1.5 mt-1.5">
                  <span className="text-slate-600" style={{ fontWeight: 500 }}>Session total</span>
                  <span className="text-slate-800" style={{ fontWeight: 600 }}>
                    {formatIDR(orders.reduce((s, o) => s + o.total, 0))}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Full orders table */}
        {orders.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-slate-700">All Transactions</h3>
              <span className="text-xs text-slate-400">{orders.length} orders</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left">
                    <th className="px-5 py-3 text-slate-500 text-xs" style={{ fontWeight: 500 }}>Order #</th>
                    <th className="px-5 py-3 text-slate-500 text-xs" style={{ fontWeight: 500 }}>Items</th>
                    <th className="px-5 py-3 text-slate-500 text-xs" style={{ fontWeight: 500 }}>Type</th>
                    <th className="px-5 py-3 text-slate-500 text-xs hidden sm:table-cell" style={{ fontWeight: 500 }}>Payment</th>
                    <th className="px-5 py-3 text-slate-500 text-xs hidden md:table-cell" style={{ fontWeight: 500 }}>Tax</th>
                    <th className="px-5 py-3 text-slate-500 text-xs text-right" style={{ fontWeight: 500 }}>Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {orders.map(order => (
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 text-slate-700">{order.orderNumber}</td>
                      <td className="px-5 py-3 text-slate-500">{order.itemCount}</td>
                      <td className="px-5 py-3">
                        <span className={[
                          'inline-flex px-2 py-0.5 rounded-full text-xs capitalize',
                          order.orderType === 'dine-in'  ? 'bg-blue-50 text-blue-600'    :
                          order.orderType === 'takeaway' ? 'bg-amber-50 text-amber-600'  :
                                                           'bg-purple-50 text-purple-600'
                        ].join(' ')}>
                          {order.orderType}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-500 hidden sm:table-cell capitalize">
                        {PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}
                      </td>
                      <td className="px-5 py-3 text-slate-500 hidden md:table-cell">{formatIDR(order.tax)}</td>
                      <td className="px-5 py-3 text-right text-slate-800" style={{ fontWeight: 500 }}>
                        {formatIDR(order.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
