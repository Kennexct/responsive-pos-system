import { useState, type ElementType } from 'react';
import { Store, DollarSign, Receipt, CreditCard, Users, Plus, Trash2, Check, X, Shield, Moon, Sun } from 'lucide-react';
import type { BusinessType, User, RolePermissions, ViewType, Role } from './mockData';
import { ConfirmationModal } from './ConfirmationModal';

interface SettingsViewProps {
  businessType: BusinessType;
  onBusinessTypeChange: (t: BusinessType) => void;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  permissions: RolePermissions;
  setPermissions: React.Dispatch<React.SetStateAction<RolePermissions>>;
  darkMode: boolean;
  onToggleDark: () => void;
  bizName: string;    setBizName: (v: string) => void;
  bizPhone: string;   setBizPhone: (v: string) => void;
  bizAddress: string; setBizAddress: (v: string) => void;
  bizEmail: string;   setBizEmail: (v: string) => void;
}

type SettingsTab = 'business' | 'currency' | 'tax' | 'payments' | 'users';

const TABS: { id: SettingsTab; label: string; icon: ElementType }[] = [
  { id: 'business',  label: 'Business',  icon: Store      },
  { id: 'currency',  label: 'Currency',  icon: DollarSign },
  { id: 'tax',       label: 'Tax',       icon: Receipt    },
  { id: 'payments',  label: 'Payments',  icon: CreditCard },
  { id: 'users',     label: 'Users',     icon: Users      },
];

interface PaymentMethodEntry { id: string; label: string; enabled: boolean; }
interface TaxRate            { id: string; name: string; rate: number; inclusive: boolean; isDefault: boolean; }

const INITIAL_PAYMENTS: PaymentMethodEntry[] = [
  { id: 'cash',          label: 'Cash',                enabled: true  },
  { id: 'qris',          label: 'QRIS',                enabled: true  },
  { id: 'card',          label: 'Debit / Credit Card', enabled: true  },
  { id: 'bank-transfer', label: 'Bank Transfer',       enabled: true  },
  { id: 'gopay',         label: 'GoPay',               enabled: false },
  { id: 'ovo',           label: 'OVO',                 enabled: false },
];

const INITIAL_TAXES: TaxRate[] = [
  { id: '1', name: 'PPN', rate: 11, inclusive: false, isDefault: true },
];

export function SettingsView({
  businessType, onBusinessTypeChange,
  users, setUsers,
  permissions, setPermissions,
  darkMode, onToggleDark,
  bizName, setBizName, bizPhone, setBizPhone, bizAddress, setBizAddress, bizEmail, setBizEmail,
}: SettingsViewProps) {
  const [tab,      setTab]      = useState<SettingsTab>('business');
  const [payments, setPayments] = useState<PaymentMethodEntry[]>(INITIAL_PAYMENTS);
  const [taxes,    setTaxes]    = useState<TaxRate[]>(INITIAL_TAXES);
  const [saved,    setSaved]    = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);

  // Add Tax modal
  const [taxModal,    setTaxModal]    = useState(false);
  const [newTaxName,  setNewTaxName]  = useState('');
  const [newTaxRate,  setNewTaxRate]  = useState('');
  const [newTaxIncl,  setNewTaxIncl]  = useState(false);
  const [newTaxDef,   setNewTaxDef]   = useState(false);

  // Invite User modal
  const [inviteModal,  setInviteModal]  = useState(false);
  const [inviteName,   setInviteName]   = useState('');
  const [inviteEmail,  setInviteEmail]  = useState('');
  const [inviteRole,   setInviteRole]   = useState<User['role']>('cashier');

  // Delete user confirm
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  const togglePayment = (id: string) =>
    setPayments(prev => prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));

  const deleteTax = (id: string) => setTaxes(prev => prev.filter(t => t.id !== id));

  const saveTax = () => {
    if (!newTaxName.trim() || !newTaxRate) return;
    const newTax: TaxRate = { id: Date.now().toString(), name: newTaxName.trim(), rate: Number(newTaxRate), inclusive: newTaxIncl, isDefault: newTaxDef };
    if (newTaxDef) setTaxes(prev => prev.map(t => ({ ...t, isDefault: false })));
    setTaxes(prev => [...prev, newTax]);
    setNewTaxName(''); setNewTaxRate(''); setNewTaxIncl(false); setNewTaxDef(false);
    setTaxModal(false);
  };

  const saveInvite = () => {
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    const newUser: User = { id: Date.now().toString(), name: inviteName.trim(), email: inviteEmail.trim(), role: inviteRole };
    setUsers(prev => [...prev, newUser]);
    setInviteName(''); setInviteEmail(''); setInviteRole('cashier');
    setInviteModal(false);
  };

  const handleConfirmSave = () => {
    setConfirmSave(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleConfirmDelete = () => {
    if (deleteUserId) { setUsers(prev => prev.filter(u => u.id !== deleteUserId)); setDeleteUserId(null); }
  };

  const togglePermission = (role: Role, viewId: ViewType) => {
    if (role === 'owner') return;
    setPermissions(prev => {
      const current = prev[role];
      const updated = current.includes(viewId) ? current.filter(id => id !== viewId) : [...current, viewId];
      return { ...prev, [role]: updated };
    });
  };

  const dm = darkMode;
  const bg      = dm ? 'bg-slate-900' : 'bg-slate-50';
  const surface = dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100';
  const t1      = dm ? 'text-slate-100' : 'text-slate-800';
  const t2      = dm ? 'text-slate-400' : 'text-slate-500';
  const inputCls = dm ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-500 focus:border-blue-400' : 'border-slate-200 text-slate-700 focus:border-blue-400';
  const tabActive = 'bg-blue-600 text-white';
  const tabInact  = dm ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'text-slate-500 hover:bg-white hover:text-slate-700';

  return (
    <div className={`flex-1 overflow-hidden flex flex-col ${bg}`}>
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 flex-1 overflow-y-auto">
        <div className="mb-6">
          <h1 className={t1}>Settings</h1>
          <p className={`text-sm mt-0.5 ${t2}`}>Manage your business configuration</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-6">
          {/* Sidebar tabs */}
          <nav className="sm:w-44 shrink-0">
            <div className="flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm whitespace-nowrap sm:w-full transition-colors text-left font-medium ${tab === id ? tabActive : tabInact}`}
                >
                  <Icon size={16} className="shrink-0" />
                  {label}
                </button>
              ))}

              {/* Dark mode toggle in sidebar */}
              <button
                onClick={onToggleDark}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm whitespace-nowrap sm:w-full transition-colors text-left font-medium mt-2 border-t sm:pt-3 ${dm ? 'border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'border-slate-100 text-slate-500 hover:bg-white hover:text-slate-700'}`}
              >
                {dm ? <Sun size={16} className="shrink-0" /> : <Moon size={16} className="shrink-0" />}
                {dm ? 'Light Mode' : 'Dark Mode'}
              </button>
            </div>
          </nav>

          {/* Content panel */}
          <div className={`flex-1 rounded-2xl shadow-sm border p-5 ${surface}`}>

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
                <Field label="Business Name"  value={bizName}    onChange={setBizName}    darkMode={dm} />
                <Field label="Phone"          value={bizPhone}   onChange={setBizPhone}   darkMode={dm} type="tel" />
                <Field label="Email"          value={bizEmail}   onChange={setBizEmail}   darkMode={dm} type="email" />
                <Field label="Address"        value={bizAddress} onChange={setBizAddress} darkMode={dm} />
                <SaveButton onSave={() => setConfirmSave(true)} saved={saved} />
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
                <Field label="Display Currency (optional)" value="" onChange={() => {}} placeholder="e.g. USD" darkMode={dm} />
                <Field label="Exchange Rate (manual)" value="" onChange={() => {}} type="number" placeholder="e.g. 16000" darkMode={dm} />
                <p className={`text-xs ${t2}`}>Rate is entered manually — no live FX in v1.</p>
                <SaveButton onSave={() => setConfirmSave(true)} saved={saved} />
              </div>
            )}

            {/* ── Tax ── */}
            {tab === 'tax' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className={t1}>Tax Rates</h3>
                  <button onClick={() => setTaxModal(true)} className="flex items-center gap-1.5 text-sm text-blue-600 border border-blue-200 dark:border-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors font-medium">
                    <Plus size={14} /> Add Rate
                  </button>
                </div>
                {taxes.length === 0
                  ? <p className={`text-sm text-center py-6 ${t2}`}>No tax rates yet.</p>
                  : taxes.map(rate => (
                    <div key={rate.id} className={`border rounded-xl p-4 flex items-center justify-between gap-3 ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
                      <div>
                        <p className={`text-sm font-semibold ${t1}`}>{rate.name}</p>
                        <p className={`text-xs mt-0.5 ${t2}`}>{rate.rate}% · {rate.inclusive ? 'Inclusive' : 'Exclusive'}{rate.isDefault ? ' · Default' : ''}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {rate.isDefault && <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 text-xs font-semibold">Default</span>}
                        <button onClick={() => deleteTax(rate.id)} className={`transition-colors ${dm ? 'text-slate-600 hover:text-red-400' : 'text-slate-300 hover:text-red-400'}`}><Trash2 size={15} /></button>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}

            {/* ── Payments ── */}
            {tab === 'payments' && (
              <div className="space-y-4">
                <h3 className={t1}>Payment Methods</h3>
                <p className={`text-sm ${t2}`}>Enable the methods available at checkout.</p>
                <div className="space-y-3">
                  {payments.map(pm => (
                    <div key={pm.id} className={`flex items-center justify-between border rounded-xl px-4 py-3 ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
                      <span className={`text-sm font-medium ${t1}`}>{pm.label}</span>
                      <Toggle checked={pm.enabled} onChange={() => togglePayment(pm.id)} />
                    </div>
                  ))}
                </div>
                <SaveButton onSave={() => setConfirmSave(true)} saved={saved} />
              </div>
            )}

            {/* ── Users ── */}
            {tab === 'users' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className={t1}>Users & Roles</h3>
                  <button onClick={() => setInviteModal(true)} className="flex items-center gap-1.5 text-sm text-blue-600 border border-blue-200 dark:border-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors font-medium">
                    <Plus size={14} /> Invite User
                  </button>
                </div>
                <div className="space-y-3">
                  {users.map(user => (
                    <div key={user.id} className={`flex items-center gap-3 border rounded-xl px-4 py-3 ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-blue-600 shrink-0 font-bold text-sm ${dm ? 'bg-blue-900/40' : 'bg-blue-100'}`}>
                        {user.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${t1}`}>{user.name}</p>
                        <p className={`text-xs ${t2}`}>{user.email}</p>
                      </div>
                      <span className={[
                        'px-2 py-0.5 rounded-full text-xs font-semibold capitalize',
                        user.role === 'owner'   ? 'bg-violet-500/10 text-violet-600' :
                        user.role === 'manager' ? 'bg-blue-500/10 text-blue-600'    :
                                                   'bg-slate-500/10 text-slate-500',
                      ].join(' ')}>{user.role}</span>
                      {user.role !== 'owner' && (
                        <button onClick={() => setDeleteUserId(user.id)} className={`transition-colors ${dm ? 'text-slate-600 hover:text-red-400' : 'text-slate-300 hover:text-red-400'} shrink-0`}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Role permissions */}
                <div className={`mt-8 border-t pt-6 ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Shield size={16} className={t2} />
                    <h3 className={t1}>Role Permissions</h3>
                  </div>
                  <p className={`text-sm mb-4 ${t2}`}>Configure which menu tabs each role can access.</p>
                  <div className="space-y-4">
                    {(['manager', 'cashier'] as Role[]).map(role => (
                      <div key={role} className={`border rounded-xl p-4 ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
                        <h4 className={`text-sm font-semibold capitalize mb-3 ${t1}`}>{role} Access</h4>
                        <div className="flex flex-wrap gap-2">
                          {(['pos', 'dashboard', 'inventory', 'reports', 'settings'] as ViewType[]).map(v => {
                            const hasAccess = permissions[role].includes(v);
                            return (
                              <button
                                key={v}
                                onClick={() => togglePermission(role, v)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1 ${
                                  hasAccess
                                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-600'
                                    : dm ? 'bg-transparent border-slate-700 text-slate-500 hover:border-slate-600' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                                }`}
                              >
                                {hasAccess && <Check size={10} />}
                                {v === 'pos' ? 'POS Terminal' : v.charAt(0).toUpperCase() + v.slice(1)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    <p className={`text-xs ${t2}`}>Owner role always has full access to all areas.</p>
                  </div>
                  <div className="mt-6">
                    <SaveButton onSave={() => setConfirmSave(true)} saved={saved} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <ConfirmationModal
        isOpen={confirmSave}
        title="Save Changes"
        message="Apply these settings to your business configuration?"
        confirmText="Save Changes"
        onConfirm={handleConfirmSave}
        onCancel={() => setConfirmSave(false)}
      />

      <ConfirmationModal
        isOpen={deleteUserId !== null}
        title="Remove User"
        message="This user will no longer have access to the system. This action cannot be undone."
        confirmText="Remove User"
        isDestructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteUserId(null)}
      />

      {taxModal && (
        <Modal title="Add Tax Rate" onClose={() => setTaxModal(false)} darkMode={dm}>
          <div className="space-y-3">
            <Field label="Name (e.g. PPN, VAT)" value={newTaxName} onChange={setNewTaxName} placeholder="PPN" darkMode={dm} />
            <Field label="Rate (%)" value={newTaxRate} onChange={setNewTaxRate} type="number" placeholder="11" darkMode={dm} />
            {[{ label: 'Inclusive', sub: 'Tax is included in the price', val: newTaxIncl, set: setNewTaxIncl },
              { label: 'Set as default', sub: 'Apply to all products', val: newTaxDef, set: setNewTaxDef }].map(({ label, sub, val, set }) => (
              <div key={label} className={`flex items-center justify-between border rounded-xl px-4 py-3 ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
                <div>
                  <p className={`text-sm font-medium ${dm ? 'text-slate-200' : 'text-slate-700'}`}>{label}</p>
                  <p className={`text-xs ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{sub}</p>
                </div>
                <Toggle checked={val} onChange={set} />
              </div>
            ))}
          </div>
          <button disabled={!newTaxName.trim() || !newTaxRate} onClick={saveTax}
            className="mt-5 w-full bg-blue-600 text-white rounded-xl py-3 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed font-semibold">
            Add Tax Rate
          </button>
        </Modal>
      )}

      {inviteModal && (
        <Modal title="Invite User" onClose={() => setInviteModal(false)} darkMode={dm}>
          <div className="space-y-3">
            <Field label="Full Name *"  value={inviteName}  onChange={setInviteName}  placeholder="e.g. Dewi Sartika" darkMode={dm} />
            <Field label="Email *"      value={inviteEmail} onChange={setInviteEmail} type="email" placeholder="dewi@warkop.id" darkMode={dm} />
            <div>
              <label className={`text-sm block mb-1 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Role</label>
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value as User['role'])}
                className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 ${dm ? 'bg-slate-700 border-slate-600 text-slate-100' : 'border-slate-200 text-slate-700 bg-white'}`}>
                <option value="cashier">Cashier — can process orders, cannot edit settings</option>
                <option value="manager">Manager — can edit products & view reports</option>
                <option value="owner">Owner — full access</option>
              </select>
            </div>
            <div className={`border rounded-xl p-3 text-xs ${dm ? 'bg-amber-900/20 border-amber-800/40 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
              In a live environment, an invitation email would be sent. This is a frontend demo.
            </div>
          </div>
          <button disabled={!inviteName.trim() || !inviteEmail.trim()} onClick={saveInvite}
            className="mt-5 w-full bg-blue-600 text-white rounded-xl py-3 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed font-semibold">
            Send Invitation
          </button>
        </Modal>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder, darkMode }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; darkMode: boolean;
}) {
  return (
    <div>
      <label className={`text-sm block mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-500' : 'border-slate-200 text-slate-700 placeholder-slate-300 bg-white'}`}
      />
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} style={{ width: 40, height: 22, position: 'relative', flexShrink: 0 }}
      className={`rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
      <span style={{ position: 'absolute', width: 18, height: 18, top: 2, left: 2, backgroundColor: 'white', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.15)', transform: checked ? 'translateX(18px)' : 'translateX(0)', transition: 'transform 0.2s' }} />
    </button>
  );
}

function SaveButton({ onSave, saved }: { onSave: () => void; saved: boolean }) {
  return (
    <button onClick={onSave} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all ${saved ? 'bg-emerald-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
      {saved ? <><Check size={15} /> Saved!</> : 'Save Changes'}
    </button>
  );
}

function Modal({ title, children, onClose, darkMode }: { title: string; children: React.ReactNode; onClose: () => void; darkMode: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative rounded-2xl p-5 w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl ${darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
        <button onClick={onClose} className={`absolute top-4 right-4 transition-colors ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
          <X size={18} />
        </button>
        <h3 className={`mb-4 font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{title}</h3>
        {children}
      </div>
    </div>
  );
}
