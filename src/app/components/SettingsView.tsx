import { useState, type ElementType } from 'react';
import { Store, DollarSign, Receipt, CreditCard, Users, Plus, Trash2, Check, X, Shield, Moon, Sun, Percent, RefreshCcw, Award, Tag } from 'lucide-react';
import type { BusinessType, User, RolePermissions, ViewType, Role, Category, DiscountSettings, RefundSettings, PromoCode, LoyaltySettings, TaxRule, TerminalViewMode, PaymentMethodEntry } from './mockData';
import { ConfirmationModal } from './ConfirmationModal';

interface SettingsViewProps {
  currentUser?: User;
  businessType: BusinessType;
  onBusinessTypeChange: (t: BusinessType) => void;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  permissions: RolePermissions;
  setPermissions: React.Dispatch<React.SetStateAction<RolePermissions>>;
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  products: Product[];
  discountSettings: DiscountSettings;
  setDiscountSettings: React.Dispatch<React.SetStateAction<DiscountSettings>>;
  refundSettings: RefundSettings;
  setRefundSettings: React.Dispatch<React.SetStateAction<RefundSettings>>;
  loyaltySettings: LoyaltySettings;
  setLoyaltySettings: React.Dispatch<React.SetStateAction<LoyaltySettings>>;
  darkMode: boolean;
  onToggleDark: () => void;
  taxRules?: TaxRule[];
  setTaxRules?: React.Dispatch<React.SetStateAction<TaxRule[]>>;
  paymentMethods: PaymentMethodEntry[];
  setPaymentMethods: React.Dispatch<React.SetStateAction<PaymentMethodEntry[]>>;
  terminalViewMode?: TerminalViewMode;
  setTerminalViewMode?: React.Dispatch<React.SetStateAction<TerminalViewMode>>;
  bizName: string;    setBizName: (v: string) => void;
  bizPhone: string;   setBizPhone: (v: string) => void;
  bizAddress: string; setBizAddress: (v: string) => void;
  bizEmail: string;   setBizEmail: (v: string) => void;
}

type SettingsTab = 'business' | 'currency' | 'tax' | 'discounts' | 'loyalty' | 'refunds' | 'payments' | 'users' | 'categories';

const TABS: { id: SettingsTab; label: string; icon: ElementType }[] = [
  { id: 'business',  label: 'Business Profile', icon: Store      },
  { id: 'users',     label: 'Staff & Roles',    icon: Users      },
  { id: 'categories',label: 'Categories',       icon: Tag        },
  { id: 'payments',  label: 'Payment Methods',  icon: CreditCard },
  { id: 'tax',       label: 'Taxes',            icon: Receipt    },
  { id: 'currency',  label: 'Currency',         icon: DollarSign },
  { id: 'discounts', label: 'Promos & Discounts', icon: Percent    },
  { id: 'loyalty',   label: 'Loyalty Program',  icon: Award      },
  { id: 'refunds',   label: 'Refunds & Voids',  icon: RefreshCcw },
];

interface TaxRate            { id: string; name: string; rate: number; inclusive: boolean; isDefault: boolean; }

export function SettingsView({
  businessType, onBusinessTypeChange,
  users, setUsers,
  permissions, setPermissions,
  categories, setCategories,
  products,
  discountSettings, setDiscountSettings,
  refundSettings, setRefundSettings,
  loyaltySettings, setLoyaltySettings,
  taxRules = [], setTaxRules,
  paymentMethods, setPaymentMethods,
  terminalViewMode = 'grid', setTerminalViewMode,
  darkMode, onToggleDark,
  bizName, setBizName, bizPhone, setBizPhone, bizAddress, setBizAddress, bizEmail, setBizEmail,
}: SettingsViewProps) {
  const [tab,      setTab]      = useState<SettingsTab>('business');
  const [saved,    setSaved]    = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  
  // Currency state
  const [displayCurrency, setDisplayCurrency] = useState('');
  const [exchangeRate, setExchangeRate] = useState('');

  // Promo code modal
  const [promoModal, setPromoModal] = useState(false);
  const [editingPromoCodeId, setEditingPromoCodeId] = useState<string | null>(null);
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoType, setNewPromoType] = useState<'percent'|'nominal'>('percent');
  const [newPromoValue, setNewPromoValue] = useState('');
  const [newPromoActiveDate, setNewPromoActiveDate] = useState('');
  const [newPromoExpiryDate, setNewPromoExpiryDate] = useState('');
  const [newPromoMinSpend, setNewPromoMinSpend] = useState('');
  const [newPromoCategories, setNewPromoCategories] = useState<string[]>([]);
  const [newPromoCannotCombine, setNewPromoCannotCombine] = useState(false);

  // Tax modal
  const [taxModal, setTaxModal] = useState(false);
  const [editingTaxId, setEditingTaxId] = useState<string | null>(null);
  const [newTaxName, setNewTaxName] = useState('');
  const [newTaxRate, setNewTaxRate] = useState('');
  const [newTaxInclusive, setNewTaxInclusive] = useState(false);

  // User modal
  const [userModal, setUserModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newUser, setNewUser] = useState<Partial<User>>({});

  const [categoryModal, setCategoryModal] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryDeleteError, setCategoryDeleteError] = useState('');

  const ROLES: Role[] = ['owner', 'manager', 'cashier'];
  const VIEWS: { id: ViewType; label: string }[] = [
    { id: 'pos',         label: 'POS' },
    { id: 'dashboard',   label: 'Dashboard' },
    { id: 'daily-sales', label: 'Daily Sales' },
    { id: 'inventory',   label: 'Inventory' },
    { id: 'reports',     label: 'Reports' },
    { id: 'customers',   label: 'Customers' },
    { id: 'settings',    label: 'Settings' }
  ];

  const handleSave = () => {
    if (currentUser?.role !== 'owner') {
      setConfirmSave(false);
      return alert("Only owners can modify settings.");
    }
    if (loyaltySettings.enabled && loyaltySettings.earnRateSpend <= 0) {
      setConfirmSave(false);
      return alert("Earn Rate Spend must be greater than 0.");
    }
    setConfirmSave(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const togglePayment = (id: string) => setPaymentMethods(prev => prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));
  const toggleCategoryTax = (id: string) => setCategories(prev => prev.map(c => c.id === id ? { ...c, isTaxable: !c.isTaxable } : c));

  const saveTax = () => {
    if (!newTaxName || !newTaxRate) return;
    if (setTaxRules) {
      if (editingTaxId) {
        setTaxRules(prev => prev.map(t => t.id === editingTaxId ? { ...t, name: newTaxName, rate: Number(newTaxRate), isInclusive: newTaxInclusive } : t));
      } else {
        setTaxRules(prev => [...prev, {
          id: Date.now().toString(),
          name: newTaxName,
          rate: Number(newTaxRate),
          isInclusive: newTaxInclusive,
          order: prev.length + 1
        }]);
      }
    }
    setTaxModal(false); setEditingTaxId(null); setNewTaxName(''); setNewTaxRate(''); setNewTaxInclusive(false);
  };

  const savePromo = () => {
    if (!newPromoCode || !newPromoValue) return;
    if (newPromoType === 'percent' && Number(newPromoValue) > 100) {
      return alert("Discount percentage cannot exceed 100%");
    }
    const isDuplicate = discountSettings.promoCodes.some(p => p.code === newPromoCode.toUpperCase() && p.id !== editingPromoCodeId);
    if (isDuplicate) return alert("Promo code already exists.");
    if (editingPromoCodeId) {
      setDiscountSettings(prev => ({
        ...prev,
        promoCodes: prev.promoCodes.map(p => p.id === editingPromoCodeId ? {
          ...p,
          code: newPromoCode.toUpperCase(),
          type: newPromoType,
          value: Number(newPromoValue),
          activeDate: newPromoActiveDate || undefined,
          expiryDate: newPromoExpiryDate || undefined,
          minSpend: newPromoMinSpend ? Number(newPromoMinSpend) : undefined,
          categories: newPromoCategories.length > 0 ? newPromoCategories : undefined,
          cannotCombine: newPromoCannotCombine
        } : p)
      }));
    } else {
      const newPromo: PromoCode = {
        id: Date.now().toString(),
        code: newPromoCode.toUpperCase(),
        type: newPromoType,
        value: Number(newPromoValue),
        active: true,
        activeDate: newPromoActiveDate || undefined,
        expiryDate: newPromoExpiryDate || undefined,
        minSpend: newPromoMinSpend ? Number(newPromoMinSpend) : undefined,
        categories: newPromoCategories.length > 0 ? newPromoCategories : undefined,
        cannotCombine: newPromoCannotCombine
      };
      setDiscountSettings(prev => ({ ...prev, promoCodes: [...prev.promoCodes, newPromo] }));
    }
    setPromoModal(false); setEditingPromoCodeId(null); setNewPromoCode(''); setNewPromoValue(''); setNewPromoActiveDate(''); setNewPromoExpiryDate(''); setNewPromoMinSpend(''); setNewPromoCategories([]); setNewPromoCannotCombine(false);
  };
  const deletePromo = (id: string) => setDiscountSettings(prev => ({ ...prev, promoCodes: prev.promoCodes.filter(p => p.id !== id) }));
  const togglePromo = (id: string) => setDiscountSettings(prev => ({ ...prev, promoCodes: prev.promoCodes.map(p => p.id === id ? { ...p, active: !p.active } : p) }));

  const openUserModal = (u?: User) => {
    if (u) { setEditingUserId(u.id); setNewUser(u); }
    else { setEditingUserId(null); setNewUser({ name: '', role: 'cashier', pin: '' }); }
    setUserModal(true);
  };

  const saveUser = () => {
    if (!newUser.name || !newUser.pin) return;
    if (editingUserId) {
      const existingUser = users.find(u => u.id === editingUserId);
      if (existingUser?.role === 'owner' && newUser.role !== 'owner') {
        const ownerCount = users.filter(u => u.role === 'owner').length;
        if (ownerCount <= 1) return alert("Cannot change role of the last owner.");
      }
      setUsers(users.map(u => u.id === editingUserId ? { ...u, ...newUser } as User : u));
    } else {
      setUsers([...users, { id: Date.now().toString(), name: newUser.name, role: newUser.role || 'cashier', pin: newUser.pin }]);
    }
    setUserModal(false);
  };

  const deleteUser = (id: string) => {
    if (users.length <= 1) return alert('Cannot delete the last user.');
    const userToDelete = users.find(u => u.id === id);
    if (userToDelete?.role === 'owner') {
      const ownerCount = users.filter(u => u.role === 'owner').length;
      if (ownerCount <= 1) return alert("Cannot delete the last owner account.");
    }
    if (window.confirm(`Are you sure you want to delete ${userToDelete?.name}?`)) {
      setUsers(users.filter(u => u.id !== id));
    }
  };

  const togglePermission = (role: Role, view: ViewType) => {
    if (role === 'owner') return; // Owner always has all
    setPermissions(prev => {
      const perms = prev[role];
      return { ...prev, [role]: perms.includes(view) ? perms.filter(v => v !== view) : [...perms, view] };
    });
  };

  const dm = darkMode;
  const bg      = dm ? 'bg-slate-900' : 'bg-slate-50';
  const surface = dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100';
  const t1      = dm ? 'text-slate-100' : 'text-slate-800';
  const t2      = dm ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`flex-1 overflow-y-auto w-full ${bg}`}>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <h1 className={`mb-6 text-xl sm:text-2xl font-bold ${t1}`}>Settings</h1>

        <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-start">
          {/* Sidebar navigation */}
          <nav className="w-full sm:w-64 shrink-0 flex flex-col gap-4">
            <div className={`flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0 scrollbar-none`}>
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={[
                    'flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap sm:w-full transition-colors text-left',
                    tab === t.id
                      ? 'bg-blue-600 text-white'
                      : dm ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'text-slate-500 hover:bg-white hover:text-slate-700 hover:shadow-sm'
                  ].join(' ')}
                >
                  <t.icon size={16} className={tab === t.id ? 'text-white/80' : ''} />
                  {t.label}
                </button>
              ))}
              
              <button
                onClick={onToggleDark}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm whitespace-nowrap sm:w-full transition-colors text-left font-medium ml-2 pl-3 border-l sm:ml-0 sm:pl-3 sm:border-l-0 sm:border-t sm:mt-2 sm:pt-3 ${dm ? 'border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'border-slate-200 text-slate-500 hover:bg-white hover:text-slate-700'}`}
              >
                {dm ? <Sun size={16} className="shrink-0" /> : <Moon size={16} className="shrink-0" />}
                {dm ? 'Light Mode' : 'Dark Mode'}
              </button>
            </div>
          </nav>

          {/* Content panel */}
          <div className={`flex-1 w-full rounded-2xl shadow-sm border p-5 ${surface}`}>

            {/* ── Business ── */}
            {tab === 'business' && (
              <div className="space-y-4">
                <h3 className={t1}>Business Profile</h3>
                <div>
                  <label className={`text-sm block mb-1 ${t2}`}>Business Type</label>
                  <div className={`flex border rounded-xl overflow-hidden w-fit ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
                    {(['retail', 'fnb'] as BusinessType[]).map(t => (
                      <button key={t} onClick={() => onBusinessTypeChange(t)} className={`px-5 py-2.5 text-sm font-medium capitalize transition-colors ${businessType === t ? 'bg-blue-600 text-white' : dm ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                        {t === 'fnb' ? 'F&B' : 'Retail'}
                      </button>
                    ))}
                  </div>
                  <p className={`text-xs mt-1 ${t2}`}>
                    {businessType === 'fnb' ? 'F&B mode enables order types and table notes.' : 'Retail mode hides F&B-specific options.'}
                  </p>
                </div>
                <div>
                  <label className={`text-sm block mb-1 ${t2}`}>Terminal View Mode</label>
                  <div className={`flex border rounded-xl overflow-hidden w-fit ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
                    {(['grid', 'scanner'] as TerminalViewMode[]).map(mode => (
                      <button key={mode} onClick={() => setTerminalViewMode?.(mode)} className={`px-5 py-2.5 text-sm font-medium capitalize transition-colors ${terminalViewMode === mode ? 'bg-blue-600 text-white' : dm ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                        {mode === 'grid' ? 'Grid (F&B)' : 'Scanner (Retail)'}
                      </button>
                    ))}
                  </div>
                  <p className={`text-xs mt-1 ${t2}`}>
                    Scanner mode hides the visual product grid for faster barcode checkout.
                  </p>
                </div>
                <Field label="Business Name"  value={bizName}    onChange={setBizName}    darkMode={dm} />
                <Field label="Phone"          value={bizPhone}   onChange={setBizPhone}   darkMode={dm} type="tel" />
                <Field label="Email"          value={bizEmail}   onChange={setBizEmail}   darkMode={dm} type="email" />
                <Field label="Address"        value={bizAddress} onChange={setBizAddress} darkMode={dm} />
                <SaveButton darkMode={darkMode} onSave={() => setConfirmSave(true)} saved={saved} />
              </div>
            )}

            {/* ── Currency ── */}
            {tab === 'currency' && (
              <div className="space-y-4">
                <h3 className={t1}>Currency Settings</h3>
                <div className={`border rounded-xl p-3 text-sm ${dm ? 'bg-blue-900/20 border-blue-800/40 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                  Base currency is set once at onboarding and cannot be changed later (v1).
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[['Base Currency', 'IDR — Indonesian Rupiah'], ['Symbol', 'Rp']].map(([l, v]) => (
                    <div key={l}>
                      <label className={`text-sm block mb-1 ${t2}`}>{l}</label>
                      <div className={`border rounded-xl px-4 py-3 text-sm ${dm ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>{v}</div>
                    </div>
                  ))}
                </div>
                <Field label="Display Currency (optional)" value={displayCurrency} onChange={setDisplayCurrency} placeholder="e.g. USD" darkMode={dm} />
                <Field label="Exchange Rate (manual)" value={exchangeRate} onChange={setExchangeRate} type="number" placeholder="e.g. 16000" darkMode={dm} />
                <p className={`text-xs ${t2}`}>Rate is entered manually — no live FX in v1.</p>
                <SaveButton darkMode={darkMode} onSave={() => setConfirmSave(true)} saved={saved} />
              </div>
            )}

            {/* ── Tax ── */}
            {tab === 'tax' && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={t1}>Tax Rates</h3>
                    <button onClick={() => setTaxModal(true)} className={`flex items-center gap-1.5 text-sm text-blue-600 border px-3 py-1.5 rounded-lg transition-colors font-medium ${dm ? 'border-blue-800 hover:bg-blue-900/20' : 'border-blue-200 hover:bg-blue-50'}`}>
                      <Plus size={14} /> Add Rate
                    </button>
                  </div>
                  {taxRules.length === 0
                    ? <p className={`text-sm text-center py-4 ${t2}`}>No tax rules yet.</p>
                    : taxRules.sort((a, b) => a.order - b.order).map(rate => (
                      <div key={rate.id} className={`border rounded-xl p-4 flex items-center justify-between gap-3 ${dm ? 'border-slate-700' : 'border-slate-200'} mb-2`}>
                        <div>
                          <p className={`text-sm font-semibold ${t1}`}>{rate.name}</p>
                          <p className={`text-xs mt-0.5 ${t2}`}>{rate.rate}% · {rate.isInclusive ? 'Inclusive' : 'Exclusive'} · Stack Order: {rate.order}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => {
                            setEditingTaxId(rate.id);
                            setNewTaxName(rate.name);
                            setNewTaxRate(rate.rate.toString());
                            setNewTaxInclusive(rate.isInclusive);
                            setTaxModal(true);
                          }} className={`transition-colors px-3 py-1 text-xs font-medium rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50`}>
                            Edit
                          </button>
                          <button onClick={() => {
                            if (setTaxRules) setTaxRules(prev => prev.filter(t => t.id !== rate.id));
                          }} className={`transition-colors px-3 py-1 text-xs font-medium rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50`}>
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  }
                </div>

                <div className={`border-t pt-6 ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
                  <h3 className={`mb-2 ${t1}`}>Category Taxes</h3>
                  <p className={`text-sm mb-4 ${t2}`}>Select which product categories are subject to the default tax rate.</p>
                  
                  <div className="grid gap-2">
                    {categories.filter(c => c.id !== 'cat-all').map(cat => (
                      <div key={cat.id} className={`flex items-center justify-between border rounded-xl px-4 py-3 ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
                        <span className={`text-sm font-medium ${t1}`}>{cat.name}</span>
                        <Toggle darkMode={darkMode} checked={cat.isTaxable} onChange={() => toggleCategoryTax(cat.id)} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Discounts ── */}
            {tab === 'discounts' && (
              <div className="space-y-6">
                <div>
                  <h3 className={`mb-2 ${t1}`}>Discount Settings</h3>
                  <div className={`flex items-center justify-between border rounded-xl px-4 py-3 mb-2 ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
                    <div>
                      <span className={`text-sm font-medium block ${t1}`}>Enable All Discounts</span>
                      <span className={`text-xs ${t2}`}>Master switch for discount features.</span>
                    </div>
                    <Toggle darkMode={darkMode} checked={discountSettings.enabled} onChange={() => setDiscountSettings(prev => ({...prev, enabled: !prev.enabled}))} />
                  </div>
                  <div className={`flex items-center justify-between border rounded-xl px-4 py-3 ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
                    <div>
                      <span className={`text-sm font-medium block ${t1}`}>Allow Item-Level Discounts</span>
                      <span className={`text-xs ${t2}`}>Allow cashiers to apply ad-hoc discounts to specific items.</span>
                    </div>
                    <Toggle darkMode={darkMode} 
                      checked={discountSettings.allowItemDiscount} 
                      onChange={() => setDiscountSettings(prev => ({...prev, allowItemDiscount: !prev.allowItemDiscount}))} 
                    />
                  </div>
                </div>

                <div className={`border-t pt-6 ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={t1}>Promo Codes</h3>
                    <button onClick={() => setPromoModal(true)} className={`flex items-center gap-1.5 text-sm text-blue-600 border px-3 py-1.5 rounded-lg transition-colors font-medium ${dm ? 'border-blue-800 hover:bg-blue-900/20' : 'border-blue-200 hover:bg-blue-50'}`}>
                      <Plus size={14} /> Add Code
                    </button>
                  </div>
                  {discountSettings.promoCodes.length === 0
                    ? <p className={`text-sm text-center py-4 ${t2}`}>No promo codes added.</p>
                    : discountSettings.promoCodes.map(promo => (
                      <div key={promo.id} className={`border rounded-xl p-4 flex items-center justify-between gap-3 ${dm ? 'border-slate-700' : 'border-slate-200'} mb-2`}>
                        <div>
                          <p className={`text-sm font-bold uppercase tracking-wider ${t1}`}>{promo.code}</p>
                          <p className={`text-xs mt-0.5 ${t2}`}>
                            {promo.type === 'percent' ? `${promo.value}% Off Total` : `Rp ${promo.value.toLocaleString('id-ID')} Off Total`}
                          </p>
                          {(promo.activeDate || promo.expiryDate || promo.minSpend) && (
                            <div className={`mt-2 flex flex-wrap gap-2 text-[10px] ${t2}`}>
                              {promo.activeDate && <span className={`px-1.5 py-0.5 rounded ${dm ? 'bg-slate-700' : 'bg-slate-100'}`}>From: {promo.activeDate}</span>}
                              {promo.expiryDate && <span className={`px-1.5 py-0.5 rounded ${dm ? 'bg-slate-700' : 'bg-slate-100'}`}>Until: {promo.expiryDate}</span>}
                              {promo.minSpend && <span className={`px-1.5 py-0.5 rounded ${dm ? 'bg-slate-700' : 'bg-slate-100'}`}>Min Spend: {promo.minSpend.toLocaleString('id-ID')}</span>}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <Toggle darkMode={darkMode} checked={promo.active} onChange={() => togglePromo(promo.id)} />
                          <button onClick={() => {
                            setEditingPromoCodeId(promo.id);
                            setNewPromoCode(promo.code);
                            setNewPromoType(promo.type);
                            setNewPromoValue(promo.value.toString());
                            setNewPromoActiveDate(promo.activeDate || '');
                            setNewPromoExpiryDate(promo.expiryDate || '');
                            setNewPromoMinSpend(promo.minSpend?.toString() || '');
                            setNewPromoCategories(promo.categories || []);
                            setNewPromoCannotCombine(promo.cannotCombine || false);
                            setPromoModal(true);
                          }} className={`transition-colors px-3 py-1 text-xs font-medium rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50`}>
                            Edit
                          </button>
                          <button onClick={() => deletePromo(promo.id)} className={`transition-colors px-3 py-1 text-xs font-medium rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50`}>
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  }
                </div>
                <SaveButton darkMode={darkMode} onSave={() => setConfirmSave(true)} saved={saved} />
              </div>
            )}

            {/* ── Loyalty ── */}
            {tab === 'loyalty' && (
              <div className="space-y-6">
                <div>
                  <h3 className={t1}>Loyalty Program</h3>
                  <p className={`text-sm mb-4 ${t2}`}>Configure points earning and redemption rules.</p>
                  
                  <div className={`flex items-center justify-between border rounded-xl px-4 py-3 mb-4 ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
                    <div>
                      <span className={`text-sm font-medium block ${t1}`}>Enable Loyalty Program</span>
                      <span className={`text-xs ${t2}`}>Allow customers to earn and redeem points.</span>
                    </div>
                    <Toggle darkMode={darkMode} checked={loyaltySettings.enabled} onChange={() => setLoyaltySettings(prev => ({...prev, enabled: !prev.enabled}))} />
                  </div>

                  {loyaltySettings.enabled && (
                    <div className="space-y-4">
                      <div>
                        <label className={`text-sm block mb-1 font-medium ${t1}`}>Earn Rate</label>
                        <div className="flex items-center gap-3">
                          <span className={`text-sm ${t2}`}>Spend Rp</span>
                          <input type="number" value={loyaltySettings.earnRateSpend} onChange={e => setLoyaltySettings(prev => ({...prev, earnRateSpend: Number(e.target.value)}))} className={`w-28 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 ${dm ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`} />
                          <span className={`text-sm ${t2}`}>=</span>
                          <input type="number" value={loyaltySettings.earnRatePoints} onChange={e => setLoyaltySettings(prev => ({...prev, earnRatePoints: Number(e.target.value)}))} className={`w-20 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 ${dm ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`} />
                          <span className={`text-sm ${t2}`}>Points</span>
                        </div>
                      </div>
                      
                      <div>
                        <label className={`text-sm block mb-1 font-medium ${t1}`}>Redemption Value</label>
                        <div className="flex items-center gap-3">
                          <span className={`text-sm ${t2}`}>1 Point = Rp</span>
                          <input type="number" value={loyaltySettings.redemptionValue} onChange={e => setLoyaltySettings(prev => ({...prev, redemptionValue: Number(e.target.value)}))} className={`w-28 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 ${dm ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`} />
                        </div>
                      </div>

                      <div className={`mt-6 pt-6 border-t ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className={`font-semibold ${t1}`}>Membership Tiers</h4>
                            <p className={`text-sm ${t2}`}>Configure tiers based on customer's total spend.</p>
                          </div>
                          <button onClick={() => setLoyaltySettings(prev => ({...prev, tiers: [...(prev.tiers || []), {id: Date.now().toString(), name: 'New Tier', minSpend: 0, discountPercent: 0}]}))} className={`flex items-center gap-1.5 text-sm text-blue-600 border px-3 py-1.5 rounded-lg transition-colors font-medium ${dm ? 'border-blue-800 hover:bg-blue-900/20' : 'border-blue-200 hover:bg-blue-50'}`}>
                            <Plus size={14} /> Add Tier
                          </button>
                        </div>
                        
                        <div className="space-y-3">
                          {(loyaltySettings.tiers || []).map((tier, index) => (
                            <div key={tier.id} className={`p-4 border rounded-xl flex flex-wrap gap-4 items-end ${dm ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}`}>
                              <div className="flex-1 min-w-[120px]">
                                <label className={`text-xs block mb-1 font-medium ${t2}`}>Tier Name</label>
                                <input type="text" value={tier.name} onChange={e => {
                                  const newTiers = [...(loyaltySettings.tiers || [])];
                                  newTiers[index].name = e.target.value;
                                  setLoyaltySettings(prev => ({...prev, tiers: newTiers}));
                                }} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 ${dm ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`} />
                              </div>
                              <div className="flex-1 min-w-[120px]">
                                <label className={`text-xs block mb-1 font-medium ${t2}`}>Min. Spend (Rp)</label>
                                <input type="number" value={tier.minSpend} onChange={e => {
                                  const newTiers = [...(loyaltySettings.tiers || [])];
                                  newTiers[index].minSpend = Number(e.target.value);
                                  setLoyaltySettings(prev => ({...prev, tiers: newTiers}));
                                }} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 ${dm ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`} />
                              </div>
                              <div className="w-24">
                                <label className={`text-xs block mb-1 font-medium ${t2}`}>Discount %</label>
                                <input type="number" value={tier.discountPercent} onChange={e => {
                                  const newTiers = [...(loyaltySettings.tiers || [])];
                                  newTiers[index].discountPercent = Number(e.target.value);
                                  setLoyaltySettings(prev => ({...prev, tiers: newTiers}));
                                }} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 ${dm ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`} />
                              </div>
                              <button onClick={() => {
                                setLoyaltySettings(prev => ({...prev, tiers: (prev.tiers || []).filter((_, i) => i !== index)}));
                              }} className={`mb-1 transition-colors ${dm ? 'text-slate-600 hover:text-red-400' : 'text-slate-400 hover:text-red-600'}`}>
                                <Trash2 size={18} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <SaveButton darkMode={darkMode} onSave={() => setConfirmSave(true)} saved={saved} />
              </div>
            )}

            {/* ── Refunds & Voids ── */}
            {tab === 'refunds' && (
              <div className="space-y-4">
                <h3 className={t1}>Refunds & Voids</h3>
                <div className={`border rounded-xl p-4 text-sm ${dm ? 'bg-amber-900/20 border-amber-800/40 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Refund:</strong> Restocks items back into inventory (if tracked).</li>
                    <li><strong>Void:</strong> Cancels order without restocking items (e.g., waste).</li>
                  </ul>
                </div>
                
                <div className={`flex items-center justify-between border rounded-xl px-4 py-3 ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
                  <div>
                    <span className={`text-sm font-medium block ${t1}`}>Require Manager PIN</span>
                    <span className={`text-xs ${t2}`}>Cashiers must enter a manager's PIN to refund or void an order.</span>
                  </div>
                  <Toggle darkMode={darkMode} 
                    checked={refundSettings.managerPinRequired} 
                    onChange={() => setRefundSettings(prev => ({...prev, managerPinRequired: !prev.managerPinRequired}))} 
                  />
                </div>
                <SaveButton darkMode={darkMode} onSave={() => setConfirmSave(true)} saved={saved} />
              </div>
            )}

            {/* ── Payments ── */}
            {tab === 'payments' && (
              <div className="space-y-4">
                <h3 className={t1}>Payment Methods</h3>
                <p className={`text-sm ${t2}`}>Enable the methods available at checkout.</p>
                <div className="space-y-3">
                  {paymentMethods.map(pm => (
                    <div key={pm.id} className={`flex items-center justify-between border rounded-xl px-4 py-3 ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
                      <span className={`text-sm font-medium ${t1}`}>{pm.label}</span>
                      <Toggle darkMode={darkMode} checked={pm.enabled} onChange={() => togglePayment(pm.id)} />
                    </div>
                  ))}
                </div>
                <SaveButton darkMode={darkMode} onSave={() => setConfirmSave(true)} saved={saved} />
              </div>
            )}

            {/* ── Users ── */}
            {tab === 'categories' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`text-lg font-bold ${t1}`}>Categories</h3>
                    <p className={`text-sm ${t2}`}>Manage product categories</p>
                  </div>
                  <button onClick={() => { setEditingCategoryId(null); setNewCategoryName(''); setCategoryDeleteError(''); setCategoryModal(true); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl flex items-center gap-2">
                    <Plus size={16} /> Add Category
                  </button>
                </div>
                {categoryDeleteError && (
                  <div className="p-4 rounded-xl bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-sm">
                    {categoryDeleteError}
                  </div>
                )}
                <div className={`rounded-xl border ${surface} overflow-hidden`}>
                  <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    {categories.map(c => {
                      const count = products.filter(p => p.categoryId === c.id).length;
                      return (
                        <div key={c.id} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <div>
                            <p className={`font-semibold ${t1}`}>{c.name}</p>
                            <p className={`text-xs ${t2}`}>{count} product(s) linked</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => { setEditingCategoryId(c.id); setNewCategoryName(c.name); setCategoryDeleteError(''); setCategoryModal(true); }} className={`px-3 py-1 text-xs font-medium rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50`}>
                              Edit
                            </button>
                            <button onClick={() => {
                              if (count > 0) {
                                setCategoryDeleteError(`Cannot delete category "${c.name}" because it is linked to ${count} product(s). Reassign them first.`);
                                return;
                              }
                              if (confirm('Are you sure you want to delete this category?')) {
                                setCategories(prev => prev.filter(cat => cat.id !== c.id));
                                setCategoryDeleteError('');
                              }
                            }} className={`px-3 py-1 text-xs font-medium rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50`}>
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {tab === 'users' && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={t1}>Staff Accounts</h3>
                    <button onClick={() => openUserModal()} className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                      <Plus size={14} /> Add User
                    </button>
                  </div>
                  <div className="space-y-3">
                    {users.map(u => (
                      <div key={u.id} className={`flex items-center justify-between border rounded-xl px-4 py-3 ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
                        <div>
                          <p className={`text-sm font-semibold ${t1}`}>{u.name}</p>
                          <p className={`text-xs mt-0.5 capitalize ${t2}`}>{u.role}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => openUserModal(u)} className={`text-xs px-3 py-1.5 border rounded-lg font-medium transition-colors ${dm ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Edit</button>
                          {u.role !== 'owner' && (
                            <button onClick={() => deleteUser(u.id)} className={`transition-colors p-1.5 ${dm ? 'text-slate-600 hover:text-red-400' : 'text-slate-300 hover:text-red-400'}`}><Trash2 size={15} /></button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`border-t pt-6 ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
                  <h3 className={`mb-4 ${t1}`}>Role Permissions</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={`border-b text-left ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
                          <th className={`pb-3 font-semibold ${t2}`}>Role</th>
                          {VIEWS.map(v => <th key={v.id} className={`pb-3 font-semibold text-center ${t2}`}>{v.label}</th>)}
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${dm ? 'divide-slate-700' : 'divide-slate-100'}`}>
                        {ROLES.map(role => (
                          <tr key={role}>
                            <td className={`py-3 capitalize font-medium ${t1}`}>{role}</td>
                            {VIEWS.map(v => {
                              const has = permissions[role].includes(v.id);
                              const disabled = role === 'owner';
                              return (
                                <td key={v.id} className="py-3 text-center">
                                  <button
                                    onClick={() => togglePermission(role, v.id)}
                                    disabled={disabled}
                                    className={`w-5 h-5 rounded flex items-center justify-center mx-auto transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${has ? 'bg-blue-600 text-white' : dm ? 'border border-slate-600 text-transparent hover:border-slate-400' : 'border border-slate-300 text-transparent hover:border-slate-400'}`}
                                  >
                                    <Check size={12} className={has ? 'opacity-100' : 'opacity-0'} />
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className={`text-xs mt-3 flex items-center gap-1.5 ${t2}`}><Shield size={12} /> Owner has full access by default.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={confirmSave}
        title="Save Settings"
        message="Are you sure you want to apply these changes? Some settings may affect ongoing orders."
        confirmText="Save Changes"
        onConfirm={handleSave}
        onCancel={() => setConfirmSave(false)}
      />

      {taxModal && (
        <Modal title={editingTaxId ? "Edit Tax Rate" : "Add Tax Rate"} onClose={() => setTaxModal(false)} darkMode={dm}>
          <Field label="Tax Name" value={newTaxName} onChange={setNewTaxName} placeholder="e.g. Service Charge" darkMode={dm} />
          <Field label="Rate (%)" value={newTaxRate} onChange={setNewTaxRate} placeholder="e.g. 5" type="number" darkMode={dm} />
          <div className="flex items-center gap-2 mb-6">
            <Toggle darkMode={darkMode} checked={newTaxInclusive} onChange={() => setNewTaxInclusive(!newTaxInclusive)} />
            <span className={`text-sm ${t2}`}>Tax included in price</span>
          </div>
          <button onClick={saveTax} className="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold hover:bg-blue-700">{editingTaxId ? 'Save Tax' : 'Add Tax'}</button>
        </Modal>
      )}

      {promoModal && (
        <Modal title={editingPromoCodeId ? "Edit Promo Code" : "Add Promo Code"} onClose={() => setPromoModal(false)} darkMode={dm}>
          <Field label="Promo Code" value={newPromoCode} onChange={e => setNewPromoCode(e.toUpperCase())} placeholder="e.g. SUMMER10" darkMode={dm} />
          <div className="mb-3">
            <label className={`text-sm block mb-1 ${t2}`}>Discount Type</label>
            <div className={`flex border rounded-xl overflow-hidden ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
              {(['percent', 'nominal'] as ('percent'|'nominal')[]).map(t => (
                <button
                  key={t}
                  onClick={() => setNewPromoType(t)}
                  className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors ${newPromoType === t ? 'bg-blue-600 text-white' : dm ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <Field label="Value" value={newPromoValue} onChange={setNewPromoValue} placeholder={newPromoType === 'percent' ? "e.g. 10" : "e.g. 15000"} type="number" darkMode={dm} />
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Field label="Active Date (opt)" value={newPromoActiveDate} onChange={setNewPromoActiveDate} type="date" darkMode={dm} />
            <Field label="Expiry Date (opt)" value={newPromoExpiryDate} onChange={setNewPromoExpiryDate} type="date" darkMode={dm} />
          </div>

          <Field label="Min Spend (opt)" value={newPromoMinSpend} onChange={setNewPromoMinSpend} type="number" placeholder="e.g. 100000" darkMode={dm} />
          
          <div className="mb-4">
            <label className={`text-sm block mb-1 ${t2}`}>Applicable Categories (Empty = All)</label>
            <div className={`flex flex-wrap gap-2 border rounded-xl p-3 ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
              {categories.filter(c => c.id !== 'cat-all').map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setNewPromoCategories(prev => prev.includes(cat.id) ? prev.filter(id => id !== cat.id) : [...prev, cat.id])}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${newPromoCategories.includes(cat.id) ? 'bg-blue-600 text-white' : dm ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 mb-6">
            <Toggle darkMode={darkMode} checked={newPromoCannotCombine} onChange={() => setNewPromoCannotCombine(!newPromoCannotCombine)} />
            <span className={`text-sm ${t2}`}>Cannot combine with item discounts</span>
          </div>

          <button onClick={savePromo} className="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold hover:bg-blue-700 mt-2">{editingPromoCodeId ? 'Save Promo' : 'Add Promo'}</button>
        </Modal>
      )}

      {categoryModal && (
        <Modal title={editingCategoryId ? 'Edit Category' : 'Add Category'} onClose={() => setCategoryModal(false)} darkMode={darkMode}>
          <div className="space-y-4">
            <div>
              <label className={`block text-xs font-medium mb-1 ${t2}`}>Category Name</label>
              <input value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} className={`w-full p-2 rounded-xl border outline-none text-sm ${darkMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'}`} />
            </div>
            <button
              onClick={() => {
                if (!newCategoryName) return;
                if (editingCategoryId) {
                  setCategories(prev => prev.map(c => c.id === editingCategoryId ? { ...c, name: newCategoryName } : c));
                } else {
                  setCategories(prev => [...prev, { id: Date.now().toString(), name: newCategoryName, isActive: true }]);
                }
                setCategoryModal(false);
              }}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
            >
              Save Category
            </button>
          </div>
        </Modal>
      )}

      {userModal && (
        <Modal title={editingUserId ? 'Edit User' : 'Add User'} onClose={() => setUserModal(false)} darkMode={dm}>
          <Field label="Name" value={newUser.name || ''} onChange={v => setNewUser({ ...newUser, name: v })} placeholder="e.g. John Doe" darkMode={dm} />
          <div className="mb-4">
            <label className={`text-sm block mb-1 ${t2}`}>Role</label>
            <select
              value={newUser.role || 'cashier'}
              onChange={e => setNewUser({ ...newUser, role: e.target.value as Role })}
              className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 ${dm ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-200 text-slate-800'}`}
            >
              <option value="owner">Owner</option>
              <option value="manager">Manager</option>
              <option value="cashier">Cashier</option>
            </select>
          </div>
          <Field label="PIN Code" value={newUser.pin || ''} onChange={v => setNewUser({ ...newUser, pin: v })} placeholder="e.g. 1234" type="password" darkMode={dm} />
          <button onClick={saveUser} disabled={!newUser.name || !newUser.pin} className="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold hover:bg-blue-700 disabled:opacity-50 mt-2">
            {editingUserId ? 'Save Changes' : 'Add User'}
          </button>
        </Modal>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text', darkMode }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; darkMode: boolean; }) {
  return (
    <div className="mb-4">
      <label className={`text-sm block mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 transition-colors ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-500' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'}`}
      />
    </div>
  );
}

function Toggle({ checked, onChange, darkMode }: { checked: boolean; onChange: () => void; darkMode: boolean }) {
  return (
    <button onClick={onChange} style={{ width: 40, height: 22, position: 'relative', flexShrink: 0 }}
      className={`rounded-full transition-colors ${checked ? 'bg-blue-600' : (darkMode ? 'bg-slate-600' : 'bg-slate-300')}`}>
      <span style={{ position: 'absolute', width: 18, height: 18, top: 2, left: 2, backgroundColor: 'white', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.15)', transform: checked ? 'translateX(18px)' : 'translateX(0)', transition: 'transform 0.2s' }} />
    </button>
  );
}

function SaveButton({ onSave, saved, darkMode }: { onSave: () => void; saved: boolean; darkMode: boolean }) {
  return (
    <div className="pt-2">
      <button onClick={onSave} disabled={saved} className={`px-6 py-2.5 rounded-xl font-semibold transition-colors ${saved ? (darkMode ? 'bg-emerald-900/40 text-emerald-600' : 'bg-emerald-100 text-emerald-600') : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
        {saved ? 'Saved!' : 'Save Settings'}
      </button>
    </div>
  );
}

function Modal({ title, children, onClose, darkMode }: { title: string; children: React.ReactNode; onClose: () => void; darkMode: boolean; }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative rounded-2xl p-5 w-full max-w-sm shadow-2xl ${darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
        <button onClick={onClose} className={`absolute top-4 right-4 transition-colors ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'}`}><X size={18} /></button>
        <h3 className={`mb-4 font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{title}</h3>
        {children}
      </div>
    </div>
  );
}
