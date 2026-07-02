import { useState } from 'react';
import { Search, User, Phone, Mail, Award, CreditCard, Calendar } from 'lucide-react';
import type { Customer, LoyaltySettings } from './mockData';
import { formatIDR } from './mockData';

interface CustomersViewProps {
  customers: Customer[];
  loyaltySettings: LoyaltySettings;
  darkMode: boolean;
}

export function CustomersView({ customers, loyaltySettings, darkMode }: CustomersViewProps) {
  const [search, setSearch] = useState('');
  const [filterTier, setFilterTier] = useState<string>('all');

  const filtered = customers.filter(c => 
    (c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)) &&
    (filterTier === 'all' || c.tierId === filterTier)
  );

  const dm = darkMode;
  const bg = dm ? 'bg-slate-900' : 'bg-slate-50';
  const surface = dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100';
  const t1 = dm ? 'text-slate-100' : 'text-slate-800';
  const t2 = dm ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`flex flex-col h-full ${bg}`}>
      <div className="p-4 sm:p-6 pb-4 shrink-0 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className={`text-xl sm:text-2xl font-bold ${t1}`}>CRM & Loyalty</h1>
          <p className={`text-sm mt-1 ${t2}`}>Manage customer profiles and points</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border flex-1 sm:w-64 focus-within:ring-2 focus-within:ring-blue-500 transition-shadow ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <Search size={16} className={t2} />
            <input
              type="text"
              placeholder="Search name or phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`bg-transparent outline-none w-full text-sm ${t1} placeholder:text-slate-400`}
            />
          </div>
          <select 
            value={filterTier} 
            onChange={e => setFilterTier(e.target.value)}
            className={`px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-blue-500 ${dm ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'}`}
          >
            <option value="all">All Tiers</option>
            {loyaltySettings.tiers?.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button 
            onClick={() => alert(`Campaign sent to ${filtered.length} customers in segment!`)} 
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shrink-0"
          >
            <Mail size={16} /> Campaign
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-6">
        <div className={`rounded-2xl border shadow-sm overflow-hidden ${surface}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className={`border-b text-left ${dm ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
                  <th className={`px-4 py-3 font-semibold ${t2}`}>Customer</th>
                  <th className={`px-4 py-3 font-semibold ${t2}`}>Tier</th>
                  <th className={`px-4 py-3 font-semibold ${t2}`}>Contact</th>
                  <th className={`px-4 py-3 font-semibold ${t2}`}>Points Balance</th>
                  <th className={`px-4 py-3 font-semibold ${t2}`}>Total Spend</th>
                  <th className={`px-4 py-3 font-semibold ${t2}`}>Joined</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${dm ? 'divide-slate-700' : 'divide-slate-100'}`}>
                {filtered.map(c => (
                  <tr key={c.id} className={`transition-colors ${dm ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${dm ? 'bg-slate-700 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                          <User size={16} />
                        </div>
                        <span className={`font-semibold ${t1}`}>{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {c.tierId ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 capitalize">
                          {loyaltySettings.tiers?.find(t => t.id === c.tierId)?.name || c.tierId}
                        </span>
                      ) : (
                        <span className={`text-xs ${t2}`}>-</span>
                      )}
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
                        <span className={`font-medium ${c.pointsBalance > 0 ? 'text-amber-600 dark:text-amber-400' : t1}`}>
                          {c.pointsBalance.toLocaleString('id-ID')} pts
                        </span>
                      </div>
                      {loyaltySettings.enabled && c.pointsBalance > 0 && (
                        <div className={`text-[10px] mt-0.5 ${t2}`}>
                          Value: {formatIDR(c.pointsBalance * loyaltySettings.redemptionValue)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <CreditCard size={14} className={t2} />
                        <span className={`font-medium ${t1}`}>{formatIDR(c.totalSpend)}</span>
                      </div>
                    </td>
                    <td className={`px-4 py-3 ${t2}`}>
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} />
                        {new Date(c.registrationDate).toLocaleDateString('en-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className={`px-4 py-8 text-center ${t2}`}>
                      No customers found matching "{search}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
