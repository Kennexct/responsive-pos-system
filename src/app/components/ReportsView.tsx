import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Download, TrendingUp, Users, ShoppingBag, DollarSign, Activity, AlertCircle, LayoutGrid, Table2 } from 'lucide-react';
import { formatIDR } from './mockData';
import type { RecentOrder, Category, Product, Customer, LoyaltySettings } from './mockData';

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash', qris: 'QRIS', card: 'Card', 'bank-transfer': 'Bank Transfer',
};

const COLORS = ['#3445AB', '#2A9161', '#E4A423', '#C7402A', '#7485DA', '#8D93A5'];

type ReportTab = 'sales' | 'crm' | 'inventory' | 'staff' | 'financial';
type ViewMode = 'visual' | 'classic';

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
  const [viewMode, setViewMode] = useState<ViewMode>('visual');
  
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
  const bg        = dm ? 'bg-ink-900'                  : 'bg-ink-50';
  const surface   = dm ? 'bg-ink-800 border-ink-700' : 'bg-white border-ink-100';
  const t1        = dm ? 'text-ink-100'                : 'text-ink-800';
  const t2        = dm ? 'text-ink-400'                : 'text-ink-500';
  const divider   = dm ? 'border-ink-700'              : 'border-ink-200';
  
  const tooltipStyle = {
    borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    fontSize: 12, background: dm ? '#181B25' : '#fff', color: dm ? '#ECEEF2' : '#252937',
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
            <div className={`flex items-center gap-1 p-1 rounded-xl border w-fit ${dm ? 'bg-ink-800 border-ink-700' : 'bg-white border-ink-200'}`}>
              {(['all', 'today', '7days', '30days'] as const).map(range => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    dateRange === range
                      ? 'bg-brand-600 text-white shadow-sm'
                      : dm ? 'text-ink-400 hover:text-ink-200 hover:bg-ink-700/50' : 'text-ink-500 hover:text-ink-700 hover:bg-ink-50'
                  }`}
                >
                  {range === 'all' ? 'All Time' : range === 'today' ? 'Today' : range === '7days' ? '7 Days' : '30 Days'}
                </button>
              ))}
            </div>
            <div className={`flex items-center gap-1 p-1 rounded-xl border w-fit ${dm ? 'bg-ink-800 border-ink-700' : 'bg-white border-ink-200'}`}>
              <button
                type="button"
                onClick={() => setViewMode('visual')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  viewMode === 'visual'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : dm ? 'text-ink-400 hover:text-ink-200 hover:bg-ink-700/50' : 'text-ink-500 hover:text-ink-700 hover:bg-ink-50'
                }`}
              >
                <LayoutGrid size={14} />
                <span>Visual</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('classic')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  viewMode === 'classic'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : dm ? 'text-ink-400 hover:text-ink-200 hover:bg-ink-700/50' : 'text-ink-500 hover:text-ink-700 hover:bg-ink-50'
                }`}
              >
                <Table2 size={14} />
                <span>Classic</span>
              </button>
            </div>
            <button
              onClick={exportCSV}
              className={`flex items-center gap-2 border rounded-xl px-4 py-2 text-sm font-medium transition-colors ${dm ? 'border-ink-700 text-ink-300 hover:bg-ink-700' : 'border-ink-200 text-ink-600 hover:bg-ink-50 bg-white'}`}
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
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-xl transition-colors whitespace-nowrap ${reportTab === tab.id ? (dm ? 'bg-brand-900/20 text-brand-400 border-b-2 border-brand-500' : 'bg-brand-50 text-brand-700 border-b-2 border-brand-600') : (dm ? 'text-ink-400 hover:text-ink-200 hover:bg-ink-800' : 'text-ink-500 hover:text-ink-700 hover:bg-ink-100')}`}
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

              {viewMode === 'visual' ? (
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

                  <div className={`p-5 rounded-2xl border ${surface}`}>
                    <h3 className={`font-semibold mb-6 ${t1}`}>Revenue Volume Breakdown</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={paymentBreakdown} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={dm ? '#373C4E' : '#DADDE5'} vertical={false} />
                          <XAxis dataKey="name" stroke={dm ? '#8D93A5' : '#646A7E'} fontSize={12} tickLine={false} />
                          <YAxis stroke={dm ? '#8D93A5' : '#646A7E'} fontSize={12} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                          <Tooltip contentStyle={tooltipStyle} formatter={(val: number) => formatIDR(val)} />
                          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                            {paymentBreakdown.map((entry, index) => (
                              <Cell key={`bar-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Classic Table: Payment Methods Breakdown */}
                  <div className={`rounded-2xl border overflow-hidden ${surface}`}>
                    <div className="px-6 py-4 border-b border-inherit">
                      <h3 className={`font-semibold text-base ${t1}`}>Payment Method Breakdown (Classic View)</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className={`border-b ${dm ? 'bg-ink-800 border-ink-700 text-ink-400' : 'bg-ink-50 border-ink-200 text-ink-500'}`}>
                          <tr>
                            <th className="px-6 py-3.5 font-semibold">Payment Method</th>
                            <th className="px-6 py-3.5 font-semibold">Total Revenue</th>
                            <th className="px-6 py-3.5 font-semibold">% Share</th>
                            <th className="px-6 py-3.5 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${divider}`}>
                          {paymentBreakdown.map(p => {
                            const share = totalSales > 0 ? Math.round((p.value / totalSales) * 100) : 0;
                            return (
                              <tr key={p.name} className={`transition-colors ${dm ? 'hover:bg-ink-700/30' : 'hover:bg-ink-50'}`}>
                                <td className={`px-6 py-3.5 font-medium flex items-center gap-2 ${t1}`}>
                                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                                  {p.name}
                                </td>
                                <td className={`px-6 py-3.5 font-semibold ${dm ? 'text-leaf-400' : 'text-leaf-600'}`}>{formatIDR(p.value)}</td>
                                <td className={`px-6 py-3.5 ${t1}`}>{share}%</td>
                                <td className="px-6 py-3.5">
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-leaf-100 text-leaf-700 dark:bg-leaf-900/30 dark:text-leaf-400">
                                    Settled
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                          {paymentBreakdown.length === 0 && (
                            <tr>
                              <td colSpan={4} className={`px-6 py-8 text-center ${t2}`}>No payment data available in this period.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Classic Table: Recent Completed Orders */}
                  <div className={`rounded-2xl border overflow-hidden ${surface}`}>
                    <div className="px-6 py-4 border-b border-inherit">
                      <h3 className={`font-semibold text-base ${t1}`}>Completed Transactions Audit Log</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className={`border-b ${dm ? 'bg-ink-800 border-ink-700 text-ink-400' : 'bg-ink-50 border-ink-200 text-ink-500'}`}>
                          <tr>
                            <th className="px-6 py-3.5 font-semibold">Order #</th>
                            <th className="px-6 py-3.5 font-semibold">Date & Time</th>
                            <th className="px-6 py-3.5 font-semibold">Cashier</th>
                            <th className="px-6 py-3.5 font-semibold">Payment</th>
                            <th className="px-6 py-3.5 font-semibold text-right">Items</th>
                            <th className="px-6 py-3.5 font-semibold text-right">Subtotal</th>
                            <th className="px-6 py-3.5 font-semibold text-right">Tax</th>
                            <th className="px-6 py-3.5 font-semibold text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${divider}`}>
                          {completedOrders.slice(0, 10).map(o => (
                            <tr key={o.id} className={`transition-colors ${dm ? 'hover:bg-ink-700/30' : 'hover:bg-ink-50'}`}>
                              <td className={`px-6 py-3.5 font-mono font-medium ${t1}`}>{o.orderNumber}</td>
                              <td className={`px-6 py-3.5 text-xs ${t2}`}>{new Date(o.createdAt).toLocaleString('id-ID')}</td>
                              <td className={`px-6 py-3.5 ${t1}`}>{o.cashier}</td>
                              <td className={`px-6 py-3.5 capitalize ${t1}`}>{PAYMENT_LABELS[o.paymentMethod] || o.paymentMethod}</td>
                              <td className={`px-6 py-3.5 text-right ${t1}`}>{(o.items ?? []).reduce((s, i) => s + i.qty, 0)}</td>
                              <td className={`px-6 py-3.5 text-right ${t1}`}>{formatIDR(o.subtotal)}</td>
                              <td className={`px-6 py-3.5 text-right text-xs ${t2}`}>{formatIDR(o.tax)}</td>
                              <td className={`px-6 py-3.5 text-right font-semibold ${dm ? 'text-leaf-400' : 'text-leaf-600'}`}>{formatIDR(o.total)}</td>
                            </tr>
                          ))}
                          {completedOrders.length === 0 && (
                            <tr>
                              <td colSpan={8} className={`px-6 py-8 text-center ${t2}`}>No completed transactions in this period.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
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
                      <p className={`text-2xl font-bold mt-2 text-turmeric-500`}>{formatIDR(totalPointsLiabilityIDR)}</p>
                      <p className={`text-xs mt-1 ${t2}`}>{totalPointsLiability.toLocaleString('id-ID')} pts unredeemed</p>
                    </div>
                    {totalPointsLiabilityIDR > 500000 && (
                      <AlertCircle className="text-chili-500" size={24} />
                    )}
                  </div>
                </div>
              </div>

              {viewMode === 'visual' ? (
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

                  <div className={`p-5 rounded-2xl border ${surface}`}>
                    <h3 className={`font-semibold mb-6 ${t1}`}>Customer Count by Tier</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={tierDistribution} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={dm ? '#373C4E' : '#DADDE5'} vertical={false} />
                          <XAxis dataKey="name" stroke={dm ? '#8D93A5' : '#646A7E'} fontSize={12} tickLine={false} />
                          <YAxis stroke={dm ? '#8D93A5' : '#646A7E'} fontSize={12} tickLine={false} allowDecimals={false} />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                            {tierDistribution.map((entry, index) => (
                              <Cell key={`tier-bar-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Classic Table: Loyalty Tier Membership */}
                  <div className={`rounded-2xl border overflow-hidden ${surface}`}>
                    <div className="px-6 py-4 border-b border-inherit">
                      <h3 className={`font-semibold text-base ${t1}`}>Loyalty Tier Membership (Classic View)</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className={`border-b ${dm ? 'bg-ink-800 border-ink-700 text-ink-400' : 'bg-ink-50 border-ink-200 text-ink-500'}`}>
                          <tr>
                            <th className="px-6 py-3.5 font-semibold">Tier Level</th>
                            <th className="px-6 py-3.5 font-semibold">Members Count</th>
                            <th className="px-6 py-3.5 font-semibold">% of Base</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${divider}`}>
                          {tierDistribution.map(t => {
                            const pct = customers.length > 0 ? Math.round((t.value / customers.length) * 100) : 0;
                            return (
                              <tr key={t.name} className={`transition-colors ${dm ? 'hover:bg-ink-700/30' : 'hover:bg-ink-50'}`}>
                                <td className={`px-6 py-3.5 font-medium flex items-center gap-2 ${t1}`}>
                                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                                  {t.name}
                                </td>
                                <td className={`px-6 py-3.5 font-semibold ${t1}`}>{t.value} members</td>
                                <td className={`px-6 py-3.5 ${t2}`}>{pct}%</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Classic Table: Top VIP Customers */}
                  <div className={`rounded-2xl border overflow-hidden ${surface}`}>
                    <div className="px-6 py-4 border-b border-inherit">
                      <h3 className={`font-semibold text-base ${t1}`}>Top Customers by Spending</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className={`border-b ${dm ? 'bg-ink-800 border-ink-700 text-ink-400' : 'bg-ink-50 border-ink-200 text-ink-500'}`}>
                          <tr>
                            <th className="px-6 py-3.5 font-semibold">Customer Name</th>
                            <th className="px-6 py-3.5 font-semibold">Phone</th>
                            <th className="px-6 py-3.5 font-semibold">Points Balance</th>
                            <th className="px-6 py-3.5 font-semibold">Total Transactions</th>
                            <th className="px-6 py-3.5 font-semibold text-right">Total Spend</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${divider}`}>
                          {[...customers].sort((a, b) => b.totalSpend - a.totalSpend).slice(0, 10).map(c => (
                            <tr key={c.id} className={`transition-colors ${dm ? 'hover:bg-ink-700/30' : 'hover:bg-ink-50'}`}>
                              <td className={`px-6 py-3.5 font-medium ${t1}`}>{c.name}</td>
                              <td className={`px-6 py-3.5 ${t2}`}>{c.phone || '-'}</td>
                              <td className={`px-6 py-3.5 font-medium text-turmeric-500`}>{c.pointsBalance} pts</td>
                              <td className={`px-6 py-3.5 ${t1}`}>{c.totalTransactions}</td>
                              <td className={`px-6 py-3.5 text-right font-semibold ${dm ? 'text-leaf-400' : 'text-leaf-600'}`}>{formatIDR(c.totalSpend)}</td>
                            </tr>
                          ))}
                          {customers.length === 0 && (
                            <tr>
                              <td colSpan={5} className={`px-6 py-8 text-center ${t2}`}>No customer records available.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* INVENTORY TAB */}
          {reportTab === 'inventory' && (
            <>
              {viewMode === 'visual' ? (
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
                          <p className={`font-semibold text-leaf-500`}>{formatIDR(p.revenue)}</p>
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
              ) : (
                <div className="space-y-6">
                  {/* Classic Table: All Products Performance Ranking */}
                  <div className={`rounded-2xl border overflow-hidden ${surface}`}>
                    <div className="px-6 py-4 border-b border-inherit">
                      <h3 className={`font-semibold text-base ${t1}`}>Product Sales Performance (Classic View)</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className={`border-b ${dm ? 'bg-ink-800 border-ink-700 text-ink-400' : 'bg-ink-50 border-ink-200 text-ink-500'}`}>
                          <tr>
                            <th className="px-6 py-3.5 font-semibold">Rank</th>
                            <th className="px-6 py-3.5 font-semibold">Product Name</th>
                            <th className="px-6 py-3.5 font-semibold text-right">Units Sold</th>
                            <th className="px-6 py-3.5 font-semibold text-right">Total Revenue</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${divider}`}>
                          {productPerformance.map((p, idx) => (
                            <tr key={p.name} className={`transition-colors ${dm ? 'hover:bg-ink-700/30' : 'hover:bg-ink-50'}`}>
                              <td className={`px-6 py-3.5 font-bold ${idx < 3 ? 'text-brand-500' : t2}`}>#{idx + 1}</td>
                              <td className={`px-6 py-3.5 font-medium ${t1}`}>{p.name}</td>
                              <td className={`px-6 py-3.5 text-right ${t1}`}>{p.qty}</td>
                              <td className={`px-6 py-3.5 text-right font-semibold ${dm ? 'text-leaf-400' : 'text-leaf-600'}`}>{formatIDR(p.revenue)}</td>
                            </tr>
                          ))}
                          {productPerformance.length === 0 && (
                            <tr>
                              <td colSpan={4} className={`px-6 py-8 text-center ${t2}`}>No product sales records in this period.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Classic Table: Category Breakdown */}
                  <div className={`rounded-2xl border overflow-hidden ${surface}`}>
                    <div className="px-6 py-4 border-b border-inherit">
                      <h3 className={`font-semibold text-base ${t1}`}>Category Revenue Breakdown</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className={`border-b ${dm ? 'bg-ink-800 border-ink-700 text-ink-400' : 'bg-ink-50 border-ink-200 text-ink-500'}`}>
                          <tr>
                            <th className="px-6 py-3.5 font-semibold">Category</th>
                            <th className="px-6 py-3.5 font-semibold text-right">Revenue</th>
                            <th className="px-6 py-3.5 font-semibold text-right">% Contribution</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${divider}`}>
                          {categoryContribution.map(cat => {
                            const totalCatRevenue = categoryContribution.reduce((s, c) => s + c.value, 0);
                            const share = totalCatRevenue > 0 ? Math.round((cat.value / totalCatRevenue) * 100) : 0;
                            return (
                              <tr key={cat.name} className={`transition-colors ${dm ? 'hover:bg-ink-700/30' : 'hover:bg-ink-50'}`}>
                                <td className={`px-6 py-3.5 font-medium flex items-center gap-2 ${t1}`}>
                                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                                  {cat.name}
                                </td>
                                <td className={`px-6 py-3.5 text-right font-semibold ${dm ? 'text-leaf-400' : 'text-leaf-600'}`}>{formatIDR(cat.value)}</td>
                                <td className={`px-6 py-3.5 text-right ${t2}`}>{share}%</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* STAFF TAB */}
          {reportTab === 'staff' && (
            <div className="space-y-6">
              {viewMode === 'visual' && staffPerformance.length > 0 && (
                <div className={`p-5 rounded-2xl border ${surface}`}>
                  <h3 className={`font-semibold mb-6 ${t1}`}>Staff Revenue Comparison</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={staffPerformance} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={dm ? '#373C4E' : '#DADDE5'} vertical={false} />
                        <XAxis dataKey="name" stroke={dm ? '#8D93A5' : '#646A7E'} fontSize={12} tickLine={false} />
                        <YAxis stroke={dm ? '#8D93A5' : '#646A7E'} fontSize={12} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(val: number) => formatIDR(val)} />
                        <Bar dataKey="sales" fill="#3445AB" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className={`rounded-2xl border overflow-hidden ${surface}`}>
                <div className="px-6 py-4 border-b border-inherit">
                  <h3 className={`font-semibold text-base ${t1}`}>Cashier Performance Leaderboard</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className={`border-b ${dm ? 'bg-ink-800 border-ink-700 text-ink-400' : 'bg-ink-50 border-ink-200 text-ink-500'}`}>
                      <tr>
                        <th className="px-6 py-4 font-semibold">Cashier Name</th>
                        <th className="px-6 py-4 font-semibold">Total Revenue</th>
                        <th className="px-6 py-4 font-semibold">Transactions</th>
                        <th className="px-6 py-4 font-semibold">Average Transaction Value (ATV)</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${divider}`}>
                      {staffPerformance.map(staff => (
                        <tr key={staff.name} className={`transition-colors ${dm ? 'hover:bg-ink-700/30' : 'hover:bg-ink-50'}`}>
                          <td className={`px-6 py-4 font-medium ${t1}`}>{staff.name}</td>
                          <td className={`px-6 py-4 font-semibold ${dm ? 'text-leaf-400' : 'text-leaf-600'}`}>{formatIDR(staff.sales)}</td>
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
              </div>
            </div>
          )}

          {/* FINANCIAL TAB */}
          {reportTab === 'financial' && (
            <div className="space-y-6">
              {viewMode === 'visual' ? (
                <div className="max-w-3xl space-y-6">
                  <div className={`p-6 rounded-2xl border ${surface}`}>
                    <h3 className={`font-semibold mb-6 text-lg ${t1}`}>Estimated P&L Snapshot</h3>
                    <div className="space-y-4 text-sm">
                      <div className={`flex justify-between pb-2 border-b border-dashed ${dm ? 'border-ink-700' : 'border-ink-200'}`}>
                        <span className={t2}>Gross Sales (Excl. Tax)</span>
                        <span className={t1}>{formatIDR(totalSales - totalTax + discountLeakage)}</span>
                      </div>
                      <div className={`flex justify-between pb-2 border-b border-dashed ${dm ? 'border-ink-700' : 'border-ink-200'}`}>
                        <span className={t2}>Discounts & Promos</span>
                        <span className="text-chili-500">-{formatIDR(discountLeakage)}</span>
                      </div>
                      <div className={`flex justify-between pb-2 border-b font-medium ${dm ? 'border-ink-700' : 'border-ink-200'}`}>
                        <span className={t1}>Net Sales</span>
                        <span className={t1}>{formatIDR(totalSales - totalTax)}</span>
                      </div>
                      <div className={`flex justify-between pb-2 border-b border-dashed ${dm ? 'border-ink-700' : 'border-ink-200'}`}>
                        <span className={t2}>Cost of Goods Sold (COGS)</span>
                        <span className="text-chili-500">-{formatIDR(totalCost)}</span>
                      </div>
                      <div className="flex justify-between pt-2 text-lg font-bold">
                        <span className={t1}>Gross Profit</span>
                        <span className="text-leaf-500">{formatIDR(grossProfit)}</span>
                      </div>
                      <div className="flex justify-end">
                        <span className={`text-xs px-2 py-1 rounded-full ${profitMargin >= 30 ? (dm ? 'bg-leaf-900/30 text-leaf-400' : 'bg-leaf-100 text-leaf-700') : (dm ? 'bg-turmeric-900/30 text-turmeric-400' : 'bg-turmeric-100 text-turmeric-700')}`}>
                          {profitMargin}% Margin
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={`p-6 rounded-2xl border ${surface}`}>
                    <h3 className={`font-semibold mb-6 text-lg ${t1}`}>Tax & Compliance</h3>
                    <div className="space-y-4 text-sm">
                      <div className={`flex justify-between items-center pb-3 border-b ${dm ? 'border-ink-700' : 'border-ink-200'}`}>
                        <div>
                          <p className={`font-medium ${t1}`}>Total Tax Collected</p>
                          <p className={`text-xs mt-0.5 ${t2}`}>To be remitted to tax authorities</p>
                        </div>
                        <span className={`text-xl font-bold ${t1}`}>{formatIDR(totalTax)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`rounded-2xl border overflow-hidden ${surface}`}>
                  <div className="px-6 py-4 border-b border-inherit">
                    <h3 className={`font-semibold text-base ${t1}`}>Financial Statement & Tax Audit (Classic Ledger View)</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className={`border-b ${dm ? 'bg-ink-800 border-ink-700 text-ink-400' : 'bg-ink-50 border-ink-200 text-ink-500'}`}>
                        <tr>
                          <th className="px-6 py-3.5 font-semibold">Account / Metric</th>
                          <th className="px-6 py-3.5 font-semibold text-right">Amount (IDR)</th>
                          <th className="px-6 py-3.5 font-semibold">Classification</th>
                          <th className="px-6 py-3.5 font-semibold">Notes</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${divider}`}>
                        <tr className={`transition-colors ${dm ? 'hover:bg-ink-700/30' : 'hover:bg-ink-50'}`}>
                          <td className={`px-6 py-3.5 font-medium ${t1}`}>Gross Sales (Catalog Price)</td>
                          <td className={`px-6 py-3.5 text-right font-medium ${t1}`}>{formatIDR(totalSales - totalTax + discountLeakage)}</td>
                          <td className={`px-6 py-3.5 ${t2}`}>Revenue</td>
                          <td className={`px-6 py-3.5 text-xs ${t2}`}>Before discounts and promos</td>
                        </tr>
                        <tr className={`transition-colors ${dm ? 'hover:bg-ink-700/30' : 'hover:bg-ink-50'}`}>
                          <td className={`px-6 py-3.5 font-medium text-chili-500`}>Discount & Points Leakage</td>
                          <td className={`px-6 py-3.5 text-right font-semibold text-chili-500`}>-{formatIDR(discountLeakage)}</td>
                          <td className={`px-6 py-3.5 ${t2}`}>Contra Revenue</td>
                          <td className={`px-6 py-3.5 text-xs ${t2}`}>Promos & loyalty redemption</td>
                        </tr>
                        <tr className={`transition-colors font-medium ${dm ? 'bg-ink-800/30' : 'bg-ink-50/50'}`}>
                          <td className={`px-6 py-3.5 ${t1}`}>Net Sales Revenue</td>
                          <td className={`px-6 py-3.5 text-right font-bold ${t1}`}>{formatIDR(totalSales - totalTax)}</td>
                          <td className={`px-6 py-3.5 ${t2}`}>Net Revenue</td>
                          <td className={`px-6 py-3.5 text-xs ${t2}`}>Recognized turnover excluding tax</td>
                        </tr>
                        <tr className={`transition-colors ${dm ? 'hover:bg-ink-700/30' : 'hover:bg-ink-50'}`}>
                          <td className={`px-6 py-3.5 font-medium text-turmeric-500`}>Cost of Goods Sold (COGS)</td>
                          <td className={`px-6 py-3.5 text-right font-semibold text-turmeric-500`}>-{formatIDR(totalCost)}</td>
                          <td className={`px-6 py-3.5 ${t2}`}>Expense / Cost</td>
                          <td className={`px-6 py-3.5 text-xs ${t2}`}>Direct product cost</td>
                        </tr>
                        <tr className={`transition-colors font-bold ${dm ? 'bg-brand-900/10' : 'bg-brand-50/50'}`}>
                          <td className={`px-6 py-3.5 text-base ${dm ? 'text-leaf-400' : 'text-leaf-600'}`}>Gross Profit</td>
                          <td className={`px-6 py-3.5 text-right text-base font-bold ${dm ? 'text-leaf-400' : 'text-leaf-600'}`}>{formatIDR(grossProfit)}</td>
                          <td className={`px-6 py-3.5 ${t1}`}>{profitMargin}% Margin</td>
                          <td className={`px-6 py-3.5 text-xs ${t2}`}>Net Sales minus COGS</td>
                        </tr>
                        <tr className={`transition-colors ${dm ? 'hover:bg-ink-700/30' : 'hover:bg-ink-50'}`}>
                          <td className={`px-6 py-3.5 font-medium ${t1}`}>Tax Remittance (PB1 / PPN)</td>
                          <td className={`px-6 py-3.5 text-right font-semibold ${t1}`}>{formatIDR(totalTax)}</td>
                          <td className={`px-6 py-3.5 ${t2}`}>Liability</td>
                          <td className={`px-6 py-3.5 text-xs ${t2}`}>Collected on behalf of tax office</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}
