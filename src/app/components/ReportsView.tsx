import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Download, TrendingUp, Users, ShoppingBag, DollarSign, Activity, AlertCircle } from 'lucide-react';
import { formatIDR } from './mockData';
import type { RecentOrder, Category, Product, Customer, LoyaltySettings } from './mockData';

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash', qris: 'QRIS', card: 'Card', 'bank-transfer': 'Bank Transfer',
};

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

type ReportTab = 'sales' | 'crm' | 'inventory' | 'staff' | 'financial';

interface Props {
  orders: RecentOrder[];
  products: Product[];
  customers: Customer[];
  loyaltySettings: LoyaltySettings;
  categories: Category[];
  darkMode: boolean;
}

export function ReportsView({ orders, products, customers, loyaltySettings, categories, darkMode }: Props) {
  const [reportTab, setReportTab] = useState<ReportTab>('sales');
  const [dateRange, setDateRange] = useState<'all' | 'today' | '7days' | '30days'>('30days');
  
  const dm = darkMode;
  
  // ── Global Metrics ────────────────────────────────────────────────────────
  const completedOrders = useMemo(() => {
    const today = new Date();
    const startDate = new Date();
    if (dateRange === '7days') startDate.setDate(today.getDate() - 7);
    if (dateRange === '30days') startDate.setDate(today.getDate() - 30);
    const startStr = startDate.toISOString().slice(0, 10);
    const todayStr = today.toISOString().slice(0, 10);

    return orders.filter(o => {
      if (o.status !== 'completed') return false;
      if (dateRange === 'all') return true;
      const orderDate = o.createdAt.slice(0, 10);
      if (dateRange === 'today') return orderDate === todayStr;
      return orderDate >= startStr && orderDate <= todayStr;
    });
  }, [orders, dateRange]);
  
  const totalSales = completedOrders.reduce((s, o) => s + o.total, 0);
  const totalTax = completedOrders.reduce((s, o) => s + o.tax, 0);
  const totalCost = completedOrders.reduce((s, o) => s + (o.totalCost || 0), 0);
  const discountLeakage = completedOrders.reduce((s, o) => s + (o.discountTotal || 0) + (o.pointsDiscountAmt || 0), 0);
  
  const grossProfit = totalSales - totalTax - totalCost;
  const profitMargin = totalSales > 0 ? Math.round((grossProfit / (totalSales - totalTax)) * 100) : 0;
  
  // ── Sales Analytics ────────────────────────────────────────────────────────
  const paymentBreakdown = useMemo(() => {
    const acc: Record<string, number> = {};
    completedOrders.forEach(o => {
      acc[o.paymentMethod] = (acc[o.paymentMethod] || 0) + o.total;
    });
    return Object.keys(acc).map((key, index) => ({
      name: PAYMENT_LABELS[key] || key,
      value: acc[key],
      color: COLORS[index % COLORS.length]
    }));
  }, [completedOrders]);

  // ── CRM Analytics ────────────────────────────────────────────────────────
  const tierDistribution = useMemo(() => {
    const acc: Record<string, number> = {};
    customers.forEach(c => {
      const tierName = c.tierId ? (loyaltySettings.tiers?.find(t => t.id === c.tierId)?.name || c.tierId) : 'No Tier';
      acc[tierName] = (acc[tierName] || 0) + 1;
    });
    return Object.keys(acc).map((key, index) => ({
      name: key,
      value: acc[key],
      color: COLORS[index % COLORS.length]
    }));
  }, [customers, loyaltySettings]);

  const totalPointsLiability = customers.reduce((s, c) => s + c.pointsBalance, 0);
  const totalPointsLiabilityIDR = totalPointsLiability * loyaltySettings.redemptionValue;

  // ── Inventory Analytics ────────────────────────────────────────────────────────
  const productPerformance = useMemo(() => {
    const acc: Record<string, { revenue: number, qty: number, name: string }> = {};
    completedOrders.forEach(o => {
      (o.items || []).forEach(item => {
        if (!acc[item.product.id]) acc[item.product.id] = { revenue: 0, qty: 0, name: item.product.name };
        const price = item.product.price + (item.variant?.priceModifier || 0);
        acc[item.product.id].revenue += price * item.qty;
        acc[item.product.id].qty += item.qty;
      });
    });
    return Object.values(acc).sort((a, b) => b.revenue - a.revenue);
  }, [completedOrders]);

  const topProducts = productPerformance.slice(0, 5);
  
  const categoryContribution = useMemo(() => {
    const acc: Record<string, number> = {};
    completedOrders.forEach(o => {
      (o.items || []).forEach(item => {
        acc[item.product.category] = (acc[item.product.category] || 0) + (item.product.price * item.qty);
      });
    });
    return Object.keys(acc).map((key, index) => ({
      name: key,
      value: acc[key],
      color: COLORS[index % COLORS.length]
    }));
  }, [completedOrders]);

  // ── Staff Analytics ────────────────────────────────────────────────────────
  const staffPerformance = useMemo(() => {
    const acc: Record<string, { sales: number, txns: number }> = {};
    completedOrders.forEach(o => {
      if (!acc[o.cashier]) acc[o.cashier] = { sales: 0, txns: 0 };
      acc[o.cashier].sales += o.total;
      acc[o.cashier].txns += 1;
    });
    return Object.keys(acc).map(name => ({
      name,
      sales: acc[name].sales,
      txns: acc[name].txns,
      atv: Math.round(acc[name].sales / acc[name].txns)
    })).sort((a, b) => b.sales - a.sales);
  }, [completedOrders]);

  // ── Styling Tokens ────────────────────────────────────────────────────────
  const bg        = dm ? 'bg-slate-900'                  : 'bg-slate-50';
  const surface   = dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100';
  const t1        = dm ? 'text-slate-100'                : 'text-slate-800';
  const t2        = dm ? 'text-slate-400'                : 'text-slate-500';
  const divider   = dm ? 'border-slate-700'              : 'border-slate-200';
  
  const tooltipStyle = {
    borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    fontSize: 12, background: dm ? '#1E2330' : '#fff', color: dm ? '#F1F5F9' : '#1E293B',
  };

  const exportCSV = () => {
    if (completedOrders.length === 0) return;
    const headers = ['Order Number','Date','Cashier','Payment Method','Subtotal','Tax','Total','Status'];
    const rows = completedOrders.map(o => [
      o.orderNumber,
      new Date(o.createdAt).toLocaleString('id-ID'),
      o.cashier,
      o.paymentMethod,
      o.subtotal,
      o.tax,
      o.total,
      o.status
    ]);
    const csvContent = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pos-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`flex-1 overflow-y-auto w-full ${bg}`}>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className={`text-2xl font-bold ${t1}`}>Analytics & Reports</h1>
            <p className={`text-sm mt-0.5 ${t2}`}>Insights into business performance</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 p-1 rounded-xl border w-fit ${dm ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
              {(['all', 'today', '7days', '30days'] as const).map(range => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    dateRange === range
                      ? 'bg-blue-600 text-white shadow-sm'
                      : dm ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {range === 'all' ? 'All Time' : range === 'today' ? 'Today' : range === '7days' ? '7 Days' : '30 Days'}
                </button>
              ))}
            </div>
            <button
              onClick={exportCSV}
              className={`flex items-center gap-2 border rounded-xl px-4 py-2 text-sm font-medium transition-colors ${dm ? 'border-slate-700 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50 bg-white'}`}
            >
              <Download size={15} />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex gap-2 overflow-x-auto pb-2 border-b ${divider}`}>
          {[
            { id: 'sales', label: 'Sales Performance', icon: TrendingUp },
            { id: 'crm', label: 'CRM & Loyalty', icon: Users },
            { id: 'inventory', label: 'Product & Inventory', icon: ShoppingBag },
            { id: 'staff', label: 'Staff Performance', icon: Activity },
            { id: 'financial', label: 'Financial Audit', icon: DollarSign },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setReportTab(tab.id as ReportTab)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-xl transition-colors whitespace-nowrap ${reportTab === tab.id ? (dm ? 'bg-blue-900/20 text-blue-400 border-b-2 border-blue-500' : 'bg-blue-50 text-blue-700 border-b-2 border-blue-600') : (dm ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100')}`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content based on Tab */}
        <div className="space-y-6">
          
          {/* SALES TAB */}
          {reportTab === 'sales' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Gross Revenue', value: formatIDR(totalSales), desc: 'Including taxes' },
                  { label: 'Net Revenue', value: formatIDR(totalSales - totalTax), desc: 'Excluding taxes' },
                  { label: 'Discount Leakage', value: formatIDR(discountLeakage), desc: 'Revenue lost to promos' },
                  { label: 'Total Orders', value: completedOrders.length.toString(), desc: 'Completed transactions' },
                ].map(stat => (
                  <div key={stat.label} className={`p-5 rounded-2xl border ${surface}`}>
                    <p className={`text-sm font-medium ${t2}`}>{stat.label}</p>
                    <p className={`text-2xl font-bold mt-2 ${t1}`}>{stat.value}</p>
                    <p className={`text-xs mt-1 ${t2}`}>{stat.desc}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={`p-5 rounded-2xl border ${surface}`}>
                  <h3 className={`font-semibold mb-6 ${t1}`}>Sales by Payment Method</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={paymentBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={5} dataKey="value">
                          {paymentBreakdown.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} formatter={(val: number) => formatIDR(val)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* CRM TAB */}
          {reportTab === 'crm' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className={`p-5 rounded-2xl border ${surface}`}>
                  <p className={`text-sm font-medium ${t2}`}>Total Registered Customers</p>
                  <p className={`text-2xl font-bold mt-2 ${t1}`}>{customers.length}</p>
                </div>
                <div className={`p-5 rounded-2xl border ${surface}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className={`text-sm font-medium ${t2}`}>Total Points Liability</p>
                      <p className={`text-2xl font-bold mt-2 text-amber-500`}>{formatIDR(totalPointsLiabilityIDR)}</p>
                      <p className={`text-xs mt-1 ${t2}`}>{totalPointsLiability.toLocaleString('id-ID')} pts unredeemed</p>
                    </div>
                    {totalPointsLiabilityIDR > 500000 && (
                      <AlertCircle className="text-red-500" size={24} />
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={`p-5 rounded-2xl border ${surface}`}>
                  <h3 className={`font-semibold mb-6 ${t1}`}>Loyalty Tier Distribution</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={tierDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                          {tierDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* INVENTORY TAB */}
          {reportTab === 'inventory' && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={`p-5 rounded-2xl border ${surface}`}>
                  <h3 className={`font-semibold mb-4 ${t1}`}>Top Selling Products (Revenue)</h3>
                  <div className="space-y-4">
                    {topProducts.map((p, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <div>
                          <p className={`font-medium ${t1}`}>{p.name}</p>
                          <p className={`text-xs ${t2}`}>{p.qty} units sold</p>
                        </div>
                        <p className={`font-semibold text-emerald-500`}>{formatIDR(p.revenue)}</p>
                      </div>
                    ))}
                    {topProducts.length === 0 && <p className={t2}>No sales data available.</p>}
                  </div>
                </div>

                <div className={`p-5 rounded-2xl border ${surface}`}>
                  <h3 className={`font-semibold mb-6 ${t1}`}>Category Contribution</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categoryContribution} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={5} dataKey="value">
                          {categoryContribution.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} formatter={(val: number) => formatIDR(val)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* STAFF TAB */}
          {reportTab === 'staff' && (
            <div className={`rounded-2xl border overflow-hidden ${surface}`}>
              <table className="w-full text-sm text-left">
                <thead className={`border-b ${dm ? 'bg-slate-800/50 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                  <tr>
                    <th className="px-6 py-4 font-semibold">Cashier Name</th>
                    <th className="px-6 py-4 font-semibold">Total Revenue</th>
                    <th className="px-6 py-4 font-semibold">Transactions</th>
                    <th className="px-6 py-4 font-semibold">Average Transaction Value (ATV)</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${divider}`}>
                  {staffPerformance.map(staff => (
                    <tr key={staff.name} className={`transition-colors ${dm ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'}`}>
                      <td className={`px-6 py-4 font-medium ${t1}`}>{staff.name}</td>
                      <td className={`px-6 py-4 font-semibold ${dm ? 'text-emerald-400' : 'text-emerald-600'}`}>{formatIDR(staff.sales)}</td>
                      <td className={`px-6 py-4 ${t1}`}>{staff.txns}</td>
                      <td className={`px-6 py-4 ${t1}`}>{formatIDR(staff.atv)}</td>
                    </tr>
                  ))}
                  {staffPerformance.length === 0 && (
                    <tr>
                      <td colSpan={4} className={`px-6 py-8 text-center ${t2}`}>No staff sales data available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* FINANCIAL TAB */}
          {reportTab === 'financial' && (
            <div className="max-w-3xl space-y-6">
              <div className={`p-6 rounded-2xl border ${surface}`}>
                <h3 className={`font-semibold mb-6 text-lg ${t1}`}>Estimated P&L Snapshot</h3>
                <div className="space-y-4 text-sm">
                  <div className={`flex justify-between pb-2 border-b border-dashed ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
                    <span className={t2}>Gross Sales (Excl. Tax)</span>
                    <span className={t1}>{formatIDR(totalSales - totalTax + discountLeakage)}</span>
                  </div>
                  <div className={`flex justify-between pb-2 border-b border-dashed ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
                    <span className={t2}>Discounts & Promos</span>
                    <span className="text-red-500">-{formatIDR(discountLeakage)}</span>
                  </div>
                  <div className={`flex justify-between pb-2 border-b font-medium ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
                    <span className={t1}>Net Sales</span>
                    <span className={t1}>{formatIDR(totalSales - totalTax)}</span>
                  </div>
                  <div className={`flex justify-between pb-2 border-b border-dashed ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
                    <span className={t2}>Cost of Goods Sold (COGS)</span>
                    <span className="text-red-500">-{formatIDR(totalCost)}</span>
                  </div>
                  <div className="flex justify-between pt-2 text-lg font-bold">
                    <span className={t1}>Gross Profit</span>
                    <span className="text-emerald-500">{formatIDR(grossProfit)}</span>
                  </div>
                  <div className="flex justify-end">
                    <span className={`text-xs px-2 py-1 rounded-full ${profitMargin >= 30 ? (dm ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700') : (dm ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-700')}`}>
                      {profitMargin}% Margin
                    </span>
                  </div>
                </div>
              </div>

              <div className={`p-6 rounded-2xl border ${surface}`}>
                <h3 className={`font-semibold mb-6 text-lg ${t1}`}>Tax & Compliance</h3>
                <div className="space-y-4 text-sm">
                  <div className={`flex justify-between items-center pb-3 border-b ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
                    <div>
                      <p className={`font-medium ${t1}`}>Total Tax Collected</p>
                      <p className={`text-xs mt-0.5 ${t2}`}>To be remitted to tax authorities</p>
                    </div>
                    <span className={`text-xl font-bold ${t1}`}>{formatIDR(totalTax)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}
