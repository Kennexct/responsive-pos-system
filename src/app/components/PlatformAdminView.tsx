import React, { useState, useMemo } from 'react';
import { IS_LOCAL_DEMO } from '../lib/auth';
import { 
  Building2, Users, CreditCard, ShieldCheck, ShieldAlert, Calendar, CheckCircle2, 
  XCircle, Clock, Search, Filter, RefreshCw, Key, Mail, Edit3, ArrowRight, 
  DollarSign, Activity, FileText, ChevronRight, Lock, Eye, Download
} from 'lucide-react';
import type { MerchantAccount, SubscriptionPlan, SubscriptionStatus, RecentOrder, User } from './mockData';
import { formatIDR } from './mockData';

interface Props {
  merchants: MerchantAccount[];
  setMerchants: React.Dispatch<React.SetStateAction<MerchantAccount[]>>;
  orders: RecentOrder[];
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  darkMode: boolean;
  onImpersonateMerchant: (merchantId: string) => void;
}

export function PlatformAdminView({
  merchants,
  setMerchants,
  orders,
  users,
  setUsers,
  darkMode: dm,
  onImpersonateMerchant,
}: Props) {
  const [activeTab, setActiveTab] = useState<'merchants' | 'audit'>('merchants');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SubscriptionStatus>('all');
  const [planFilter, setPlanFilter] = useState<'all' | SubscriptionPlan>('all');

  // Selected merchant for Drawer / Modal
  const [selectedMerchant, setSelectedMerchant] = useState<MerchantAccount | null>(null);
  const [drawerMode, setDrawerMode] = useState<'subscription' | 'credentials' | 'audit' | null>(null);

  // Forms in Drawer
  const [editOwnerName, setEditOwnerName] = useState('');
  const [editOwnerEmail, setEditOwnerEmail] = useState('');
  const [editOwnerPin, setEditOwnerPin] = useState('');
  const [editStoreName, setEditStoreName] = useState('');
  const [customExpiryDate, setCustomExpiryDate] = useState('');
  const [selectedPlanChange, setSelectedPlanChange] = useState<SubscriptionPlan>('monthly');

  // Filtered merchants
  const filteredMerchants = useMemo(() => {
    return merchants.filter(m => {
      const matchSearch = 
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchStatus = statusFilter === 'all' || m.subscriptionStatus === statusFilter;
      const matchPlan = planFilter === 'all' || m.subscriptionPlan === planFilter;
      return matchSearch && matchStatus && matchPlan;
    });
  }, [merchants, searchTerm, statusFilter, planFilter]);

  // Platform Metrics
  const totalMerchants = merchants.length;
  const activeMerchants = merchants.filter(m => m.subscriptionStatus === 'active' && m.isEnabled).length;
  const trialMerchants = merchants.filter(m => m.subscriptionStatus === 'trial' && m.isEnabled).length;
  const expiredOrSuspended = merchants.filter(m => m.subscriptionStatus === 'expired' || m.subscriptionStatus === 'suspended' || !m.isEnabled).length;
  const totalGrossVolume = orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.total, 0);

  // Styling helper classes (IBM Carbon dense style)
  const bgMain = dm ? 'bg-[#0F1118]' : 'bg-[#ECEEF2]';
  const cardBg = dm ? 'bg-[#181B25] border-[#373C4E]' : 'bg-white border-[#DADDE5]';
  const headerBg = dm ? 'bg-[#181B25] border-[#373C4E]' : 'bg-white border-[#DADDE5]';
  const textPrimary = dm ? 'text-ink-100' : 'text-ink-900';
  const textSecondary = dm ? 'text-ink-400' : 'text-ink-600';
  const inputClass = `w-full px-3 py-2 text-xs border rounded transition-colors focus:outline-none focus:ring-1 focus:ring-brand-500 ${
    dm ? 'bg-[#0F1118] border-[#373C4E] text-ink-100' : 'bg-white border-[#DADDE5] text-ink-900'
  }`;

  // Open drawer
  const openDrawer = (merchant: MerchantAccount, mode: 'subscription' | 'credentials' | 'audit') => {
    setSelectedMerchant(merchant);
    setDrawerMode(mode);
    setEditOwnerName(merchant.ownerName);
    setEditOwnerEmail(merchant.email);
    setEditOwnerPin('');
    setEditStoreName(merchant.name);
    setSelectedPlanChange(merchant.subscriptionPlan);
    setCustomExpiryDate(merchant.subscriptionExpiresAt ? merchant.subscriptionExpiresAt.slice(0, 10) : '');
  };

  // Close drawer
  const closeDrawer = () => {
    setSelectedMerchant(null);
    setDrawerMode(null);
  };

  // Action: Toggle Enabled (Kill-switch)
  const handleToggleEnable = (merchantId: string, currentStatus: boolean) => {
    setMerchants(prev => prev.map(m => {
      if (m.id === merchantId) {
        return {
          ...m,
          isEnabled: !currentStatus,
          subscriptionStatus: !currentStatus ? (new Date() > new Date(m.subscriptionExpiresAt) ? 'expired' : 'active') : 'suspended'
        };
      }
      return m;
    }));
  };

  // Action: Extend subscription by N days
  const handleExtendDays = (days: number) => {
    if (!selectedMerchant) return;
    const baseDate = new Date(selectedMerchant.subscriptionExpiresAt) > new Date()
      ? new Date(selectedMerchant.subscriptionExpiresAt)
      : new Date();
    
    const newExpiry = new Date(baseDate.getTime() + days * 86400000).toISOString();
    
    setMerchants(prev => prev.map(m => {
      if (m.id === selectedMerchant.id) {
        return {
          ...m,
          subscriptionExpiresAt: newExpiry,
          subscriptionStatus: 'active',
          isEnabled: true,
          subscriptionPlan: selectedPlanChange
        };
      }
      return m;
    }));
    closeDrawer();
  };

  // Action: Save custom expiry & plan
  const handleSaveSubscriptionDetails = () => {
    if (!selectedMerchant) return;
    const newExpiryIso = customExpiryDate ? new Date(customExpiryDate).toISOString() : selectedMerchant.subscriptionExpiresAt;
    const isPast = new Date(newExpiryIso) < new Date();

    setMerchants(prev => prev.map(m => {
      if (m.id === selectedMerchant.id) {
        return {
          ...m,
          subscriptionPlan: selectedPlanChange,
          subscriptionExpiresAt: newExpiryIso,
          subscriptionStatus: isPast ? 'expired' : 'active',
        };
      }
      return m;
    }));
    closeDrawer();
  };

  // Action: Save Credentials (Email, PIN, Owner Name, Store Name)
  const handleSaveCredentials = () => {
    if (!selectedMerchant) return;
    setMerchants(prev => prev.map(m => {
      if (m.id === selectedMerchant.id) {
        return {
          ...m,
          name: editStoreName.trim() || m.name,
          ownerName: editOwnerName.trim() || m.ownerName,
          email: editOwnerEmail.trim() || m.email,
          ownerPin: editOwnerPin.trim() || m.ownerPin,
        };
      }
      return m;
    }));

    // Synchronize to users state
    setUsers(prev => prev.map(u => {
      if (u.merchantId === selectedMerchant.id && u.role === 'owner') {
        return {
          ...u,
          name: editOwnerName.trim() || u.name,
          email: editOwnerEmail.trim() || u.email,
          pin: editOwnerPin.trim() || u.pin,
          businessName: editStoreName.trim() || u.businessName
        };
      }
      return u;
    }));

    closeDrawer();
  };

  // Status Badge Component
  const renderStatusBadge = (status: SubscriptionStatus, isEnabled: boolean) => {
    if (!isEnabled) {
      return (
        <span className="px-2 py-0.5 text-[11px] font-semibold roundedr bg-chili-500/10 text-chili-500 border border-chili-500/20">
          Disabled
        </span>
      );
    }
    switch (status) {
      case 'active':
        return (
          <span className="px-2 py-0.5 text-[11px] font-semibold roundedr bg-leaf-500/10 text-leaf-500 border border-leaf-500/20">
            Active
          </span>
        );
      case 'trial':
        return (
          <span className="px-2 py-0.5 text-[11px] font-semibold roundedr bg-brand-500/10 text-brand-500 border border-brand-500/20">
            Trial
          </span>
        );
      case 'expired':
        return (
          <span className="px-2 py-0.5 text-[11px] font-semibold roundedr bg-turmeric-500/10 text-turmeric-500 border border-turmeric-500/20">
            Expired
          </span>
        );
      case 'suspended':
      default:
        return (
          <span className="px-2 py-0.5 text-[11px] font-semibold roundedr bg-ink-500/10 text-ink-400 border border-ink-500/20">
            Suspended
          </span>
        );
    }
  };

  return (
    <div className={`flex-1 flex flex-col h-full overflow-hidden ${bgMain}`}>
      {/* Top Header */}
      <header className={`px-6 py-4 border-b flex items-center justify-between ${headerBg}`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-brand-600 text-white text-[10px] font-bold roundedr">
              Super Admin Console
            </span>
            <h1 className={`text-xl font-bold tracking-tight ${textPrimary}`}>
              Platform Management & Merchant Subscriptions
            </h1>
          </div>
          <p className={`text-xs mt-0.5 ${textSecondary}`}>
            Centralized multi-tenant license authority, validity adjuster, owner credential manager & raw audit viewer
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('merchants')}
            className={`px-3 py-1.5 text-xs font-semibold rounded border transition-colors flex items-center gap-1.5 ${
              activeTab === 'merchants'
                ? 'bg-brand-600 text-white border-brand-600'
                : dm ? 'border-[#373C4E] text-ink-300 hover:bg-[#181B25]' : 'border-[#DADDE5] text-ink-700 hover:bg-ink-100'
            }`}
          >
            <Building2 size={14} />
            Merchants ({totalMerchants})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 text-xs font-semibold rounded border transition-colors flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'bg-brand-600 text-white border-brand-600'
                : dm ? 'border-[#373C4E] text-ink-300 hover:bg-[#181B25]' : 'border-[#DADDE5] text-ink-700 hover:bg-ink-100'
            }`}
          >
            <FileText size={14} />
            Raw Orders Audit
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* KPI Platform Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className={`p-4 rounded-lg border ${cardBg}`}>
            <span className={`text-[11px] font-semiboldr ${textSecondary}`}>Total Merchants</span>
            <div className={`text-2xl font-bold mt-1 ${textPrimary}`}>{totalMerchants}</div>
            <span className="text-[11px] text-brand-500 font-medium mt-1 inline-block">Registered Outlets</span>
          </div>
          <div className={`p-4 rounded-lg border ${cardBg}`}>
            <span className={`text-[11px] font-semiboldr ${textSecondary}`}>Active Subscriptions</span>
            <div className="text-2xl font-bold mt-1 text-leaf-500">{activeMerchants}</div>
            <span className="text-[11px] text-leaf-600 font-medium mt-1 inline-block">Licensed & Running</span>
          </div>
          <div className={`p-4 rounded-lg border ${cardBg}`}>
            <span className={`text-[11px] font-semiboldr ${textSecondary}`}>Free Trial Stores</span>
            <div className="text-2xl font-bold mt-1 text-brand-400">{trialMerchants}</div>
            <span className="text-[11px] text-brand-500 font-medium mt-1 inline-block">14-Day Evaluation</span>
          </div>
          <div className={`p-4 rounded-lg border ${cardBg}`}>
            <span className={`text-[11px] font-semiboldr ${textSecondary}`}>Expired / Suspended</span>
            <div className="text-2xl font-bold mt-1 text-turmeric-500">{expiredOrSuspended}</div>
            <span className="text-[11px] text-turmeric-600 font-medium mt-1 inline-block">Needs Extension</span>
          </div>
          <div className={`p-4 rounded-lg border ${cardBg}`}>
            <span className={`text-[11px] font-semiboldr ${textSecondary}`}>Total Platform Volume</span>
            <div className={`text-2xl font-bold mt-1 text-brand-500 truncate`}>{formatIDR(totalGrossVolume)}</div>
            <span className="text-[11px] text-brand-400 font-medium mt-1 inline-block">All Time Gross GMV</span>
          </div>
        </div>

        {/* Tab 1: Merchants Management Table */}
        {activeTab === 'merchants' && (
          <div className={`rounded-lg border overflow-hidden ${cardBg}`}>
            {/* Filter bar */}
            <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 ${dm ? 'border-[#373C4E]' : 'border-[#DADDE5]'}`}>
              <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    type="text"
                    placeholder="Search by store name, owner, email, or merchant ID..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className={`${inputClass} pl-8`}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 text-xs">
                  <Filter size={13} className="text-ink-400" />
                  <span className={textSecondary}>Status:</span>
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as any)}
                    className={inputClass}
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="trial">Trial</option>
                    <option value="expired">Expired</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                <div className="flex items-center gap-1 text-xs">
                  <span className={textSecondary}>Plan:</span>
                  <select
                    value={planFilter}
                    onChange={e => setPlanFilter(e.target.value as any)}
                    className={inputClass}
                  >
                    <option value="all">All Plans</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="lifetime">Lifetime</option>
                    <option value="trial">Trial</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Merchant Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className={`border-b ${dm ? 'bg-[#181B25] border-[#373C4E] text-ink-400' : 'bg-ink-50 border-[#DADDE5] text-ink-600'} font-semiboldr text-[11px]`}>
                    <th className="p-3">Merchant / Store</th>
                    <th className="p-3">Owner Credentials</th>
                    <th className="p-3">Plan</th>
                    <th className="p-3">Subscription Expiry</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Kill-Switch</th>
                    <th className="p-3 text-right">Administrative Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${dm ? 'divide-[#373C4E]' : 'divide-[#DADDE5]'}`}>
                  {filteredMerchants.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-ink-400">
                        No merchants found matching your search and filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredMerchants.map(merchant => {
                      const isExpired = new Date(merchant.subscriptionExpiresAt) < new Date();
                      const daysRemaining = Math.ceil(
                        (new Date(merchant.subscriptionExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                      );

                      return (
                        <tr key={merchant.id} className={`transition-colors ${dm ? 'hover:bg-[#181B25]/50' : 'hover:bg-ink-50'}`}>
                          {/* Store Info */}
                          <td className="p-3">
                            <div className="font-semibold text-sm text-brand-500 hover:underline cursor-pointer" onClick={() => openDrawer(merchant, 'subscription')}>
                              {merchant.name}
                            </div>
                            <div className="font-mono text-[10px] text-ink-400 mt-0.5">
                              ID: {merchant.id} • {merchant.type.toUpperCase()}
                            </div>
                          </td>

                          {/* Owner Credentials */}
                          <td className="p-3">
                            <div className={`font-medium ${textPrimary}`}>{merchant.ownerName}</div>
                            <div className="text-ink-400 font-mono text-[11px]">{merchant.email}</div>
                            
                          </td>

                          {/* Plan */}
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded font-medium text-[11px] capitalize bg-brand-600/10 text-brand-500 border border-brand-600/20">
                              {merchant.subscriptionPlan}
                            </span>
                          </td>

                          {/* Expiry */}
                          <td className="p-3 font-mono">
                            <div className={isExpired ? 'text-chili-500 font-semibold' : textPrimary}>
                              {new Date(merchant.subscriptionExpiresAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </div>
                            <div className={`text-[10px] ${isExpired ? 'text-chili-400' : daysRemaining <= 7 ? 'text-turmeric-500' : 'text-ink-400'}`}>
                              {isExpired ? `Expired ${Math.abs(daysRemaining)} days ago` : `${daysRemaining} days left`}
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td className="p-3">
                            {renderStatusBadge(merchant.subscriptionStatus, merchant.isEnabled)}
                          </td>

                          {/* Kill-switch toggle */}
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() => handleToggleEnable(merchant.id, merchant.isEnabled)}
                              className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                                merchant.isEnabled
                                  ? 'bg-leaf-500/10 text-leaf-600 hover:bg-leaf-500/20 border border-leaf-500/30'
                                  : 'bg-chili-500/10 text-chili-600 hover:bg-chili-500/20 border border-chili-500/30'
                              }`}
                            >
                              {merchant.isEnabled ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                              {merchant.isEnabled ? 'Enabled' : 'Disabled'}
                            </button>
                          </td>

                          {/* Action Buttons */}
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openDrawer(merchant, 'subscription')}
                                title="Adjust Subscription"
                                className="px-2.5 py-1 rounded bg-brand-600 text-white text-xs font-medium hover:bg-brand-700 transition-colors flex items-center gap-1"
                              >
                                <Calendar size={12} />
                                Adjust Sub
                              </button>
                              <button
                                onClick={() => openDrawer(merchant, 'credentials')}
                                title="Change Owner Credentials"
                                className={`p-1.5 rounded border transition-colors ${dm ? 'border-[#373C4E] text-ink-300 hover:bg-[#181B25]' : 'border-[#DADDE5] text-ink-700 hover:bg-ink-100'}`}
                              >
                                <Key size={13} />
                              </button>
                              <button
                                onClick={() => onImpersonateMerchant(merchant.id)}
                                title="Impersonate / Login As Store"
                                className={`px-2 py-1 rounded border text-[11px] font-medium transition-colors flex items-center gap-1 ${
                                  dm ? 'border-[#373C4E] text-ink-300 hover:bg-[#181B25]' : 'border-[#DADDE5] text-ink-700 hover:bg-ink-100'
                                }`}
                              >
                                <ArrowRight size={12} />
                                Login POS
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Raw Orders Audit Log */}
        {activeTab === 'audit' && (
          <div className={`rounded-lg border overflow-hidden ${cardBg}`}>
            <div className={`p-4 border-b flex items-center justify-between ${dm ? 'border-[#373C4E]' : 'border-[#DADDE5]'}`}>
              <div>
                <h3 className={`text-sm font-bold ${textPrimary}`}>Platform Raw Transaction Ledger</h3>
                <p className={`text-xs ${textSecondary}`}>Real-time audit log of sales records, line items, and payment settlements</p>
              </div>
              <span className="text-xs font-mono text-ink-400">Total Records: {orders.length}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className={`border-b ${dm ? 'bg-[#181B25] border-[#373C4E] text-ink-400' : 'bg-ink-50 border-[#DADDE5] text-ink-600'} font-semiboldr text-[11px]`}>
                    <th className="p-3">Order Number</th>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Items / Units</th>
                    <th className="p-3">Payment</th>
                    <th className="p-3">Subtotal</th>
                    <th className="p-3">Discount</th>
                    <th className="p-3">Tax</th>
                    <th className="p-3 font-bold">Total Settled</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${dm ? 'divide-[#373C4E]' : 'divide-[#DADDE5]'}`}>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-ink-400">
                        No transactions found in the ledger.
                      </td>
                    </tr>
                  ) : (
                    orders.map(order => (
                      <tr key={order.id} className={`transition-colors ${dm ? 'hover:bg-[#181B25]/50' : 'hover:bg-ink-50'}`}>
                        <td className="p-3 font-mono font-bold text-brand-500">{order.orderNumber}</td>
                        <td className="p-3 text-ink-400 font-mono text-[11px]">
                          {new Date(order.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                        </td>
                        <td className="p-3">
                          <span className="font-semibold">{order.itemCount} items</span>
                          {order.items && order.items.length > 0 && (
                            <div className="text-[10px] text-ink-400 truncate max-w-xs">
                              {order.items.map(i => `${i.qty}x ${i.product.name}${i.variant ? ` (${i.variant.name})` : ''}`).join(', ')}
                            </div>
                          )}
                        </td>
                        <td className="p-3 capitalize">
                          <span className="font-mono text-xs">{order.paymentMethod}</span>
                          {order.splitPaymentMethod && (
                            <span className="text-[10px] text-ink-400 block">+ {order.splitPaymentMethod}</span>
                          )}
                        </td>
                        <td className="p-3 font-mono">{formatIDR(order.subtotalBeforeDiscount || order.subtotal)}</td>
                        <td className="p-3 font-mono text-leaf-500">
                          {order.discountTotal ? `-${formatIDR(order.discountTotal)}` : '-'}
                        </td>
                        <td className="p-3 font-mono">{formatIDR(order.tax)}</td>
                        <td className="p-3 font-mono font-bold text-brand-500">{formatIDR(order.total)}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-boldr ${
                            order.status === 'completed'
                              ? 'bg-leaf-500/10 text-leaf-500 border border-leaf-500/20'
                              : 'bg-turmeric-500/10 text-turmeric-500 border border-turmeric-500/20'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Subscription Adjustment Drawer / Modal */}
      {selectedMerchant && drawerMode === 'subscription' && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-xl border shadow-2xl p-6 space-y-4 ${cardBg}`}>
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className={`text-base font-bold ${textPrimary}`}>Adjust Subscription License</h3>
                <p className="text-xs text-ink-400 font-mono">{selectedMerchant.name} ({selectedMerchant.id})</p>
              </div>
              <button onClick={closeDrawer} className="text-ink-400 hover:text-ink-200">
                <XCircle size={20} />
              </button>
            </div>

            {/* Current status display */}
            <div className={`p-3 rounded-lg border text-xs space-y-1.5 ${dm ? 'bg-[#0F1118] border-[#373C4E]' : 'bg-ink-50 border-ink-200'}`}>
              <div className="flex justify-between">
                <span className={textSecondary}>Current Status:</span>
                <span className="font-semibold">{renderStatusBadge(selectedMerchant.subscriptionStatus, selectedMerchant.isEnabled)}</span>
              </div>
              <div className="flex justify-between">
                <span className={textSecondary}>Current Expiry:</span>
                <span className="font-mono font-semibold">
                  {new Date(selectedMerchant.subscriptionExpiresAt).toLocaleDateString('id-ID', { dateStyle: 'full' })}
                </span>
              </div>
            </div>

            {/* Quick Extension Buttons */}
            <div>
              <label className={`block text-xs font-semibold mb-2 ${textSecondary}`}>Quick Add Validity</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleExtendDays(30)}
                  className="px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded text-xs font-semibold transition-colors"
                >
                  +1 Month (30d)
                </button>
                <button
                  type="button"
                  onClick={() => handleExtendDays(90)}
                  className="px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded text-xs font-semibold transition-colors"
                >
                  +3 Months (90d)
                </button>
                <button
                  type="button"
                  onClick={() => handleExtendDays(365)}
                  className="px-3 py-2 bg-leaf-600 hover:bg-leaf-700 text-white rounded text-xs font-semibold transition-colors"
                >
                  +1 Year (365d)
                </button>
              </div>
            </div>

            {/* Custom Plan & Custom Date Form */}
            <div className="space-y-3 pt-2 border-t border-ink-200 dark:border-ink-800">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${textSecondary}`}>Subscription Plan</label>
                <select
                  value={selectedPlanChange}
                  onChange={e => setSelectedPlanChange(e.target.value as SubscriptionPlan)}
                  className={inputClass}
                >
                  <option value="monthly">Monthly Subscription</option>
                  <option value="yearly">Yearly Subscription</option>
                  <option value="lifetime">Lifetime License</option>
                  <option value="trial">14-Day Free Trial</option>
                </select>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${textSecondary}`}>Specific Expiry Date</label>
                <input
                  type="date"
                  value={customExpiryDate}
                  onChange={e => setCustomExpiryDate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Save / Cancel */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={closeDrawer}
                className={`flex-1 py-2 rounded text-xs font-semibold border ${dm ? 'border-[#373C4E] text-ink-300' : 'border-ink-300 text-ink-700'}`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSubscriptionDetails}
                className="flex-1 py-2 rounded text-xs font-semibold bg-brand-600 text-white hover:bg-brand-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Owner Credentials Drawer / Modal */}
      {selectedMerchant && drawerMode === 'credentials' && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-xl border shadow-2xl p-6 space-y-4 ${cardBg}`}>
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className={`text-base font-bold ${textPrimary}`}>Owner Account & Credentials</h3>
                <p className="text-xs text-ink-400 font-mono">Merchant: {selectedMerchant.id}</p>
              </div>
              <button onClick={closeDrawer} className="text-ink-400 hover:text-ink-200">
                <XCircle size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${textSecondary}`}>Store Name</label>
                <input
                  type="text"
                  value={editStoreName}
                  onChange={e => setEditStoreName(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${textSecondary}`}>Owner Full Name</label>
                <input
                  type="text"
                  value={editOwnerName}
                  onChange={e => setEditOwnerName(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${textSecondary}`}>Owner Email Address</label>
                <input
                  type="email"
                  value={editOwnerEmail}
                  onChange={e => setEditOwnerEmail(e.target.value)}
                  className={inputClass}
                />
              </div>

              {IS_LOCAL_DEMO && (
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${textSecondary}`}>Reset owner PIN (offline demo only)</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    value={editOwnerPin}
                    onChange={e => setEditOwnerPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Leave empty to keep"
                    className={`${inputClass} tracking-widest text-sm`}
                  />
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-2 border-t border-ink-200 dark:border-ink-800">
              <button
                type="button"
                onClick={closeDrawer}
                className={`flex-1 py-2 rounded text-xs font-semibold border ${dm ? 'border-[#373C4E] text-ink-300' : 'border-ink-300 text-ink-700'}`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCredentials}
                className="flex-1 py-2 rounded text-xs font-semibold bg-brand-600 text-white hover:bg-brand-700"
              >
                Update Credentials
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
