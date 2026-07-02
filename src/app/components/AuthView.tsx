import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Store, Mail, Lock, User as UserIcon, ChevronRight } from 'lucide-react';
import type { User } from './mockData';

interface AuthViewProps {
  users: User[];
  darkMode: boolean;
  onLogin: (user: User) => void;
  onSignup: (user: User) => void;
}

const DEMO_ACCOUNTS = [
  { email: 'budi@warkop.id',  label: 'Owner',   role: 'Full access',         color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30 dark:text-violet-400' },
  { email: 'ani@warkop.id',   label: 'Cashier', role: 'POS only',            color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400' },
  { email: 'citra@warkop.id', label: 'Cashier', role: 'POS only',            color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400' },
];

export function AuthView({ users, darkMode, onLogin, onSignup }: AuthViewProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [name,     setName]     = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 400)); // fake async for UX feel

    if (isLogin) {
      const user = users.find(u => u.email === email);
      if (!user) { setError('Email not found. Try a demo account below.'); setLoading(false); return; }
      if (!password) { setError('Password is required.'); setLoading(false); return; }
      onLogin(user);
    } else {
      if (!name.trim() || !email.trim() || !password) { setError('All fields are required.'); setLoading(false); return; }
      if (users.some(u => u.email === email)) { setError('Email is already registered.'); setLoading(false); return; }
      const newUser: User = { id: Date.now().toString(), name: name.trim(), email: email.trim(), role: 'owner' };
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
          <div className="w-20 h-20 bg-white/15 rounded-3xl flex items-center justify-center mx-auto mb-8 backdrop-blur-sm border border-white/20">
            <Store size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-4">POS Pro</h1>
          <p className="text-blue-100 text-lg leading-relaxed mb-8">The professional point-of-sale system for modern F&B and retail businesses.</p>
          <div className="grid grid-cols-3 gap-4 text-sm">
            {['Orders', 'Inventory', 'Reports'].map(f => (
              <div key={f} className="bg-white/10 rounded-xl p-3 backdrop-blur-sm border border-white/10">
                <p className="font-semibold">{f}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className={`flex flex-1 lg:max-w-md items-center justify-center p-6 ${darkMode ? '' : ''}`}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Store size={22} className="text-white" />
            </div>
            <span className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>POS Pro</span>
          </div>

          <h2 className={`text-2xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
            {isLogin ? 'Welcome back' : 'Create account'}
          </h2>
          <p className={`text-sm mb-8 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {isLogin ? 'Sign in to your POS dashboard' : 'Set up your business account'}
          </p>

          {/* Tab toggle */}
          <div className={`flex rounded-xl p-1 mb-6 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
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
                  key="name-field"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                >
                  <label className={labelCls}>Full Name</label>
                  <div className="relative">
                    <UserIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} className={inputCls} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className={labelCls}>Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email" placeholder="you@business.com" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className={inputCls} />
              </div>
            </div>

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
              {loading ? 'Please wait…' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {isLogin && (
            <div className={`mt-6 rounded-2xl p-4 border ${darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
              <p className={`text-xs font-semibold mb-3 ${darkMode ? 'text-slate-400' : 'text-slate-400'}`}>
                DEMO ACCOUNTS — any password
              </p>
              <div className="space-y-2">
                {DEMO_ACCOUNTS.map(acc => (
                  <button
                    key={acc.email}
                    onClick={() => { setEmail(acc.email); setPassword('demo'); setError(''); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left border transition-all hover:scale-[1.01] active:scale-[0.99] ${
                      darkMode ? 'border-slate-700 hover:border-slate-600 bg-slate-800/50' : 'border-slate-100 hover:border-slate-200 bg-slate-50 hover:bg-white'
                    } ${email === acc.email ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    <div>
                      <p className={`text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{acc.email}</p>
                      <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{acc.role}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${acc.color}`}>{acc.label}</span>
                      <ChevronRight size={14} className="text-slate-400" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
