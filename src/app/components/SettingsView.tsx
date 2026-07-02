import { useState, type ElementType } from 'react';
import { Store, DollarSign, Receipt, CreditCard, Users, Plus, Trash2, Check, X, Shield } from 'lucide-react';
import type { BusinessType, User, RolePermissions, ViewType, Role } from './mockData';
import { ConfirmationModal } from './ConfirmationModal';

interface SettingsViewProps {
  businessType: BusinessType;
  onBusinessTypeChange: (t: BusinessType) => void;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  permissions: RolePermissions;
  setPermissions: React.Dispatch<React.SetStateAction<RolePermissions>>;
}

type SettingsTab = 'business' | 'currency' | 'tax' | 'payments' | 'users';

const TABS: { id: SettingsTab; label: string; icon: ElementType }[] = [
  { id: 'business',  label: 'Business',  icon: Store      },
  { id: 'currency',  label: 'Currency',  icon: DollarSign },
  { id: 'tax',       label: 'Tax',       icon: Receipt    },
  { id: 'payments',  label: 'Payments',  icon: CreditCard },
  { id: 'users',     label: 'Users',     icon: Users      },
];

interface PaymentMethod { id: string; label: string; enabled: boolean; }
interface TaxRate       { id: string; name: string; rate: number; inclusive: boolean; isDefault: boolean; }

const INITIAL_PAYMENTS: PaymentMethod[] = [
  { id: 'cash',          label: 'Cash',                enabled: true  },
  { id: 'qris',          label: 'QRIS',                enabled: true  },
  { id: 'card',          label: 'Debit / Credit Card',  enabled: true  },
  { id: 'bank-transfer', label: 'Bank Transfer',         enabled: true  },
  { id: 'gopay',         label: 'GoPay',               enabled: false },
  { id: 'ovo',           label: 'OVO',                 enabled: false },
];

const INITIAL_TAXES: TaxRate[] = [
  { id: '1', name: 'PPN', rate: 11, inclusive: false, isDefault: true },
];

export function SettingsView({ businessType, onBusinessTypeChange, users, setUsers, permissions, setPermissions }: SettingsViewProps) {
  const [tab,      setTab]      = useState<SettingsTab>('business');
  const [payments, setPayments] = useState<PaymentMethod[]>(INITIAL_PAYMENTS);
  const [taxes,    setTaxes]    = useState<TaxRate[]>(INITIAL_TAXES);
  const [saved,    setSaved]    = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);

  // Business form
  const [bizName,  setBizName]  = useState('Warung Kopi Santai');
  const [phone,    setPhone]    = useState('+62 812 3456 7890');
  const [address,  setAddress]  = useState('Jl. Sudirman No. 123, Jakarta');
  const [email,    setEmail]    = useState('hello@warkop.id');

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

  const togglePayment = (id: string) =>
    setPayments(prev => prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));

  const deleteUser = (id: string) => {
    // Prevent state update here directly, normally we'd confirm this too, but we'll leave it simple for demo
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const deleteTax = (id: string) => setTaxes(prev => prev.filter(t => t.id !== id));

  const saveTax = () => {
    if (!newTaxName.trim() || !newTaxRate) return;
    const newTax: TaxRate = {
      id: Date.now().toString(),
      name: newTaxName.trim(),
      rate: Number(newTaxRate),
      inclusive: newTaxIncl,
      isDefault: newTaxDef,
    };
    if (newTaxDef) setTaxes(prev => prev.map(t => ({ ...t, isDefault: false })));
    setTaxes(prev => [...prev, newTax]);
    setNewTaxName(''); setNewTaxRate(''); setNewTaxIncl(false); setNewTaxDef(false);
    setTaxModal(false);
  };

  const saveInvite = () => {
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    const newUser: User = {
      id: Date.now().toString(),
      name: inviteName.trim(),
      email: inviteEmail.trim(),
      role: inviteRole,
    };
    setUsers(prev => [...prev, newUser]);
    setInviteName(''); setInviteEmail(''); setInviteRole('cashier');
    setInviteModal(false);
  };

  const handleSaveClick = () => {
    setConfirmModal(true);
  };

  const handleConfirmSave = () => {
    setConfirmModal(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const togglePermission = (role: Role, viewId: ViewType) => {
    if (role === 'owner') return; // Owner always has all access
    setPermissions(prev => {
      const current = prev[role];
      const updated = current.includes(viewId)
        ? current.filter(id => id !== viewId)
        : [...current, viewId];
      return { ...prev, [role]: updated };
    });
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-slate-50">
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 flex-1 overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-slate-800">Settings</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage your business configuration</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-6">
          {/* Sidebar tabs */}
          <nav className="sm:w-44 shrink-0">
            <div className="flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={[
                    'flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm whitespace-nowrap sm:w-full transition-colors text-left',
                    tab === id ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-white hover:text-slate-700',
                  ].join(' ')}
                >
                  <Icon size={16} className="shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          </nav>

          {/* Content panel */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            {/* ── Business ── */}
            {tab === 'business' && (
              <div className="space-y-4">
                <h3 className="text-slate-700">Business Profile</h3>
                <div>
                  <label className="text-sm text-slate-500 block mb-1">Business Type</label>
                  <div className="flex border border-slate-200 rounded-xl overflow-hidden w-fit">
                    {(['retail', 'fnb'] as BusinessType[]).map(t => (
                      <button
                        key={t}
                        onClick={() => onBusinessTypeChange(t)}
                        className={[
                          'px-5 py-2.5 text-sm capitalize transition-colors',
                          businessType === t ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50',
                        ].join(' ')}
                      >
                        {t === 'fnb' ? 'F&B' : 'Retail'}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {businessType === 'fnb'
                      ? 'F&B mode enables order types (Dine-in / Takeaway / Delivery) and table notes.'
                      : 'Retail mode hides F&B-specific options.'}
                  </p>
                </div>
                <Field label="Business Name" value={bizName}  onChange={setBizName}  />
                <Field label="Phone"         value={phone}    onChange={setPhone}    type="tel"   />
                <Field label="Email"         value={email}    onChange={setEmail}    type="email" />
                <Field label="Address"       value={address}  onChange={setAddress}  />
                <SaveButton onSave={handleSaveClick} saved={saved} />
              </div>
            )}

            {/* ── Currency ── */}
            {tab === 'currency' && (
              <div className="space-y-4">
                <h3 className="text-slate-700">Currency Settings</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
                  Base currency is set once at onboarding and cannot be changed later (v1).
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-500 block mb-1">Base Currency</label>
                    <div className="border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 text-slate-700 text-sm">
                      IDR — Indonesian Rupiah
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500 block mb-1">Symbol</label>
                    <div className="border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 text-slate-700 text-sm">
                      Rp
                    </div>
                  </div>
                </div>
                <Field label="Display Currency (optional)" value="" onChange={() => {}} placeholder="e.g. USD" />
                <Field label="Exchange Rate (manual)"      value="" onChange={() => {}} type="number" placeholder="e.g. 16000" />
                <p className="text-xs text-slate-400 -mt-2">Rate is entered manually — no live FX in v1.</p>
                <SaveButton onSave={handleSaveClick} saved={saved} />
              </div>
            )}

            {/* ── Tax ── */}
            {tab === 'tax' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-slate-700">Tax Rates</h3>
                  <button
                    onClick={() => setTaxModal(true)}
                    className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <Plus size={14} />
                    Add Rate
                  </button>
                </div>
                {taxes.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">No tax rates yet.</p>
                ) : (
                  taxes.map(rate => (
                    <div key={rate.id} className="border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-slate-700" style={{ fontWeight: 500 }}>{rate.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {rate.rate}% · {rate.inclusive ? 'Inclusive' : 'Exclusive'}
                          {rate.isDefault ? ' · Default' : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {rate.isDefault && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs">Default</span>
                        )}
                        <button
                          onClick={() => deleteTax(rate.id)}
                          className="text-slate-300 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── Payments ── */}
            {tab === 'payments' && (
              <div className="space-y-4">
                <h3 className="text-slate-700">Payment Methods</h3>
                <p className="text-sm text-slate-500">
                  Enable the methods available at checkout. Payments are recorded manually — no live gateway in v1.
                </p>
                <div className="space-y-3">
                  {payments.map(pm => (
                    <div key={pm.id} className="flex items-center justify-between border border-slate-200 rounded-xl px-4 py-3">
                      <span className="text-sm text-slate-700">{pm.label}</span>
                      <button
                        onClick={() => togglePayment(pm.id)}
                        aria-checked={pm.enabled}
                        role="switch"
                        style={{ width: 40, height: 22, position: 'relative', flexShrink: 0 }}
                        className={`rounded-full transition-colors ${pm.enabled ? 'bg-blue-600' : 'bg-slate-200'}`}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            width: 18,
                            height: 18,
                            top: 2,
                            left: 2,
                            backgroundColor: 'white',
                            borderRadius: '50%',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                            transform: pm.enabled ? 'translateX(18px)' : 'translateX(0)',
                            transition: 'transform 0.2s',
                          }}
                        />
                      </button>
                    </div>
                  ))}
                </div>
                <SaveButton onSave={handleSaveClick} saved={saved} />
              </div>
            )}

            {/* ── Users ── */}
            {tab === 'users' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-slate-700">Users & Roles</h3>
                  <button
                    onClick={() => setInviteModal(true)}
                    className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <Plus size={14} />
                    Invite User
                  </button>
                </div>
                <div className="space-y-3">
                  {users.map(user => (
                    <div key={user.id} className="flex items-center gap-3 border border-slate-200 rounded-xl px-4 py-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 shrink-0" style={{ fontWeight: 600 }}>
                        {user.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700">{user.name}</p>
                        <p className="text-xs text-slate-400">{user.email}</p>
                      </div>
                      <span className={[
                        'px-2 py-0.5 rounded-full text-xs capitalize',
                        user.role === 'owner'   ? 'bg-violet-50 text-violet-600' :
                        user.role === 'manager' ? 'bg-blue-50 text-blue-600'    :
                                                   'bg-slate-100 text-slate-500',
                      ].join(' ')}>
                        {user.role}
                      </span>
                      {user.role !== 'owner' && (
                        <button onClick={() => deleteUser(user.id)} className="text-slate-300 hover:text-red-400 transition-colors shrink-0">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-8 border-t border-slate-200 pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield size={18} className="text-slate-700" />
                    <h3 className="text-slate-700">Role Permissions</h3>
                  </div>
                  <p className="text-sm text-slate-500 mb-4">Configure which menu tabs are accessible for each staff role.</p>
                  
                  <div className="space-y-4">
                    {(['manager', 'cashier'] as Role[]).map(role => (
                      <div key={role} className="border border-slate-200 rounded-xl p-4">
                        <h4 className="text-sm font-semibold text-slate-700 capitalize mb-3">{role} Access</h4>
                        <div className="flex flex-wrap gap-2">
                          {(['pos', 'dashboard', 'inventory', 'reports', 'settings'] as ViewType[]).map(v => {
                            const hasAccess = permissions[role].includes(v);
                            return (
                              <button
                                key={v}
                                onClick={() => togglePermission(role, v)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                                  hasAccess 
                                    ? 'bg-blue-50 border-blue-200 text-blue-700' 
                                    : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                                }`}
                              >
                                {v === 'pos' ? 'POS Terminal' : v.charAt(0).toUpperCase() + v.slice(1)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    <div className="text-xs text-slate-400 mt-2">Note: The "Owner" role automatically has full access to all areas.</div>
                  </div>
                  <div className="mt-6">
                    <SaveButton onSave={handleSaveClick} saved={saved} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={confirmModal}
        title="Save Changes"
        message="Are you sure you want to apply these changes to your business settings?"
        onConfirm={handleConfirmSave}
        onCancel={() => setConfirmModal(false)}
      />

      {/* ── Add Tax Rate modal ── */}
      {taxModal && (
        <Modal title="Add Tax Rate" onClose={() => setTaxModal(false)}>
          <div className="space-y-3">
            <Field label="Name (e.g. PPN, GST, VAT)" value={newTaxName} onChange={setNewTaxName} placeholder="PPN" />
            <Field label="Rate (%)"                   value={newTaxRate} onChange={setNewTaxRate} type="number" placeholder="11" />
            <div className="flex items-center justify-between border border-slate-200 rounded-xl px-4 py-3">
              <div>
                <p className="text-sm text-slate-700">Inclusive</p>
                <p className="text-xs text-slate-400">Tax is included in the price</p>
              </div>
              <Toggle checked={newTaxIncl} onChange={setNewTaxIncl} />
            </div>
            <div className="flex items-center justify-between border border-slate-200 rounded-xl px-4 py-3">
              <div>
                <p className="text-sm text-slate-700">Set as default</p>
                <p className="text-xs text-slate-400">Apply to all products by default</p>
              </div>
              <Toggle checked={newTaxDef} onChange={setNewTaxDef} />
            </div>
          </div>
          <button
            disabled={!newTaxName.trim() || !newTaxRate}
            onClick={saveTax}
            className="mt-5 w-full bg-blue-600 text-white rounded-xl py-3 hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add Tax Rate
          </button>
        </Modal>
      )}

      {/* ── Invite User modal ── */}
      {inviteModal && (
        <Modal title="Invite User" onClose={() => setInviteModal(false)}>
          <div className="space-y-3">
            <Field label="Full Name *"    value={inviteName}  onChange={setInviteName}  placeholder="e.g. Dewi Sartika" />
            <Field label="Email *"        value={inviteEmail} onChange={setInviteEmail} type="email" placeholder="dewi@warkop.id" />
            <div>
              <label className="text-sm text-slate-500 block mb-1">Role</label>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as User['role'])}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 text-slate-700 bg-white"
              >
                <option value="cashier">Cashier — can process orders, cannot edit settings</option>
                <option value="manager">Manager — can edit products & view reports</option>
                <option value="owner">Owner — full access</option>
              </select>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
              In a live environment, an invitation email would be sent to this address. This is a frontend demo.
            </div>
          </div>
          <button
            disabled={!inviteName.trim() || !inviteEmail.trim()}
            onClick={saveInvite}
            className="mt-5 w-full bg-blue-600 text-white rounded-xl py-3 hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Send Invitation
          </button>
        </Modal>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-sm text-slate-500 block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 text-slate-700 placeholder-slate-300"
      />
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{ width: 40, height: 22, position: 'relative', flexShrink: 0 }}
      className={`rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-slate-200'}`}
    >
      <span style={{
        position: 'absolute', width: 18, height: 18, top: 2, left: 2,
        backgroundColor: 'white', borderRadius: '50%',
        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        transform: checked ? 'translateX(18px)' : 'translateX(0)',
        transition: 'transform 0.2s',
      }} />
    </button>
  );
}

function SaveButton({ onSave, saved }: { onSave: () => void; saved: boolean }) {
  return (
    <button
      onClick={onSave}
      className={[
        'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm text-white transition-all',
        saved ? 'bg-emerald-600' : 'bg-blue-600 hover:bg-blue-700',
      ].join(' ')}
    >
      {saved ? <><Check size={15} /> Saved!</> : 'Save Changes'}
    </button>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl p-5 w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X size={18} />
        </button>
        <h3 className="text-slate-800 mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}
