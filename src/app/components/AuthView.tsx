import { useState, type FormEvent, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Mail, Lock, Store, User as UserIcon, KeyRound, Coffee, ShoppingBag, Loader2, MailCheck } from 'lucide-react';
import type { BusinessType, User } from './mockData';
import { INITIAL_USERS, formatIDR } from './mockData';
import { VPosLogo } from './VPosLogo';
import { AUTH_MODE, IS_LOCAL_DEMO, AuthError, signInWithEmail, signUpOwner } from '../lib/auth';

interface AuthViewProps {
  users: User[];
  darkMode: boolean;
  onLogin: (user: User) => void;
  onSignup: (user: User) => void;
}

type Mode = 'signin' | 'signup';
type LocalMethod = 'password' | 'pin';

const SAMPLE_RECEIPT = [
  { name: 'Es kopi susu', qty: 2, price: 22000 },
  { name: 'Nasi goreng spesial', qty: 1, price: 45000 },
  { name: 'Croissant butter', qty: 1, price: 24000 },
];

export function AuthView({ users, onLogin, onSignup }: AuthViewProps) {
  const [mode, setMode] = useState<Mode>('signin');
  const [localMethod, setLocalMethod] = useState<LocalMethod>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('fnb');
  const [staffId, setStaffId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  // Local demo only: device-stored accounts. Cloud mode never reads these.
  const localUsers = IS_LOCAL_DEMO
    ? [...users, ...INITIAL_USERS.filter(iu => !users.some(u => u.id === iu.id))]
    : [];

  const switchMode = (m: Mode) => { setMode(m); setError(''); setAwaitingConfirmation(false); };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'signin') await doSignIn();
      else await doSignUp();
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Something went wrong. Check your connection and try again.');
      if (!(err instanceof AuthError)) console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const doSignIn = async () => {
    if (AUTH_MODE === 'cloud') {
      if (!email.trim() || !password) throw new AuthError('Enter your email and password.');
      onLogin(await signInWithEmail(email, password));
      return;
    }
    if (localMethod === 'pin') {
      if (!staffId) throw new AuthError('Choose who is signing in.');
      const user = localUsers.find(u => u.id === staffId);
      if (!user || user.pin !== pin) throw new AuthError('That PIN is not right for this staff member.');
      onLogin(user);
      return;
    }
    const user = localUsers.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user || user.pin !== password) throw new AuthError('Email or password is incorrect.');
    onLogin(user);
  };

  const doSignUp = async () => {
    if (!businessName.trim() || !ownerName.trim() || !email.trim() || !password) {
      throw new AuthError('Fill in every field to create the business.');
    }
    if (AUTH_MODE === 'cloud') {
      const { user, needsEmailConfirmation } = await signUpOwner({ email, password, ownerName, businessName, businessType });
      if (needsEmailConfirmation) { setAwaitingConfirmation(true); return; }
      if (user) onSignup(user);
      return;
    }
    if (localUsers.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) {
      throw new AuthError('This email already has an account on this device. Sign in instead.');
    }
    onSignup({
      id: crypto.randomUUID(),
      name: ownerName.trim(),
      email: email.trim(),
      role: 'owner',
      pin: password,
      merchantId: `m_${crypto.randomUUID()}`,
      businessName: businessName.trim(),
    });
  };

  const submitLabel = mode === 'signup' ? 'Create business' : localMethod === 'pin' && IS_LOCAL_DEMO ? 'Sign in with PIN' : 'Sign in';

  return (
    <div className="min-h-[100dvh] flex bg-ink-50 text-ink-900 dark:bg-ink-950 dark:text-ink-100">
      <ReceiptPanel />

      <main className="flex flex-1 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-10"><VPosLogo size={36} showText textClassName="text-xl" /></div>

          <h1 className="text-2xl font-bold tracking-tight">
            {mode === 'signin' ? 'Sign in to your counter' : 'Set up your business'}
          </h1>
          <p className="mt-1.5 text-sm text-ink-500 dark:text-ink-400">
            {mode === 'signin' ? 'Pick up where the last shift left off.' : 'A 14-day trial starts today. No card needed.'}
          </p>

          {IS_LOCAL_DEMO && (
            <p className="mt-5 rounded-md border border-turmeric-200 bg-turmeric-50 px-3 py-2 text-xs text-turmeric-800 dark:border-turmeric-500/30 dark:bg-turmeric-500/10 dark:text-turmeric-200">
              Offline demo: accounts and sales are stored in this browser only. Connect Supabase to sync and protect data.
            </p>
          )}

          {awaitingConfirmation ? (
            <div role="status" className="mt-8 rounded-lg border border-leaf-200 bg-leaf-50 p-5 dark:border-leaf-500/30 dark:bg-leaf-500/10">
              <MailCheck className="text-leaf-600 dark:text-leaf-300" size={22} />
              <p className="mt-3 font-semibold">Check {email.trim()}</p>
              <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">Open the confirmation link, then sign in here to finish setting up {businessName.trim() || 'your business'}.</p>
              <button type="button" onClick={() => switchMode('signin')} className="mt-4 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300 cursor-pointer">Go to sign in</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
              {mode === 'signup' && (
                <>
                  <Field label="Business name" icon={<Store size={16} />}>
                    <input autoComplete="organization" value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Kopi Santai" className={inputCls} />
                  </Field>
                  <fieldset>
                    <legend className={labelCls}>What do you sell?</legend>
                    <div className="grid grid-cols-2 gap-2">
                      {([['fnb', 'Food & drinks', Coffee], ['retail', 'Goods', ShoppingBag]] as const).map(([value, label, Icon]) => (
                        <label key={value} className={`flex items-center gap-2 rounded-md border px-3 h-11 text-sm cursor-pointer ${
                          businessType === value
                            ? 'border-brand-600 bg-brand-50 text-brand-800 font-semibold dark:border-brand-400 dark:bg-brand-500/15 dark:text-brand-100'
                            : 'border-ink-200 bg-white text-ink-700 hover:border-ink-300 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300'
                        }`}>
                          <input type="radio" name="businessType" value={value} checked={businessType === value} onChange={() => setBusinessType(value)} className="sr-only" />
                          <Icon size={16} /> {label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <Field label="Your name" icon={<UserIcon size={16} />}>
                    <input autoComplete="name" value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="Budi Santoso" className={inputCls} />
                  </Field>
                </>
              )}

              {mode === 'signin' && IS_LOCAL_DEMO && (
                <div role="tablist" aria-label="Sign-in method" className="grid grid-cols-2 rounded-md bg-ink-100 p-1 dark:bg-ink-900">
                  {([['password', 'Email', Mail], ['pin', 'Staff PIN', KeyRound]] as const).map(([value, label, Icon]) => (
                    <button key={value} type="button" role="tab" aria-selected={localMethod === value}
                      onClick={() => { setLocalMethod(value); setError(''); }}
                      className={`flex items-center justify-center gap-1.5 rounded h-9 text-sm cursor-pointer ${
                        localMethod === value ? 'bg-white text-ink-900 font-semibold shadow-sm dark:bg-ink-800 dark:text-ink-50' : 'text-ink-500 hover:text-ink-800 dark:hover:text-ink-200'
                      }`}>
                      <Icon size={14} /> {label}
                    </button>
                  ))}
                </div>
              )}

              {mode === 'signin' && IS_LOCAL_DEMO && localMethod === 'pin' ? (
                <>
                  <Field label="Staff member" icon={<UserIcon size={16} />}>
                    <select value={staffId} onChange={e => setStaffId(e.target.value)} className={`${inputCls} appearance-none`}>
                      <option value="">Choose your name</option>
                      {localUsers.filter(u => u.role !== 'superadmin').map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                    </select>
                  </Field>
                  <Field label="PIN" icon={<KeyRound size={16} />}>
                    <input type="password" inputMode="numeric" autoComplete="off" maxLength={6} value={pin}
                      onChange={e => setPin(e.target.value.replace(/\D/g, ''))} placeholder="4 to 6 digits" className={`${inputCls} tracking-[0.3em]`} />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="Email" icon={<Mail size={16} />}>
                    <input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@business.id" className={inputCls} />
                  </Field>
                  <Field label="Password" icon={<Lock size={16} />} hint={mode === 'signup' ? 'At least 8 characters.' : undefined}>
                    <input type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password}
                      onChange={e => setPassword(e.target.value)} className={inputCls} />
                  </Field>
                </>
              )}

              {error && (
                <p role="alert" className="rounded-md border border-chili-200 bg-chili-50 px-3 py-2 text-sm text-chili-700 dark:border-chili-500/30 dark:bg-chili-500/10 dark:text-chili-200">
                  {error}
                </p>
              )}

              <button type="submit" disabled={busy}
                className="w-full h-12 rounded-md bg-brand-600 text-white font-semibold hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer dark:bg-brand-400 dark:text-ink-950 dark:hover:bg-brand-300">
                {busy && <Loader2 size={16} className="animate-spin" />}
                {busy ? 'One moment…' : submitLabel}
              </button>
            </form>
          )}

          <p className="mt-6 text-sm text-ink-500 dark:text-ink-400">
            {mode === 'signin' ? 'New to VPos? ' : 'Already have a business account? '}
            <button type="button" onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')} className="font-semibold text-brand-700 hover:underline dark:text-brand-300 cursor-pointer">
              {mode === 'signin' ? 'Set up your business' : 'Sign in'}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}

const labelCls = 'block mb-1.5 text-sm font-medium text-ink-700 dark:text-ink-300';
const inputCls = 'w-full h-11 rounded-md border border-ink-200 bg-white pl-10 pr-3 text-[15px] text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-50 dark:placeholder:text-ink-500';

function Field({ label, icon, hint, children }: { label: string; icon: ReactNode; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <span className="relative block">
        <span aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400">{icon}</span>
        {children}
      </span>
      {hint && <span className="mt-1 block text-xs text-ink-500">{hint}</span>}
    </label>
  );
}

/** The one expressive moment: a receipt printing out of the counter. */
function ReceiptPanel() {
  const reduce = useReducedMotion();
  const subtotal = SAMPLE_RECEIPT.reduce((s, i) => s + i.qty * i.price, 0);
  const tax = Math.round(subtotal * 0.1);

  return (
    <aside aria-hidden className="hidden lg:flex relative w-[44%] max-w-[620px] flex-col justify-between bg-brand-900 p-12 text-brand-50 overflow-hidden">
      <VPosLogo size={36} showText textClassName="text-xl !text-white" />

      <div className="flex justify-center">
        <div className="relative w-[300px]">
          {/* printer slot */}
          <div className="h-3 rounded-full bg-brand-950 shadow-[inset_0_2px_4px_rgba(0,0,0,.45)]" />
          <motion.div
            initial={reduce ? false : { y: -260, opacity: 1 }}
            animate={{ y: 0 }}
            transition={{ duration: 1.1, ease: [0.2, 0.7, 0.2, 1], delay: 0.2 }}
            className="receipt-edge -mt-1.5 mx-3 bg-white px-5 pt-6 text-ink-800 shadow-[0_24px_40px_-24px_rgba(0,0,0,.6)]"
          >
            <p className="text-center font-bold tracking-tight">Kopi Santai</p>
            <p className="text-center text-xs text-ink-500">Jl. Sudirman 123, Jakarta</p>
            <p className="text-center text-xs text-ink-500">Table 4</p>
            <div className="my-3 border-t border-dashed border-ink-300" />
            <ul className="space-y-1.5 text-[13px]">
              {SAMPLE_RECEIPT.map(i => (
                <li key={i.name} className="flex justify-between gap-3">
                  <span className="truncate">{i.qty}× {i.name}</span>
                  <span className="tabular-nums">{formatIDR(i.qty * i.price)}</span>
                </li>
              ))}
            </ul>
            <div className="my-3 border-t border-dashed border-ink-300" />
            <div className="flex justify-between text-[13px] text-ink-500"><span>PB1 10%</span><span className="tabular-nums">{formatIDR(tax)}</span></div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-sm font-semibold">Total</span>
              <span className="text-2xl font-extrabold tracking-tight tabular-nums">{formatIDR(subtotal + tax)}</span>
            </div>
            <p className="mt-3 text-xs text-leaf-700 font-semibold">Paid with QRIS</p>
          </motion.div>
        </div>
      </div>

      <div>
        <p className="text-3xl font-bold leading-tight tracking-tight text-white max-w-sm">Every sale adds up, to the last rupiah.</p>
        <p className="mt-3 max-w-sm text-brand-200">Checkout, stock and tax reports for cafés and shops in one place.</p>
      </div>
    </aside>
  );
}
