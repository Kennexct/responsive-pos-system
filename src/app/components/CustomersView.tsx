import { useState, useMemo } from 'react';
import { Search, User, Phone, Mail, Award, CreditCard, Calendar, MessageCircle, X, ChevronRight, Tag, Users, CheckCircle } from 'lucide-react';
import type { Customer, LoyaltySettings, RecentOrder } from './mockData';
import { formatIDR } from './mockData';

interface CustomersViewProps {
  customers: Customer[];
  loyaltySettings: LoyaltySettings;
  darkMode: boolean;
  orders: RecentOrder[];
}

// Simple Helper to calculate RFM Segment
function getRFMSegment(c: Customer): string {
  if (c.totalSpend > 5000000 && c.totalTransactions > 10) return 'Champion';
  if (c.totalTransactions > 5 && c.lastPurchaseDate) return 'Loyal';
  if (c.totalTransactions === 1) return 'New';
  if (c.totalTransactions === 0) return 'Registered (No Purchase)';
  return 'At Risk';
}

export function CustomersView({ customers, loyaltySettings, darkMode, orders }: CustomersViewProps) {
  const [activeTab, setActiveTab] = useState<'directory' | 'segments'>('directory');
  const [search, setSearch] = useState('');
  const [filterTier, setFilterTier] = useState<string>('all');
  
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCampaignModal, setShowCampaignModal] = useState<boolean>(false);
  const [segmentFilter, setSegmentFilter] = useState<string>('all');

  const customersWithRFM = useMemo(() => customers.map(c => ({ ...c, rfmSegment: getRFMSegment(c) })), [customers]);

  const filteredDirectory = customersWithRFM.filter(c => 
    (c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)) &&
    (filterTier === 'all' || c.tierId === filterTier)
  );

  const segmentedCustomers = customersWithRFM.filter(c => {
    if (segmentFilter === 'all') return true;
    if (segmentFilter === 'champion') return c.rfmSegment === 'Champion';
    if (segmentFilter === 'at-risk') return c.rfmSegment === 'At Risk';
    if (segmentFilter === 'high-spender') return c.averageTransactionValue > 200000;
    return true;
  });

  const dm = darkMode;
  const bg = dm ? 'bg-slate-900' : 'bg-slate-50';
  const surface = dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100';
  const t1 = dm ? 'text-slate-100' : 'text-slate-800';
  const t2 = dm ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`flex flex-col h-full w-full ${bg}`}>
      <div className="w-full max-w-7xl mx-auto flex flex-col h-full">
        {/* Header & Tabs */}
        <div className="p-4 sm:p-6 pb-2 shrink-0">
          <h1 className={`text-2xl font-bold ${t1} mb-4`}>CRM & Loyalty</h1>
          <div className={`flex gap-2 overflow-x-auto pb-2 border-b ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
            <button
              onClick={() => setActiveTab('directory')}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-xl transition-colors whitespace-nowrap ${activeTab === 'directory' ? (dm ? 'bg-blue-900/20 text-blue-400 border-b-2 border-blue-500' : 'bg-blue-50 text-blue-700 border-b-2 border-blue-600') : (dm ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100')}`}
            >
              Customer Directory
            </button>
            <button
              onClick={() => setActiveTab('segments')}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-xl transition-colors whitespace-nowrap ${activeTab === 'segments' ? (dm ? 'bg-blue-900/20 text-blue-400 border-b-2 border-blue-500' : 'bg-blue-50 text-blue-700 border-b-2 border-blue-600') : (dm ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100')}`}
            >
              Segmentation & Campaigns
            </button>
          </div>
        </div>

        {activeTab === 'directory' ? (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="px-4 sm:px-6 py-4 shrink-0 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex gap-3 w-full sm:w-auto">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border w-full sm:w-72 ${dm ? 'bg-slate-800 border-slate-700 focus-within:border-slate-600' : 'bg-white border-slate-200 focus-within:border-slate-300'}`}>
                  <Search size={18} className={t2} />
                  <input
                    type="text"
                    placeholder="Search by name or phone..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className={`bg-transparent border-none outline-none text-sm w-full ${t1} placeholder:text-slate-400`}
                  />
                </div>
                <select
                  value={filterTier}
                  onChange={e => setFilterTier(e.target.value)}
                  className={`text-sm px-3 py-2 rounded-xl border outline-none ${dm ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}
                >
                  <option value="all">All Tiers</option>
                  {loyaltySettings.tiers?.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-6">
              <div className={`rounded-2xl border shadow-sm overflow-hidden ${surface}`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm whitespace-nowrap">
                    <thead>
                      <tr className={`border-b text-left ${dm ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
                        <th className={`px-4 py-3 font-semibold ${t2}`}>Customer</th>
                        <th className={`px-4 py-3 font-semibold ${t2}`}>Tier & Segment</th>
                        <th className={`px-4 py-3 font-semibold ${t2}`}>Contact</th>
                        <th className={`px-4 py-3 font-semibold ${t2}`}>Points</th>
                        <th className={`px-4 py-3 font-semibold ${t2}`}>Behavioral Stats</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${dm ? 'divide-slate-700' : 'divide-slate-100'}`}>
                      {filteredDirectory.map(c => (
                        <tr key={c.id} onClick={() => setSelectedCustomer(c)} className={`cursor-pointer transition-colors ${dm ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${dm ? 'bg-slate-700 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                                <User size={16} />
                              </div>
                              <div className="flex flex-col">
                                <span className={`font-semibold ${t1}`}>{c.name}</span>
                                {c.tags && c.tags.length > 0 && (
                                  <div className="flex gap-1 mt-0.5">
                                    {c.tags.map(t => <span key={t} className={`px-1.5 py-0.5 rounded text-[10px] ${dm ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700'}`}>{t}</span>)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1 items-start">
                              {c.tierId ? (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${dm ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-800'}`}>
                                  {loyaltySettings.tiers?.find(t => t.id === c.tierId)?.name || c.tierId}
                                </span>
                              ) : <span className={`text-xs ${t2}`}>-</span>}
                              <span className={`text-xs font-medium px-2 py-0.5 rounded ${dm ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-800'}`}>{c.rfmSegment}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className={`flex flex-col gap-1 ${t2}`}>
                              <span className="flex items-center gap-1.5"><Phone size={12} /> {c.phone}</span>
                              {c.email && <span className="flex items-center gap-1.5"><Mail size={12} /> {c.email}</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <Award size={14} className={c.pointsBalance > 0 ? 'text-amber-500' : t2} />
                              <span className={`font-medium ${c.pointsBalance > 0 ? (dm ? 'text-amber-400' : 'text-amber-600') : t1}`}>
                                {c.pointsBalance.toLocaleString('id-ID')} pts
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className={`flex flex-col gap-1 ${t2} text-xs`}>
                              <span>Spend: <strong className={t1}>{formatIDR(c.totalSpend)}</strong></span>
                              <span>Txns: <strong className={t1}>{c.totalTransactions}</strong> (ATV: {formatIDR(c.averageTransactionValue || 0)})</span>
                              {c.lastPurchaseDate && <span>Last: {new Date(c.lastPurchaseDate).toLocaleDateString()}</span>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden px-4 sm:px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-full">
              {/* Segments Sidebar */}
              <div className={`col-span-1 rounded-2xl border p-4 ${surface} flex flex-col gap-2`}>
                <h3 className={`font-semibold ${t1} mb-2`}>Dynamic Segments</h3>
                
                {[
                  { id: 'all', label: 'All Customers', desc: 'The entire database' },
                  { id: 'champion', label: 'Champions', desc: 'High spend, high frequency' },
                  { id: 'high-spender', label: 'High Spenders', desc: 'ATV > Rp 200,000' },
                  { id: 'at-risk', label: 'At Risk', desc: 'No recent activity' },
                ].map(s => (
                  <button 
                    key={s.id} 
                    onClick={() => setSegmentFilter(s.id)}
                    className={`flex flex-col text-left p-3 rounded-xl transition-colors border ${segmentFilter === s.id ? (dm ? 'border-blue-500 bg-blue-900/20' : 'border-blue-500 bg-blue-50') : (dm ? 'border-transparent hover:bg-slate-700/50' : 'border-transparent hover:bg-slate-100')}`}
                  >
                    <span className={`font-medium text-sm ${segmentFilter === s.id ? (dm ? 'text-blue-400' : 'text-blue-700') : t1}`}>{s.label}</span>
                    <span className={`text-xs ${segmentFilter === s.id ? (dm ? 'text-blue-300' : 'text-blue-500') : t2}`}>{s.desc}</span>
                  </button>
                ))}
              </div>

              {/* Segment Results */}
              <div className={`col-span-1 md:col-span-3 flex flex-col rounded-2xl border overflow-hidden ${surface}`}>
                <div className={`p-4 border-b flex justify-between items-center ${dm ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
                  <div>
                    <h3 className={`font-semibold ${t1}`}>Segment Audience</h3>
                    <p className={`text-sm ${t2}`}>{segmentedCustomers.length} customers matched</p>
                  </div>
                  <button 
                    onClick={() => setShowCampaignModal(true)}
                    disabled={segmentedCustomers.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                  >
                    <MessageCircle size={16} /> New Campaign
                  </button>
                </div>
                <div className="p-4 flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {segmentedCustomers.map(c => (
                    <div key={c.id} className={`p-3 rounded-xl border flex items-center gap-3 ${dm ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}>
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <User size={18} />
                      </div>
                      <div className="flex-col flex flex-1 min-w-0">
                        <span className={`text-sm font-medium truncate ${t1}`}>{c.name}</span>
                        <span className={`text-xs truncate ${t2}`}>{c.phone}</span>
                      </div>
                    </div>
                  ))}
                  {segmentedCustomers.length === 0 && (
                    <div className={`col-span-full py-10 text-center ${t2}`}>
                      No customers match this segment.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedCustomer && (
        <CustomerDetailsModal 
          customer={selectedCustomer} 
          orders={orders.filter(o => o.customerId === selectedCustomer.id)}
          darkMode={darkMode}
          onClose={() => setSelectedCustomer(null)}
        />
      )}

      {showCampaignModal && (
        <CampaignModal
          darkMode={darkMode}
          customersCount={segmentedCustomers.length}
          onClose={() => setShowCampaignModal(false)}
        />
      )}
    </div>
  );
}

// Subcomponents

function CustomerDetailsModal({ customer, orders, darkMode, onClose }: { customer: Customer, orders: RecentOrder[], darkMode: boolean, onClose: () => void }) {
  const dm = darkMode;
  const surface = dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100';
  const t1 = dm ? 'text-slate-100' : 'text-slate-800';
  const t2 = dm ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
      <div className={`w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right ${dm ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <div className={`p-4 border-b flex items-center justify-between sticky top-0 z-10 ${surface}`}>
          <h2 className={`font-semibold ${t1}`}>Customer Details</h2>
          <button onClick={onClose} className={`p-2 rounded-full ${dm ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} ${t2}`}>
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          <div className="flex flex-col items-center text-center mb-8">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${dm ? 'bg-slate-800 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
              <User size={40} />
            </div>
            <h3 className={`text-xl font-bold ${t1}`}>{customer.name}</h3>
            <p className={`${t2}`}>{customer.phone}</p>
            {customer.marketingConsent && (
              <span className={`mt-2 px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${dm ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-800'}`}>
                <CheckCircle size={12} /> Marketing Opt-In
              </span>
            )}
          </div>

          <h4 className={`font-semibold mb-3 ${t1}`}>Transaction History ({orders.length})</h4>
          <div className="space-y-3">
            {orders.length === 0 ? (
              <p className={`text-sm ${t2}`}>No transactions recorded yet.</p>
            ) : (
              orders.map(o => (
                <div key={o.id} className={`p-3 rounded-xl border flex flex-col gap-2 ${surface}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className={`text-sm font-medium ${t1}`}>{o.orderNumber}</span>
                      <span className={`text-xs block ${t2}`}>{new Date(o.createdAt).toLocaleString()}</span>
                    </div>
                    <span className={`text-sm font-bold ${dm ? 'text-blue-400' : 'text-blue-600'}`}>{formatIDR(o.total)}</span>
                  </div>
                  <div className={`text-xs flex gap-2 ${t2}`}>
                    {o.pointsEarned ? <span className="text-amber-500">+{o.pointsEarned} pts</span> : null}
                    {o.pointsRedeemed ? <span className="text-amber-500">-{o.pointsRedeemed} pts</span> : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CampaignModal({ darkMode, customersCount, onClose }: { darkMode: boolean, customersCount: number, onClose: () => void }) {
  const [msg, setMsg] = useState('Enjoy a special 20% off this weekend! Show this message at checkout.');
  const [sent, setSent] = useState(false);
  
  const dm = darkMode;
  const surface = dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100';
  const t1 = dm ? 'text-slate-100' : 'text-slate-800';
  const t2 = dm ? 'text-slate-400' : 'text-slate-500';

  if (sent) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className={`w-full max-w-sm rounded-2xl p-6 text-center shadow-2xl ${surface}`}>
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} />
          </div>
          <h2 className={`text-xl font-bold ${t1} mb-2`}>Campaign Sent!</h2>
          <p className={`${t2} mb-6`}>Message successfully broadcasted to {customersCount} customers via WhatsApp integration.</p>
          <button onClick={onClose} className={`w-full py-3 font-medium rounded-xl ${dm ? 'bg-slate-100 text-slate-900' : 'bg-slate-900 text-white'}`}>
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className={`w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden ${surface}`}>
        <div className={`p-4 border-b flex items-center justify-between ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
          <h2 className={`font-semibold ${t1} flex items-center gap-2`}><MessageCircle size={18} className="text-emerald-500"/> Broadcast Campaign</h2>
          <button onClick={onClose} className={`p-1.5 rounded-full ${dm ? 'hover:bg-slate-700' : 'hover:bg-slate-100'} ${t2}`}>
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          <div className={`mb-4 flex items-center gap-3 p-3 rounded-xl border ${dm ? 'border-blue-900/30 bg-blue-900/10' : 'border-blue-100 bg-blue-50'}`}>
            <Users size={20} className="text-blue-500" />
            <div className="flex flex-col">
              <span className={`text-sm font-semibold ${t1}`}>Target Audience</span>
              <span className={`text-xs ${t2}`}>{customersCount} customers selected</span>
            </div>
          </div>
          <label className={`block text-sm font-medium mb-2 ${t1}`}>WhatsApp Message</label>
          <textarea
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            className={`w-full p-3 rounded-xl border outline-none text-sm resize-none h-32 ${dm ? 'bg-slate-900 border-slate-700 focus:border-slate-500 text-slate-200' : 'bg-slate-50 border-slate-200 focus:border-slate-400 text-slate-800'}`}
          />
        </div>
        <div className={`p-4 border-t flex justify-end gap-3 ${dm ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
          <button onClick={onClose} className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${dm ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-200 text-slate-700'}`}>
            Cancel
          </button>
          <button onClick={() => setSent(true)} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2">
            Send Broadcast
          </button>
        </div>
      </div>
    </div>
  );
}
