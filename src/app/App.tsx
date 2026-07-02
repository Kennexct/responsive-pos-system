import { useState, useEffect, type ElementType } from 'react';
import { LayoutDashboard, ShoppingCart, Package, BarChart2, Settings, Menu, Monitor } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { POSView } from './components/POSView';
import { Dashboard } from './components/Dashboard';
import { InventoryView } from './components/InventoryView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { MobileOwnerView } from './components/MobileOwnerView';
import { AuthView } from './components/AuthView';
import type { BusinessType, ViewType, Product, RecentOrder, CartItem, OrderType, PaymentMethod, User, RolePermissions } from './components/mockData';
import { PRODUCTS, RECENT_ORDERS, INITIAL_USERS, DEFAULT_PERMISSIONS } from './components/mockData';

const MOBILE_NAV: { id: ViewType; label: string; icon: ElementType }[] = [
  { id: 'pos',       label: 'POS',        icon: Monitor         },
  { id: 'dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { id: 'inventory', label: 'Inventory',  icon: Package         },
  { id: 'reports',   label: 'Reports',    icon: BarChart2       },
  { id: 'settings',  label: 'Settings',   icon: Settings        },
];

let orderCounter = 1242;
function nextOrderNumber(): string {
  return `INV-00${orderCounter++}`;
}

export default function App() {
  const [view, setView]               = useState<ViewType>('pos');
  const [businessType, setBusinessType] = useState<BusinessType>('fnb');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ─── Theme ────────────────────────────────────────────────────────────────
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try { return localStorage.getItem('pos-dark') === 'true'; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem('pos-dark', String(darkMode)); } catch { /* ignore */ }
  }, [darkMode]);

  // ─── Business Settings ─────────────────────────────────────────────────────
  const [bizName,    setBizName]    = useState('Warung Kopi Santai');
  const [bizPhone,   setBizPhone]   = useState('+62 812 3456 7890');
  const [bizAddress, setBizAddress] = useState('Jl. Sudirman No. 123, Jakarta');
  const [bizEmail,   setBizEmail]   = useState('hello@warkop.id');

  // ─── Auth ──────────────────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers]             = useState<User[]>([...INITIAL_USERS]);
  const [permissions, setPermissions] = useState<RolePermissions>(DEFAULT_PERMISSIONS);

  // ─── Shared Data ───────────────────────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>([...PRODUCTS]);
  const [orders,   setOrders]   = useState<RecentOrder[]>([...RECENT_ORDERS]);

  const handleOrderComplete = (
    cart: CartItem[],
    orderType: OrderType,
    paymentMethod: PaymentMethod,
    amountPaid: number,
  ) => {
    const subtotal = cart.reduce((sum, item) => {
      const line = item.product.price * item.qty;
      return sum + line - line * (item.discount / 100);
    }, 0);
    const tax   = Math.round(subtotal * 0.11);
    const total = subtotal + tax;
    const totalCost = cart.reduce((sum, item) => sum + (item.product.costPrice * item.qty), 0);

    const newOrder: RecentOrder = {
      id:            String(Date.now()),
      orderNumber:   nextOrderNumber(),
      itemCount:     cart.reduce((s, i) => s + i.qty, 0),
      subtotal,
      tax,
      total,
      totalCost,
      paymentMethod,
      orderType,
      status:        'completed',
      createdAt:     new Date().toISOString(),
      cashier:       currentUser?.name ?? 'Staff',
    };
    setOrders(prev => [newOrder, ...prev]);

    setProducts(prev =>
      prev.map(p => {
        const cartItem = cart.find(c => c.product.id === p.id);
        if (!cartItem) return p;
        return { ...p, stock: Math.max(0, p.stock - cartItem.qty) };
      })
    );
  };

  if (!currentUser) {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <AuthView
          users={users}
          darkMode={darkMode}
          onLogin={setCurrentUser}
          onSignup={(u) => { setUsers(prev => [...prev, u]); setCurrentUser(u); }}
        />
      </div>
    );
  }

  const allowedViews = permissions[currentUser.role];

  const VIEW_TITLE: Record<ViewType, string> = {
    pos: 'POS Terminal', dashboard: 'Dashboard',
    inventory: 'Inventory', reports: 'Reports', settings: 'Settings',
  };

  return (
    <div className={`h-screen flex overflow-hidden ${darkMode ? 'dark bg-slate-900' : 'bg-slate-100'}`}>
      <Sidebar
        currentView={view}
        onViewChange={setView}
        businessType={businessType}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentUser={currentUser}
        onLogout={() => { setCurrentUser(null); setView('pos'); }}
        allowedViews={allowedViews}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(d => !d)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className={`md:hidden flex items-center justify-between px-4 h-14 border-b shrink-0 ${
          darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}>
          <button
            onClick={() => setSidebarOpen(true)}
            className={`p-2 -ml-1 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
          >
            <Menu size={20} />
          </button>
          <span className={`text-sm font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
            {VIEW_TITLE[view] ?? 'POS Pro'}
          </span>
          <div className="w-8" />
        </header>

        <main className="flex-1 overflow-hidden flex">
          {/* Mobile */}
          <div className="flex md:hidden flex-1 overflow-hidden flex-col">
            {view === 'pos' && (
              <POSView
                businessType={businessType}
                products={products}
                currentUser={currentUser}
                bizName={bizName}
                darkMode={darkMode}
                onOrderComplete={(c, o, p, a) => handleOrderComplete(c, o, p, a)}
              />
            )}
            {view === 'dashboard'  && <MobileOwnerView orders={orders} darkMode={darkMode} />}
            {view === 'inventory'  && <InventoryView products={products} onProductsChange={setProducts} darkMode={darkMode} />}
            {view === 'reports'    && <ReportsView orders={orders} darkMode={darkMode} />}
            {view === 'settings'   && (
              <SettingsView
                businessType={businessType}
                onBusinessTypeChange={setBusinessType}
                users={users}
                setUsers={setUsers}
                permissions={permissions}
                setPermissions={setPermissions}
                darkMode={darkMode}
                onToggleDark={() => setDarkMode(d => !d)}
                bizName={bizName}   setBizName={setBizName}
                bizPhone={bizPhone} setBizPhone={setBizPhone}
                bizAddress={bizAddress} setBizAddress={setBizAddress}
                bizEmail={bizEmail}   setBizEmail={setBizEmail}
              />
            )}
          </div>

          {/* Tablet / desktop */}
          <div className="hidden md:flex flex-1 overflow-hidden">
            {view === 'pos' && (
              <POSView
                businessType={businessType}
                products={products}
                currentUser={currentUser}
                bizName={bizName}
                darkMode={darkMode}
                onOrderComplete={handleOrderComplete}
              />
            )}
            {view === 'dashboard' && <Dashboard orders={orders} darkMode={darkMode} />}
            {view === 'inventory' && <InventoryView products={products} onProductsChange={setProducts} darkMode={darkMode} />}
            {view === 'reports'   && <ReportsView orders={orders} darkMode={darkMode} />}
            {view === 'settings'  && (
              <SettingsView
                businessType={businessType}
                onBusinessTypeChange={setBusinessType}
                users={users}
                setUsers={setUsers}
                permissions={permissions}
                setPermissions={setPermissions}
                darkMode={darkMode}
                onToggleDark={() => setDarkMode(d => !d)}
                bizName={bizName}   setBizName={setBizName}
                bizPhone={bizPhone} setBizPhone={setBizPhone}
                bizAddress={bizAddress} setBizAddress={setBizAddress}
                bizEmail={bizEmail}   setBizEmail={setBizEmail}
              />
            )}
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav className={`md:hidden flex border-t shrink-0 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          {MOBILE_NAV.filter(item => allowedViews.includes(item.id)).map(({ id, label, icon: Icon }) => {
            const active = view === id;
            return (
              <button
                key={id}
                onClick={() => setView(id)}
                className={[
                  'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none',
                  active
                    ? 'text-blue-500'
                    : darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600',
                ].join(' ')}
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
