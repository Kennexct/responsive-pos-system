import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Store, Mail, Lock, User as UserIcon, ChevronRight, KeyRound } from 'lucide-react';
import type { User, Role } from './mockData';
import { VPosLogo } from './VPosLogo';

interface AuthViewProps {
  users: User[];
  darkMode: boolean;
  onLogin: (user: User) => void;
  onSignup: (user: User) => void;
}

const DEMO_ACCOUNTS = [
  { email: 'owner@vpos.app', label: 'Owner', role: 'Full access', pin: '9999', colorLight: 'text-violet-600 bg-violet-50', colorDark: 'bg-violet-900/30 text-violet-400' },
];

export function AuthView({ users, darkMode, onLogin, onSignup }: AuthViewProps) {
  const [isLogin,    setIsLogin]    = useState(true);
  const [loginMode,  setLoginMode]  = useState<'email' | 'pin'>('email');
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [pinInput,   setPinInput]   = useState('');
  const [name,       setName]       = useState('');
  const [businessNameInput, setBusinessNameInput] = useState('');
  const [role,       setRole]       = useState<Role>('cashier');
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 400)); // fake async for UX feel

    if (isLogin) {
      if (loginMode === 'email') {
        const user = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
        if (!user) { setError('Email not found.'); setLoading(false); return; }
        if (!password) { setError('Password/PIN is required.'); setLoading(false); return; }
        if (user.pin !== password) { setError('Incorrect password/PIN.'); setLoading(false); return; }
        onLogin(user);
      } else {
        if (!pinInput) { setError('PIN Code is required.'); setLoading(false); return; }
        let user: User | undefined;
        if (selectedUserId) {
          user = users.find(u => u.id === selectedUserId);
          if (!user || user.pin !== pinInput) {
            setError(`Incorrect PIN code for ${user?.name || 'selected staff'}.`);
            setLoading(false);
            return;
          }
        } else {
          user = users.find(u => u.pin === pinInput);
          if (!user) {
            setError('No staff account found with this PIN code.');
            setLoading(false);
            return;
          }
        }
        onLogin(user);
      }
    } else {
      if (!name.trim() || !email.trim() || !password || !businessNameInput.trim()) {
        setError('All fields are required (including Business Name).');
        setLoading(false);
        return;
      }
      if (users.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) {
        setError('Email is already registered.');
        setLoading(false);
        return;
      }
      const merchId = `m_${Date.now()}`;
      const newUser: User = {
        id: Date.now().toString(),
        name: name.trim(),
        email: email.trim(),
        role: 'owner',
        pin: password,
        merchantId: merchId,
        businessName: businessNameInput.trim()
      };
      onSignup(newUser);
    }
    setLoading(false);
  };

  const inputCls = `w-full pl-11 pr-4 py-3 rounded-xl text-sm border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
    darkMode
      ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:ring-offset-slate-900'
      : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:bg-white'
  }`;

  const labelCls = `block text-xs font-semibold mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`;

  return (
    <div className={`min-h-screen flex ${darkMode ? 'bg-[#0C0E14]' : 'bg-slate-50'}`}>
      {/* Left panel — decorative (desktop only) */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 items-center justify-center p-12">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        <div className="relative z-10 max-w-sm text-white text-center">
          <div className="mx-auto mb-8 flex justify-center">
            <VPosLogo size={72} />
          </div>
          <h1 className="text-3xl font-bold mb-4">VPos</h1>
          <p className="text-blue-100 text-lg leading-relaxed mb-8">Streamline your business operations with real-time insights.</p>
          <div className="grid grid-cols-3 gap-4 text-sm">
            {['Smart Ordering', 'Stock Tracking', 'Live Analytics'].map(f => (
              <div key={f} className="bg-white/10 rounded-xl p-3 backdrop-blur-sm border border-white/10">
                <p className="font-semibold">{f}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className={`flex flex-1 lg:max-w-md items-center justify-center p-6`}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <VPosLogo size={36} showText={true} textClassName="text-xl" />
          </div>

          <h2 className={`text-2xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
            {isLogin ? 'Welcome back' : 'Create account'}
          </h2>
          <p className={`text-sm mb-6 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {isLogin ? 'Sign in to your POS dashboard' : 'Set up your business account'}
          </p>

          {/* Main Auth Tab toggle (Sign In / Sign Up) */}
          <div className={`flex rounded-xl p-1 mb-4 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
            {['Sign In', 'Sign Up'].map((t, i) => {
              const active = isLogin ? i === 0 : i === 1;
              return (
                <button
                  key={t}
                  onClick={() => { setIsLogin(i === 0); setError(''); }}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                    active
                      ? darkMode ? 'bg-slate-700 text-white shadow-sm' : 'bg-white text-slate-800 shadow-sm'
                      : darkMode ? 'text-slate-500' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>

          {/* Sub-toggle for Sign In Method (Email vs Staff PIN) */}
          {isLogin && (
            <div className="flex gap-2 mb-6">
              <button
                type="button"
                onClick={() => { setLoginMode('email'); setError(''); }}
                className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg border transition-colors flex items-center justify-center gap-1.5 ${
                  loginMode === 'email'
                    ? darkMode ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-blue-50 border-blue-600 text-blue-700'
                    : darkMode ? 'border-slate-800 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-100'
                }`}
              >
                <Mail size={13} />
                Email & Password
              </button>
              <button
                type="button"
                onClick={() => { setLoginMode('pin'); setError(''); }}
                className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg border transition-colors flex items-center justify-center gap-1.5 ${
                  loginMode === 'pin'
                    ? darkMode ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-blue-50 border-blue-600 text-blue-700'
                    : darkMode ? 'border-slate-800 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-100'
                }`}
              >
                <KeyRound size={13} />
                Staff PIN Code
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="popLayout">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`text-sm p-3 rounded-xl border ${darkMode ? 'bg-red-900/30 text-red-400 border-red-800' : 'bg-red-50 text-red-600 border-red-100'}`}
                >
                  {error}
                </motion.div>
              )}

              {!isLogin && (
                <motion.div
                  key="signup-fields"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  className="space-y-4"
                >
                  <div>
                    <label className={labelCls}>Store / Business Name</label>
                    <div className="relative">
                      <Store size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="text" placeholder="e.g. Kopi Santai Studio" value={businessNameInput} onChange={e => setBusinessNameInput(e.target.value)} className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Full Name (Owner)</label>
                    <div className="relative">
                      <UserIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="text" placeholder="e.g. Budi Santoso" value={name} onChange={e => setName(e.target.value)} className={inputCls} />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Fields for Email Login or Sign Up */}
            {(!isLogin || loginMode === 'email') && (
              <>
                <div>
                  <label className={labelCls}>Email Address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="email" placeholder="you@business.com" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>{!isLogin ? 'Password' : 'Password / PIN'}</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className={inputCls} />
                  </div>
                </div>
              </>
            )}

            {/* Fields for Staff PIN Login */}
            {isLogin && loginMode === 'pin' && (
              <>
                <div>
                  <label className={labelCls}>Staff Member</label>
                  <div className="relative">
                    <UserIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <select
                      value={selectedUserId}
                      onChange={e => setSelectedUserId(e.target.value)}
                      className={inputCls}
                    >
                      <option value="">-- Any Staff (Auto-detect by PIN) --</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>4-Digit PIN Code</label>
                  <div className="relative">
                    <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      maxLength={4}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      placeholder="Enter 4-digit PIN"
                      value={pinInput}
                      onChange={e => setPinInput(e.target.value.replace(/\D/g, ''))}
                      className={`${inputCls} font-mono tracking-widest text-base`}
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 font-semibold transition-colors mt-2 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : null}
              {loading ? 'Please wait…' : isLogin ? (loginMode === 'pin' ? 'Sign In with PIN' : 'Sign In') : 'Create Account'}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

