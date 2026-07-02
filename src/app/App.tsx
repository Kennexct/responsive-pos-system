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
import { DailySalesView } from './components/DailySalesView';
import type { BusinessType, ViewType, Product, RecentOrder, CartItem, OrderType, PaymentMethod, User, RolePermissions, Category, DiscountSettings, RefundSettings } from './components/mockData';
import { PRODUCTS, RECENT_ORDERS, INITIAL_USERS, DEFAULT_PERMISSIONS, CATEGORIES } from './components/mockData';

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
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
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
  const [categories, setCategories] = useState<Category[]>([...CATEGORIES]);
  const [products, setProducts] = useState<Product[]>([...PRODUCTS]);
  const [orders,   setOrders]   = useState<RecentOrder[]>([...RECENT_ORDERS]);
  const [discountSettings, setDiscountSettings] = useState<DiscountSettings>({
    enabled: true, allowItemDiscount: true, promoCodes: [{ id: '1', code: 'PROMO10', type: 'percent', value: 10, active: true }]
  });
  const [refundSettings, setRefundSettings] = useState<RefundSettings>({
    managerPinRequired: true
  });

  const handleRefund = (orderId: string, reason: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'refunded', refundReason: reason } : o));
    
    // Restock items
    const orderToRefund = orders.find(o => o.id === orderId);
    if (orderToRefund && orderToRefund.items) {
      setProducts(prev => prev.map(p => {
        const inOrder = orderToRefund.items!.filter(i => i.product.id === p.id).reduce((s, i) => s + i.qty, 0);
        if (inOrder > 0 && p.trackInventory) {
          return { ...p, stock: p.stock + inOrder };
        }
        return p;
      }));
    }
  };

  const handleVoid = (orderId: string, reason: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'voided', refundReason: reason } : o));
    // No restock for voids
  };

  const handleOrderComplete = (
    cart: CartItem[],
    orderType: OrderType,
    paymentMethod: PaymentMethod,
    amountPaid: number,
    promoCode?: string
  ) => {
    let subtotalBeforeDiscount = 0;
    let itemDiscountTotal = 0;
    let taxAmt = 0;
    
    cart.forEach(item => {
      const basePrice = item.product.price + (item.variant?.priceModifier || 0);
      const linePrice = basePrice * item.qty;
      subtotalBeforeDiscount += linePrice;
      
      let itemTotal = linePrice;
      if (item.itemDiscountNominal) {
        itemDiscountTotal += (item.itemDiscountNominal * item.qty);
        itemTotal -= (item.itemDiscountNominal * item.qty);
      } else if (item.discount) {
        const d = linePrice * (item.discount / 100);
        itemDiscountTotal += d;
        itemTotal -= d;
      }
      
      const cat = categories.find(c => c.name === item.product.category);
      if (cat?.isTaxable) {
        taxAmt += itemTotal * TAX_RATE; // Approximation before promo code
      }
    });

    const subtotal = subtotalBeforeDiscount - itemDiscountTotal;
    let promoDiscountAmt = 0;
    
    if (promoCode) {
      const promo = discountSettings.promoCodes.find(p => p.code === promoCode);
      if (promo) {
        if (promo.type === 'percent') {
          promoDiscountAmt = subtotal * (promo.value / 100);
        } else {
          promoDiscountAmt = promo.value;
        }
      }
    }

    const finalSubtotal = Math.max(0, subtotal - promoDiscountAmt);
    const effectiveRatio = subtotal > 0 ? (finalSubtotal / subtotal) : 1;
    const finalTax = Math.round(taxAmt * effectiveRatio);
    const total = finalSubtotal + finalTax;
    
    const discountTotal = itemDiscountTotal + promoDiscountAmt;
    const totalCost = cart.reduce((sum, item) => sum + (item.product.costPrice * item.qty), 0);

    const newOrder: RecentOrder = {
      id:            String(Date.now()),
      orderNumber:   nextOrderNumber(),
      itemCount:     cart.reduce((s, i) => s + i.qty, 0),
      subtotalBeforeDiscount,
      discountTotal,
      promoCode,
      subtotal:      finalSubtotal,
      tax:           finalTax,
      total,
      totalCost,
      paymentMethod,
      orderType,
      status:        'completed',
      createdAt:     new Date().toISOString().slice(0, 19),
      cashier:       currentUser?.name || 'Cashier',
      items:         [...cart]
    };

    setOrders(prev => [newOrder, ...prev]);

    // Decrease stock
    const updatedProducts = products.map(p => {
      const inCart = cart.filter(i => i.product.id === p.id).reduce((s, i) => s + i.qty, 0);
      if (inCart > 0 && p.trackInventory) {
        return { ...p, stock: Math.max(0, p.stock - inCart) };
      }
      return p;
    });
    setProducts(updatedProducts);
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
                categories={categories}
                discountSettings={discountSettings}
                currentUser={currentUser}
                bizName={bizName}
                darkMode={darkMode}
                onOrderComplete={(c, o, p, a, pc) => handleOrderComplete(c, o, p, a, pc)}
              />
            )}
            {view === 'dashboard'  && <MobileOwnerView orders={orders} darkMode={darkMode} />}
            {view === 'inventory'  && <InventoryView products={products} onProductsChange={setProducts} categories={categories} darkMode={darkMode} />}
            {view === 'reports'    && <ReportsView orders={orders} categories={categories} darkMode={darkMode} />}
            {view === 'daily-sales'&& (
              <DailySalesView 
                orders={orders} 
                darkMode={darkMode} 
                refundSettings={refundSettings} 
                onRefund={handleRefund} 
                onVoid={handleVoid} 
              />
            )}
            {view === 'settings'   && (
              <SettingsView
                businessType={businessType}
                onBusinessTypeChange={setBusinessType}
                users={users}
                setUsers={setUsers}
                permissions={permissions}
                setPermissions={setPermissions}
                categories={categories}
                setCategories={setCategories}
                discountSettings={discountSettings}
                setDiscountSettings={setDiscountSettings}
                refundSettings={refundSettings}
                setRefundSettings={setRefundSettings}
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
                categories={categories}
                discountSettings={discountSettings}
                currentUser={currentUser}
                bizName={bizName}
                darkMode={darkMode}
                onOrderComplete={(c, o, p, a, pc) => handleOrderComplete(c, o, p, a, pc)}
              />
            )}
            {view === 'dashboard' && <Dashboard orders={orders} darkMode={darkMode} />}
            {view === 'inventory' && <InventoryView products={products} onProductsChange={setProducts} categories={categories} darkMode={darkMode} />}
            {view === 'reports'   && <ReportsView orders={orders} categories={categories} darkMode={darkMode} />}
            {view === 'daily-sales'&& (
              <DailySalesView 
                orders={orders} 
                darkMode={darkMode} 
                refundSettings={refundSettings} 
                onRefund={handleRefund} 
                onVoid={handleVoid} 
              />
            )}
            {view === 'settings'  && (
              <SettingsView
                businessType={businessType}
                onBusinessTypeChange={setBusinessType}
                users={users}
                setUsers={setUsers}
                permissions={permissions}
                setPermissions={setPermissions}
                categories={categories}
                setCategories={setCategories}
                discountSettings={discountSettings}
                setDiscountSettings={setDiscountSettings}
                refundSettings={refundSettings}
                setRefundSettings={setRefundSettings}
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
