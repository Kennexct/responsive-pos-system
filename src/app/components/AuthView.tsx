import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Store, Mail, Lock, User as UserIcon } from 'lucide-react';
import type { User } from './mockData';

interface AuthViewProps {
  users: User[];
  onLogin: (user: User) => void;
  onSignup: (user: User) => void;
}

export function AuthView({ users, onLogin, onSignup }: AuthViewProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isLogin) {
      const user = users.find(u => u.email === email);
      if (!user) {
        setError('Invalid email or password. (Demo: try budi@warkop.id)');
        return;
      }
      // Demo: accept any password for valid emails
      if (!password) {
        setError('Password is required.');
        return;
      }
      onLogin(user);
    } else {
      if (!name.trim() || !email.trim() || !password) {
        setError('All fields are required.');
        return;
      }
      if (users.some(u => u.email === email)) {
        setError('Email is already registered.');
        return;
      }
      const newUser: User = {
        id: Date.now().toString(),
        name: name.trim(),
        email: email.trim(),
        role: 'owner', // First signed up user might be owner, but we'll default to owner for demo
      };
      onSignup(newUser);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100"
      >
        <div className="bg-blue-600 p-8 text-center text-white">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Store size={32} />
          </div>
          <h1 className="text-2xl font-bold mb-2">POS Pro Max</h1>
          <p className="text-blue-100 text-sm">Manage your business elegantly</p>
        </div>

        <div className="p-8">
          <div className="flex bg-slate-100 rounded-xl p-1 mb-8">
            <button
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${isLogin ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${!isLogin ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="popLayout">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100"
                >
                  {error}
                </motion.div>
              )}
              
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="relative"
                >
                  <UserIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
              />
            </div>

            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white rounded-xl py-3 font-medium hover:bg-blue-700 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none focus-visible:ring-offset-2 mt-2"
            >
              {isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>
          
          {isLogin && (
            <div className="mt-6 text-center text-sm text-slate-500 bg-blue-50 p-3 rounded-xl border border-blue-100">
              <p className="font-medium text-blue-700 mb-1">Demo Accounts:</p>
              <p>budi@warkop.id (Owner)</p>
              <p>ani@warkop.id (Cashier)</p>
              <p className="text-xs mt-1 text-slate-400">Any password will work</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
