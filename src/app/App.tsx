import { useState, useEffect, type ElementType } from 'react';
import { LayoutDashboard, ShoppingCart, Package, BarChart2, Settings, Menu, Monitor, Users, Receipt } from 'lucide-react';
import { usePersistentState } from './hooks/usePersistentState';
import { ToastProvider } from './contexts/ToastContext';
import { Sidebar } from './components/Sidebar';
import { POSView } from './components/POSView';
import { Dashboard } from './components/Dashboard';
import { InventoryView } from './components/InventoryView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { MobileOwnerView } from './components/MobileOwnerView';
import { AuthView } from './components/AuthView';
import { DailySalesView } from './components/DailySalesView';
import { CustomersView } from './components/CustomersView';
import type { BusinessType, ViewType, Product, RecentOrder, CartItem, OrderType, PaymentMethod, User, RolePermissions, Category, DiscountSettings, RefundSettings, Customer, LoyaltySettings, TaxRule, TerminalViewMode, PaymentMethodEntry } from './components/mockData';
import { PRODUCTS, RECENT_ORDERS, INITIAL_USERS, DEFAULT_PERMISSIONS, CATEGORIES, INITIAL_CUSTOMERS, INITIAL_LOYALTY_SETTINGS, INITIAL_TAX_RULES, INITIAL_PAYMENTS } from './components/mockData';

const MOBILE_NAV: { id: ViewType; label: string; icon: ElementType }[] = [
  { id: 'pos',         label: 'POS',          icon: Monitor         },
  { id: 'dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
  { id: 'inventory',   label: 'Inventory',    icon: Package         },
  { id: 'reports',     label: 'Reports',      icon: BarChart2       },
  { id: 'daily-sales', label: 'Daily Sales',  icon: Receipt         },
  { id: 'customers',   label: 'Customers',    icon: Users           },
  { id: 'settings',    label: 'Settings',     icon: Settings        },
];

let orderCounter = 1242;
function nextOrderNumber(): string {
  return `INV-00${orderCounter++}`;
}

export default function App() {
  const [view, setView]               = useState<ViewType>('pos');
  const [businessType, setBusinessType] = useState<BusinessType>('fnb');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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

  // ─── Business Info (Persistent) ──────────────────────────────────────────
  const [bizName, setBizName, bnLoaded] = usePersistentState('pos-bizname', 'Warung Kopi Santai');
  const [bizPhone, setBizPhone, bpLoaded] = usePersistentState('pos-bizphone', '+62 812 3456 7890');
  const [bizEmail, setBizEmail, beLoaded] = usePersistentState('pos-bizemail', 'hello@warkop.id');
  const [bizAddress, setBizAddress, baLoaded] = usePersistentState('pos-bizaddress', 'Jl. Sudirman No. 123, Jakarta');

  // ─── Auth ──────────────────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers, usersLoaded] = usePersistentState<User[]>('pos-users', [...INITIAL_USERS]);
  const [permissions, setPermissions, permsLoaded] = usePersistentState<RolePermissions>('pos-perms', DEFAULT_PERMISSIONS);

  // ─── Data State (Persistent) ─────────────────────────────────────────────
  const [categories, setCategories, catLoaded] = usePersistentState<Category[]>('pos-categories', [...CATEGORIES]);
  const [products, setProducts, prodLoaded] = usePersistentState<Product[]>('pos-products', [...PRODUCTS]);
  const [orders, setOrders, ordersLoaded] = usePersistentState<RecentOrder[]>('pos-orders', [...RECENT_ORDERS]);
  const [paymentMethods, setPaymentMethods, pmLoaded] = usePersistentState<PaymentMethodEntry[]>('pos-payments', INITIAL_PAYMENTS);
  const [customers, setCustomers, custLoaded] = usePersistentState<Customer[]>('pos-customers', [...INITIAL_CUSTOMERS]);
  
  // ─── Taxes & Discounts (Persistent) ──────────────────────────────────────
  const [discountSettings, setDiscountSettings, dsLoaded] = usePersistentState<DiscountSettings>('pos-discounts', {
    enabled: true,
    allowItemDiscount: true,
    promoCodes: [{ id: '1', code: 'PROMO10', type: 'percent', value: 10, active: true }]
  });
  const [refundSettings, setRefundSettings, rsLoaded] = usePersistentState<RefundSettings>('pos-refunds', {
    managerPinRequired: true
  });
  const [loyaltySettings, setLoyaltySettings, lsLoaded] = usePersistentState<LoyaltySettings>('pos-loyalty', { ...INITIAL_LOYALTY_SETTINGS });
  const [taxRules, setTaxRules, trLoaded] = usePersistentState<TaxRule[]>('pos-taxrules', INITIAL_TAX_RULES);
  const [terminalViewMode, setTerminalViewMode, tvmLoaded] = usePersistentState<TerminalViewMode>('pos-terminalview', 'grid');

  const handleRefund = (orderId: string, reason: string) => {
    const orderToRefund = orders.find(o => o.id === orderId);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'refunded', refundReason: reason } : o));
    
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
  };

  const handleOrderComplete = (
    cart: CartItem[],
    orderType: OrderType,
    paymentMethod: PaymentMethod,
    amountPaid: number,
    promoCode?: string,
    customerId?: string,
    pointsEarnedInput?: number,
    pointsRedeemed?: number,
    pointsDiscountAmt?: number,
    finalTaxParam?: number,
    totalParam?: number,
    finalSubtotalParam?: number
  ) => {
    let subtotalBeforeDiscount = 0;
    let itemDiscountTotal = 0;
    
    cart.forEach(item => {
      const basePrice = item.product.price + (item.variant?.priceModifier || 0);
      const linePrice = basePrice * item.qty;
      subtotalBeforeDiscount += linePrice;
      
      if (item.itemDiscountNominal) {
        itemDiscountTotal += (item.itemDiscountNominal * item.qty);
      } else if (item.discount) {
        itemDiscountTotal += (linePrice * (item.discount / 100));
      }
    });

    const finalSubtotal = finalSubtotalParam ?? subtotalBeforeDiscount;
    const finalTax = finalTaxParam ?? 0;
    const total = totalParam ?? finalSubtotal;
    const discountTotal = subtotalBeforeDiscount - finalSubtotal - (pointsDiscountAmt || 0);
    
    let pointsEarned = 0;
    if (customerId && loyaltySettings.enabled && loyaltySettings.earnRateSpend > 0) {
      pointsEarned = Math.floor(total / loyaltySettings.earnRateSpend) * loyaltySettings.earnRatePoints;
    }
    
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
      items:         [...cart],
      customerId,
      pointsEarned,
      pointsRedeemed,
      pointsDiscountAmt
    };

    setOrders(prev => [newOrder, ...prev]);

    if (customerId) {
      setCustomers(prev => prev.map(c => {
        if (c.id === customerId) {
          const newTotalSpend = c.totalSpend + total;
          const newTotalTransactions = (c.totalTransactions || 0) + 1;
          const newAtv = Math.round(newTotalSpend / newTotalTransactions);
          
          let newTierId = c.tierId;
          const applicableTiers = loyaltySettings.tiers
            .filter(t => newTotalSpend >= t.minSpend)
            .sort((a, b) => b.minSpend - a.minSpend);
            
          if (applicableTiers.length > 0) {
            newTierId = applicableTiers[0].id;
          }

          return {
            ...c,
            totalSpend: newTotalSpend,
            pointsBalance: c.pointsBalance - (pointsRedeemed || 0) + pointsEarned,
            totalTransactions: newTotalTransactions,
            averageTransactionValue: newAtv,
            lastPurchaseDate: new Date().toISOString(),
            tierId: newTierId
          };
        }
        return c;
      }));
    }

    const updatedProducts = products.map(p => {
      const inCart = cart.filter(i => i.product.id === p.id).reduce((s, i) => s + i.qty, 0);
      if (inCart > 0 && p.trackInventory) {
        return { ...p, stock: Math.max(0, p.stock - inCart) };
      }
      return p;
    });
    setProducts(updatedProducts);
  };

  const isFullyLoaded = catLoaded && prodLoaded && ordersLoaded && pmLoaded && dsLoaded && rsLoaded && lsLoaded && trLoaded && tvmLoaded && bnLoaded && bpLoaded && beLoaded && baLoaded && usersLoaded && permsLoaded && custLoaded;

  if (!isFullyLoaded) {
    return <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>Loading...</div>;
  }

  if (!isAuthenticated || !currentUser) {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <AuthView
          users={users}
          darkMode={darkMode}
          onLogin={(u) => { setCurrentUser(u); setIsAuthenticated(true); }}
          onSignup={(u) => { setUsers(prev => [...prev, u]); setCurrentUser(u); setIsAuthenticated(true); }}
        />
      </div>
    );
  }

  const allowedViews = currentUser ? permissions[currentUser.role] || [] : [];

  const VIEW_TITLE: Record<ViewType, string> = {
    pos: 'POS Terminal', dashboard: 'Dashboard',
    inventory: 'Inventory', reports: 'Reports', settings: 'Settings',
    'daily-sales': 'Daily Sales', customers: 'Customers'
  };

  return (
    <ToastProvider darkMode={darkMode}>
      <div className={`h-screen flex overflow-hidden relative ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-30 ${darkMode ? 'bg-blue-600' : 'bg-blue-300'}`} />
        <div className={`absolute top-[40%] -right-[10%] w-[40%] h-[60%] rounded-full blur-[120px] opacity-20 ${darkMode ? 'bg-purple-600' : 'bg-purple-300'}`} />
        <div className={`absolute -bottom-[20%] left-[20%] w-[60%] h-[40%] rounded-full blur-[120px] opacity-20 ${darkMode ? 'bg-emerald-600' : 'bg-emerald-300'}`} />
      </div>

      <div className="z-10 flex w-full h-full">
      <Sidebar
        currentView={view}
        onViewChange={setView}
        businessType={businessType}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentUser={currentUser}
        onLogout={() => { setCurrentUser(null); setIsAuthenticated(false); setView('pos'); }}
        allowedViews={allowedViews}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(d => !d)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className={`md:hidden flex items-center justify-between px-4 h-14 border-b shrink-0 backdrop-blur-md ${
          darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white/60 border-slate-200'
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
                terminalViewMode={terminalViewMode}
                products={products}
                categories={categories}
                discountSettings={discountSettings}
                taxRules={taxRules}
                currentUser={currentUser}
                bizName={bizName}
                darkMode={darkMode}
                customers={customers}
                setCustomers={setCustomers}
                loyaltySettings={loyaltySettings}
                paymentMethods={paymentMethods}
                onOrderComplete={(c, o, p, a, pc, cid, pe, pr, pda, ft, tot, fs) => handleOrderComplete(c, o, p, a, pc, cid, pe, pr, pda, ft, tot, fs)}
              />
            )}
            {view === 'dashboard'  && <MobileOwnerView orders={orders} products={products} darkMode={darkMode} />}
            {view === 'inventory'  && <InventoryView products={products} onProductsChange={setProducts} categories={categories} darkMode={darkMode} />}
            {view === 'reports'    && <ReportsView orders={orders} products={products} customers={customers} loyaltySettings={loyaltySettings} categories={categories} darkMode={darkMode} />}
            {view === 'daily-sales'&& (
              <DailySalesView users={users} 
                orders={orders} 
                darkMode={darkMode} 
                refundSettings={refundSettings} 
                onRefund={handleRefund} 
                onVoid={handleVoid} 
              />
            )}
            {view === 'customers' && (
              <CustomersView
                customers={customers}
                setCustomers={setCustomers}
                loyaltySettings={loyaltySettings}
                darkMode={darkMode}
                orders={orders}
              />
            )}
            {view === 'settings'   && (
              <SettingsView
                currentUser={currentUser}
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
                taxRules={taxRules}
                setTaxRules={setTaxRules}
                paymentMethods={paymentMethods}
                setPaymentMethods={setPaymentMethods}
                products={products}
                terminalViewMode={terminalViewMode}
                setTerminalViewMode={setTerminalViewMode}
                refundSettings={refundSettings}
                setRefundSettings={setRefundSettings}
                loyaltySettings={loyaltySettings}
                setLoyaltySettings={setLoyaltySettings}
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
                terminalViewMode={terminalViewMode}
                products={products}
                categories={categories}
                discountSettings={discountSettings}
                taxRules={taxRules}
                currentUser={currentUser}
                bizName={bizName}
                darkMode={darkMode}
                customers={customers}
                setCustomers={setCustomers}
                loyaltySettings={loyaltySettings}
                paymentMethods={paymentMethods}
                onOrderComplete={(c, o, p, a, pc, cid, pe, pr, pda, ft, tot, fs) => handleOrderComplete(c, o, p, a, pc, cid, pe, pr, pda, ft, tot, fs)}
              />
            )}
            {view === 'dashboard' && <Dashboard orders={orders} products={products} customers={customers} loyaltySettings={loyaltySettings} darkMode={darkMode} />}
            {view === 'inventory' && <InventoryView products={products} onProductsChange={setProducts} categories={categories} darkMode={darkMode} />}
            {view === 'reports'   && <ReportsView orders={orders} products={products} customers={customers} loyaltySettings={loyaltySettings} categories={categories} darkMode={darkMode} />}
            {view === 'daily-sales'&& (
              <DailySalesView users={users} 
                orders={orders} 
                darkMode={darkMode} 
                refundSettings={refundSettings} 
                onRefund={handleRefund} 
                onVoid={handleVoid} 
              />
            )}
            {view === 'customers' && (
              <CustomersView
                customers={customers}
                setCustomers={setCustomers}
                loyaltySettings={loyaltySettings}
                darkMode={darkMode}
                orders={orders}
              />
            )}
            {view === 'settings'  && (
              <SettingsView
                currentUser={currentUser}
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
                taxRules={taxRules}
                setTaxRules={setTaxRules}
                paymentMethods={paymentMethods}
                setPaymentMethods={setPaymentMethods}
                products={products}
                terminalViewMode={terminalViewMode}
                setTerminalViewMode={setTerminalViewMode}
                refundSettings={refundSettings}
                setRefundSettings={setRefundSettings}
                loyaltySettings={loyaltySettings}
                setLoyaltySettings={setLoyaltySettings}
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
        <nav className={`md:hidden flex border-t shrink-0 backdrop-blur-md ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
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
    </div>
    </ToastProvider>
  );
}
